"use client";

import { writeAudioMp4, type AudioSample, type EditEntry } from "./mp4Writer";

/**
 * Throws away the pictures and keeps the sound, without decoding either.
 *
 * A song recorded on a phone arrives as a video: an MP4 or MOV holding an H.264
 * track that is almost all of the bytes, next to an AAC track that is almost
 * none of them. Re-encoding that audio would need a decoder the browser may not
 * expose — Safari refuses to hand an MOV to decodeAudioData at all — and would
 * lose quality for no reason. Copying it does neither. The AAC frames are moved
 * into an audio-only file byte for byte, so what comes out is the exact audio
 * that went in, at a fraction of the size, and no codec is involved.
 *
 * mp4box parses; the writing is done by hand, because mp4box only emits
 * fragmented files and those were being misread.
 */

export type Remuxed = { ok: true; file: File; seconds: number } | { ok: false };

/** What the parse learns about the source, ready to be written back out. */
type Plan = {
  movieTimescale: number;
  mediaTimescale: number;
  language: number;
  stsdEntry: Uint8Array<ArrayBuffer>;
  edits: EditEntry[] | null;
};

/** Every MP4 and MOV starts with a size field then the letters "ftyp". */
export function looksLikeMp4(head: ArrayBuffer): boolean {
  if (head.byteLength < 12) return false;
  const tag = new Uint8Array(head, 4, 4);
  return String.fromCharCode(...tag) === "ftyp";
}

export async function remuxToAudio(file: File, bytes: ArrayBuffer): Promise<Remuxed> {
  try {
    // An iPhone recording contains boxes mp4box does not recognise, and it says
    // so at error level. The parse succeeds anyway and there is no quieter
    // setting to choose: setLogLevel only accepts the library's own four
    // functions and falls back to error for anything else. So the line stays in
    // the console and means nothing. Whether this worked is decided by what is
    // returned below.
    const { createFile, MP4BoxBuffer } = await import("mp4box");

    const src = createFile();
    let failed = false;
    src.onError = () => { failed = true; };

    // Held on an object rather than in a local: the compiler narrows a local
    // assigned only inside a callback down to null and then calls the rest of
    // this function unreachable.
    const found: { plan: Plan | null; seconds: number } = { plan: null, seconds: 0 };
    const samples: AudioSample[] = [];
    // onSamples can be handed the same run more than once depending on when the
    // parse settles, and a duplicated frame would lengthen the track.
    const seen = new Set<number>();

    src.onReady = (info) => {
      const track = info.audioTracks?.[0];
      if (!track?.audio) { failed = true; return; }

      const trak = src.getTrackById(track.id);
      const entry = trak?.mdia?.minf?.stbl?.stsd?.entries?.[0] as
        | { start?: number; size?: number }
        | undefined;
      // The source's own sample entry, copied byte for byte, so the decoder
      // configuration that describes these frames travels with them unchanged.
      if (!trak || entry?.start === undefined || entry.size === undefined) { failed = true; return; }

      const elst = trak.edts?.elst;
      found.plan = {
        movieTimescale: src.moov?.mvhd?.timescale ?? track.timescale,
        mediaTimescale: track.timescale,
        language: trak.mdia?.mdhd?.language ?? 0x55c4,
        stsdEntry: new Uint8Array(bytes, entry.start, entry.size),
        // The edit list is what trims the encoder's priming. Dropped, the track
        // starts roughly 50 ms early on a silent run-in.
        edits: elst?.entries?.length
          ? elst.entries.map((e) => ({ segmentDuration: e.segment_duration, mediaTime: e.media_time }))
          : null,
      };
      found.seconds = Math.round(track.duration / track.timescale);

      // Armed here, inside onReady, on purpose. Asking after the parse has been
      // flushed is too late: the buffers are gone and no sample is ever handed
      // over, which reads exactly like a file with no audio in it.
      src.setExtractionOptions(track.id, null, { nbSamples: 500 });
      src.start();
    };

    src.onSamples = (_id, _user, incoming) => {
      for (const s of incoming) {
        if (!s.data || seen.has(s.number)) continue;
        seen.add(s.number);
        samples.push({ data: s.data, size: s.data.byteLength, duration: s.duration });
      }
    };

    src.appendBuffer(MP4BoxBuffer.fromArrayBuffer(bytes, 0));
    src.flush();
    const built = found.plan;
    if (failed || !built || !samples.length) return { ok: false };

    const written = writeAudioMp4({ ...built, samples });
    const name = file.name.replace(/\.[^./\\]+$/, "") || "song";
    return {
      ok: true,
      file: new File([written], `${name}.m4a`, { type: "audio/mp4" }),
      seconds: found.seconds,
    };
  } catch (err) {
    console.error("remux failed", err);
    return { ok: false };
  }
}

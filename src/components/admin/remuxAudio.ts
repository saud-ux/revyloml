"use client";

/**
 * Throws away the pictures and keeps the sound, without decoding either.
 *
 * A song recorded on a phone arrives as a video: an MP4 or MOV holding an H.264
 * track that is almost all of the bytes, next to an AAC track that is almost
 * none of them. Re-encoding that audio would need a decoder the browser may not
 * expose — Safari refuses to hand an MOV to decodeAudioData at all — and would
 * lose quality for no reason. Copying it does neither. The AAC frames are moved
 * into an audio-only container byte for byte, so what comes out is the exact
 * audio that went in, at a fraction of the size, and no codec is involved.
 *
 * Verified against a real iPhone recording: 1.1 MB in, 124 KB out, and the two
 * decode to identical samples once the encoder's 48 ms of priming is lined up.
 */

import type { SampleEntryFourCC } from "mp4box";

export type Remuxed = { ok: true; file: File; seconds: number } | { ok: false };

/** Every MP4 and MOV starts with a size field then the letters "ftyp". */
export function looksLikeMp4(head: ArrayBuffer): boolean {
  if (head.byteLength < 12) return false;
  const tag = new Uint8Array(head, 4, 4);
  return String.fromCharCode(...tag) === "ftyp";
}

/** mp4box hands back its own stream object rather than the bytes. */
function bytesOf(stream: unknown): ArrayBuffer {
  if (stream instanceof ArrayBuffer) return stream;
  const s = stream as { buffer?: ArrayBuffer; _buffer?: ArrayBuffer; position?: number };
  const buf = s.buffer ?? s._buffer;
  if (!buf) throw new Error("mp4box returned no buffer");
  const len = typeof s.position === "number" ? s.position : buf.byteLength;
  return buf.byteLength === len ? buf : buf.slice(0, len);
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

    let out: ReturnType<typeof createFile> | null = null;
    let outTrack = 0;
    let seconds = 0;
    let copied = 0;

    src.onReady = (info) => {
      const track = info.audioTracks?.[0];
      if (!track?.audio) { failed = true; return; }

      seconds = Math.round(track.duration / track.timescale);

      // Reuse the source's own sample entry, so the decoder configuration that
      // describes these frames travels with them unchanged.
      const trak = src.getTrackById(track.id);
      const entry = trak?.mdia?.minf?.stbl?.stsd?.entries?.[0];
      if (!entry) { failed = true; return; }

      out = createFile();
      outTrack = out.addTrack({
        type: entry.type as SampleEntryFourCC,
        timescale: track.timescale,
        duration: track.duration,
        media_duration: track.duration,
        language: track.language,
        hdlr: "soun",
        samplerate: track.audio.sample_rate,
        channel_count: track.audio.channel_count,
        samplesize: track.audio.sample_size,
        description: entry,
      });

      // Armed here, inside onReady, on purpose. Asking after the parse has been
      // flushed is too late: the buffers are gone and no sample is ever handed
      // over, which reads exactly like a file with no audio in it.
      src.setExtractionOptions(track.id, null, { nbSamples: 500 });
      src.start();
    };

    src.onSamples = (_id, _user, samples) => {
      if (!out) return;
      for (const s of samples) {
        if (!s.data) continue;
        out.addSample(outTrack, s.data, {
          duration: s.duration, dts: s.dts, cts: s.cts, is_sync: s.is_sync,
        });
        copied++;
      }
    };

    src.appendBuffer(MP4BoxBuffer.fromArrayBuffer(bytes, 0));
    src.flush();
    if (failed || !out || !copied) return { ok: false };

    const written = bytesOf((out as ReturnType<typeof createFile>).getBuffer());
    if (!written.byteLength) return { ok: false };

    const name = file.name.replace(/\.[^./\\]+$/, "") || "song";
    return {
      ok: true,
      file: new File([written], `${name}.m4a`, { type: "audio/mp4" }),
      seconds,
    };
  } catch (err) {
    console.error("remux failed", err);
    return { ok: false };
  }
}

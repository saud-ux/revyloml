"use client";

/**
 * Writes a plain, progressive MP4 holding one audio track.
 *
 * mp4box can parse anything but it only writes fragmented files: addSample
 * appends a moof and an mdat per sample, so a ten second recording came out as
 * 436 fragments with empty sample tables and a third of the file given over to
 * fragment headers. Players are entitled to make of that what they will, and at
 * least one reported the track as twice its length.
 *
 * So the samples are written out here instead, in the shape every other muxer
 * produces: real stts, stsc, stsz and stco tables, and a single mdat.
 */

const cat = (parts: Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};
const u16 = (n: number) => Uint8Array.of((n >> 8) & 255, n & 255);
const u32 = (n: number) => Uint8Array.of((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
const tag = (s: string) => Uint8Array.of(s.charCodeAt(0), s.charCodeAt(1), s.charCodeAt(2), s.charCodeAt(3));
const box = (type: string, ...parts: Uint8Array[]) => {
  const body = cat(parts);
  return cat([u32(body.length + 8), tag(type), body]);
};
const full = (type: string, version: number, flags: number, ...parts: Uint8Array[]) =>
  box(type, Uint8Array.of(version, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255), ...parts);

/** The identity transform, which every audio track carries regardless. */
const MATRIX = cat([
  u32(0x00010000), u32(0), u32(0),
  u32(0), u32(0x00010000), u32(0),
  u32(0), u32(0), u32(0x40000000),
]);

/**
 * Rebuilds a sound description in the form a plain MP4 requires.
 *
 * A QuickTime recording, which is what an iPhone produces, describes its audio
 * with a version 1 entry that buries the decoder config inside a `wave` atom
 * alongside some legacy siblings. An MP4 parser expects a version 0 entry with
 * `esds` as a direct child and will not go looking in `wave` for it. Copied
 * across verbatim the file looks fine to lenient tools and plays in nothing:
 * the decoder never finds its configuration.
 *
 * So the `esds` is dug out of wherever it sits and re-housed in a clean entry.
 */
export function normalizeAudioEntry(
  raw: Uint8Array,
  channels: number,
  sampleRate: number,
  sampleSize: number,
): Uint8Array<ArrayBuffer> {
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const type = String.fromCharCode(raw[4], raw[5], raw[6], raw[7]);
  const version = view.getUint16(16);
  // Version 1 carries four extra fields, version 2 a longer block still.
  const childrenAt = 36 + (version === 1 ? 16 : version === 2 ? 36 : 0);

  const findEsds = (from: number, to: number): Uint8Array | null => {
    let at = from;
    while (at + 8 <= to) {
      const size = view.getUint32(at);
      if (size < 8 || at + size > to) break;
      const kind = String.fromCharCode(raw[at + 4], raw[at + 5], raw[at + 6], raw[at + 7]);
      if (kind === "esds") return raw.subarray(at, at + size);
      // QuickTime hides it one level down.
      if (kind === "wave") {
        const inner = findEsds(at + 8, at + size);
        if (inner) return inner;
      }
      at += size;
    }
    return null;
  };

  const esds = findEsds(childrenAt, raw.length);
  // Already the plain form, or nothing recognisable to rebuild from: leave it be.
  if (!esds || (version === 0 && raw.length === 36 + esds.length)) return cat([raw]);

  return box(type,
    Uint8Array.of(0, 0, 0, 0, 0, 0),   // reserved
    u16(1),                             // data reference index
    u16(0), u16(0), u32(0),             // version, revision, vendor
    u16(channels), u16(sampleSize || 16), u16(0), u16(0),
    u32(sampleRate << 16),              // 16.16 fixed point
    esds,
  );
}

export type AudioSample = { data: Uint8Array; size: number; duration: number };
export type EditEntry = { segmentDuration: number; mediaTime: number };

export type Mp4Plan = {
  movieTimescale: number;
  mediaTimescale: number;
  /** packed ISO-639-2, as the source declared it */
  language: number;
  /** the source's own sample entry, copied verbatim so the decoder config survives */
  stsdEntry: Uint8Array;
  /** the source's edit list, which is what trims the encoder's priming */
  edits: EditEntry[] | null;
  samples: AudioSample[];
};

function moov(plan: Mp4Plan, mediaDuration: number, movieDuration: number, chunkOffset: number) {
  // stts is run length encoded: a constant frame size collapses to one entry.
  const runs: Array<[number, number]> = [];
  for (const s of plan.samples) {
    const last = runs[runs.length - 1];
    if (last && last[1] === s.duration) last[0]++;
    else runs.push([1, s.duration]);
  }

  const stbl = box("stbl",
    full("stsd", 0, 0, u32(1), plan.stsdEntry),
    full("stts", 0, 0, u32(runs.length), ...runs.map(([c, d]) => cat([u32(c), u32(d)]))),
    // One chunk holding every sample, which is what a single mdat means.
    full("stsc", 0, 0, u32(1), u32(1), u32(plan.samples.length), u32(1)),
    full("stsz", 0, 0, u32(0), u32(plan.samples.length), ...plan.samples.map((s) => u32(s.size))),
    full("stco", 0, 0, u32(1), u32(chunkOffset)),
  );

  const mdia = box("mdia",
    full("mdhd", 0, 0, u32(0), u32(0), u32(plan.mediaTimescale), u32(mediaDuration), u16(plan.language), u16(0)),
    full("hdlr", 0, 0, u32(0), tag("soun"), u32(0), u32(0), u32(0),
         new TextEncoder().encode("SoundHandler\0")),
    box("minf",
      box("smhd", u32(0)),
      box("dinf", full("dref", 0, 0, u32(1), full("url ", 0, 1))),
      stbl,
    ),
  );

  const tkhd = full("tkhd", 0, 3, u32(0), u32(0), u32(1), u32(0), u32(movieDuration),
    u32(0), u32(0), u16(0), u16(0), u16(0x0100), u16(0), MATRIX, u32(0), u32(0));

  const edts = plan.edits?.length
    ? box("edts", full("elst", 0, 0, u32(plan.edits.length),
        ...plan.edits.map((e) => cat([u32(e.segmentDuration), u32(e.mediaTime >>> 0), u32(0x00010000)]))))
    : null;

  return box("moov",
    full("mvhd", 0, 0, u32(0), u32(0), u32(plan.movieTimescale), u32(movieDuration),
      u32(0x00010000), u16(0x0100), u16(0), u32(0), u32(0), MATRIX,
      u32(0), u32(0), u32(0), u32(0), u32(0), u32(0), u32(2)),
    box("trak", ...(edts ? [tkhd, edts, mdia] : [tkhd, mdia])),
  );
}

export function writeAudioMp4(plan: Mp4Plan): Uint8Array<ArrayBuffer> {
  const mediaDuration = plan.samples.reduce((n, s) => n + s.duration, 0);
  // With an edit list the presentation is shorter than the media, by the
  // priming it trims, and the edit list already states that length.
  const movieDuration = plan.edits?.length
    ? plan.edits.reduce((n, e) => n + e.segmentDuration, 0)
    : Math.round((mediaDuration * plan.movieTimescale) / plan.mediaTimescale);

  const ftyp = box("ftyp", tag("M4A "), u32(512), tag("M4A "), tag("isom"), tag("iso2"), tag("mp41"));

  // The chunk offset points past the header, and the header's length does not
  // depend on the value, so one throwaway pass measures it for the real one.
  const measured = moov(plan, mediaDuration, movieDuration, 0);
  const header = moov(plan, mediaDuration, movieDuration, ftyp.length + measured.length + 8);

  const payload = plan.samples.reduce((n, s) => n + s.size, 0);
  return cat([ftyp, header, u32(payload + 8), tag("mdat"), ...plan.samples.map((s) => s.data)]);
}

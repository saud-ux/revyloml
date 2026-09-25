"use client";

import { Mp3Encoder } from "@breezystack/lamejs";
import { looksLikeMp4, remuxToAudio } from "./remuxAudio";

/**
 * Turns whatever Yazan picked into something small enough to upload and small
 * enough to stream.
 *
 * He records on a phone, so the file he has is often a video: a minute of 4K is
 * around 400 MB, and the free plan allows 50 MB per file, 1 GB in total and
 * 10 GB of traffic a month. The audio hiding inside that video is a couple of
 * megabytes. So the phone pulls it out and encodes an MP3 before anything is
 * uploaded, and the video is discarded.
 *
 * A file that is already compressed audio is left exactly as it is, and an MP4
 * or MOV gets its audio track copied out rather than decoded, which is both
 * lossless and the only route that works on Safari — it will not hand a video
 * container to decodeAudioData at all. Decoding and re-encoding is the last
 * resort, for the formats neither of those covers.
 */

const PASSTHROUGH = new Set([
  "audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/ogg",
]);

const RATE = 44100;
/** Transparent enough for streaming at about 1.4 MB a minute. */
const KBPS = 192;
const BLOCK = 1152;              // lamejs encodes one MP3 frame per block
const BLOCKS_PER_TICK = 80;      // then yield, so the progress bar can repaint
const MAX_MINUTES = 60;

export type Stage = "reading" | "extracting" | "converting";

const MAX_BYTES = 50 * 1024 * 1024;
export type Prepared =
  | { ok: true; file: File; seconds: number; converted: boolean }
  | { ok: false; error: "decode" | "empty" | "toolong" };

function toInt16(input: Float32Array, out: Int16Array) {
  for (let i = 0; i < input.length; i++) {
    const s = input[i] < -1 ? -1 : input[i] > 1 ? 1 : input[i];
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
}

const yieldToPaint = () => new Promise((r) => setTimeout(r, 0));

/**
 * Safari only grew the promise form of decodeAudioData late, and the callback
 * form still works everywhere, so ask for both.
 */
function decode(ctx: BaseAudioContext, buf: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const p = ctx.decodeAudioData(buf, resolve, reject);
    if (p && typeof p.then === "function") p.then(resolve, reject);
  });
}

export async function prepareAudio(
  file: File,
  onStage: (stage: Stage, percent: number) => void,
): Promise<Prepared> {
  // Already compressed audio of a sensible size: send it untouched.
  if (PASSTHROUGH.has(file.type) && file.size <= MAX_BYTES) {
    return { ok: true, file, seconds: 0, converted: false };
  }

  onStage("reading", 0);
  const bytes = await file.arrayBuffer();

  onStage("extracting", 0);

  // An MP4 or MOV: lift the audio track out whole. No decoder, no quality lost,
  // and a phone video collapses to a few per cent of its size.
  if (looksLikeMp4(bytes.slice(0, 12))) {
    const lifted = await remuxToAudio(file, bytes);
    if (lifted.ok && lifted.file.size <= MAX_BYTES) {
      return { ok: true, file: lifted.file, seconds: lifted.seconds, converted: true };
    }
  }

  let audio: AudioBuffer;
  try {
    // An offline context resamples to its own rate while decoding, so the
    // encoder always gets 44.1 kHz whatever the phone recorded at.
    const ctx = new OfflineAudioContext(2, 1, RATE);
    audio = await decode(ctx, bytes);
  } catch {
    return { ok: false, error: "decode" };
  }

  if (!audio.length) return { ok: false, error: "empty" };
  if (audio.duration > MAX_MINUTES * 60) return { ok: false, error: "toolong" };

  const channels = Math.min(audio.numberOfChannels, 2);
  const left = audio.getChannelData(0);
  const right = channels > 1 ? audio.getChannelData(1) : null;

  const encoder = new Mp3Encoder(channels, RATE, KBPS);
  const parts: Uint8Array[] = [];
  const l16 = new Int16Array(BLOCK);
  const r16 = right ? new Int16Array(BLOCK) : null;

  onStage("converting", 0);
  for (let i = 0; i < left.length; i += BLOCK) {
    const n = Math.min(BLOCK, left.length - i);
    const lSlice = left.subarray(i, i + n);
    const lOut = n === BLOCK ? l16 : new Int16Array(n);
    toInt16(lSlice, lOut);

    let chunk: Uint8Array;
    if (right && r16) {
      const rOut = n === BLOCK ? r16 : new Int16Array(n);
      toInt16(right.subarray(i, i + n), rOut);
      chunk = encoder.encodeBuffer(lOut, rOut);
    } else {
      chunk = encoder.encodeBuffer(lOut);
    }
    if (chunk.length) parts.push(chunk);

    if ((i / BLOCK) % BLOCKS_PER_TICK === 0) {
      onStage("converting", Math.round((i / left.length) * 100));
      await yieldToPaint();
    }
  }

  const tail = encoder.flush();
  if (tail.length) parts.push(tail);
  onStage("converting", 100);

  const blob = new Blob(parts as BlobPart[], { type: "audio/mpeg" });
  const name = file.name.replace(/\.[^./\\]+$/, "") || "song";
  return {
    ok: true,
    file: new File([blob], `${name}.mp3`, { type: "audio/mpeg" }),
    seconds: Math.round(audio.duration),
    converted: true,
  };
}

"use client";

import { useCallback, useState } from "react";
import { requestUpload } from "@/app/actions";
import { prepareAudio, type Stage } from "./prepareAudio";

/**
 * One file slot on an admin form.
 *
 * An audio slot first turns whatever was picked into a small MP3, which is what
 * makes a video from a phone usable at all. Then the file goes straight from the
 * browser into storage: a server action body is capped at 1 MB and a song is
 * never that small.
 *
 * "post" is the fallback for a deployment with no bucket, where the file rides
 * along in the form as it always did.
 */
export type Slot = {
  phase: "idle" | "working" | "done" | "post" | "error";
  /** What the working phase is doing, for the label. */
  stage: Stage | "uploading" | null;
  percent: number;
  name: string | null;
  bytes: number;
  /** Bytes actually uploaded, which after a conversion is far less than `bytes`. */
  sent: number;
  /** Track length in seconds, known only when we decoded the file ourselves. */
  seconds: number;
  converted: boolean;
  url: string | null;
  /** An ERRORS key the form already knows how to translate. */
  error: string | null;
};

const IDLE: Slot = {
  phase: "idle", stage: null, percent: 0, name: null, bytes: 0, sent: 0,
  seconds: 0, converted: false, url: null, error: null,
};

function put(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    // XMLHttpRequest rather than fetch: it reports upload progress, and a song
    // over a phone connection is long enough that a silent button looks broken.
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`upload ${xhr.status}`));
    xhr.onerror = () => reject(new Error("upload failed"));
    xhr.onabort = () => reject(new Error("upload aborted"));
    xhr.send(file);
  });
}

export function useUpload(kind: "audio" | "image", prefix: "audio" | "cover" | "photo") {
  const [slot, setSlot] = useState<Slot>(IDLE);

  const take = useCallback(
    async (input: HTMLInputElement) => {
      const picked = input.files?.[0];
      if (!picked) return;

      const base = { name: picked.name, bytes: picked.size };
      setSlot({ ...IDLE, ...base, phase: "working", stage: "reading" });

      const fail = (code: string) => {
        // Drop the file too: leaving it in the input would post it on submit and
        // hit the very limit this exists to avoid.
        input.value = "";
        setSlot({ ...IDLE, ...base, phase: "error", error: `${prefix}-${code}` });
      };

      let file = picked;
      let seconds = 0;
      let converted = false;

      if (kind === "audio") {
        const ready = await prepareAudio(picked, (stage, percent) =>
          setSlot((s) => (s.phase === "working" ? { ...s, stage, percent } : s)),
        );
        if (!ready.ok) return fail(ready.error);
        ({ file, seconds, converted } = ready);
      }

      const sized = { ...base, sent: file.size, seconds, converted };
      setSlot((s) => ({ ...s, ...sized, stage: "uploading", percent: 0 }));

      let ticket;
      try {
        ticket = await requestUpload(kind, file.type, file.size);
      } catch {
        return fail("upstream");
      }

      if (!ticket.ok) {
        if (ticket.error === "disk") {
          // No bucket: keep the file in the input and let the form carry it.
          return setSlot({ ...IDLE, ...sized, phase: "post", stage: null });
        }
        return fail(ticket.error);
      }

      try {
        await put(ticket.uploadUrl, file, (percent) =>
          setSlot((s) => (s.phase === "working" ? { ...s, percent } : s)),
        );
      } catch (err) {
        console.error(err);
        return fail("upstream");
      }

      input.value = "";
      setSlot({
        ...IDLE, ...sized, phase: "done", stage: null, percent: 100, url: ticket.publicUrl,
      });
    },
    [kind, prefix],
  );

  return [slot, take] as const;
}

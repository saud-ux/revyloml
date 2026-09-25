"use client";

import { useCallback, useState } from "react";
import { requestUpload } from "@/app/actions";

/**
 * One file slot on an admin form.
 *
 * "post" is the fallback for a deployment with no bucket, where the file rides
 * along in the form as it always did. Everywhere else the file goes straight
 * from the browser into storage and only its URL is submitted, because a server
 * action body is capped at 1 MB and a song is never that small.
 */
export type Slot = {
  phase: "idle" | "busy" | "done" | "post" | "error";
  percent: number;
  name: string | null;
  bytes: number;
  url: string | null;
  /** An ERRORS key the form already knows how to translate. */
  error: string | null;
};

const IDLE: Slot = { phase: "idle", percent: 0, name: null, bytes: 0, url: null, error: null };

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
      const file = input.files?.[0];
      if (!file) return;

      const base = { name: file.name, bytes: file.size };
      setSlot({ ...IDLE, ...base, phase: "busy" });

      const fail = (code: string) => {
        // Drop the file too: leaving it in the input would post it on submit and
        // hit the very limit this exists to avoid.
        input.value = "";
        setSlot({ ...IDLE, ...base, phase: "error", error: `${prefix}-${code}` });
      };

      let ticket;
      try {
        ticket = await requestUpload(kind, file.type, file.size);
      } catch {
        return fail("upstream");
      }

      if (!ticket.ok) {
        if (ticket.error === "disk") {
          // No bucket: keep the file in the input and let the form carry it.
          return setSlot({ ...IDLE, ...base, phase: "post" });
        }
        return fail(ticket.error);
      }

      try {
        await put(ticket.uploadUrl, file, (percent) =>
          setSlot((s) => (s.phase === "busy" ? { ...s, percent } : s)),
        );
      } catch (err) {
        console.error(err);
        return fail("upstream");
      }

      input.value = "";
      setSlot({ ...IDLE, ...base, phase: "done", percent: 100, url: ticket.publicUrl });
    },
    [kind, prefix],
  );

  return [slot, take] as const;
}

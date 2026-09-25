"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveSong } from "@/app/actions";
import { Cover } from "@/components/Cover";
import { ImageIcon, NoteIcon } from "@/components/Icons";
import { duration as fmtDuration } from "@/lib/format";
import { fill, type Dict, type Locale } from "@/lib/i18n";
import type { Song } from "@/lib/types";
import { Bar } from "./Bar";
import { useUpload, type Slot } from "./useUpload";

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const ERRORS: Record<string, keyof Dict> = {
  title: "errTitle",
  "audio-type": "errAudioType",
  "audio-size": "errAudioSize",
  "cover-type": "errImageType",
  "cover-size": "errImageSize",
  "audio-upstream": "errUpstream",
  "cover-upstream": "errUpstream",
};

export function SongForm({
  locale, dict, song,
}: {
  locale: Locale;
  dict: Dict;
  song?: Song;
}) {
  const [state, action, pending] = useActionState(saveSong, undefined);
  const [audio, takeAudio] = useUpload("audio", "audio");
  const [cover, takeCover] = useUpload("image", "cover");
  const [seconds, setSeconds] = useState(song?.duration ?? 0);
  const [titleAr, setTitleAr] = useState(song?.title.ar ?? "");

  const busy = audio.phase === "busy" || cover.phase === "busy";

  /** What the picker says under itself once a file has been chosen. */
  function status(slot: Slot): string | null {
    if (slot.phase === "busy") return fill(dict.uploading, { percent: slot.percent });
    if (slot.phase === "error") return dict.uploadRetry;
    if (slot.name) return `${slot.name} · ${mb(slot.bytes)}`;
    return null;
  }

  /**
   * Read the track length in the browser rather than probing the file on the
   * server — no ffmpeg in the deployment, and the browser already decoded it.
   */
  function onAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Read the length before handing the input over: the upload clears it.
    const url = URL.createObjectURL(file);
    const probe = new Audio();
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      const d = Math.round(probe.duration);
      if (Number.isFinite(d) && d > 0) setSeconds(d);
      URL.revokeObjectURL(url);
    };
    probe.onerror = () => URL.revokeObjectURL(url);
    probe.src = url;
    void takeAudio(e.target);
  }

  // An upload that failed in the browser reports the same codes the action
  // does, so both end up in the same sentence under the form.
  const error = audio.error ?? cover.error ?? state?.error;
  const errorKey = error ? ERRORS[error] : undefined;

  return (
    <form action={action} className="form">
      <input type="hidden" name="locale" value={locale} />
      {song && <input type="hidden" name="slug" value={song.slug} />}
      {/* Controlled: an uncontrolled input written through a ref loses its value
          on the next render, which silently submitted every song as 0:00. */}
      <input type="hidden" name="duration" value={seconds} readOnly />
      {/* Filled once the browser has put the file in storage itself. */}
      <input type="hidden" name="audioUrl" value={audio.url ?? ""} readOnly />
      <input type="hidden" name="coverUrl" value={cover.url ?? ""} readOnly />

      <div className="dropzone">
        <span className="dropzone__icon"><NoteIcon size={24} /></span>
        <label className="btn btn--secondary">
          {dict.dropzone}
          <input type="file" name="audio" accept="audio/*" className="sr-only" onChange={onAudio} />
        </label>
        <span className="dropzone__hint">
          {audio.name
            ? `${status(audio)} · ${fmtDuration(seconds)}`
            : song?.audioUrl
              ? fmtDuration(seconds)
              : dict.formats}
        </span>
        {audio.phase === "busy" && <Bar percent={audio.percent} />}
        {/* Nothing re-encodes the upload, so the file Yazan picks is the file
            every listener downloads. A WAV is a slow page on mobile data. */}
        {!audio.name && <span className="dropzone__hint">{dict.formatsHint}</span>}
        {audio.bytes > 12 * 1024 * 1024 && (
          <span className="dropzone__warn">{dict.formatsHint}</span>
        )}
      </div>

      <div className="form__grid">
        <label className="field">
          <span className="field__label">{dict.title}</span>
          <input className="input" name="titleAr" dir="rtl" required
                 defaultValue={song?.title.ar} onChange={(e) => setTitleAr(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">{dict.titleEnField}</span>
          <input className="input ltr" name="titleEn" defaultValue={song?.title.en} />
        </label>
        <label className="field">
          <span className="field__label">{dict.releasedAt}</span>
          <input className="input ltr" type="date" name="releasedAt"
                 defaultValue={song?.releasedAt ?? new Date().toISOString().slice(0, 10)} />
        </label>
      </div>

      <div className="field">
        <span className="field__label">{dict.cover}</span>
        <div className="cover-field">
          <Cover
            size={76}
            title={titleAr || "?"}
            slug={song?.slug ?? "new"}
            url={cover.url ?? song?.coverUrl}
          />
          <div className="cover-field__col">
            <span className="dropzone__hint">{status(cover) ?? dict.generated}</span>
            <label className="btn btn--secondary">
              <ImageIcon /> {dict.replaceCover}
              <input
                type="file"
                name="cover"
                accept="image/*"
                className="sr-only"
                onChange={(e) => void takeCover(e.target)}
              />
            </label>
            {cover.phase === "busy" && <Bar percent={cover.percent} />}
          </div>
        </div>
      </div>

      <label className="field">
        <span className="field__label">{dict.lyricsOpt}</span>
        <textarea className="input input--area" name="lyrics" rows={6} defaultValue={song?.lyrics} />
      </label>

      <fieldset className="field">
        <legend className="field__label">{dict.visibility}</legend>
        <div className="segmented">
          <label className="segmented__opt">
            <input type="radio" name="visibility" value="public"
                   defaultChecked={song?.visibility !== "hidden"} />
            <span>{dict.public}</span>
          </label>
          <label className="segmented__opt">
            <input type="radio" name="visibility" value="hidden"
                   defaultChecked={song?.visibility === "hidden"} />
            <span>{dict.hidden}</span>
          </label>
        </div>
        <p className="field__hint">{dict.visHelp}</p>
      </fieldset>

      {error && (
        <p className="field__error" role="alert">{errorKey ? dict[errorKey] : error}</p>
      )}

      <div className="form__actions">
        {/* Saving mid-upload would file the song without its audio. */}
        <button type="submit" className="btn btn--primary" disabled={pending || busy}>
          {pending ? dict.saving : song ? dict.saveChanges : dict.save}
        </button>
        <Link href={`/${locale}/admin`} className="btn btn--secondary">{dict.cancel}</Link>
      </div>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveSong } from "@/app/actions";
import { Cover } from "@/components/Cover";
import { ImageIcon, NoteIcon } from "@/components/Icons";
import { duration as fmtDuration } from "@/lib/format";
import type { Dict, Locale } from "@/lib/i18n";
import type { Song } from "@/lib/types";

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
  const [audioName, setAudioName] = useState<string | null>(null);
  const [audioBytes, setAudioBytes] = useState(0);
  const [seconds, setSeconds] = useState(song?.duration ?? 0);
  const [titleAr, setTitleAr] = useState(song?.title.ar ?? "");

  /**
   * Read the track length in the browser rather than probing the file on the
   * server — no ffmpeg in the deployment, and the browser already decoded it.
   */
  function onAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioName(file.name);
    setAudioBytes(file.size);
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
  }

  const errorKey = state?.error ? ERRORS[state.error] : undefined;

  return (
    <form action={action} className="form">
      <input type="hidden" name="locale" value={locale} />
      {song && <input type="hidden" name="slug" value={song.slug} />}
      {/* Controlled: an uncontrolled input written through a ref loses its value
          on the next render, which silently submitted every song as 0:00. */}
      <input type="hidden" name="duration" value={seconds} readOnly />

      <div className="dropzone">
        <span className="dropzone__icon"><NoteIcon size={24} /></span>
        <label className="btn btn--secondary">
          {dict.dropzone}
          <input type="file" name="audio" accept="audio/*" className="sr-only" onChange={onAudio} />
        </label>
        <span className="dropzone__hint">
          {audioName ? `${audioName} · ${fmtDuration(seconds)} · ${mb(audioBytes)}` : song?.audioUrl ? fmtDuration(seconds) : dict.formats}
        </span>
        {/* Nothing re-encodes the upload, so the file Yazan picks is the file
            every listener downloads. A WAV is a slow page on mobile data. */}
        {!audioName && <span className="dropzone__hint">{dict.formatsHint}</span>}
        {audioBytes > 12 * 1024 * 1024 && (
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
          <Cover size={76} title={titleAr || "?"} slug={song?.slug ?? "new"} url={song?.coverUrl} />
          <div className="cover-field__col">
            <span className="dropzone__hint">{dict.generated}</span>
            <label className="btn btn--secondary">
              <ImageIcon /> {dict.replaceCover}
              <input type="file" name="cover" accept="image/*" className="sr-only" />
            </label>
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

      {state?.error && (
        <p className="field__error" role="alert">{errorKey ? dict[errorKey] : state.error}</p>
      )}

      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? dict.saving : song ? dict.saveChanges : dict.save}
        </button>
        <Link href={`/${locale}/admin`} className="btn btn--secondary">{dict.cancel}</Link>
      </div>
    </form>
  );
}

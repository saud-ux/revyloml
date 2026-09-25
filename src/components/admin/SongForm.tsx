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
  "audio-decode": "errAudioDecode",
  "audio-empty": "errAudioEmpty",
  "audio-toolong": "errAudioToolong",
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
  const [probed, setProbed] = useState(song?.duration ?? 0);
  const [titleAr, setTitleAr] = useState(song?.title.ar ?? "");

  const busy = audio.phase === "working" || cover.phase === "working";

  /** What the picker says under itself once a file has been chosen. */
  function status(slot: Slot): string | null {
    if (slot.phase === "working") {
      if (slot.stage === "reading") return dict.stageReading;
      if (slot.stage === "extracting") return dict.stageExtracting;
      if (slot.stage === "converting") return fill(dict.stageConverting, { percent: slot.percent });
      return fill(dict.uploading, { percent: slot.percent });
    }
    if (slot.phase === "error") return dict.uploadRetry;
    if (slot.name) return `${slot.name} · ${mb(slot.bytes)}`;
    return null;
  }

  /**
   * Read the track length in the browser rather than probing the file on the
   * server — no ffmpeg in the deployment, and the browser is about to decode the
   * whole thing anyway. A file passed through untouched is never decoded, so it
   * still needs the cheap metadata probe.
   */
  function onAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Probe before handing the input over: the upload clears it.
    const url = URL.createObjectURL(file);
    const probe = new Audio();
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      const d = Math.round(probe.duration);
      if (Number.isFinite(d) && d > 0) setProbed(d);
      URL.revokeObjectURL(url);
    };
    probe.onerror = () => URL.revokeObjectURL(url);
    probe.src = url;
    void takeAudio(e.target);
  }

  // An upload that failed in the browser reports the same codes the action
  // does, so both end up in the same sentence under the form.
  // The converter decoded the whole file, so its length beats the probe's.
  const seconds = audio.seconds > 0 ? audio.seconds : probed;

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
          <input
            type="file"
            name="audio"
            /* Extensions as well as the wildcards. iOS matches files in the
               Files app by extension, and on wildcards alone it greys out
               perfectly good audio, leaving folders as the only thing that can
               be tapped. Anything unsuitable that slips through is caught on
               the way in and reported. */
            accept="audio/*,video/*,.mp3,.m4a,.aac,.wav,.aiff,.aif,.caf,.ogg,.oga,.opus,.flac,.mp4,.m4v,.mov,.3gp,.webm,.mkv"
            className="sr-only"
            onChange={onAudio}
          />
        </label>
        <span className="dropzone__hint">
          {audio.name
            ? `${status(audio)} · ${fmtDuration(seconds)}`
            : song?.audioUrl
              ? fmtDuration(seconds)
              : dict.formats}
        </span>
        {audio.phase === "working" && <Bar percent={audio.percent} />}
        {!audio.name && <span className="dropzone__hint">{dict.formatsHint}</span>}
        {/* Worth saying out loud: a 400 MB clip becoming 7 MB looks like the
            upload went wrong otherwise. */}
        {audio.converted && audio.phase === "done" && (
          <span className="dropzone__hint">
            {fill(dict.convertedNote, { from: mb(audio.bytes), to: mb(audio.sent) })}
          </span>
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
                accept="image/*,.jpg,.jpeg,.png,.webp,.avif,.gif"
                className="sr-only"
                onChange={(e) => void takeCover(e.target)}
              />
            </label>
            {cover.phase === "working" && <Bar percent={cover.percent} />}
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
        {/* Saving mid-upload would file the song without its audio, and saving
            after a failed conversion would create one that can never play. A
            song that already has audio is still editable: the old file stands. */}
        <button
          type="submit"
          className="btn btn--primary"
          disabled={pending || busy || (audio.phase === "error" && !song?.audioUrl)}
        >
          {pending ? dict.saving : song ? dict.saveChanges : dict.save}
        </button>
        <Link href={`/${locale}/admin`} className="btn btn--secondary">{dict.cancel}</Link>
      </div>
    </form>
  );
}

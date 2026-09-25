"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveProfile } from "@/app/actions";
import { Avatar } from "@/components/Cover";
import { CheckIcon, ImageIcon } from "@/components/Icons";
import { fill, type Dict, type Locale } from "@/lib/i18n";
import type { Profile } from "@/lib/types";
import { Bar } from "./Bar";
import { useUpload } from "./useUpload";

/** The three accent options from the design; the chosen one drives the whole site. */
const ACCENTS: { value: string; label: Record<Locale, string> }[] = [
  { value: "#1DB954", label: { en: "Signal Green", ar: "أخضر" } },
  { value: "#E9A23B", label: { en: "Ember Amber", ar: "كهرماني" } },
  { value: "#8B6FF0", label: { en: "Velvet", ar: "بنفسجي" } },
];

const ERRORS: Record<string, keyof Dict> = {
  handle: "errHandle",
  "photo-type": "errImageType",
  "photo-size": "errImageSize",
  "photo-upstream": "errUpstream",
};

export function ProfileForm({
  locale, dict, profile,
}: {
  locale: Locale;
  dict: Dict;
  profile: Profile;
}) {
  const [state, action, pending] = useActionState(saveProfile, undefined);
  const [photo, takePhoto] = useUpload("image", "photo");
  const [accent, setAccent] = useState(profile.accent);
  const [name, setName] = useState(profile.name[locale] || profile.name.en);

  const error = photo.error ?? state?.error;
  const errorKey = error ? ERRORS[error] : undefined;

  const photoStatus =
    photo.phase === "working"
      ? fill(dict.uploading, { percent: photo.percent })
      : photo.phase === "error"
        ? dict.uploadRetry
        : photo.phase === "done"
          ? dict.uploadDone
          : null;

  return (
    <form action={action} className="form">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="photoUrl" value={profile.photoUrl ?? ""} />
      {/* Filled once the browser has put the file in storage itself, which is
          the only way past the 1 MB cap on a server action body. */}
      <input type="hidden" name="photoUploaded" value={photo.url ?? ""} readOnly />

      <div className="cover-field">
        <Avatar size={76} name={name || "?"} url={photo.url ?? profile.photoUrl} />
        <div className="cover-field__col">
          <span className="field__label">{dict.photo}</span>
          <label className="btn btn--secondary">
            <ImageIcon /> {dict.changePhoto}
            <input
              type="file"
              name="photo"
              accept="image/*"
              className="sr-only"
              onChange={(e) => void takePhoto(e.target)}
            />
          </label>
          {photoStatus && <span className="dropzone__hint">{photoStatus}</span>}
          {photo.phase === "working" && <Bar percent={photo.percent} />}
        </div>
      </div>

      <label className="field">
        <span className="field__label">{dict.handle}</span>
        <input className="input ltr" name="handle" defaultValue={profile.handle}
               pattern="[a-zA-Z0-9._]{1,30}" required />
        <span className="field__hint">{dict.handleHint}</span>
      </label>

      <div className="form__grid">
        <label className="field">
          <span className="field__label">{dict.nameAr}</span>
          <input className="input" name="nameAr" dir="rtl" defaultValue={profile.name.ar}
                 onChange={(e) => locale === "ar" && setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">{dict.nameEn}</span>
          <input className="input ltr" name="nameEn" defaultValue={profile.name.en}
                 onChange={(e) => locale === "en" && setName(e.target.value)} />
        </label>
      </div>

      <label className="field">
        <span className="field__label">{dict.bioAr}</span>
        <textarea className="input input--area" name="bioAr" dir="rtl" rows={3}
                  maxLength={160} defaultValue={profile.bio.ar} />
      </label>
      <label className="field">
        <span className="field__label">{dict.bioEn}</span>
        <textarea className="input input--area ltr" name="bioEn" rows={3}
                  maxLength={160} defaultValue={profile.bio.en} />
      </label>

      <fieldset className="field">
        <legend className="field__label">{dict.accent}</legend>
        <div className="accents">
          {ACCENTS.map((a) => (
            <label key={a.value} className="accent">
              <input type="radio" name="accent" value={a.value} className="sr-only"
                     checked={accent === a.value} onChange={() => setAccent(a.value)} />
              <span className="accent__dot" style={{ background: a.value }}>
                {accent === a.value && <CheckIcon size={18} />}
              </span>
              <span className="accent__label">{a.label[locale]}</span>
            </label>
          ))}
        </div>
        <p className="field__hint">{dict.accentHelp}</p>
      </fieldset>

      {error && (
        <p className="field__error" role="alert">{errorKey ? dict[errorKey] : error}</p>
      )}

      <div className="form__actions">
        {/* Saving mid-upload would file the profile without its photo. */}
        <button type="submit" className="btn btn--primary" disabled={pending || photo.phase === "working"}>
          {pending ? dict.saving : dict.saveChanges}
        </button>
        <Link href={`/${locale}/admin`} className="btn btn--secondary">{dict.cancel}</Link>
      </div>
    </form>
  );
}

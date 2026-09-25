"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveProfile } from "@/app/actions";
import { Avatar } from "@/components/Cover";
import { ImageIcon } from "@/components/Icons";
import { fill, type Dict, type Locale } from "@/lib/i18n";
import type { Profile } from "@/lib/types";
import { Bar } from "./Bar";
import { useUpload } from "./useUpload";

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
              accept="image/*,.jpg,.jpeg,.png,.webp,.avif,.gif"
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

      <fieldset className="field">
        <legend className="field__label">{dict.socialTitle}</legend>
        <div className="form__grid">
          {([
            ["instagram", "Instagram", profile.social.instagram],
            ["tiktok", "TikTok", profile.social.tiktok],
            ["snapchat", "Snapchat", profile.social.snapchat],
            ["x", "X", profile.social.x],
          ] as const).map(([name, label, value]) => (
            <label className="field" key={name}>
              <span className="field__label">{label}</span>
              <input
                className="input ltr"
                name={name}
                defaultValue={value}
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="revyloml"
              />
            </label>
          ))}
        </div>
        <p className="field__hint">{dict.socialHint}</p>
      </fieldset>

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

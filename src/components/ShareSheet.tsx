"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowOutIcon, CheckIcon, CloseIcon, CopyIcon, ShareIcon, WhatsAppIcon } from "./Icons";
import type { Dict } from "@/lib/i18n";

/**
 * Copy link, WhatsApp, native share — plus the "link copied" confirmation.
 * The URL is read in the browser so it is always the real, shareable one.
 */
export function ShareSheet({
  dict, title, label, text, buttonClass = "iconbtn",
}: {
  dict: Dict;
  title: string;
  /** accessible name for the trigger */
  label: string;
  /** visible label; omit for an icon-only trigger */
  text?: string;
  buttonClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(id);
  }, [copied]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url || window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function nativeShare() {
    const data = { title, url: url || window.location.href };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
        setOpen(false);
        return;
      } catch {
        /* the person dismissed the OS sheet — leave ours open */
      }
    }
    void copy();
  }

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        aria-label={label}
        onClick={() => {
          // Read the real URL when the sheet opens, not during render — the
          // server has no window and the markup must hydrate identically.
          setUrl(window.location.href);
          setOpen(true);
        }}
      >
        <ShareIcon size={18} />
        {text}
      </button>

      {open && (
        <>
          <button type="button" className="scrim" aria-label={dict.cancel} onClick={() => setOpen(false)} />
          <div className="sheet" role="dialog" aria-modal="true" aria-label={dict.shareSong}>
            {copied && (
              <div className="toast" role="status">
                <span><CheckIcon /> {dict.copied}</span>
              </div>
            )}
            <div className="sheet__head">
              <h2 className="sheet__title">{dict.shareSong}</h2>
              <button ref={closeRef} type="button" className="iconbtn" aria-label={dict.cancel}
                      onClick={() => setOpen(false)}>
                <CloseIcon />
              </button>
            </div>

            <div className="linkrow">
              <span className="linkrow__url ltr">{url}</span>
              <button type="button" className="btn btn--primary" style={{ minHeight: 36, paddingInline: 14 }}
                      onClick={copy}>
                {dict.copyLink}
              </button>
            </div>

            <div className="targets">
              <a
                className="target"
                href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`}
                target="_blank"
                rel="noreferrer"
              >
                <span className="target__box target__box--wa"><WhatsAppIcon /></span>
                <span className="target__label">{dict.whatsapp}</span>
              </a>
              <button type="button" className="target" onClick={copy}>
                <span className="target__box"><CopyIcon /></span>
                <span className="target__label">{dict.copyLink}</span>
              </button>
              <button type="button" className="target" onClick={nativeShare}>
                <span className="target__box"><ArrowOutIcon /></span>
                <span className="target__label">{dict.moreApps}</span>
              </button>
            </div>
          </div>
        </>
      )}

    </>
  );
}

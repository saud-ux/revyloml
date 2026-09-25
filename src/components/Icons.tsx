type P = { size?: number; className?: string };

const stroke = (d: string, size: number, className?: string, width = 1.6) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden className={className} style={{ display: "block", flexShrink: 0 }}
    dangerouslySetInnerHTML={{ __html: d }}
  />
);

/* The play glyph is an outlined triangle and it never mirrors in RTL. */
export const PlayIcon = ({ size = 20 }: P) => stroke('<path d="M8 5.2 19 12 8 18.8z"/>', size, undefined, 2);
export const PauseIcon = ({ size = 20 }: P) =>
  stroke('<rect x="7.5" y="5.2" width="3.6" height="13.6"/><rect x="13" y="5.2" width="3.6" height="13.6"/>', size, undefined, 2);

/* Directional icons: `.flip` is applied by the caller under :dir(rtl). */
export const PrevIcon = ({ size = 24, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}
       style={{ display: "block", flexShrink: 0 }}>
    <path d="M18.6 5.8v12.4a.6.6 0 0 1-.93.5L9 13.2v4.4a.7.7 0 0 1-1.4 0V6.4a.7.7 0 0 1 1.4 0v4.4l8.67-5.5a.6.6 0 0 1 .93.5z" />
  </svg>
);
export const NextIcon = ({ size = 24, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}
       style={{ display: "block", flexShrink: 0 }}>
    <path d="M5.4 5.8v12.4a.6.6 0 0 0 .93.5L15 13.2v4.4a.7.7 0 0 0 1.4 0V6.4a.7.7 0 0 0-1.4 0v4.4L6.33 5.3a.6.6 0 0 0-.93.5z" />
  </svg>
);
export const BackIcon = ({ size = 21, className }: P) => stroke('<path d="M15 4.5 8 12l7 7.5"/>', size, className);

export const ShareIcon = ({ size = 18 }: P) =>
  stroke('<path d="M12 15.5V4"/><path d="M8.3 7.4 12 3.7l3.7 3.7"/><path d="M5.8 12.6V19a1.5 1.5 0 0 0 1.5 1.5h9.4A1.5 1.5 0 0 0 18.2 19v-6.4"/>', size);
export const CopyIcon = ({ size = 22 }: P) =>
  stroke('<rect x="9" y="8.5" width="10.5" height="11.5" rx="2.4"/><path d="M15 8.5V6.2A2.2 2.2 0 0 0 12.8 4H6.7A2.2 2.2 0 0 0 4.5 6.2v6.1A2.2 2.2 0 0 0 6.7 14.5H9"/>', size);
export const CheckIcon = ({ size = 16 }: P) => stroke('<path d="M5 12.6 9.5 17 19 7"/>', size);
export const CloseIcon = ({ size = 18 }: P) => stroke('<path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8"/>', size);
export const ShuffleIcon = ({ size = 19 }: P) =>
  stroke('<path d="M4 7h3.4l9.2 10H20"/><path d="M4 17h3.4l2.3-2.6"/><path d="M14.3 9.6 16.6 7H20"/><path d="M17.4 4.4 20 7l-2.6 2.6"/><path d="M17.4 14.4 20 17l-2.6 2.6"/>', size);
export const RepeatIcon = ({ size = 19 }: P) =>
  stroke('<path d="M7 7h9a4 4 0 0 1 4 4v.6"/><path d="M17 17H8a4 4 0 0 1-4-4v-.6"/><path d="M9.6 4.4 7 7l2.6 2.6"/><path d="M14.4 19.6 17 17l-2.6-2.6"/>', size);
export const InstagramIcon = ({ size = 18 }: P) =>
  stroke('<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.1" cy="6.9" r="1.1" fill="currentColor"/>', size);
export const TiktokIcon = ({ size = 18 }: P) =>
  stroke('<path d="M14.4 3.6v10.2a3.9 3.9 0 1 1-3.9-3.9"/><path d="M14.4 6.3a4.8 4.8 0 0 0 4.5 3.2"/>', size);
export const SnapchatIcon = ({ size = 18 }: P) =>
  stroke('<path d="M12 3.8c2.5 0 4 1.8 4 4.2 0 1 .1 1.9-.2 2.5.5.3 1 .2 1.5.1.5 1-.6 1.4-1.4 1.8.4 1.5 1.8 2.6 3.1 2.9.2.6-1.4 1.2-2.6 1.3-.2.4-.2 1-.5 1.1-.8.2-1.9-.4-3 .1-.9.4-1.5 1.4-2.9 1.4s-2-1-2.9-1.4c-1.1-.5-2.2.1-3-.1-.3-.1-.3-.7-.5-1.1-1.2-.1-2.8-.7-2.6-1.3 1.3-.3 2.7-1.4 3.1-2.9-.8-.4-1.9-.8-1.4-1.8.5.1 1 .2 1.5-.1-.3-.6-.2-1.5-.2-2.5 0-2.4 1.5-4.2 4-4.2z"/>', size);
export const XIcon = ({ size = 18 }: P) =>
  stroke('<path d="M4.4 4.4 19.6 19.6"/><path d="M19.6 4.4 4.4 19.6"/>', size, undefined, 1.9);
export const SortIcon = ({ size = 14 }: P) => stroke('<path d="M6 7h12M8 12h8M10.5 17h3"/>', size);
export const NoteIcon = ({ size = 28 }: P) =>
  stroke('<path d="M9.4 17.6V6.3l9.8-2v11"/><circle cx="6.9" cy="17.6" r="2.5"/><circle cx="16.7" cy="15.3" r="2.5"/>', size);
export const ArrowOutIcon = ({ size = 21 }: P) => stroke('<path d="M7 17 17 7"/><path d="M8.6 7H17v8.4"/>', size);
export const WhatsAppIcon = ({ size = 24 }: P) =>
  stroke('<path d="M20.4 11.6a8.4 8.4 0 0 1-12.5 7.3L3.6 20.4l1.5-4.2A8.4 8.4 0 1 1 20.4 11.6z"/><path d="M9.2 9.2c.3-.7.6-.7.9-.7h.5c.2 0 .5 0 .7.6l.7 1.6c.1.3 0 .5-.1.7l-.4.5c-.1.2-.2.3 0 .6a6.2 6.2 0 0 0 2.6 2.2c.3.1.5.1.7-.1l.5-.6c.2-.2.4-.2.6-.1l1.5.8c.3.2.4.4.3.7a2.1 2.1 0 0 1-1.9 1.4c-.9 0-3.3-.9-5-2.9-1.4-1.6-1.9-3-1.9-3.8a2.4 2.4 0 0 1 .3-.9z"/>', size);
export const LockIcon = ({ size = 22 }: P) =>
  stroke('<rect x="4.8" y="10.3" width="14.4" height="9.7" rx="2.6"/><path d="M8.4 10.3V7.9a3.6 3.6 0 0 1 7.2 0v2.4"/>', size);
export const PlusIcon = ({ size = 18 }: P) => stroke('<path d="M12 5v14M5 12h14"/>', size);
export const UserIcon = ({ size = 18 }: P) =>
  stroke('<circle cx="12" cy="8.4" r="3.8"/><path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0"/>', size);
export const TrashIcon = ({ size = 17 }: P) =>
  stroke('<path d="M4.5 7h15"/><path d="M9.2 7V5.6A1.6 1.6 0 0 1 10.8 4h2.4a1.6 1.6 0 0 1 1.6 1.6V7"/><path d="M6.6 7l.8 11.3A2 2 0 0 0 9.4 20.2h5.2a2 2 0 0 0 2-1.9L17.4 7"/>', size);
export const PencilIcon = ({ size = 17 }: P) =>
  stroke('<path d="M4.2 20.1 8.6 19 18.9 8.7a2 2 0 0 0 0-2.8l-.8-.8a2 2 0 0 0-2.8 0L5 15.4z"/><path d="M14.4 6.9l2.7 2.7"/>', size);
export const EyeIcon = ({ size = 17 }: P) =>
  stroke('<path d="M2.6 12S6.1 5.7 12 5.7 21.4 12 21.4 12 17.9 18.3 12 18.3 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="3"/>', size);
export const EyeOffIcon = ({ size = 17 }: P) =>
  stroke('<path d="M4 4l16 16"/><path d="M9.8 6A9.3 9.3 0 0 1 12 5.7c5.9 0 9.4 6.3 9.4 6.3a17.4 17.4 0 0 1-3.2 3.9"/><path d="M6.4 8.2A17.2 17.2 0 0 0 2.6 12S6.1 18.3 12 18.3a9.2 9.2 0 0 0 3.5-.7"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>', size);
export const PinIcon = ({ size = 17 }: P) =>
  stroke('<path d="M9.2 3.6h5.6l-.7 5.1 2.9 2.6-.2 1.7H6.2L6 11.3l2.9-2.6z"/><path d="M12 13v7.4"/>', size);
export const GripIcon = ({ size = 18 }: P) =>
  stroke('<path d="M9 6.5h.01M15 6.5h.01M9 12h.01M15 12h.01M9 17.5h.01M15 17.5h.01"/>', size, undefined, 2.4);
export const ImageIcon = ({ size = 16 }: P) =>
  stroke('<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.6"/><circle cx="8.9" cy="10" r="1.7"/><path d="M4.2 17.3 9 12.6l3.4 3.3 3.1-3 4.3 4.4"/>', size);
export const ChevronUpIcon = ({ size = 16 }: P) => stroke('<path d="M6 15l6-6 6 6"/>', size, undefined, 2);
export const ChevronDownIcon = ({ size = 16 }: P) => stroke('<path d="M6 9l6 6 6-6"/>', size, undefined, 2);

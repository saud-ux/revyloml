import { InstagramIcon, SnapchatIcon, TiktokIcon, XIcon } from "./Icons";

/**
 * Where else to find him, under his name on the public page.
 *
 * The addresses are built here from stored handles rather than stored whole, so
 * a link on this page can only ever point at the account it says it does.
 */
const SITES = [
  { key: "instagram", label: "Instagram", icon: InstagramIcon, at: (h: string) => `https://instagram.com/${h}` },
  { key: "tiktok", label: "TikTok", icon: TiktokIcon, at: (h: string) => `https://tiktok.com/@${h}` },
  { key: "snapchat", label: "Snapchat", icon: SnapchatIcon, at: (h: string) => `https://snapchat.com/add/${h}` },
  { key: "x", label: "X", icon: XIcon, at: (h: string) => `https://x.com/${h}` },
] as const;

export function SocialLinks({ social }: { social: Record<string, string> }) {
  const shown = SITES.filter((s) => social[s.key]?.trim());
  if (!shown.length) return null;

  return (
    <nav className="social" aria-label="Links">
      {shown.map(({ key, label, icon: Icon, at }) => (
        <a
          key={key}
          className="social__link"
          href={at(social[key].trim())}
          target="_blank"
          rel="noopener noreferrer me"
          aria-label={`${label}: @${social[key].trim()}`}
        >
          <Icon />
        </a>
      ))}
    </nav>
  );
}

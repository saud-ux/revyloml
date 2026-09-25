import QRCode from "qrcode";
import { QrIcon } from "@/components/Icons";
import type { Dict } from "@/lib/i18n";

/**
 * A scannable code for the public page, to put in a story or on a poster.
 *
 * Dark squares on a white tile rather than the site's own colours: the accent
 * green on white is nowhere near the contrast a scanner needs, and a code that
 * looks right and reads badly is worse than one that simply looks plain.
 *
 * Rendered here on the server, so the panel needs no client code at all and the
 * download is an ordinary link to the image.
 */
export async function QrPanel({ url, dict }: { url: string; dict: Dict }) {
  const png = await QRCode.toDataURL(url, {
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#000000ff", light: "#ffffffff" },
  });

  return (
    <section className="card">
      <h2 className="card__title">
        <QrIcon /> {dict.qrTitle}
      </h2>
      <p className="card__body">{dict.qrBody}</p>

      <div className="qr">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={png} alt={dict.qrTitle} width={168} height={168} />
      </div>

      <a className="btn btn--secondary" href={png} download="revyloml-qr.png">
        {dict.qrDownload}
      </a>
    </section>
  );
}

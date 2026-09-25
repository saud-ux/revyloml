import { checkStorage } from "@/lib/storage";
import { fill, type Dict } from "@/lib/i18n";

/**
 * Says why uploads are failing, on the page where someone is trying to upload.
 * Without this a missing bucket looks like a broken app: every upload fails and
 * nothing says which of four settings is wrong.
 */
export async function StorageWarning({ dict }: { dict: Dict }) {
  const health = await checkStorage();
  if (health.ok) return null;

  const detail =
    health.reason === "no-bucket"
      ? fill(dict.storageNoBucket, { bucket: health.bucket ?? "media" })
      : health.reason === "unauthorized"
        ? dict.storageUnauthorized
        : dict.storageUnreachable;

  return (
    <aside className="warning" role="alert">
      <strong className="warning__title">{dict.storageBad}</strong>
      <span>{detail}</span>
    </aside>
  );
}

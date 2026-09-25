import "server-only";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

const scrypt = promisify(scryptCb) as (
  password: string, salt: Buffer, keylen: number,
) => Promise<Buffer>;

const COOKIE = "revylo_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Two people share this admin, so there is still no user table and no auth
 * library: passwords live in the environment and the session is an
 * HMAC-signed cookie carrying whose it is.
 *
 * Ways to set a password:
 *   ADMIN_PASSWORD_HASH  a scrypt hash from `npm run hash-password` (preferred)
 *   ADMIN_PASSWORD       the password itself, hashed at boot
 *   ADMIN_PASSWORD_2     a second person's password, with ADMIN_NAME_2
 *
 * The names, ADMIN_NAME and ADMIN_NAME_2, are only labels: they say who last
 * touched a song. Nobody has powers the other lacks, because nobody asked for
 * that and a permission system for two friends is a permission system nobody
 * maintains.
 *
 * The plain variable exists because setting this up from a phone means typing
 * into a hosting dashboard with no terminal to hash anything. It is weaker only
 * against someone who can already read the deployment's environment — and that
 * person can read DATABASE_URL too, so the practical gap is small.
 */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

const sameString = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Whoever the password belongs to, or null when it belongs to nobody. */
export async function checkAdminPassword(password: string): Promise<string | null> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash && (await verifyPassword(password, hash))) {
    return process.env.ADMIN_NAME?.trim() || "المدير";
  }

  const first = process.env.ADMIN_PASSWORD;
  if (first && sameString(password, first)) {
    return process.env.ADMIN_NAME?.trim() || "المدير";
  }

  const second = process.env.ADMIN_PASSWORD_2;
  if (second && sameString(password, second)) {
    return process.env.ADMIN_NAME_2?.trim() || "الثاني";
  }

  return null;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  // Constant time: a length-dependent early return would leak the hash length.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function createSession(name: string): Promise<void> {
  const expires = Date.now() + MAX_AGE * 1000;
  // The name rides inside the signed payload, so it cannot be edited into
  // somebody else's without the secret.
  const payload = `${expires}~${encodeURIComponent(name)}`;
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** Who is signed in, or null. The name is only as trusted as the signature. */
export async function currentAdmin(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, mac] = raw.split(".");
  if (!payload || !mac) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  const [expiresRaw, nameRaw = ""] = payload.split("~");
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires <= Date.now()) return null;
  return decodeURIComponent(nameRaw) || "المدير";
}

/** True when the request carries a valid, unexpired session cookie. */
export async function isSignedIn(): Promise<boolean> {
  return (await currentAdmin()) !== null;
}

/** Admin writes are refused outright when the deployment has no password set. */
export function adminConfigured(): boolean {
  const hasPassword = Boolean(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD);
  return hasPassword && Boolean(process.env.SESSION_SECRET);
}

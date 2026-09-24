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
 * One person signs in here, so there is no user table and no auth library: the
 * password lives in the environment and the session is an HMAC-signed cookie.
 *
 * Two ways to set the password:
 *   ADMIN_PASSWORD_HASH  a scrypt hash from `npm run hash-password` (preferred)
 *   ADMIN_PASSWORD       the password itself, hashed at boot
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

/** The configured password check, whichever variable supplied it. */
export async function checkAdminPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) return verifyPassword(password, hash);

  const plain = process.env.ADMIN_PASSWORD;
  if (!plain) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(plain);
  return a.length === b.length && timingSafeEqual(a, b);
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

export async function createSession(): Promise<void> {
  const expires = Date.now() + MAX_AGE * 1000;
  const payload = String(expires);
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

/** True when the request carries a valid, unexpired session cookie. */
export async function isSignedIn(): Promise<boolean> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [payload, mac] = raw.split(".");
  if (!payload || !mac) return false;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;

  const expires = Number(payload);
  return Number.isFinite(expires) && expires > Date.now();
}

/** Admin writes are refused outright when the deployment has no password set. */
export function adminConfigured(): boolean {
  const hasPassword = Boolean(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD);
  return hasPassword && Boolean(process.env.SESSION_SECRET);
}

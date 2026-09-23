import { createHash, timingSafeEqual } from "node:crypto";

// "A generic password for now" — one shared secret, no accounts, no
// sessions table. The cookie holds a hash of the password rather than the
// password itself, so it isn't sitting in plaintext in the browser or logs.
export const ADMIN_COOKIE_NAME = "admin_session";

function configuredPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "changeme";
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function expectedCookieValue(): string {
  return hash(configuredPassword());
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function checkPassword(candidate: string): boolean {
  return timingSafeStringEqual(hash(candidate), expectedCookieValue());
}

export function isAuthenticated(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  return timingSafeStringEqual(cookieValue, expectedCookieValue());
}

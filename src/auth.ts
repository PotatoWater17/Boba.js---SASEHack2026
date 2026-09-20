import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "userId";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

const INTERNAL_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/dashboard",
  "/find",
  "/friends",
  "/groups",
  "/meetings",
  "/profile",
  "/admin",
  "/match",
] as const;

export type SessionPayload = { userId: string; sessionVersion: number };

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }
  return "dev-session-secret-change-me";
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, SCRYPT);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function needsPasswordUpgrade(stored: string) {
  return !stored.startsWith("scrypt:");
}

function legacyHash(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, stored: string) {
  if (stored.startsWith("scrypt:")) {
    const parts = stored.split(":");
    if (parts.length !== 3) return false;
    const salt = Buffer.from(parts[1], "hex");
    const hash = Buffer.from(parts[2], "hex");
    const candidate = scryptSync(password, salt, 64, SCRYPT);
    if (hash.length !== candidate.length) return false;
    return timingSafeEqual(hash, candidate);
  }
  return safeEqual(legacyHash(password), stored);
}

export function normalizeSessionVersion(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function sessionPayload(userId: string, sessionVersion: number) {
  return `${userId}:${sessionVersion}`;
}

function signSession(userId: string, sessionVersion: number) {
  const version = normalizeSessionVersion(sessionVersion);
  const payload = sessionPayload(userId, version);
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function verifyLegacySession(payload: string, sig: string): SessionPayload | null {
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  if (!safeEqual(sig, expected)) return null;
  return { userId: payload, sessionVersion: 0 };
}

export function parseSession(token: string): SessionPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const colon = payload.indexOf(":");
  if (colon <= 0) return verifyLegacySession(payload, sig);

  const userId = payload.slice(0, colon);
  const sessionVersion = normalizeSessionVersion(Number(payload.slice(colon + 1)));
  if (!userId || !sig) return null;
  const expected = createHmac("sha256", sessionSecret()).update(sessionPayload(userId, sessionVersion)).digest("hex");
  if (!safeEqual(sig, expected)) return null;
  return { userId, sessionVersion };
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
  };
}

export async function setUser(userId: string, sessionVersion?: number | null) {
  (await cookies()).set(
    SESSION_COOKIE,
    signSession(userId, normalizeSessionVersion(sessionVersion)),
    sessionCookieOptions(),
  );
}

export async function clearUser() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return parseSession(raw);
}

/** @deprecated Prefer readSession + sessionVersion check in getMe. */
export async function readSessionUserId() {
  const session = await readSession();
  return session?.userId ?? null;
}

/** Allow only same-site app paths (blocks open redirects). */
export function safeNextPath(raw: string, fallback: string) {
  const next = (raw || fallback).trim();
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("\\") || next.includes("%5c") || next.includes("%2f%2f")) return fallback;
  const pathOnly = next.split("?")[0]?.split("#")[0] || "";
  const ok = INTERNAL_PREFIXES.some(
    (prefix) => pathOnly === prefix || (prefix !== "/" && pathOnly.startsWith(`${prefix}/`)),
  );
  return ok ? next : fallback;
}

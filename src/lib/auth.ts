import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_EXPIRES_DAYS = parseInt(
  (process.env.JWT_REFRESH_EXPIRES || "7d").replace("d", ""),
  10
);
export const REFRESH_COOKIE_NAME = "cinema_refresh";

export interface AccessTokenPayload {
  userId: string;
  role: string;
  tokenVersion: number;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_EXPIRES as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function randomToken(): string {
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = randomToken();
  // store a hashed reference so a DB leak can't be replayed directly
  const hashed = await bcrypt.hash(raw, 10);
  const expiresAt = new Date(
    Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000
  );
  await db.refreshToken.create({
    data: { token: hashed, userId, expiresAt },
  });
  return raw;
}

export async function rotateRefreshToken(
  rawToken: string
): Promise<{ userId: string; raw: string } | null> {
  if (!rawToken) return null;
  // find a matching, non-revoked, non-expired token
  const tokens = await db.refreshToken.findMany({
    where: { revoked: false, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
  let matched: (typeof tokens)[number] | null = null;
  for (const t of tokens) {
    if (await bcrypt.compare(rawToken, t.token)) {
      matched = t;
      break;
    }
  }
  if (!matched) return null;
  if (matched.user.banned) {
    await db.refreshToken.update({
      where: { id: matched.id },
      data: { revoked: true },
    });
    return null;
  }
  // invalidate old, issue new (rotation)
  await db.refreshToken.update({
    where: { id: matched.id },
    data: { revoked: true },
  });
  const fresh = await issueRefreshToken(matched.userId);
  return { userId: matched.userId, raw: fresh };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  if (!rawToken) return;
  const tokens = await db.refreshToken.findMany({
    where: { revoked: false },
  });
  for (const t of tokens) {
    if (await bcrypt.compare(rawToken, t.token)) {
      await db.refreshToken.update({
        where: { id: t.id },
        data: { revoked: true },
      });
      return;
    }
  }
}

export async function setRefreshCookie(raw: string) {
  const store = await cookies();
  store.set(REFRESH_COOKIE_NAME, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_EXPIRES_DAYS * 24 * 60 * 60,
  });
}

export async function clearRefreshCookie() {
  const store = await cookies();
  store.delete(REFRESH_COOKIE_NAME);
}

export async function getRefreshCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE_NAME)?.value;
}

/**
 * Resolve the current user from the Authorization header (access token).
 * Returns null if not authenticated or token version mismatch (revoked sessions).
 */
export async function getCurrentUser(): Promise<{
  id: string;
  username: string;
  email: string;
  role: string;
  avatar: string | null;
  language: string;
  theme: string;
  banned: boolean;
  tokenVersion: number;
} | null> {
  const store = await cookies();
  const authHeader =
    store.get("cinema_access")?.value ||
    (typeof Request !== "undefined" ? undefined : undefined);
  // We'll also accept header-based token via a helper below
  const token = authHeader;
  if (!token) return null;
  const payload = verifyAccessToken(token);
  if (!payload) return null;
  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (!user) return null;
  if (user.banned) return null;
  // tokenVersion bump invalidates old access tokens too
  if (user.tokenVersion !== payload.tokenVersion) return null;
  return user;
}

export async function getUserFromAuthHeader(
  authHeader?: string | null
): Promise<{
  id: string;
  username: string;
  email: string;
  role: string;
  avatar: string | null;
  language: string;
  theme: string;
  banned: boolean;
  tokenVersion: number;
} | null> {
  if (!authHeader) return null;
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;
  const payload = verifyAccessToken(token);
  if (!payload) return null;
  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.banned) return null;
  if (user.tokenVersion !== payload.tokenVersion) return null;
  return user;
}

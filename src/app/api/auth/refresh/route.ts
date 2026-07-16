import { db } from "@/lib/db";
import {
  rotateRefreshToken,
  signAccessToken,
  setRefreshCookie,
  getRefreshCookie,
  clearRefreshCookie,
} from "@/lib/auth";
import { ok, fail } from "@/lib/response";

export async function POST() {
  const raw = await getRefreshCookie();
  if (!raw) return fail("No refresh token", 401);

  const rotated = await rotateRefreshToken(raw);
  if (!rotated) {
    await clearRefreshCookie();
    return fail("Invalid or expired refresh token", 401);
  }

  const user = await db.user.findUnique({ where: { id: rotated.userId } });
  if (!user || user.banned) {
    await clearRefreshCookie();
    return fail("Invalid session", 401);
  }

  await setRefreshCookie(rotated.raw);
  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  return ok({
    accessToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio,
      language: user.language,
      theme: user.theme,
    },
  });
}

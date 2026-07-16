import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  comparePassword,
  signAccessToken,
  issueRefreshToken,
  setRefreshCookie,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { ok, fail } from "@/lib/response";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 10, 60_000);
  if (!rl.ok) return fail("Too many requests. Try again later.", 429);

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid email or password");

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return fail("Invalid email or password", 401);
  if (user.banned) return fail("This account has been banned", 403);

  const valid = await comparePassword(password, user.password);
  if (!valid) return fail("Invalid email or password", 401);

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });
  const refresh = await issueRefreshToken(user.id);
  await setRefreshCookie(refresh);

  return ok({
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
    accessToken,
  });
}

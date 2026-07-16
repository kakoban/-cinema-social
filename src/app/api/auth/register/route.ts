import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, signAccessToken, issueRefreshToken, setRefreshCookie, getCurrentUser } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { ok, fail } from "@/lib/response";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 10, 60_000);
  if (!rl.ok) return fail("Too many requests. Try again later.", 429);

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || "Invalid input");
  }
  const { username, email, password } = parsed.data;

  const exists = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (exists) {
    if (exists.email === email) return fail("Email already registered", 409);
    return fail("Username already taken", 409);
  }

  const hashed = await hashPassword(password);
  const user = await db.user.create({
    data: { username, email, password: hashed },
  });

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

export async function GET() {
  // current user profile
  const user = await getCurrentUser();
  if (!user) return ok(null);
  return ok({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
    language: user.language,
    theme: user.theme,
  });
}

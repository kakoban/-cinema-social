import { NextRequest } from "next/server";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok } from "@/lib/response";

export async function GET(req: NextRequest) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
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

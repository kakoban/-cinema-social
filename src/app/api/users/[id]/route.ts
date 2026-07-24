import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { profileSchema, isAllowedVideoUrl } from "@/lib/validation";
import { ok, notFound, unauthorized, fail } from "@/lib/response";

async function findUser(idOrUsername: string) {
  return (
    (await db.user.findUnique({ where: { id: idOrUsername } })) ||
    (await db.user.findUnique({ where: { username: idOrUsername } }))
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await findUser(id);
  if (!user) return notFound("User not found");

  const me = await getUserFromAuthHeader(req.headers.get("authorization"));
  const isFollowing = me
    ? !!(await db.follow.findUnique({
        where: {
          followerId_followingId: { followerId: me.id, followingId: user.id },
        },
      }))
    : false;

  const [reviewCount, followersCount, followingCount] = await Promise.all([
    db.review.count({ where: { userId: user.id } }),
    db.follow.count({ where: { followingId: user.id } }),
    db.follow.count({ where: { followerId: user.id } }),
  ]);

  return ok({
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    bio: user.bio,
    role: user.role,
    language: user.language,
    theme: user.theme,
    createdAt: user.createdAt,
    watchHours: user.watchHours,
    reviewCount,
    followersCount,
    followingCount,
    isFollowing,
    isMe: me?.id === user.id,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!me) return unauthorized();
  const { id } = await params;
  if (me.id !== id && me.role !== "ADMIN") return fail("Forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message || "Invalid input");

  const data: Record<string, unknown> = {};
  if (parsed.data.avatar !== undefined) data.avatar = parsed.data.avatar || null;
  if (parsed.data.bio !== undefined) data.bio = parsed.data.bio || null;
  if (parsed.data.language) data.language = parsed.data.language;
  if (parsed.data.theme) data.theme = parsed.data.theme;
  if (parsed.data.username && parsed.data.username !== me.username) {
    const taken = await db.user.findUnique({
      where: { username: parsed.data.username },
    });
    if (taken) return fail("Username already taken", 409);
    data.username = parsed.data.username;
  }

  const updated = await db.user.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      avatar: true,
      bio: true,
      language: true,
      theme: true,
    },
  });
  return ok(updated);
}

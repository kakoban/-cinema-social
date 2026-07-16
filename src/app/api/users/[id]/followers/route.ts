import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, notFound } from "@/lib/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user =
    (await db.user.findUnique({ where: { id } })) ||
    (await db.user.findUnique({ where: { username: id } }));
  if (!user) return notFound("User not found");

  const follows = await db.follow.findMany({
    where: { followingId: user.id },
    include: {
      follower: {
        select: { id: true, username: true, avatar: true, bio: true },
      },
    },
  });
  return ok(follows.map((f) => f.follower));
}

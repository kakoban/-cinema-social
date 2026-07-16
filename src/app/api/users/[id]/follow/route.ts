import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, notFound, unauthorized, fail } from "@/lib/response";

async function findUser(idOrUsername: string) {
  return (
    (await db.user.findUnique({ where: { id: idOrUsername } })) ||
    (await db.user.findUnique({ where: { username: idOrUsername } }))
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!me) return unauthorized();
  const { id } = await params;
  const target = await findUser(id);
  if (!target) return notFound("User not found");
  if (target.id === me.id) return fail("Cannot follow yourself", 400);

  try {
    await db.follow.create({
      data: { followerId: me.id, followingId: target.id },
    });
  } catch {
    // already following — fine
  }

  await db.notification.create({
    data: {
      userId: target.id,
      actorId: me.id,
      type: "FOLLOW",
      content: `${me.username} started following you`,
      link: `#/profile/${me.username}`,
    },
  });

  return ok({ following: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!me) return unauthorized();
  const { id } = await params;
  const target = await findUser(id);
  if (!target) return notFound("User not found");

  await db.follow.deleteMany({
    where: { followerId: me.id, followingId: target.id },
  }).catch(() => null);

  return ok({ following: false });
}

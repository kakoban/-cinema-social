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

    await db.notification.create({
      data: {
        userId: target.id,
        actorId: me.id,
        type: "FOLLOW",
        content: `${me.username} started following you`,
        link: `#/profile/${me.username}`,
      },
    });

    // Notify via HTTP call to realtime service
    fetch(`http://localhost:3003/api/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: target.id,
        type: "FOLLOW",
        content: `${me.username} started following you`,
        link: `#/profile/${me.username}`,
      }),
    }).catch(e => console.error("Realtime notify failed:", e));

  } catch {
    // already following — fine
  }

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

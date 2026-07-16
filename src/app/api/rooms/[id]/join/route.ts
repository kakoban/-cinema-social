import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, notFound, unauthorized, fail } from "@/lib/response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();
  if (user.banned) return fail("Banned users cannot join rooms", 403);
  const { id } = await params;

  const room = await db.room.findUnique({
    where: { id },
    include: { _count: { select: { members: true } } },
  });
  if (!room) return notFound("Room not found");

  // If already a member, do nothing (preserves HOST role)
  const existing = await db.roomMember.findUnique({
    where: { userId_roomId: { userId: user.id, roomId: id } },
  });
  if (existing) return ok({ joined: true, alreadyMember: true });

  if (room._count.members >= room.maxUsers) return fail("This room is full", 403);

  await db.roomMember.create({
    data: { userId: user.id, roomId: id, role: "VIEWER" },
  });

  return ok({ joined: true });
}

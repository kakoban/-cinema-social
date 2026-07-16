import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, notFound, unauthorized } from "@/lib/response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();
  const { id } = await params;
  const room = await db.room.findUnique({ where: { id } });
  if (!room) return notFound("Room not found");

  await db.roomMember.deleteMany({
    where: { userId: user.id, roomId: id },
  });

  const remaining = await db.roomMember.count({ where: { roomId: id } });
  if (remaining === 0) {
    // auto-delete empty room
    await db.room.delete({ where: { id } }).catch(() => null);
    return ok({ left: true, roomDeleted: true });
  }

  return ok({ left: true, roomDeleted: false });
}

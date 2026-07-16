import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound } from "@/lib/response";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();
  const { id } = await params;
  const room = await db.room.findUnique({ where: { id } });
  if (!room) return notFound("Room not found");
  await db.room.delete({ where: { id } });
  return ok({ ok: true });
}

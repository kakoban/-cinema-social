import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, notFound, unauthorized } from "@/lib/response";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();
  const { id } = await params;
  const notif = await db.notification.findUnique({ where: { id } });
  if (!notif) return notFound("Notification not found");
  if (notif.userId !== user.id) return Response.json({ success: false, error: "Forbidden" }, { status: 403 });

  await db.notification.update({ where: { id }, data: { isRead: true } });
  return ok({ ok: true });
}

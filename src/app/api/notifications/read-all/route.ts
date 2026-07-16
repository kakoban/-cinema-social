import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function PUT(req: NextRequest) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();

  await db.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
  return ok({ ok: true });
}

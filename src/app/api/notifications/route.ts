import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();

  const [items, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: { select: { id: true, username: true, avatar: true } },
      },
    }),
    db.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return ok({ items, unreadCount });
}

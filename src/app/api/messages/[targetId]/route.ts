import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ targetId: string }> }
) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();

  const { targetId } = await params;

  // Get messages between these two users
  const messages = await db.message.findMany({
    where: {
      type: "DIRECT",
      OR: [
        { userId: user.id, receiverId: targetId },
        { userId: targetId, receiverId: user.id }
      ]
    },
    orderBy: { createdAt: "asc" },
  });

  return ok(messages.map(m => ({
    id: m.id,
    senderId: m.userId,
    receiverId: m.receiverId,
    content: m.content,
    createdAt: m.createdAt,
  })));
}
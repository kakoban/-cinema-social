import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();

  // Find all messages sent or received by this user
  const messages = await db.message.findMany({
    where: {
      type: "DIRECT",
      OR: [
        { userId: user.id },
        { receiverId: user.id }
      ]
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      receiver: { select: { id: true, username: true, avatar: true } }
    }
  });

  // Group by conversation partner
  const conversationsMap = new Map();

  for (const msg of messages) {
    if (!msg.receiverId || !msg.userId) continue;

    const partnerId = msg.userId === user.id ? msg.receiverId : msg.userId;
    const partnerInfo = msg.userId === user.id ? msg.receiver! : msg.user!;

    if (!conversationsMap.has(partnerId)) {
      conversationsMap.set(partnerId, {
        userId: partnerId,
        username: partnerInfo.username,
        avatar: partnerInfo.avatar,
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt,
      });
    }
  }

  const conversations = Array.from(conversationsMap.values())
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return ok(conversations);
}
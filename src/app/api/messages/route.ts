import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/response";

export async function POST(req: NextRequest) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body || !body.receiverId || !body.content) return fail("Missing receiverId or content");

  const receiver = await db.user.findUnique({ where: { id: body.receiverId } });
  if (!receiver) return fail("Receiver not found", 404);

  const msg = await db.message.create({
    data: {
      userId: user.id,
      receiverId: body.receiverId,
      content: body.content,
      type: "DIRECT",
    }
  });

  // Send notification to the receiver
  await db.notification.create({
    data: {
      userId: body.receiverId,
      actorId: user.id,
      type: "SYSTEM", // Using SYSTEM or a new DM type
      content: `New message from ${user.username}`,
      link: `#/messages/${user.username}`,
    }
  });

  // Realtime notify
  fetch(`http://localhost:3003/api/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: body.receiverId,
      type: "SYSTEM",
      content: `New message from ${user.username}`,
      link: `#/messages/${user.username}`,
    }),
  }).catch(() => null);

  return ok({ msg: {
    id: msg.id,
    senderId: msg.userId,
    receiverId: msg.receiverId,
    content: msg.content,
    createdAt: msg.createdAt,
  } });
}
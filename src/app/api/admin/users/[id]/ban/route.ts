import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound, fail } from "@/lib/response";

async function requireAdmin(req: NextRequest) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return { error: unauthorized(), user: null };
  if (user.role !== "ADMIN") return { error: forbidden(), user: null };
  return { error: null, user };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAdmin(req);
  if (error || !user) return error;
  const { id } = await params;
  if (id === user.id) return fail("Cannot ban yourself", 400);

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return notFound("User not found");

  // bump tokenVersion to invalidate all sessions
  await db.user.update({
    where: { id },
    data: { banned: true, tokenVersion: { increment: 1 } },
  });
  // revoke all refresh tokens
  await db.refreshToken.updateMany({
    where: { userId: id, revoked: false },
    data: { revoked: true },
  });
  return ok({ ok: true, banned: true });
}

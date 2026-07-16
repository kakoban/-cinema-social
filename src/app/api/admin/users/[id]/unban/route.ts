import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound } from "@/lib/response";

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
  const { error } = await requireAdmin(req);
  if (error) return error;
  const { id } = await params;
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return notFound("User not found");

  await db.user.update({ where: { id }, data: { banned: false } });
  return ok({ ok: true, banned: false });
}

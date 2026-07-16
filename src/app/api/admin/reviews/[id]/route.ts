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
  const review = await db.review.findUnique({ where: { id } });
  if (!review) return notFound("Review not found");
  await db.review.delete({ where: { id } });
  return ok({ ok: true });
}

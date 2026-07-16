import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { reviewSchema } from "@/lib/validation";
import { ok, fail, unauthorized, notFound, forbidden } from "@/lib/response";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();
  const { id } = await params;

  const review = await db.review.findUnique({ where: { id } });
  if (!review) return notFound("Review not found");
  if (review.userId !== user.id && user.role !== "ADMIN")
    return forbidden("Not your review");

  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.partial().safeParse(body);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message || "Invalid input");

  const updated = await db.review.update({
    where: { id },
    data: {
      ...(parsed.data.content !== undefined ? { content: parsed.data.content } : {}),
      ...(parsed.data.rating !== undefined ? { rating: parsed.data.rating } : {}),
    },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
    },
  });
  return ok(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();
  const { id } = await params;

  const review = await db.review.findUnique({ where: { id } });
  if (!review) return notFound("Review not found");
  if (review.userId !== user.id && user.role !== "ADMIN")
    return forbidden("Not your review");

  await db.review.delete({ where: { id } });
  return ok({ ok: true });
}

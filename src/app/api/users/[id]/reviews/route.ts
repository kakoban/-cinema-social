import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, notFound } from "@/lib/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user =
    (await db.user.findUnique({ where: { id } })) ||
    (await db.user.findUnique({ where: { username: id } }));
  if (!user) return notFound("User not found");

  const reviews = await db.review.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      movie: {
        select: { id: true, title: true, poster: true, year: true },
      },
    },
  });
  return ok(reviews);
}

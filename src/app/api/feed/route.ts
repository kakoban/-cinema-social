import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = 10;

  // reviews from users I follow
  const following = await db.follow.findMany({
    where: { followerId: user.id },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  if (!followingIds.length) return ok({ items: [], page, totalPages: 0 });

  const [items, total] = await Promise.all([
    db.review.findMany({
      where: { userId: { in: followingIds } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        movie: {
          select: { id: true, title: true, poster: true, year: true },
        },
      },
    }),
    db.review.count({ where: { userId: { in: followingIds } } }),
  ]);

  return ok({
    items,
    page,
    totalPages: Math.ceil(total / pageSize),
  });
}

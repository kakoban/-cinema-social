import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { reviewSchema } from "@/lib/validation";
import { ok, fail, unauthorized } from "@/lib/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const reviews = await db.review.findMany({
      where: { movieId: id },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });
    return ok(reviews);
  } catch (e) {
    return ok([]);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();
  const { id: movieId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message || "Invalid review");

  const existing = await db.review.findUnique({
    where: { userId_movieId: { userId: user.id, movieId } },
  });
  if (existing) return fail("You already reviewed this movie", 409);

  const review = await db.review.create({
    data: {
      content: parsed.data.content,
      rating: parsed.data.rating,
      userId: user.id,
      movieId,
    },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
    },
  });

  // notify followers of this user
  const followers = await db.follow.findMany({
    where: { followingId: user.id },
    select: { followerId: true },
  });
  if (followers.length) {
    const movie = await db.movie.findUnique({ where: { id: movieId } });
    await db.notification.createMany({
      data: followers.map((f) => ({
        userId: f.followerId,
        actorId: user.id,
        type: "REVIEW",
        content: `${user.username} reviewed ${movie?.title || "a movie"}`,
        link: `#/movie/${movieId}`,
      })),
    });

    // Notify via realtime
    for (const f of followers) {
      fetch(`http://localhost:3003/api/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: f.followerId,
          type: "REVIEW",
          content: `${user.username} reviewed ${movie?.title || "a movie"}`,
          link: `#/movie/${movieId}`,
        }),
      }).catch(() => null);
    }
  }

  return ok(review);
}

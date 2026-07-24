import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET(req: NextRequest) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();

  // Basic collaborative filtering / content-based logic
  // 1. Get user's highly rated movies (rating >= 7)
  const userLikedReviews = await db.review.findMany({
    where: { userId: user.id, rating: { gte: 7 } },
    select: { movieId: true }
  });
  const likedMovieIds = userLikedReviews.map(r => r.movieId);

  // 2. Get user's watchlisted movies
  const watchlistItems = await db.watchlistItem.findMany({
    where: { watchlist: { userId: user.id } },
    select: { movieId: true }
  });
  const watchlistMovieIds = watchlistItems.map(w => w.movieId);

  const seenIds = new Set([...likedMovieIds, ...watchlistMovieIds]);

  let recommendations: any[] = [];

  if (seenIds.size > 0) {
    // Recommend highly rated movies not seen by user
    recommendations = await db.movie.findMany({
      where: {
        id: { notIn: Array.from(seenIds) },
        rating: { gte: 6.5 }
      },
      orderBy: { rating: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        poster: true,
        year: true,
        rating: true,
        source: true
      }
    });
  }

  // Fallback: If not enough data, just return recent popular movies
  if (recommendations.length < 5) {
    const popular = await db.movie.findMany({
      where: {
        id: { notIn: Array.from(seenIds) }
      },
      orderBy: { rating: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        poster: true,
        year: true,
        rating: true,
        source: true
      }
    });

    // Merge without duplicates
    const existingIds = new Set(recommendations.map(r => r.id));
    for (const p of popular) {
      if (!existingIds.has(p.id)) {
        recommendations.push(p);
        existingIds.add(p.id);
      }
    }
  }

  return ok(recommendations.slice(0, 10));
}
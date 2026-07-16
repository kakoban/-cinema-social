import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureMovieFromTmdb, tmdbTrailer } from "@/lib/tmdb";
import { ensureMovieFromArchive } from "@/lib/archive";
import { ok, notFound } from "@/lib/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Try local DB first (could be a cuid or a tmdb id)
  let movie = await db.movie.findUnique({ where: { id } });
  if (!movie) {
    // maybe it's a tmdbId numeric
    const tmdbId = parseInt(id, 10);
    if (!isNaN(tmdbId)) {
      movie = await ensureMovieFromTmdb(tmdbId);
    }
  }
  if (!movie) {
    // maybe an archive identifier
    movie = await ensureMovieFromArchive(id);
  }
  if (!movie) return notFound("Movie not found");

  // If TMDB source and no trailer yet, try to fetch
  if (movie.tmdbId && !movie.trailerUrl) {
    const trailer = await tmdbTrailer(movie.tmdbId);
    if (trailer) {
      movie = await db.movie.update({
        where: { id: movie.id },
        data: { trailerUrl: trailer },
      });
    }
  }

  // aggregate local review stats
  const reviews = await db.review.findMany({
    where: { movieId: movie.id },
    select: { rating: true },
  });
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  return ok({ ...movie, avgRating, reviewCount: reviews.length });
}

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureMovieFromTmdb, tmdbTrailer } from "@/lib/tmdb";
import { ensureMovieFromArchive } from "@/lib/archive";
import { ensureMovieFromYoutube } from "@/lib/youtube";
import { ensureMovieFromVimeo } from "@/lib/vimeo";
import { ok, notFound } from "@/lib/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let movie: any = null;

    // Try local DB first (cuid)
    try {
      movie = await db.movie.findUnique({ where: { id } });
    } catch (e) {
      console.warn("DB findUnique failed, trying dynamic providers");
    }

    if (!movie) {
      if (id.startsWith('yt_')) {
        movie = await ensureMovieFromYoutube(id);
      } else if (id.startsWith('vim_')) {
        movie = await ensureMovieFromVimeo(id);
      } else {
        const tmdbId = parseInt(id, 10);
        if (!isNaN(tmdbId)) {
          movie = await ensureMovieFromTmdb(tmdbId);
        }
        if (!movie) {
          movie = await ensureMovieFromArchive(id);
        }
      }
    }

    if (!movie) return notFound("Movie not found");

    // aggregate local review stats
    let reviews: any[] = [];
    try {
      reviews = await db.review.findMany({
        where: { movieId: movie.id },
        select: { rating: true },
      });
    } catch (e) {
      /* ignore db error for reviews */
    }
    const avgRating = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

    return ok({ ...movie, avgRating, reviewCount: reviews.length });
  } catch (error: any) {
    console.error("GET /api/movies/[id] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

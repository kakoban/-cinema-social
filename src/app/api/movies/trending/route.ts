import { NextRequest } from "next/server";
import { tmdbTrending, POSTER, BACKDROP, hasTmdbKey } from "@/lib/tmdb";
import { ok } from "@/lib/response";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);

  if (!hasTmdbKey()) {
    return ok({ results: [], configured: false });
  }

  const movies = await tmdbTrending(page);
  const results = movies.map((m) => ({
    tmdbId: m.id,
    title: m.title,
    poster: POSTER(m.poster_path),
    backdrop: BACKDROP(m.backdrop_path),
    description: m.overview,
    year: m.release_date ? new Date(m.release_date).getFullYear() : null,
    rating: m.vote_average,
    source: "TMDB",
  }));

  return ok({ results, configured: true });
}

import { NextRequest } from "next/server";
import { tmdbSearch, POSTER, BACKDROP } from "@/lib/tmdb";
import { ok } from "@/lib/response";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 10, 60_000);
  if (!rl.ok) return ok({ results: [], total: 0, page: 1, totalPages: 0 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  if (!q.trim()) return ok({ results: [], total: 0, page, totalPages: 0 });

  const data = await tmdbSearch(q, page);
  const results = data.results.map((m) => ({
    tmdbId: m.id,
    title: m.title,
    poster: POSTER(m.poster_path),
    backdrop: BACKDROP(m.backdrop_path),
    description: m.overview,
    year: m.release_date ? new Date(m.release_date).getFullYear() : null,
    rating: m.vote_average,
    source: "TMDB",
  }));

  return ok({
    results,
    total: data.total_results,
    page: data.page,
    totalPages: data.total_pages,
  });
}

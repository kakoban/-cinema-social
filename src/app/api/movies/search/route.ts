import { NextRequest } from "next/server";
import { ok } from "@/lib/response";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { youtubeSearch } from "@/lib/youtube";
import { vimeoSearch } from "@/lib/vimeo";
import { tmdbSearch, POSTER, BACKDROP } from "@/lib/tmdb";
import { archiveSearch } from "@/lib/archive";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 10, 60_000);
  if (!rl.ok) return ok({ results: [], total: 0, page: 1, totalPages: 0 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const source = searchParams.get("source") || "tmdb";

  if (!q.trim()) return ok({ results: [], total: 0, page, totalPages: 0 });

  let results: any[] = [];
  let total = 0;
  let totalPages = 0;

  if (source === "youtube") {
    const data = await youtubeSearch(q, 20);
    results = data.results;
    total = results.length;
    totalPages = 1;
  } else if (source === "vimeo") {
    const data = await vimeoSearch(q, 20);
    results = data.results;
    total = results.length;
    totalPages = 1;
  } else if (source === "archive") {
    const data = await archiveSearch(q, page);
    results = data.results;
    total = data.total;
    totalPages = Math.ceil(data.total / 50);
  } else {
    // TMDB default
    const data = await tmdbSearch(q, page);
    results = data.results.map((m) => ({
      tmdbId: m.id,
      title: m.title,
      poster: POSTER(m.poster_path),
      backdrop: BACKDROP(m.backdrop_path),
      description: m.overview,
      year: m.release_date ? new Date(m.release_date).getFullYear() : null,
      rating: m.vote_average,
      source: "TMDB",
    }));
    total = data.total_results;
    totalPages = data.total_pages;
  }

  return ok({ results, total, page, totalPages });
}

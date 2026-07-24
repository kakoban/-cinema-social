// TMDB (The Movie Database) client
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_KEY = process.env.TMDB_API_KEY || "";

export const TMDB_IMG = "https://image.tmdb.org/t/p";
export const POSTER = (path: string | null) =>
  path ? `${TMDB_IMG}/w500${path}` : null;
export const BACKDROP = (path: string | null) =>
  path ? `${TMDB_IMG}/w780${path}` : null;

export const hasTmdbKey = () => Boolean(TMDB_KEY);

async function tmdbFetch(path: string, params: Record<string, string | number> = {}) {
  if (!TMDB_KEY) return null;
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_KEY);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  vote_average: number | null;
  genre_ids?: number[];
  runtime?: number;
  genres?: { id: number; name: string }[];
}

export interface TmdbResult {
  page: number;
  results: TmdbMovie[];
  total_pages: number;
  total_results: number;
}

export async function tmdbTrending(page = 1): Promise<TmdbMovie[]> {
  const data = await tmdbFetch("/trending/movie/week", { page });
  return data?.results ?? [];
}

export async function tmdbSearch(query: string, page = 1): Promise<TmdbResult> {
  const data = await tmdbFetch("/search/movie", { query, page });
  return (
    data ?? { page, results: [], total_pages: 0, total_results: 0 }
  );
}

export async function tmdbDetail(id: number): Promise<TmdbMovie | null> {
  return tmdbFetch(`/movie/${id}`);
}

export async function tmdbTrailer(id: number): Promise<string | null> {
  const data = await tmdbFetch(`/movie/${id}/videos`);
  if (!data?.results) return null;
  const yt = data.results.find(
    (v: { site: string; type: string; key: string }) =>
      v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
  );
  return yt?.key ? `https://www.youtube.com/watch?v=${yt.key}` : null;
}

// Ensure a Movie row exists in our DB for a TMDB id (upsert by tmdbId)
export async function ensureMovieFromTmdb(
  tmdbId: number
) {
  const { db } = await import("./db");
  const existing = await db.movie.findUnique({ where: { tmdbId } });
  if (existing) return existing;
  const detail = await tmdbDetail(tmdbId);
  if (!detail) return null;
  const genre = detail.genres?.map((g) => g.name).join(", ") || null;
  const year = detail.release_date
    ? new Date(detail.release_date).getFullYear()
    : null;
  return db.movie.create({
    data: {
      tmdbId: detail.id,
      title: detail.title,
      poster: POSTER(detail.poster_path),
      backdrop: BACKDROP(detail.backdrop_path),
      description: detail.overview || null,
      year,
      rating: detail.vote_average ?? null,
      genre,
      runtime: detail.runtime ?? null,
      source: "TMDB",
      videoUrl: `https://player.smashy.stream/movie/${detail.id}`,
    },
  });
}

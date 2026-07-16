// Archive.org client — free public-domain movies, no API key needed

const SEARCH_URL = "https://archive.org/advancedsearch.php";
const META_URL = "https://archive.org/metadata";

export interface ArchiveResult {
  identifier: string;
  title: string;
  description?: string;
  year?: string;
  downloads?: number;
}

export interface ArchiveFile {
  name: string;
  format: string;
  size?: string;
}

export interface ArchiveDetail extends ArchiveResult {
  files: ArchiveFile[];
  thumbnail?: string;
  server?: string;
  dir?: string;
}

export async function archiveSearch(
  query: string,
  page = 1,
  rows = 20
): Promise<{ results: ArchiveResult[]; total: number }> {
  const q = query.trim()
    ? `mediatype:movies AND title:(${query})`
    : "mediatype:movies AND collection:feature_films";
  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("output", "json");
  url.searchParams.set("rows", String(rows));
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort[]", "downloads desc");
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return { results: [], total: 0 };
    const data = await res.json();
    const docs = (data.response?.docs ?? []) as ArchiveResult[];
    const total = (data.response?.numFound ?? 0) as number;
    return { results: docs, total };
  } catch {
    return { results: [], total: 0 };
  }
}

// A curated set of well-known public-domain films for the homepage highlight
export const ARCHIVE_HIGHLIGHTS = [
  "NightOfTheLivingDead_1968",
  "Nosferatu_202412",
  "CharlotChaplinTheAdventurer",
  "PopeyetheSailormeetsSindbadtheSailor",
  "TheGeneral1926",
  "Metropolis_201809",
  "ATripToTheMoon1902",
];

export async function archiveDetail(
  identifier: string
): Promise<ArchiveDetail | null> {
  try {
    const res = await fetch(`${META_URL}/${identifier}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const metadata = data.metadata || {};
    const files: ArchiveFile[] = (data.files || []).map(
      (f: { name: string; format?: string; size?: string }) => ({
        name: f.name,
        format: f.format || "",
        size: f.size,
      })
    );
    const thumbnail = data.misc?.image
      ? `https://archive.org/services/img/${identifier}`
      : undefined;
    return {
      identifier,
      title: metadata.title || identifier,
      description: metadata.description,
      year: metadata.year,
      downloads: parseInt(metadata.downloads || "0", 10),
      files,
      thumbnail,
      server: data.server,
      dir: data.dir,
    };
  } catch {
    return null;
  }
}

const FORMAT_PRIORITY = [
  "h.264",
  "h264",
  "mpeg4",
  "720p",
  "480p",
  "ogv",
  "ogg",
];

export function pickBestVideoFile(detail: ArchiveDetail): string | null {
  if (!detail.server || !detail.files.length) {
    // fallback to /embed
    return `https://archive.org/embed/${detail.identifier}`;
  }
  let best: ArchiveFile | null = null;
  let bestRank = Infinity;
  for (const f of detail.files) {
    if (!/\.(mp4|ogv|mpeg|mpg|m4v)$/i.test(f.name)) continue;
    const fmt = f.format.toLowerCase();
    const rank = FORMAT_PRIORITY.findIndex((p) => fmt.includes(p));
    const r = rank === -1 ? 99 : rank;
    if (r < bestRank) {
      bestRank = r;
      best = f;
    }
  }
  if (!best) return `https://archive.org/embed/${detail.identifier}`;
  return `https://archive.org/download/${detail.identifier}/${encodeURIComponent(
    best.name
  )}`;
}

export function archiveEmbedUrl(identifier: string): string {
  return `https://archive.org/embed/${identifier}`;
}

export function archiveThumb(identifier: string): string {
  return `https://archive.org/services/img/${identifier}`;
}

// Ensure a Movie row exists for an Archive.org identifier
export async function ensureMovieFromArchive(identifier: string) {
  const { db } = await import("./db");
  const existing = await db.movie.findFirst({ where: { archiveId: identifier } });
  if (existing) return existing;
  const detail = await archiveDetail(identifier);
  if (!detail) return null;
  const videoUrl = pickBestVideoFile(detail);
  const year = detail.year ? parseInt(detail.year, 10) : null;
  let description = detail.description;
  if (description && description.length > 1500)
    description = description.slice(0, 1500) + "...";
  return db.movie.create({
    data: {
      title: detail.title,
      archiveId: identifier,
      poster: archiveThumb(identifier),
      backdrop: archiveThumb(identifier),
      description: description || null,
      year: year && !isNaN(year) ? year : null,
      rating: null,
      genre: "Classic / Public Domain",
      source: "ARCHIVE",
      videoUrl,
      trailerUrl: null,
    },
  });
}

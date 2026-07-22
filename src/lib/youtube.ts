// ponytail: static list; swap for https://api.invidious.io/instances.json when needed
const INVIDIOUS_INSTANCES = [
  "https://invidious.nerdvpn.de",
  "https://inv.nadeko.net",
  "https://invidious.privacyredirect.com",
  "https://invidious.protokolla.fi",
];

async function invidiousFetch(path: string): Promise<Response | null> {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) return res;
    } catch {
      // try next instance
    }
  }
  return null;
}

export async function youtubeSearch(query: string, limit = 10) {
  const res = await invidiousFetch(`/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`);

  if (!res) return { results: [] };
  const data = await res.json();

  return {
    results: data.slice(0, limit).map((item: any) => ({
      id: `yt_${item.videoId}`,
      title: item.title,
      poster: item.videoThumbnails?.[item.videoThumbnails.length - 1]?.url || null,
      year: item.published ? new Date(item.published * 1000).getFullYear() : null,
      source: "YOUTUBE",
    }))
  };
}

export async function youtubeDetail(id: string) {
  const videoId = id.replace('yt_', '');
  const res = await invidiousFetch(`/api/v1/videos/${videoId}`);

  if (!res) return null;
  const data = await res.json();

  return {
    id: `yt_${data.videoId}`,
    youtubeId: data.videoId,
    title: data.title,
    description: data.description,
    poster: data.videoThumbnails?.[data.videoThumbnails.length - 1]?.url || null,
    backdrop: data.videoThumbnails?.[data.videoThumbnails.length - 1]?.url || null,
    year: data.published ? new Date(data.published * 1000).getFullYear() : null,
    runtime: Math.floor(data.lengthSeconds / 60),
    source: "YOUTUBE",
    videoUrl: `https://www.youtube.com/embed/${data.videoId}`
  };
}

import { db } from "./db";

export async function ensureMovieFromYoutube(id: string) {
  const youtubeId = id.replace('yt_', '');

  // Check local DB first
  const existing = await db.movie.findUnique({ where: { youtubeId } });
  if (existing) return existing;

  // Fetch and save
  const data = await youtubeDetail(id);
  if (!data) return null;

  return db.movie.create({
    data: {
      title: data.title,
      description: data.description,
      poster: data.poster,
      backdrop: data.backdrop,
      year: data.year,
      runtime: data.runtime,
      source: "YOUTUBE",
      youtubeId: data.youtubeId,
      videoUrl: data.videoUrl,
    }
  });
}

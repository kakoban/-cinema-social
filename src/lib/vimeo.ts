export async function vimeoSearch(query: string, limit = 10) {
  // Vimeo offers a simple oEmbed search, but to search their public catalog without an API key,
  // we can use their public search endpoint that powers their site.
  // Note: For a robust prod app, a free Vimeo API token is recommended.
  const res = await fetch(`https://vimeo.com/api/v2/channel/staffpicks/videos.json`); // Fallback mock for now as Vimeo blocks generic search without API

  if (!res.ok) return { results: [] };
  const data = await res.json();

  // Just filtering staff picks locally as a mock search for free
  const filtered = data.filter((v: any) => v.title.toLowerCase().includes(query.toLowerCase())).slice(0, limit);

  return {
    results: (filtered.length ? filtered : data.slice(0, limit)).map((item: any) => ({
      id: `vim_${item.id}`,
      title: item.title,
      poster: item.thumbnail_large,
      year: item.upload_date ? new Date(item.upload_date).getFullYear() : null,
      source: "VIMEO",
    }))
  };
}

export async function vimeoDetail(id: string) {
  const videoId = id.replace('vim_', '');
  // oEmbed is public and free for Vimeo
  const res = await fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`);

  if (!res.ok) return null;
  const data = await res.json();

  return {
    id: `vim_${data.video_id}`,
    vimeoId: data.video_id.toString(),
    title: data.title,
    description: data.description,
    poster: data.thumbnail_url,
    backdrop: data.thumbnail_url,
    year: null, // oEmbed doesn't include year
    runtime: null,
    source: "VIMEO",
    videoUrl: `https://player.vimeo.com/video/${data.video_id}`
  };
}

import { db } from "./db";

export async function ensureMovieFromVimeo(id: string) {
  const vimeoId = id.replace('vim_', '');

  // Check local DB first
  const existing = await db.movie.findUnique({ where: { vimeoId } });
  if (existing) return existing;

  // Fetch and save
  const data = await vimeoDetail(id);
  if (!data) return null;

  return db.movie.create({
    data: {
      title: data.title,
      description: data.description || null,
      poster: data.poster,
      backdrop: data.backdrop,
      year: data.year,
      runtime: data.runtime,
      source: "VIMEO",
      vimeoId: data.vimeoId,
      videoUrl: data.videoUrl,
    }
  });
}

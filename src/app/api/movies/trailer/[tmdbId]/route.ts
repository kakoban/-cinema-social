import { NextRequest } from "next/server";
import { tmdbTrailer } from "@/lib/tmdb";
import { ok, notFound } from "@/lib/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tmdbId: string }> }
) {
  const { tmdbId } = await params;
  const id = parseInt(tmdbId, 10);
  if (isNaN(id)) return notFound("Invalid id");
  const trailer = await tmdbTrailer(id);
  if (!trailer) return ok({ trailerUrl: null });
  return ok({ trailerUrl: trailer });
}

import { NextRequest } from "next/server";
import { archiveDetail, pickBestVideoFile, archiveThumb } from "@/lib/archive";
import { ok, notFound } from "@/lib/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const { identifier } = await params;
  const detail = await archiveDetail(identifier);
  if (!detail) return notFound("Not found on Archive.org");

  const videoUrl = pickBestVideoFile(detail);
  return ok({
    identifier: detail.identifier,
    title: detail.title,
    description: detail.description,
    year: detail.year,
    poster: archiveThumb(detail.identifier),
    videoUrl,
    embedUrl: `https://archive.org/embed/${detail.identifier}`,
    source: "ARCHIVE",
  });
}

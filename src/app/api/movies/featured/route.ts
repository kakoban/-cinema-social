import { db } from "@/lib/db";
import { ok } from "@/lib/response";

// Return local ARCHIVE-source movies (seeded classics + any added) for the homepage highlight
export async function GET() {
  let movies = await db.movie.findMany({
    where: { source: "ARCHIVE" },
    orderBy: { createdAt: "asc" },
    take: 12,
    select: {
      id: true,
      title: true,
      poster: true,
      year: true,
      rating: true,
      genre: true,
      archiveId: true,
      source: true,
    },
  });
  return ok(movies);
}

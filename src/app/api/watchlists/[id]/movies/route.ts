import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, notFound, unauthorized, fail } from "@/lib/response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();
  const { id } = await params;
  const list = await db.watchlist.findUnique({ where: { id } });
  if (!list) return notFound("List not found");
  if (list.userId !== user.id) return fail("Not your list", 403);

  const body = await req.json().catch(() => null);
  const movieId = body?.movieId;
  if (!movieId) return fail("movieId required");

  const movie = await db.movie.findUnique({ where: { id: movieId } });
  if (!movie) return notFound("Movie not found");

  try {
    await db.watchlistItem.create({
      data: { watchlistId: id, movieId },
    });
  } catch {
    // already in list
  }

  const updated = await db.watchlist.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          movie: {
            select: { id: true, title: true, poster: true, year: true, source: true },
          },
        },
        orderBy: { addedAt: "desc" },
      },
    },
  });
  return ok(updated);
}

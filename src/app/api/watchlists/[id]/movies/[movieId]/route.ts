import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, notFound, unauthorized, forbidden } from "@/lib/response";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; movieId: string }> }
) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();
  const { id, movieId } = await params;
  const list = await db.watchlist.findUnique({ where: { id } });
  if (!list) return notFound("List not found");
  if (list.userId !== user.id) return forbidden("Not your list");

  await db.watchlistItem.deleteMany({
    where: { watchlistId: id, movieId },
  });

  return ok({ ok: true });
}

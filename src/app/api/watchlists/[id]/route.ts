import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { watchlistSchema } from "@/lib/validation";
import { ok, notFound, unauthorized, forbidden } from "@/lib/response";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();
  const { id } = await params;
  const list = await db.watchlist.findUnique({ where: { id } });
  if (!list) return notFound("List not found");
  if (list.userId !== user.id) return forbidden("Not your list");

  const body = await req.json().catch(() => null);
  const parsed = watchlistSchema.partial().safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message);

  const updated = await db.watchlist.update({
    where: { id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.isPublic !== undefined ? { isPublic: parsed.data.isPublic } : {}),
    },
  });
  return ok(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();
  const { id } = await params;
  const list = await db.watchlist.findUnique({ where: { id } });
  if (!list) return notFound("List not found");
  if (list.userId !== user.id) return forbidden("Not your list");

  await db.watchlist.delete({ where: { id } });
  return ok({ ok: true });
}

function fail(msg: string, status = 400) {
  return Response.json({ success: false, error: msg }, { status });
}

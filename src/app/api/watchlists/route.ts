import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { watchlistSchema } from "@/lib/validation";
import { ok, unauthorized, fail } from "@/lib/response";

export async function GET(req: NextRequest) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();

  const lists = await db.watchlist.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
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
  return ok(lists);
}

export async function POST(req: NextRequest) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = watchlistSchema.safeParse(body);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message || "Invalid input");

  const list = await db.watchlist.create({
    data: { name: parsed.data.name, isPublic: parsed.data.isPublic, userId: user.id },
    include: { items: true },
  });
  return ok(list);
}

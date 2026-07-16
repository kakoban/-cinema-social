import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, unauthorized, forbidden } from "@/lib/response";

export async function GET(req: NextRequest) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const reviews = await db.review.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      movie: { select: { id: true, title: true, poster: true } },
    },
  });
  return ok(reviews);
}

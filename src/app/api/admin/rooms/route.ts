import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, unauthorized, forbidden } from "@/lib/response";

export async function GET(req: NextRequest) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const rooms = await db.room.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      host: { select: { id: true, username: true } },
      movie: { select: { id: true, title: true } },
      _count: { select: { members: true } },
    },
  });
  return ok(
    rooms.map((r) => ({
      id: r.id,
      name: r.name,
      isPublic: r.isPublic,
      status: r.status,
      createdAt: r.createdAt,
      host: r.host,
      movie: r.movie,
      memberCount: r._count.members,
    }))
  );
}

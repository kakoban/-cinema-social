import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { roomSchema } from "@/lib/validation";
import { ok, fail, unauthorized } from "@/lib/response";

export async function GET() {
  const rooms = await db.room.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
    include: {
      host: { select: { id: true, username: true, avatar: true } },
      movie: { select: { id: true, title: true, poster: true } },
      _count: { select: { members: true } },
    },
    take: 50,
  });
  return ok(
    rooms.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isPublic: r.isPublic,
      maxUsers: r.maxUsers,
      status: r.status,
      isPlaying: r.isPlaying,
      createdAt: r.createdAt,
      host: r.host,
      movie: r.movie,
      memberCount: r._count.members,
    }))
  );
}

export async function POST(req: NextRequest) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();
  if (user.banned) return fail("Banned users cannot create rooms", 403);

  const body = await req.json().catch(() => null);
  const parsed = roomSchema.safeParse(body);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message || "Invalid input");

  const { name, description, movieId, isPublic, maxUsers } = parsed.data;

  if (movieId) {
    const movie = await db.movie.findUnique({ where: { id: movieId } });
    if (!movie) return fail("Movie not found", 404);
  }

  const room = await db.room.create({
    data: {
      name,
      description: description || null,
      movieId: movieId || null,
      hostId: user.id,
      isPublic,
      maxUsers,
    },
    include: {
      host: { select: { id: true, username: true, avatar: true } },
      movie: { select: { id: true, title: true, poster: true, videoUrl: true, source: true } },
    },
  });

  // host is automatically a member
  await db.roomMember.create({
    data: { userId: user.id, roomId: room.id, role: "HOST" },
  });

  return ok(room);
}

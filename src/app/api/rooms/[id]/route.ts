import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { roomSchema } from "@/lib/validation";
import { ok, notFound, unauthorized, forbidden, fail } from "@/lib/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const room = await db.room.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, username: true, avatar: true } },
      movie: {
        select: {
          id: true,
          title: true,
          poster: true,
          backdrop: true,
          videoUrl: true,
          trailerUrl: true,
          source: true,
          archiveId: true,
          tmdbId: true,
          description: true,
          year: true,
        },
      },
      members: {
        include: {
          user: { select: { id: true, username: true, avatar: true } },
        },
      },
      _count: { select: { members: true } },
    },
  });
  if (!room) return notFound("Room not found");
  return ok({
    id: room.id,
    name: room.name,
    description: room.description,
    isPublic: room.isPublic,
    maxUsers: room.maxUsers,
    status: room.status,
    currentTime: room.currentTime,
    isPlaying: room.isPlaying,
    lastSyncAt: room.lastSyncAt,
    createdAt: room.createdAt,
    host: room.host,
    movie: room.movie,
    members: room.members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    })),
    memberCount: room._count.members,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return unauthorized();
  const { id } = await params;
  const room = await db.room.findUnique({ where: { id } });
  if (!room) return notFound("Room not found");
  if (room.hostId !== user.id && user.role !== "ADMIN")
    return forbidden("Only the host can update");

  const body = await req.json().catch(() => null);
  const parsed = roomSchema.partial().safeParse(body);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message || "Invalid input");

  const updated = await db.room.update({
    where: { id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description || null }
        : {}),
      ...(parsed.data.movieId !== undefined
        ? { movieId: parsed.data.movieId || null }
        : {}),
      ...(parsed.data.isPublic !== undefined ? { isPublic: parsed.data.isPublic } : {}),
      ...(parsed.data.maxUsers ? { maxUsers: parsed.data.maxUsers } : {}),
    },
    include: {
      host: { select: { id: true, username: true, avatar: true } },
      movie: { select: { id: true, title: true, poster: true, videoUrl: true, source: true } },
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
  const room = await db.room.findUnique({ where: { id } });
  if (!room) return notFound("Room not found");
  if (room.hostId !== user.id && user.role !== "ADMIN")
    return forbidden("Only the host or admin can delete");

  await db.room.delete({ where: { id } });
  return ok({ ok: true });
}

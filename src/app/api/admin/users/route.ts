import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { ok, unauthorized, forbidden } from "@/lib/response";

async function requireAdmin(req: NextRequest) {
  const user = await getUserFromAuthHeader(req.headers.get("authorization"));
  if (!user) return { error: unauthorized(), user: null };
  if (user.role !== "ADMIN") return { error: forbidden(), user: null };
  return { error: null, user };
}

export async function GET(req: NextRequest) {
  const { error, user } = await requireAdmin(req);
  if (error || !user) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = 20;

  const where = q
    ? {
        OR: [
          { username: { contains: q } },
          { email: { contains: q } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatar: true,
        banned: true,
        tokenVersion: true,
        createdAt: true,
        _count: {
          select: { reviews: true, followers: true, following: true },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  return ok({
    users: users.map((u) => ({
      ...u,
      reviewCount: u._count.reviews,
      followersCount: u._count.followers,
      followingCount: u._count.following,
    })),
    page,
    totalPages: Math.ceil(total / pageSize),
    total,
  });
}

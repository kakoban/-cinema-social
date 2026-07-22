import { NextRequest } from "next/server";
import { ok, fail, unauthorized } from "@/lib/response";
import { db } from "@/lib/db";
import { getUserFromAuthHeader } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 5, 60_000);
  if (!rl.ok) return fail("Too many requests", 429);

  const user = await getUserFromAuthHeader(req.headers.get("Authorization"));
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { title, videoUrl, poster, description } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return fail("Title is required");
    }
    if (!videoUrl || typeof videoUrl !== "string" || !videoUrl.trim()) {
      return fail("Video URL is required");
    }

    // Basic URL validation
    try {
      new URL(videoUrl);
    } catch {
      return fail("Invalid Video URL format");
    }

    const movie = await db.movie.create({
      data: {
        title: title.trim(),
        videoUrl: videoUrl.trim(),
        poster: poster?.trim() || null,
        description: description?.trim() || null,
        source: "CUSTOM",
      },
    });

    return ok(movie);
  } catch (error) {
    console.error("Custom movie creation error:", error);
    return fail("Invalid request data");
  }
}

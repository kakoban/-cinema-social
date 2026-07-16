import { NextRequest } from "next/server";
import { archiveSearch, archiveThumb } from "@/lib/archive";
import { ok } from "@/lib/response";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 10, 60_000);
  if (!rl.ok) return ok({ results: [], total: 0 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const { results, total } = await archiveSearch(q, page);
  const mapped = results.map((r) => ({
    identifier: r.identifier,
    title: r.title,
    description: r.description,
    year: r.year,
    downloads: r.downloads,
    poster: archiveThumb(r.identifier),
    source: "ARCHIVE",
  }));

  return ok({ results: mapped, total, page });
}

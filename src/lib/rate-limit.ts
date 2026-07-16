// Simple in-memory per-IP rate limiter
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  ip: string,
  limit = 10,
  windowMs = 60_000
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = ip;
  const entry = buckets.get(key);
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (entry.count >= limit) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return { ok: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  const xr = req.headers.get("x-real-ip");
  if (xr) return xr;
  return "unknown";
}

import { revokeRefreshToken, clearRefreshCookie, getRefreshCookie } from "@/lib/auth";
import { ok } from "@/lib/response";

export async function POST() {
  const raw = await getRefreshCookie();
  if (raw) await revokeRefreshToken(raw);
  await clearRefreshCookie();
  return ok({ ok: true });
}

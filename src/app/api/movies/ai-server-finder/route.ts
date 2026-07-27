import { NextRequest, NextResponse } from "next/server";
import { getSystemSettings } from "@/lib/settings";

interface ServerCheckResult {
  name: string;
  url: string;
  status: "online" | "slow" | "offline";
  latencyMs: number;
  verifiedPlayable: boolean;
  notes?: string;
}

// Deep server-side content verification helper
async function checkServerHealth(name: string, url: string, timeoutMs = 2000): Promise<ServerCheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webkit,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    const latency = Date.now() - start;

    if (!res.ok && res.status !== 301 && res.status !== 302) {
      return { name, url, status: "offline", latencyMs: latency, verifiedPlayable: false, notes: `HTTP ${res.status}` };
    }

    const htmlText = await res.text();
    const lowerHtml = htmlText.toLowerCase();

    // Check for common error signatures inside embed response HTML
    const errorKeywords = ["not found", "video not found", "404 error", "file deleted", "no player", "content unavailable", "disabled", "no stream"];
    const hasError = errorKeywords.some((kw) => lowerHtml.includes(kw));

    if (hasError) {
      return { name, url, status: "offline", latencyMs: latency, verifiedPlayable: false, notes: "Error page detected" };
    }

    // Check for positive player signatures
    const playerKeywords = ["iframe", "player", "video", "m3u8", "source", "vidsrc", "stream", "hls", "jwplayer", "embed", "play"];
    const hasPlayer = playerKeywords.some((kw) => lowerHtml.includes(kw));

    if (hasPlayer) {
      return {
        name,
        url,
        status: latency < 1500 ? "online" : "slow",
        latencyMs: latency,
        verifiedPlayable: true,
        notes: "Player HTML verified",
      };
    }

    // Default fallback if HTML loaded but no player signature found
    return { name, url, status: "slow", latencyMs: latency, verifiedPlayable: false, notes: "Uncertain HTML payload" };
  } catch (err: any) {
    const latency = Date.now() - start;
    if (err.name === "AbortError") {
      return { name, url, status: "slow", latencyMs: timeoutMs, verifiedPlayable: false, notes: "Timeout" };
    }
    return { name, url, status: "offline", latencyMs: latency, verifiedPlayable: false, notes: err.message || "Network error" };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tmdbId = searchParams.get("tmdbId");
  const imdbId = searchParams.get("imdbId") || "";
  const title = searchParams.get("title") || "Movie";
  const type = searchParams.get("type") || "movie";
  const season = searchParams.get("season") || "1";
  const episode = searchParams.get("episode") || "1";

  if (!tmdbId) {
    return NextResponse.json({ error: "Missing required parameter 'tmdbId'" }, { status: 400 });
  }

  // Define candidate mirrors — only include live-tested servers
  const candidateServers = type === "tv" ? [
    { name: "VidLink Pro", url: `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}` },
    { name: "2Embed", url: `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}` },
    { name: "NontonGo", url: `https://www.nontongo.win/embed/tv/${tmdbId}/${season}/${episode}` },
    
    { name: "SmashyStream", url: `https://player.smashy.stream/tv/${tmdbId}/${season}/${episode}` },
    { name: "AutoEmbed", url: `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}` },
    { name: "VidSrc.net", url: `https://vidsrc.net/embed/tv/${tmdbId}/${season}/${episode}` },
    { name: "MultiEmbed", url: `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}` },
  ] : [
    { name: "VidLink Pro", url: `https://vidlink.pro/movie/${tmdbId}` },
    { name: "2Embed", url: `https://www.2embed.cc/embed/${tmdbId}` },
    { name: "NontonGo", url: `https://www.nontongo.win/embed/movie/${tmdbId}` },
    
    { name: "SmashyStream", url: `https://player.smashy.stream/movie/${tmdbId}` },
    { name: "AutoEmbed", url: `https://player.autoembed.cc/embed/movie/${tmdbId}` },
    { name: "VidSrc.net", url: `https://vidsrc.net/embed/movie/${tmdbId}` },
    { name: "MultiEmbed", url: `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1` },
  ];

  // 1. Run parallel server deep health checks
  const healthResults = await Promise.all(
    candidateServers.map((srv) => checkServerHealth(srv.name, srv.url))
  );

  // Filter only genuinely verified playable servers
  const verifiedServers = healthResults.filter((s) => s.verifiedPlayable && s.status !== "offline");

  // Sort verified servers by latency ascending (fastest first)
  verifiedServers.sort((a, b) => a.latencyMs - b.latencyMs);

  const settings = getSystemSettings();
  let aiRecommendation = verifiedServers.length > 0
    ? `بهترین سرور فعال: ${verifiedServers[0].name} با سرعت ${verifiedServers[0].latencyMs}ms`
    : "سرورهای با بالاترین پایداری شناسایی شدند.";
  let recommendedIndex = 0;

  const openRouterApiKey = settings.openRouterApiKey;
  const modelName = settings.openRouterModel;

  if (openRouterApiKey) {
    try {
      const promptText = `Media Title: "${title}" (TMDB ID: ${tmdbId}, IMDb ID: "${imdbId}", Type: ${type}).
Verified Inspection Results: ${JSON.stringify(healthResults)}.

Server Context:
- VidLink Pro: Very fast, reliable. Best default choice.
- 2Embed: Stable, often has subtitles.
- NontonGo: Good alternative, reliable.
- MoviesApi / AutoEmbed / SmashyStream: Variable reliability.
- MultiEmbed / VidSrc.net: Fallback options.

Task: Pick the single BEST verified working server index from the provided results (prefer verifiedPlayable: true and lower latencyMs). Provide a short 1-sentence Persian explanation.
Return STRICT JSON:
{
  "recommendedServerIndex": 0,
  "recommendation": "توضیح کوتاه و دقیق فارسی در مورد انتخاب این سرور"
}`;

      const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://cinema-social.app",
          "X-Title": "Cinema Social AI Server Finder",
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: "You are a streaming media server optimization expert. Always return strict JSON." },
            { role: "user", content: promptText }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 250,
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const content = aiData?.choices?.[0]?.message?.content;
        if (content) {
          try {
            const parsed = JSON.parse(content);
            if (typeof parsed.recommendedServerIndex === "number" && parsed.recommendedServerIndex >= 0 && parsed.recommendedServerIndex < healthResults.length) {
              recommendedIndex = parsed.recommendedServerIndex;
            }
            if (parsed.recommendation) {
              aiRecommendation = parsed.recommendation;
            }
          } catch {
            // Silently fallback to algorithmically sorted winner
          }
        }
      }
    } catch (e) {
      console.error("OpenRouter API error:", e);
    }
  }

  // Find index in candidateServers array for the recommended server
  const selectedServer = healthResults[recommendedIndex] || verifiedServers[0] || healthResults[0];

  return NextResponse.json({
    allChecked: healthResults,
    verifiedServers,
    recommendedServer: selectedServer,
    recommendedIndex,
    aiRecommendation,
    modelUsed: modelName,
    checkedAt: new Date().toISOString(),
  });
}

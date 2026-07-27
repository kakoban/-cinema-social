import unzipper from 'unzipper';
import iconv from 'iconv-lite';
import { Buffer } from 'buffer';

export interface SubtitleResult {
  id: string;
  title: string;
  language: string;
  url: string;
  source: 'subdl' | 'subscene';
  downloads?: number;
  rating?: number;
}

const SUBDL_BASE = "https://subdl.com";
const SUBSCENE_BASE = "https://subscene.com";

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9,fa;q=0.8'
};

/**
 * Searches real subtitles across Subdl web scraper and Subscene fallback
 */
export async function searchSubtitles(query: string, lang = 'fa'): Promise<SubtitleResult[]> {
  const results: SubtitleResult[] = [];

  // 1. Primary: Subdl Web Scraper
  try {
    const subdlResults = await searchSubdlScraper(query, lang);
    results.push(...subdlResults);
  } catch (err) {
    console.warn("Subdl scraper error:", err);
  }

  // 2. Secondary Fallback: Subscene Scraper if Subdl returned very few results
  if (results.length < 3) {
    try {
      const subsceneResults = await searchSubsceneScraper(query, lang);
      results.push(...subsceneResults);
    } catch (err) {
      console.warn("Subscene scraper fallback error:", err);
    }
  }

  return results;
}

/**
 * Robust Subdl web scraper for movies & TV shows
 */
async function searchSubdlScraper(query: string, lang = 'fa'): Promise<SubtitleResult[]> {
  const results: SubtitleResult[] = [];

  // Step 1: Search movie/show on Subdl
  const searchUrl = `${SUBDL_BASE}/search/${encodeURIComponent(query)}`;
  const searchRes = await fetch(searchUrl, {
    headers: DEFAULT_HEADERS,
    next: { revalidate: 3600 } // Cache search results for 1 hour
  });

  if (!searchRes.ok) return [];
  const searchHtml = await searchRes.text();

  // Extract movie & series links (e.g. /subtitle/sd2922/inception)
  const matches = [...searchHtml.matchAll(/href="(\/subtitle\/(sd\d+)\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  if (matches.length === 0) return [];

  // Take top 3 matching title pages
  const moviePaths = Array.from(new Set(matches.slice(0, 3).map(m => m[1])));

  for (const moviePath of moviePaths) {
    // Try Persian subpage first, then general movie page
    const targetUrls = [
      `${SUBDL_BASE}${moviePath}/farsi_persian`,
      `${SUBDL_BASE}${moviePath}`
    ];

    for (const targetUrl of targetUrls) {
      try {
        const pageRes = await fetch(targetUrl, { headers: DEFAULT_HEADERS });
        if (!pageRes.ok) continue;

        const html = await pageRes.text();
        const dlRegex = /href="(https?:\/\/dl\.subdl\.com\/subtitle\/[^"]+\.zip)"/gi;
        let match;

        while ((match = dlRegex.exec(html)) !== null) {
          const downloadUrl = match[1];
          // Extract release title text around the download link
          const searchBack = html.substring(Math.max(0, match.index - 500), match.index);
          const titleMatch = searchBack.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i) || 
                            searchBack.match(/class="[^"]*font-bold[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
          
          let releaseTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : query;
          if (!releaseTitle || releaseTitle.length < 2) releaseTitle = `${query} - Subtitle Track`;

          if (!results.some(r => r.url === downloadUrl)) {
            results.push({
              id: `subdl-${results.length + 1}`,
              title: releaseTitle,
              language: lang,
              url: downloadUrl,
              source: 'subdl'
            });
          }

          if (results.length >= 30) break;
        }

        if (results.length > 0) break; // Successfully parsed subtitles for this title
      } catch (e) {
        console.warn("Subdl page fetch error:", targetUrl, e);
      }
    }
    if (results.length >= 30) break;
  }

  return results;
}

/**
 * Scrapes Subscene website for subtitle links
 */
async function searchSubsceneScraper(query: string, lang = 'fa'): Promise<SubtitleResult[]> {
  const res = await fetch(`${SUBSCENE_BASE}/subtitles/searchbytitle`, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `query=${encodeURIComponent(query)}&l=${lang}`,
  });

  if (!res.ok) return [];

  const html = await res.text();
  const results: SubtitleResult[] = [];
  const regex = /<a href="(\/subtitles\/[^"]+)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const path = match[1];
    const title = match[2].trim();

    results.push({
      id: `subscene-${path}`,
      title: title,
      url: `${SUBSCENE_BASE}${path}`,
      language: lang,
      source: 'subscene'
    });
  }
  return results;
}

/**
 * Downloads a subtitle from Subdl ZIP URL or Subscene page URL
 */
export async function downloadSubtitleText(subtitleUrl: string): Promise<string> {
  let finalDownloadUrl = subtitleUrl;

  // Handle Subscene detail page
  if (subtitleUrl.includes('subscene.com/subtitles/') && !subtitleUrl.endsWith('/download')) {
    const pageRes = await fetch(subtitleUrl, { headers: DEFAULT_HEADERS });
    if (!pageRes.ok) throw new Error("Failed to load Subscene detail page");
    const pageHtml = await pageRes.text();
    const downloadMatch = pageHtml.match(/href="(\/subtitles\/[^"]+\/download)"/i);
    if (!downloadMatch) throw new Error("Could not find download link on Subscene page");
    finalDownloadUrl = `${SUBSCENE_BASE}${downloadMatch[1]}`;
  }

  // Download the ZIP archive or subtitle file buffer
  const res = await fetch(finalDownloadUrl, { headers: DEFAULT_HEADERS });
  if (!res.ok) throw new Error(`Failed to download subtitle file: ${res.status}`);

  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || '';
  const contentDisposition = res.headers.get('content-disposition') || '';

  // Check if response is a ZIP archive
  if (
    contentType.includes('zip') || 
    contentType.includes('octet-stream') || 
    contentDisposition.includes('.zip') ||
    finalDownloadUrl.endsWith('.zip')
  ) {
    try {
      const directory = await unzipper.Open.buffer(Buffer.from(buffer));
      // Find the first .srt or .vtt file inside ZIP
      const srtFile = directory.files.find(d => 
        d.path.toLowerCase().endsWith('.srt') || d.path.toLowerCase().endsWith('.vtt')
      );
      if (!srtFile) {
        throw new Error('No .srt or .vtt file found inside downloaded ZIP');
      }

      const srtBuffer = await srtFile.buffer();
      return decodeSubtitleBuffer(srtBuffer);
    } catch (e) {
      console.warn("ZIP extraction failed, attempting direct buffer decode:", e);
      return decodeSubtitleBuffer(Buffer.from(buffer));
    }
  }

  return decodeSubtitleBuffer(Buffer.from(buffer));
}

/**
 * Smart buffer decoder for UTF-8 and Persian Windows-1256 encodings
 */
export function decodeSubtitleBuffer(buffer: Buffer): string {
  const utf8Str = buffer.toString('utf8');

  // Check for UTF-8 replacement character
  if (utf8Str.includes('\uFFFD')) {
    return iconv.decode(buffer, 'win1256');
  }

  const win1256Str = iconv.decode(buffer, 'win1256');
  const persianRegex = /[؀-ۿ]/;
  const hasPersianUtf8 = persianRegex.test(utf8Str);
  const hasPersianWin1256 = persianRegex.test(win1256Str);

  if (hasPersianWin1256 && !hasPersianUtf8) {
    return win1256Str;
  }

  return utf8Str;
}

/**
 * Converts SRT formatted subtitle text to WebVTT format
 */
export function srtToVtt(srt: string): string {
  if (srt.trim().startsWith("WEBVTT")) {
    return srt;
  }

  let vtt = "WEBVTT\n\n";
  vtt += srt
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Fix timestamps (SRT uses comma, VTT uses dot)
    .replace(/^(\d{2}:\d{2}:\d{2}),(\d{3})/gm, "$1.$2")
    .replace(/^(\d{2}:\d{2}),(\d{3})/gm, "00:$1.$2")
    .replace(/<br\s*\/?>/gi, "\n");

  return vtt;
}

import unzipper from 'unzipper';
import iconv from 'iconv-lite';
import { Buffer } from 'buffer';

const SUBSCENE_BASE = "https://subscene.com";

export interface SubtitleResult {
  id: string;
  title: string;
  language: string;
  url: string;
}

export async function searchSubscene(query: string, lang = 'fa'): Promise<SubtitleResult[]> {
  try {
    const res = await fetch(`${SUBSCENE_BASE}/subtitles/searchbytitle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: `query=${encodeURIComponent(query)}&l=${lang}`,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch from Subscene: ${res.status}`);
    }

    const html = await res.text();

    // Parse results
    const results: SubtitleResult[] = [];
    const regex = /<a href="(\/subtitles\/[^"]+)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const path = match[1];
      const title = match[2].trim();

      // Basic filtering: we only want Persian if searching for Persian
      if (lang === 'fa' && !html.includes('fa-fa') && !title.toLowerCase().includes('farsi') && !title.toLowerCase().includes('persian')) {
          // It's hard to accurately parse the language span without DOM parser,
          // but we capture whatever matches.
      }

      results.push({
        id: path,
        title: title,
        url: `${SUBSCENE_BASE}${path}`,
        language: lang,
      });
    }
    return results;
  } catch (error) {
    console.error("Subscene search error:", error);
    // Return mock data for testing if real subscene is blocked
    if (process.env.NODE_ENV === 'development') {
      return [
        { id: '/mock/1', title: `[MOCK] ${query} - Bluray 1080p - Persian`, language: 'fa', url: '/mock/1' },
        { id: '/mock/2', title: `[MOCK] ${query} - WebDL - Persian`, language: 'fa', url: '/mock/2' }
      ];
    }
    throw error;
  }
}

export async function downloadSubsceneSrt(subtitleUrl: string): Promise<string> {
  // If it's a mock URL, return mock SRT
  if (subtitleUrl.startsWith('/mock/')) {
    return `1\n00:00:01,000 --> 00:00:05,000\n[Mock Subtitle] This is a test subtitle.\n\n2\n00:00:06,000 --> 00:00:10,000\nسلااااام! این یک زیرنویس تستی فارسی است.`;
  }

  // First we need the actual download URL from the specific subtitle page
  const pageRes = await fetch(subtitleUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
  });

  if (!pageRes.ok) throw new Error("Failed to load subtitle page");
  const pageHtml = await pageRes.text();

  const downloadMatch = pageHtml.match(/href="(\/subtitles\/[^"]+\/download)"/i);
  if (!downloadMatch) throw new Error("Could not find download link on page");

  const downloadUrl = `${SUBSCENE_BASE}${downloadMatch[1]}`;

  // Download the file
  const res = await fetch(downloadUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
  });

  if (!res.ok) throw new Error(`Failed to download subtitle file: ${res.status}`);

  const buffer = await res.arrayBuffer();

  // Check if it's a ZIP
  const contentType = res.headers.get('content-type') || '';
  const contentDisposition = res.headers.get('content-disposition') || '';

  if (contentType.includes('zip') || contentType.includes('octet-stream') || contentDisposition.includes('.zip')) {
    // Extract SRT from ZIP
    try {
      const directory = await unzipper.Open.buffer(Buffer.from(buffer));

      // Find the first .srt file
      const srtFile = directory.files.find(d => d.path.toLowerCase().endsWith('.srt'));
      if (!srtFile) {
        throw new Error('No .srt file found in the downloaded ZIP');
      }

      const srtBuffer = await srtFile.buffer();
      return decodeSubtitleBuffer(srtBuffer);
    } catch (e) {
      console.error("ZIP extraction failed:", e);
      throw new Error("Failed to extract subtitle from ZIP");
    }
  }

  // If it's not a ZIP, just decode the buffer directly
  return decodeSubtitleBuffer(Buffer.from(buffer));
}

/**
 * Decodes a subtitle buffer, fixing Windows-1256 encoding for Persian if needed
 */
function decodeSubtitleBuffer(buffer: Buffer): string {
  // First try to decode as UTF-8
  const utf8Str = buffer.toString('utf8');

  // A simple heuristic for Persian Windows-1256 detection:
  // If UTF-8 parsing results in a lot of replacement characters ()
  // or completely weird ASCII symbols where Persian letters should be.
  // Actually, standard iconv-lite decode is safer if we know it's Persian,
  // but let's check if it contains common Persian words in UTF-8.

  // If it contains , it's almost certainly not valid UTF-8.
  if (utf8Str.includes('')) {
    return iconv.decode(buffer, 'win1256');
  }

  // Another heuristic: Arabic/Persian Windows-1256 uses characters in the range 0xC0-0xFF.
  // If we decode it as win1256 and it contains valid Persian chars, and utf8 doesn't, we switch.
  const win1256Str = iconv.decode(buffer, 'win1256');

  // Check for common Persian letters in the win1256 decoded string that wouldn't appear correctly in utf8 if it was win1256
  const persianChars = /[؀-ۿ]/;
  const hasPersianUtf8 = persianChars.test(utf8Str);
  const hasPersianWin1256 = persianChars.test(win1256Str);

  // If decoding as win1256 yields Persian characters but UTF-8 doesn't, it's win1256
  if (hasPersianWin1256 && !hasPersianUtf8) {
      return win1256Str;
  }

  // Default to UTF-8
  return utf8Str;
}

export function srtToVtt(srt: string): string {
  let vtt = "WEBVTT\n\n";
  vtt += srt
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Fix timestamps (SRT uses comma, VTT uses dot)
    .replace(/^(\d{2}:\d{2}:\d{2}),(\d{3})/gm, "$1.$2")
    // Handle SRT formatting tags if necessary, but VTT supports basic <b> <i> etc.
    .replace(/<br>/gi, "\n");

  return vtt;
}

// Subscene Scraper — Free subtitle source with rich Persian/Farsi content
// Note: Subscene doesn't have an official API, so we scrape their website.

const SUBSCENE_BASE = "https://subscene.com";

export interface SubsceneResult {
  id: string;
  title: string;
  language: string;
  languageCode: string;
  url: string;
  downloadUrl: string;
  hearingImpaired?: boolean;
}

export interface SubsceneSubtitle {
  id: string;
  title: string;
  language: string;
  languageCode: string;
  url: string;
  downloadUrl: string;
  hearingImpaired: boolean;
  comment?: string;
}

/**
 * Search for subtitles on Subscene
 * @param query - Movie/TV show title
 * @param languages - Array of language codes (default: ['fa', 'en'])
 * @returns Array of subtitle results
 */
export async function subsceneSearch(
  query: string,
  languages: string[] = ["fa", "en"]
): Promise<SubsceneResult[]> {
  try {
    // Subscene search URL pattern
    const searchUrl = `${SUBSCENE_BASE}/subtitles/searchbytitle`;
    
    const formData = new URLSearchParams();
    formData.append("query", query);
    formData.append("l", "");

    const response = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      body: formData.toString(),
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error("Subscene search failed:", response.status);
      return [];
    }

    const html = await response.text();
    return parseSearchResults(html, languages);
  } catch (error) {
    console.error("Subscene search error:", error);
    return [];
  }
}

/**
 * Parse search results from Subscene HTML
 */
function parseSearchResults(html: string, targetLanguages: string[]): SubsceneResult[] {
  const results: SubsceneResult[] = [];
  
  // Match subtitle links in the search results
  // Pattern: /subtitles/[title-slug]/[language]/[id]
  const linkPattern = /<a\s+href="\/subtitles\/([^"]+)">\s*<span class="([^"]*)">\s*([^<]+)\s*<\/span>\s*<span>\s*([^<]+)\s*<\/span>\s*<\/a>/gi;
  
  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    const [, path, langClass, language, title] = match;
    
    // Extract language code from class or text
    const languageCode = extractLanguageCode(langClass, language.trim());
    
    // Filter by target languages
    if (targetLanguages.length > 0 && !targetLanguages.includes(languageCode)) {
      continue;
    }

    // Check if hearing impaired
    const hearingImpaired = html.includes(`${path}`) && 
      html.includes('class="hi"');

    results.push({
      id: path,
      title: title.trim(),
      language: language.trim(),
      languageCode,
      url: `${SUBSCENE_BASE}/subtitles/${path}`,
      downloadUrl: `${SUBSCENE_BASE}/subtitles/${path}/download`,
      hearingImpaired,
    });
  }

  // Alternative parsing if the first pattern doesn't match
  if (results.length === 0) {
    const altPattern = /<a\s+href="(\/subtitles\/[^"]+)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<\/a>/gi;
    
    while ((match = altPattern.exec(html)) !== null) {
      const [, path, title] = match;
      
      // Try to extract language from the path
      const langMatch = path.match(/\/subtitles\/[^\/]+\/([^\/]+)\//);
      const language = langMatch ? langMatch[1] : "unknown";
      const languageCode = language.substring(0, 2).toLowerCase();

      // Filter by target languages
      if (targetLanguages.length > 0 && !targetLanguages.includes(languageCode)) {
        continue;
      }

      results.push({
        id: path,
        title: title.trim(),
        language: language,
        languageCode,
        url: `${SUBSCENE_BASE}${path}`,
        downloadUrl: `${SUBSCENE_BASE}${path}/download`,
        hearingImpaired: false,
      });
    }
  }

  return results;
}

/**
 * Extract language code from CSS class or language name
 */
function extractLanguageCode(className: string, languageName: string): string {
  // Common language class patterns on Subscene
  const classMap: Record<string, string> = {
    "persian": "fa",
    "farsi": "fa",
    "english": "en",
    "arabic": "ar",
    "spanish": "es",
    "french": "fr",
    "german": "de",
    "italian": "it",
    "portuguese": "pt",
    "turkish": "tr",
    "russian": "ru",
    "chinese": "zh",
    "japanese": "ja",
    "korean": "ko",
    "hindi": "hi",
  };

  // Check class name
  const lowerClass = className.toLowerCase();
  for (const [key, code] of Object.entries(classMap)) {
    if (lowerClass.includes(key)) {
      return code;
    }
  }

  // Check language name
  const lowerName = languageName.toLowerCase();
  for (const [key, code] of Object.entries(classMap)) {
    if (lowerName.includes(key)) {
      return code;
    }
  }

  // Default to first two chars
  return languageName.substring(0, 2).toLowerCase();
}

/**
 * Get subtitle download URL from a subtitle page
 * @param subtitlePath - The subtitle path from search results
 * @returns Direct download URL
 */
export async function getSubsceneDownloadUrl(subtitlePath: string): Promise<string | null> {
  try {
    const url = subtitlePath.startsWith("http") 
      ? subtitlePath 
      : `${SUBSCENE_BASE}${subtitlePath}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Look for download link
    const downloadMatch = html.match(/href="(\/subtitles\/[^"]+\/download)"/i);
    if (downloadMatch) {
      return `${SUBSCENE_BASE}${downloadMatch[1]}`;
    }

    // Alternative: direct download link
    const directMatch = html.match(/href="([^"]*download[^"]*\.srt)"/i);
    if (directMatch) {
      return directMatch[1].startsWith("http") 
        ? directMatch[1] 
        : `${SUBSCENE_BASE}${directMatch[1]}`;
    }

    return null;
  } catch (error) {
    console.error("Get download URL error:", error);
    return null;
  }
}

/**
 * Download subtitle content from Subscene
 * @param downloadUrl - The download URL
 * @returns SRT content as string
 */
export async function downloadSubsceneSubtitle(downloadUrl: string): Promise<string | null> {
  try {
    const url = downloadUrl.startsWith("http") 
      ? downloadUrl 
      : `${SUBSCENE_BASE}${downloadUrl}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*",
      },
    });

    if (!response.ok) {
      return null;
    }

    // Subscene downloads are usually ZIP files
    const contentType = response.headers.get("content-type") || "";
    
    if (contentType.includes("zip") || contentType.includes("octet-stream")) {
      // For ZIP files, we'd need a ZIP parser
      // For now, return null and handle in the API
      return null;
    }

    // If it's plain text (SRT)
    return await response.text();
  } catch (error) {
    console.error("Download subtitle error:", error);
    return null;
  }
}

/**
 * Convert SRT to WebVTT format
 */
export function srtToVtt(srt: string): string {
  let vtt = "WEBVTT\n\n";
  vtt += srt
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^(\d+)\n(\d{2}:\d{2}:\d{2}),(\d{3}) --> (\d{2}:\d{2}:\d{2}),(\d{3})/gm, "$1\n$2.$3 --> $4.$5")
    .replace(/<br>/gi, "\n");
  return vtt;
}

/**
 * Get language name from code
 */
export function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    fa: "Persian",
    en: "English",
    ar: "Arabic",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    tr: "Turkish",
    ru: "Russian",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    hi: "Hindi",
  };
  return names[code] || code.toUpperCase();
}

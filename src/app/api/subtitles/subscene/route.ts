import { NextRequest, NextResponse } from 'next/server';
import { subsceneSearch, getSubsceneDownloadUrl, downloadSubsceneSubtitle, srtToVtt, getLanguageName } from '@/lib/subscene';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const action = searchParams.get('action') || 'search';
  const subtitlePath = searchParams.get('path');
  const languagesParam = searchParams.get('languages') || 'fa,en';

  // Parse languages
  const languages = languagesParam.split(',').map(l => l.trim()).filter(Boolean);

  try {
    if (action === 'download' && subtitlePath) {
      // Get download URL
      const downloadUrl = await getSubsceneDownloadUrl(subtitlePath);
      
      if (!downloadUrl) {
        return NextResponse.json({ error: "Could not find download link" }, { status: 404 });
      }

      // Try to download subtitle
      const srtContent = await downloadSubsceneSubtitle(downloadUrl);
      
      if (srtContent) {
        // Convert SRT to VTT
        const vtt = srtToVtt(srtContent);
        return new NextResponse(vtt, {
          headers: { 'Content-Type': 'text/vtt; charset=utf-8' }
        });
      }

      // If direct download failed, return the download URL for the client to handle
      return NextResponse.json({ 
        downloadUrl,
        message: "Direct download not available. Please open the URL to download manually."
      });
    }

    // Default action: SEARCH
    if (!q) {
      return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
    }

    const results = await subsceneSearch(q, languages);

    // Format results for the client
    const formattedResults = results.map(result => ({
      id: result.id,
      title: result.title,
      language: result.language,
      languageCode: result.languageCode,
      languageName: getLanguageName(result.languageCode),
      url: result.url,
      hearingImpaired: result.hearingImpaired || false,
      source: 'subscene',
    }));

    return NextResponse.json({ 
      data: formattedResults,
      source: 'subscene',
      query: q,
      languages,
    });
  } catch (error) {
    console.error("Subscene API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

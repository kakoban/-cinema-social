import { NextRequest, NextResponse } from 'next/server';
import { searchSubtitles, downloadSubtitleText, srtToVtt } from '@/lib/subtitles';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const action = searchParams.get('action') || 'search';
  const url = searchParams.get('url');
  const lang = searchParams.get('lang') || 'fa';

  if (action === 'search' && !q) {
    return NextResponse.json({ error: 'Missing query (q)' }, { status: 400 });
  }

  if (action === 'download' && !url) {
    return NextResponse.json({ error: 'Missing subtitle URL (url)' }, { status: 400 });
  }

  try {
    if (action === 'download' && url) {
      const srtOrVtt = await downloadSubtitleText(url);
      const vtt = srtToVtt(srtOrVtt);
      return new NextResponse(vtt, {
        headers: {
          'Content-Type': 'text/vtt; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }

    // Search
    const results = await searchSubtitles(q!, lang);
    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("Subtitle API Error:", err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

function srtToVtt(srt: string): string {
  // A robust SRT to VTT converter function
  let vtt = 'WEBVTT\n\n';
  vtt += srt
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^(\d+)\n(\d{2}:\d{2}:\d{2}),(\d{3}) --> (\d{2}:\d{2}:\d{2}),(\d{3})/gm, '$1\n$2.$3 --> $4.$5')
    .replace(/<br>/gi, '\n');
  return vtt;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const action = searchParams.get('action') || 'search';
  const fileId = searchParams.get('fileId');

  const apiKey = process.env.OPEN_SUBTITLES_API_KEY;

  if (!apiKey) {
    if (action === 'download' && fileId) {
       // Graceful fallback for mock subtitle download
       const mockSrt = `1\n00:00:01,000 --> 00:00:05,000\n[Mock Subtitle] Server requires OPEN_SUBTITLES_API_KEY in .env\n\n2\n00:00:06,000 --> 00:00:10,000\nThis is a mock subtitle to allow UI development to proceed.`;
       const vtt = srtToVtt(mockSrt);
       return new NextResponse(vtt, {
           headers: { 'Content-Type': 'text/vtt; charset=utf-8' }
       });
    }

    // Graceful fallback for mock search results
    return NextResponse.json({
      data: [
        { fileId: "123", fileName: "[MOCK] Persian Subtitle.srt", language: "fa" },
        { fileId: "456", fileName: "[MOCK] English Subtitle.srt", language: "en" },
      ]
    });
  }

  try {
    if (action === 'download' && fileId) {
      // 1. Get the download link from OpenSubtitles using fileId
      const downloadRes = await fetch('https://api.opensubtitles.com/api/v1/download', {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ file_id: parseInt(fileId) })
      });

      if (!downloadRes.ok) {
        return NextResponse.json({ error: "Failed to request download link" }, { status: downloadRes.status });
      }

      const downloadData = await downloadRes.json();
      const downloadLink = downloadData.link;

      // 2. Fetch the actual subtitle content
      const contentRes = await fetch(downloadLink);
      const content = await contentRes.text();

      // 3. Convert SRT to WebVTT
      const vtt = srtToVtt(content);

      return new NextResponse(vtt, {
        headers: { 'Content-Type': 'text/vtt; charset=utf-8' }
      });
    }

    // Default action: SEARCH
    if (!q) {
      return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
    }

    const searchRes = await fetch(`https://api.opensubtitles.com/api/v1/subtitles?query=${encodeURIComponent(q)}&languages=fa,en`, {
      headers: {
        'Api-Key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!searchRes.ok) {
      return NextResponse.json({ error: "Failed to search subtitles" }, { status: searchRes.status });
    }

    const data = await searchRes.json();
    const results = data.data.slice(0, 15).map((item: any) => {
        const file = item.attributes.files[0];
        return {
           fileId: file.file_id,
           fileName: file.file_name,
           language: item.attributes.language,
        };
    });

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("OpenSubtitles API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
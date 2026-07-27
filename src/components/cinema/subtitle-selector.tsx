"use client";

import { useState } from "react";
import { Subtitles, Loader2, Download, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface SubtitleResult {
  id: string;
  title: string;
  language: string;
  url: string;
  source?: 'subdl' | 'subscene' | 'mock';
  downloads?: number;
}

interface SubtitleSelectorProps {
  title?: string;
  onSubtitleReady: (vttUrl: string) => void;
}

export function SubtitleSelector({ title = "", onSubtitleReady }: SubtitleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(title);
  const [results, setResults] = useState<SubtitleResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/subtitles?action=search&q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "خطا در دریافت لیست زیرنویس‌ها");

      setResults(data.results || []);
      if (data.results?.length === 0) {
        setError("هیچ زیرنویسی یافت نشد.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = async (url: string, id: string) => {
    setDownloadingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/subtitles?action=download&url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "خطا در دانلود فایل زیرنویس");
      }

      // The response is plain WebVTT text
      const vttText = await res.text();

      // Create Blob URL for the track
      const blob = new Blob([vttText], { type: 'text/vtt' });
      const blobUrl = URL.createObjectURL(blob);

      onSubtitleReady(blobUrl);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && results.length === 0 && query) {
      handleSearch();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" title="جستجو و تنظیم زیرنویس">
          <Subtitles className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] bg-zinc-950 text-white border-zinc-800" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Subtitles className="h-5 w-5 text-primary" />
              جستجوی زیرنویس (Subdl & Subscene)
            </span>
            <Badge variant="secondary" className="bg-purple-950/60 text-purple-300 border-purple-800 text-[10px] gap-1">
              <Sparkles className="size-3" /> هوشمند
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mt-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="نام فیلم یا سریال..."
            className="bg-zinc-900 border-zinc-800 text-right text-white"
          />
          <Button onClick={handleSearch} disabled={isSearching} className="gap-2 shrink-0">
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            جستجو
          </Button>
        </div>

        {error && (
          <div className="text-red-400 text-sm mt-2 text-right">{error}</div>
        )}

        <ScrollArea className="h-[320px] mt-3 rounded-md border border-zinc-800 bg-zinc-900/50 p-2">
          {results.length > 0 ? (
            <div className="space-y-2">
              {results.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors border border-zinc-800/80"
                >
                  <div className="flex flex-col gap-1 overflow-hidden pl-2 text-right">
                    <span className="text-xs sm:text-sm font-medium truncate text-zinc-100" title={sub.title} dir="ltr">
                      {sub.title}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="w-fit text-[10px] border-zinc-700 text-zinc-300">
                        {sub.language === 'fa' ? 'فارسی' : sub.language}
                      </Badge>
                      {sub.source && (
                        <Badge variant="secondary" className="w-fit text-[9px] bg-zinc-900 text-zinc-400 border border-zinc-800">
                          {sub.source.toUpperCase()}
                        </Badge>
                      )}
                      {sub.downloads ? (
                        <span className="text-[10px] text-zinc-500">
                          {sub.downloads.toLocaleString()} دریافت
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shrink-0 gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                    disabled={downloadingId === sub.id}
                    onClick={() => handleDownload(sub.url, sub.id)}
                  >
                    {downloadingId === sub.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span className="text-xs hidden sm:inline">انتخاب</span>
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : !isSearching && !error ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm text-center p-4">
              نام فیلم را وارد کرده و دکمه جستجو را بزنید.
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

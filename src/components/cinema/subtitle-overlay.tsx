"use client";

import { useEffect, useState, useMemo } from "react";
import { SlidersHorizontal, Plus, Minus, RotateCcw, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Cue {
  start: number;
  end: number;
  text: string;
}

interface SubtitleOverlayProps {
  vttUrl: string | null;
  currentTime?: number;
  isPlaying?: boolean;
  className?: string;
}

/**
 * Custom VTT subtitle parser
 */
function parseVtt(vttText: string): Cue[] {
  const cues: Cue[] = [];
  const lines = vttText.split(/\r?\n/);
  let i = 0;

  // Skip WEBVTT header and metadata
  while (i < lines.length && !lines[i].includes("-->")) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes("-->")) {
      const parts = line.split("-->").map((s) => s.trim().split(" ")[0]);
      if (parts.length >= 2) {
        const start = parseTimestamp(parts[0]);
        const end = parseTimestamp(parts[1]);

        i++;
        const textLines: string[] = [];
        while (i < lines.length && lines[i].trim() !== "" && !lines[i].includes("-->")) {
          // Remove HTML/VTT tags like <v ...>, <b>, <i>, <c.color>
          const cleanLine = lines[i].replace(/<[^>]*>/g, "").trim();
          if (cleanLine) textLines.push(cleanLine);
          i++;
        }

        if (!isNaN(start) && !isNaN(end) && textLines.length > 0) {
          cues.push({
            start,
            end,
            text: textLines.join("\n"),
          });
        }
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return cues;
}

function parseTimestamp(ts: string): number {
  // Format: HH:MM:SS.mmm or MM:SS.mmm
  const parts = ts.replace(",", ".").split(":");
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  return 0;
}

export function SubtitleOverlay({
  vttUrl,
  currentTime = 0,
  isPlaying = true,
  className = "",
}: SubtitleOverlayProps) {
  const [cues, setCues] = useState<Cue[]>([]);
  const [offset, setOffset] = useState<number>(0); // Sync offset in seconds
  const [internalTime, setInternalTime] = useState<number>(0);
  const [showSyncControls, setShowSyncControls] = useState(false);

  // Load and parse VTT file
  useEffect(() => {
    if (!vttUrl) {
      setCues([]);
      return;
    }

    let isMounted = true;
    fetch(vttUrl)
      .then((res) => res.text())
      .then((text) => {
        if (isMounted) {
          const parsed = parseVtt(text);
          setCues(parsed);
        }
      })
      .catch((err) => console.error("Error loading VTT for overlay:", err));

    return () => {
      isMounted = false;
    };
  }, [vttUrl]);

  // Sync internal time with parent provided currentTime
  useEffect(() => {
    setInternalTime(currentTime);
  }, [currentTime]);

  // Self-timer backup for iframe players where parent doesn't provide fine-grained currentTime ticks
  useEffect(() => {
    if (!vttUrl || !isPlaying || currentTime > 0) return;

    const interval = setInterval(() => {
      setInternalTime((t) => t + 0.25);
    }, 250);

    return () => clearInterval(interval);
  }, [vttUrl, isPlaying, currentTime]);

  // Find active cue considering offset
  const effectiveTime = internalTime + offset;
  const activeCue = useMemo(() => {
    if (!cues.length) return null;
    return cues.find((c) => effectiveTime >= c.start && effectiveTime <= c.end) || null;
  }, [cues, effectiveTime]);

  if (!vttUrl) return null;

  return (
    <div className={`absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 ${className}`}>
      {/* Top Sync Offset Control Bar (Interactive) */}
      <div className="flex justify-end pointer-events-auto">
        <Popover open={showSyncControls} onOpenChange={setShowSyncControls}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 bg-black/70 hover:bg-black/90 border-white/20 text-white/90 text-[11px] gap-1.5 backdrop-blur-md shadow-lg"
              title="تنظیم هماهنگی زیرنویس"
            >
              <SlidersHorizontal className="size-3 text-purple-400" />
              <span>هماهنگی زیرنویس</span>
              {offset !== 0 && (
                <span className={`px-1 rounded text-[10px] font-mono ${offset > 0 ? "bg-amber-500/30 text-amber-300" : "bg-blue-500/30 text-blue-300"}`}>
                  {offset > 0 ? `+${offset.toFixed(1)}s` : `${offset.toFixed(1)}s`}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 bg-zinc-950/95 border-zinc-800 text-white text-xs p-3 backdrop-blur-xl shadow-2xl" dir="rtl">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">تأخیر زیرنویس:</span>
                <span className="font-mono text-purple-400 font-bold">
                  {offset > 0 ? `+${offset.toFixed(1)}s` : `${offset.toFixed(1)}s`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] bg-zinc-900 border-zinc-700"
                  onClick={() => setOffset((o) => o - 1)}
                >
                  -1s
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] bg-zinc-900 border-zinc-700"
                  onClick={() => setOffset((o) => o - 0.5)}
                >
                  -0.5s
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] bg-zinc-900 border-zinc-700"
                  onClick={() => setOffset((o) => o + 0.5)}
                >
                  +0.5s
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] bg-zinc-900 border-zinc-700"
                  onClick={() => setOffset((o) => o + 1)}
                >
                  +1s
                </Button>
              </div>
              {offset !== 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] text-zinc-400 hover:text-white gap-1 mt-1"
                  onClick={() => setOffset(0)}
                >
                  <RotateCcw className="size-3" />
                  بازنشانی (0.0s)
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Subtitle Cue Text Display */}
      {activeCue ? (
        <div className="mb-6 flex justify-center text-center">
          <div className="max-w-[90%] sm:max-w-[80%] bg-black/80 backdrop-blur-md text-white font-medium text-sm sm:text-base md:text-lg px-4 py-2 rounded-xl border border-white/10 shadow-2xl leading-relaxed animate-in fade-in zoom-in-95 duration-100 whitespace-pre-line dir-rtl">
            {activeCue.text}
          </div>
        </div>
      ) : null}
    </div>
  );
}

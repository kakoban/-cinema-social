"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "@/stores/router";
import { useI18n } from "@/i18n";

interface MovieCardProps {
  movie: {
    id?: string;
    tmdbId?: number;
    identifier?: string;
    title: string;
    poster?: string | null;
    rating?: number | null;
    year?: number | null;
    source?: string;
  };
  className?: string;
}

export function MovieCard({ movie, className }: MovieCardProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  // build navigation target: prefer local id, then tmdbId, then archive identifier
  const targetId = movie.id || (movie.tmdbId ? String(movie.tmdbId) : movie.identifier || "");
  const href = targetId ? `/movie/${targetId}` : "";

  return (
    <button
      onClick={() => href && navigate(href)}
      className={cn(
        "card-lift group text-start rounded-xl overflow-hidden border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/60",
        className
      )}
    >
      <div className="relative aspect-[2/3] bg-muted overflow-hidden">
        {movie.poster ? (
          <Image
            src={movie.poster}
            alt={movie.title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 20vw, 200px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs px-2 text-center">
            {movie.title}
          </div>
        )}
        {typeof movie.rating === "number" && movie.rating > 0 && (
          <div className="absolute top-2 end-2 flex items-center gap-1 rounded-full bg-black/70 backdrop-blur px-2 py-0.5 text-xs font-semibold text-yellow-400">
            <Star className="size-3 fill-yellow-400 text-yellow-400" />
            {movie.rating.toFixed(1)}
          </div>
        )}
        {movie.source === "ARCHIVE" && (
          <div className="absolute top-2 start-2 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Free
          </div>
        )}
        {movie.source === "YOUTUBE" && (
          <div className="absolute top-2 start-2 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            YouTube
          </div>
        )}
        {movie.source === "VIMEO" && (
          <div className="absolute top-2 start-2 rounded-full bg-blue-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Vimeo
          </div>
        )}
        {movie.source === "TMDB" && (
          <div className="absolute top-2 start-2 rounded-full bg-purple-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm border border-white/20">
            Stream
          </div>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-medium line-clamp-1 text-card-foreground">
          {movie.title}
        </h3>
        {movie.year ? (
          <p className="text-xs text-muted-foreground mt-0.5">{movie.year}</p>
        ) : null}
      </div>
    </button>
  );
}

export function MovieCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card animate-pulse">
      <div className="aspect-[2/3] bg-muted" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 w-3/4 bg-muted rounded" />
        <div className="h-2.5 w-1/3 bg-muted rounded" />
      </div>
    </div>
  );
}

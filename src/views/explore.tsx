"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Film, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MovieCard, MovieCardSkeleton } from "@/components/cinema/movie-card";
import { AddCustomMovie } from "@/components/cinema/add-custom-movie";
import { api } from "@/lib/api-client";
import { useNavigate } from "@/stores/router";
import { useI18n } from "@/i18n";

interface SearchMovie {
  tmdbId?: number;
  identifier?: string;
  id?: string;
  title: string;
  poster: string | null;
  rating?: number;
  year: number | null;
  source: string;
}

export function ExploreView({ query, source }: { query?: string; source?: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [input, setInput] = useState(query || "");
  const [submitted, setSubmitted] = useState(query || "");
  const [activeSource, setActiveSource] = useState<"tmdb" | "archive" | "youtube" | "vimeo">(
    (source as "tmdb" | "archive" | "youtube" | "vimeo") || "tmdb"
  );
  const [prevQuery, setPrevQuery] = useState(query);

  if (query !== prevQuery) {
    setPrevQuery(query);
    setInput(query || "");
    setSubmitted(query || "");
  }

  const { data, isLoading } = useQuery<{ results: SearchMovie[] }>({
    queryKey: ["search", activeSource, submitted],
    queryFn: async () => {
      const res = await api.get<{ results: SearchMovie[] }>(
        `/api/movies/search?q=${encodeURIComponent(submitted)}&source=${activeSource}`
      );
      return (res.data as { results: SearchMovie[] }) || { results: [] };
    },
    enabled: !!submitted,
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(input.trim());
    navigate(`/explore?q=${encodeURIComponent(input.trim())}&source=${activeSource}`);
  };

  const handleSourceChange = (s: "tmdb" | "archive" | "youtube" | "vimeo") => {
    setActiveSource(s);
    if (submitted) {
      navigate(`/explore?q=${encodeURIComponent(submitted)}&source=${s}`);
    }
  };

  const hasResults = (data?.results?.length ?? 0) > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">{t("explore.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("explore.subtitle")}</p>
        </div>
        <AddCustomMovie />
      </div>

      <form onSubmit={onSubmit} className="mb-6">
        <div className="relative max-w-2xl">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("explore.searchPlaceholder")}
            className="ps-11 h-12 text-base bg-card"
            autoFocus
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 ms-1">{t("explore.searchHint")}</p>
      </form>

      {/* Source filter */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-sm text-muted-foreground me-1">{t("explore.source")}:</span>
        {(["tmdb", "archive", "youtube", "vimeo"] as const).map((s) => (
          <Button
            key={s}
            variant={activeSource === s ? "default" : "outline"}
            size="sm"
            onClick={() => handleSourceChange(s)}
            className={activeSource === s ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {s === "tmdb" ? "New Movies (TMDB)" : s === "archive" ? t("explore.archiveResults") : s === "youtube" ? "YouTube" : "Vimeo"}
          </Button>
        ))}
      </div>

      {!submitted ? (
        <Card className="p-12 text-center">
          <Search className="size-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">{t("explore.searchPlaceholder")}</p>
        </Card>
      ) : !hasResults && !isLoading ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">{t("noResults")}</p>
        </Card>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Film className={`size-4 ${activeSource === 'archive' ? 'text-emerald-500' : activeSource === 'youtube' ? 'text-red-500' : activeSource === 'vimeo' ? 'text-blue-500' : 'text-primary'}`} />
              {activeSource === "tmdb" ? t("explore.tmdbResults") : activeSource === "archive" ? t("explore.archiveResults") : activeSource === "youtube" ? "YouTube Results" : "Vimeo Results"}
              {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </h2>
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <MovieCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {data?.results?.map((m) => (
                  <MovieCard
                    key={m.id || m.tmdbId || m.identifier}
                    movie={{
                      tmdbId: m.tmdbId,
                      identifier: m.identifier || m.id,
                      title: m.title,
                      poster: m.poster,
                      rating: m.rating,
                      year: typeof m.year === 'string' ? parseInt(m.year, 10) : m.year,
                      source: m.source,
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

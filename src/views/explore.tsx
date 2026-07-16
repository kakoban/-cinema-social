"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Film, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MovieCard, MovieCardSkeleton } from "@/components/cinema/movie-card";
import { api } from "@/lib/api-client";
import { useNavigate } from "@/stores/router";
import { useI18n } from "@/i18n";

interface TmdbMovie {
  tmdbId: number;
  title: string;
  poster: string | null;
  rating: number;
  year: number | null;
  source: string;
}
interface ArchiveMovie {
  identifier: string;
  title: string;
  poster: string;
  year: string | null;
  source: string;
}

export function ExploreView({ query, source }: { query?: string; source?: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [input, setInput] = useState(query || "");
  const [submitted, setSubmitted] = useState(query || "");
  const [activeSource, setActiveSource] = useState<"all" | "tmdb" | "archive">(
    source === "archive" ? "archive" : "all"
  );
  const [prevQuery, setPrevQuery] = useState(query);

  // Adjust local state when the URL query prop changes (render-time pattern)
  if (query !== prevQuery) {
    setPrevQuery(query);
    setInput(query || "");
    setSubmitted(query || "");
  }

  const tmdbSearch = useQuery<{ results: TmdbMovie[] }>({
    queryKey: ["tmdb-search", submitted],
    queryFn: () =>
      api.get(`/api/movies/search?q=${encodeURIComponent(submitted)}`).then((r) => r.data!),
    enabled: !!submitted && activeSource !== "archive",
  });

  const archiveSearch = useQuery<{ results: ArchiveMovie[] }>({
    queryKey: ["archive-search", submitted],
    queryFn: () =>
      api.get(`/api/movies/archive/search?q=${encodeURIComponent(submitted)}`).then((r) => r.data!),
    enabled: !!submitted && activeSource !== "tmdb",
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(input.trim());
    navigate(`/explore?q=${encodeURIComponent(input.trim())}`);
  };

  const hasResults =
    (tmdbSearch.data?.results?.length ?? 0) > 0 ||
    (archiveSearch.data?.results?.length ?? 0) > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">{t("explore.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("explore.subtitle")}</p>
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
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-muted-foreground me-1">{t("explore.source")}:</span>
        {(["all", "tmdb", "archive"] as const).map((s) => (
          <Button
            key={s}
            variant={activeSource === s ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSource(s)}
            className={activeSource === s ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {s === "all" ? t("explore.all") : s === "tmdb" ? "TMDB" : t("explore.archiveResults")}
          </Button>
        ))}
      </div>

      {!submitted ? (
        <Card className="p-12 text-center">
          <Search className="size-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">{t("explore.searchPlaceholder")}</p>
        </Card>
      ) : !hasResults && !tmdbSearch.isLoading && !archiveSearch.isLoading ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">{t("noResults")}</p>
        </Card>
      ) : (
        <div className="space-y-10">
          {/* TMDB results */}
          {activeSource !== "archive" && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Film className="size-4 text-primary" />
                {t("explore.tmdbResults")}
                {tmdbSearch.isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              </h2>
              {tmdbSearch.isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <MovieCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {tmdbSearch.data?.results?.map((m) => (
                    <MovieCard
                      key={m.tmdbId}
                      movie={{
                        tmdbId: m.tmdbId,
                        title: m.title,
                        poster: m.poster,
                        rating: m.rating,
                        year: m.year,
                        source: m.source,
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Archive results */}
          {activeSource !== "tmdb" && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Film className="size-4 text-emerald-500" />
                {t("explore.archiveResults")}
                {archiveSearch.isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              </h2>
              {archiveSearch.isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <MovieCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {archiveSearch.data?.results?.map((m) => (
                    <MovieCard
                      key={m.identifier}
                      movie={{
                        identifier: m.identifier,
                        title: m.title,
                        poster: m.poster,
                        year: m.year ? parseInt(m.year, 10) : null,
                        source: "ARCHIVE",
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

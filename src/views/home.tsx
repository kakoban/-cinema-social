"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Film, Search, Users, Play, Sparkles, TrendingUp, AlertTriangle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { MovieCard, MovieCardSkeleton } from "@/components/cinema/movie-card";
import { UserAvatar } from "@/components/cinema/user-avatar";
import { StarRating } from "@/components/cinema/star-rating";
import { api } from "@/lib/api-client";
import { useNavigate } from "@/stores/router";
import { useAuthStore } from "@/stores/auth-store";
import { useI18n } from "@/i18n";

interface TrendingMovie {
  tmdbId: number;
  title: string;
  poster: string | null;
  backdrop: string | null;
  description: string;
  year: number | null;
  rating: number;
  source: string;
}

interface FeaturedMovie {
  id: string;
  title: string;
  poster: string | null;
  year: number | null;
  rating: number | null;
  archiveId: string | null;
  source: string;
}

interface FeedItem {
  id: string;
  content: string;
  rating: number;
  createdAt: string;
  user: { id: string; username: string; avatar: string | null };
  movie: { id: string; title: string; poster: string | null; year: number | null };
}

export function HomeView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const trending = useQuery<{ results: TrendingMovie[]; configured: boolean }>({
    queryKey: ["trending"],
    queryFn: async () => {
      const res = await api.get<{ results: TrendingMovie[]; configured: boolean }>("/api/movies/trending");
      return (res.data as { results: TrendingMovie[]; configured: boolean }) || { results: [], configured: false };
    },
  });

  const archive = useQuery<FeaturedMovie[]>({
    queryKey: ["featured"],
    queryFn: async () => {
      const res = await api.get<FeaturedMovie[]>("/api/movies/featured");
      return (res.data as FeaturedMovie[]) || [];
    },
  });

  const feed = useQuery<{ items: FeedItem[] }>({
    queryKey: ["feed"],
    queryFn: async () => {
      const res = await api.get<{ items: FeedItem[] }>("/api/feed");
      return (res.data as { items: FeedItem[] }) || { items: [] };
    },
    enabled: !!user,
  });

  const recommendations = useQuery<FeaturedMovie[]>({
    queryKey: ["recommendations"],
    queryFn: async () => {
      const res = await api.get<FeaturedMovie[]>("/api/movies/recommendations");
      return (res.data as FeaturedMovie[]) || [];
    },
    enabled: !!user,
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-24 -start-24 size-96 bg-red-600 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -end-24 size-96 bg-red-800 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground mb-6">
            <Sparkles className="size-3.5 text-yellow-400" />
            {t("tagline")}
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4">
            {t("home.heroTitle")}{" "}
            <span className="text-primary">{t("home.heroTitleAccent")}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {t("home.heroSubtitle")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate("/explore")}
              className="bg-red-600 hover:bg-red-700"
            >
              <Search className="size-4 me-2" />
              {t("home.ctaExplore")}
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/rooms")}>
              <Users className="size-4 me-2" />
              {t("home.ctaRooms")}
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { icon: Film, label: t("nav.explore") },
              { icon: Users, label: t("nav.rooms") },
              { icon: Play, label: t("movie.watchNow") },
            ].map((f, i) => (
              <div key={i} className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="size-10 rounded-full bg-card border border-border flex items-center justify-center">
                  <f.icon className="size-5 text-primary" />
                </div>
                <span className="text-xs">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
        {/* TMDB setup banner */}
        {trending.data && !trending.data.configured && (
          <Card className="border-yellow-500/30 bg-yellow-500/5 p-5">
            <div className="flex gap-3">
              <AlertTriangle className="size-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{t("home.setupBanner")}</h3>
                <p className="text-sm text-muted-foreground">{t("home.setupDesc")}</p>
                <a
                  href="https://www.themoviedb.org/settings/api"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                >
                  {t("home.learnMore")} →
                </a>
              </div>
            </div>
          </Card>
        )}

        {/* Trending */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              {t("home.trending")}
            </h2>
          </div>
          {trending.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))}
            </div>
          ) : trending.data?.results?.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {trending.data.results.map((m) => (
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
          ) : (
            <p className="text-sm text-muted-foreground">
              {trending.data?.configured ? t("noResults") : "—"}
            </p>
          )}
        </section>

        {/* Archive classics */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Film className="size-5 text-emerald-500" />
                {t("home.archive")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{t("home.archiveDesc")}</p>
            </div>
          </div>
          {archive.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {archive.data?.map((m) => (
                <MovieCard
                  key={m.id}
                  movie={{
                    id: m.id,
                    title: m.title,
                    poster: m.poster,
                    year: m.year,
                    rating: m.rating ?? undefined,
                    source: "ARCHIVE",
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Recommendations */}
        {user && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <Star className="size-5 text-yellow-500" />
                  Recommended for You
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Based on your ratings and watchlist</p>
              </div>
            </div>
            {recommendations.isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <MovieCardSkeleton key={i} />
                ))}
              </div>
            ) : recommendations.data?.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {recommendations.data.map((m) => (
                  <MovieCard
                    key={m.id}
                    movie={{
                      id: m.id,
                      title: m.title,
                      poster: m.poster,
                      year: m.year,
                      rating: m.rating ?? undefined,
                      source: m.source,
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Rate some movies to get recommendations!</p>
            )}
          </section>
        )}

        {/* Activity feed */}
        {user && (
          <section>
            <h2 className="text-xl sm:text-2xl font-bold mb-5 flex items-center gap-2">
              <Users className="size-5 text-primary" />
              {t("home.activity")}
            </h2>
            {feed.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : feed.data?.items?.length ? (
              <div className="space-y-3">
                {feed.data.items.map((item) => (
                  <Card key={item.id} className="p-4 flex gap-3">
                    <UserAvatar username={item.user.username} avatar={item.user.avatar} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => navigate(`/profile/${item.user.username}`)}
                          className="font-medium text-sm hover:text-primary"
                        >
                          {item.user.username}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {t("review.rating", { n: item.rating })}
                        </span>
                        <StarRating value={item.rating} size={12} />
                      </div>
                      <button
                        onClick={() => navigate(`/movie/${item.movie.id}`)}
                        className="text-xs text-muted-foreground hover:text-primary mt-0.5 block"
                      >
                        on <span className="font-medium">{item.movie.title}</span>
                        {item.movie.year ? ` (${item.movie.year})` : ""}
                      </button>
                      <p className="text-sm mt-1.5 line-clamp-2">{item.content}</p>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                {t("home.activityEmpty")}
              </Card>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

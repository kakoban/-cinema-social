"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import {
  Play,
  Plus,
  Star,
  Trash2,
  Pencil,
  Users,
  Youtube,
  Calendar,
  Clock,
  Film,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useNavigate } from "@/stores/router";
import { useAuthStore } from "@/stores/auth-store";
import { useI18n } from "@/i18n";
import { UserAvatar } from "@/components/cinema/user-avatar";
import { StarRating, RatingInput } from "@/components/cinema/star-rating";

interface MovieDetail {
  id: string;
  tmdbId: number | null;
  archiveId: string | null;
  title: string;
  poster: string | null;
  backdrop: string | null;
  description: string | null;
  year: number | null;
  rating: number | null;
  genre: string | null;
  runtime: number | null;
  source: string;
  videoUrl: string | null;
  trailerUrl: string | null;
  avgRating: number | null;
  reviewCount: number;
}

interface Review {
  id: string;
  content: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
  user: { id: string; username: string; avatar: string | null };
}

interface Watchlist {
  id: string;
  name: string;
  items: { movieId: string }[];
}

export function MovieView({ id }: { id: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const movie = useQuery<MovieDetail>({
    queryKey: ["movie", id],
    queryFn: async () => {
      const r = await api.get<MovieDetail>(`/api/movies/${id}`);
      if (!r.success || !r.data) throw new Error(r.error || "Movie not found");
      return r.data;
    },
    retry: false,
  });

  const reviews = useQuery<Review[]>({
    queryKey: ["movie-reviews", movie.data?.id],
    queryFn: async () => {
      const r = await api.get<Review[]>(`/api/movies/${movie.data!.id}/reviews`);
      return r.data || [];
    },
    enabled: !!movie.data?.id,
  });

  const watchlists = useQuery<Watchlist[]>({
    queryKey: ["watchlists"],
    queryFn: async () => {
      const r = await api.get<Watchlist[]>("/api/watchlists");
      return r.data || [];
    },
    enabled: !!user,
  });

  const [showTrailer, setShowTrailer] = useState(false);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewRating, setReviewRating] = useState(7);
  const [editingId, setEditingId] = useState<string | null>(null);

  const myReview = reviews.data?.find((r) => r.user.id === user?.id);
  const [prevReviewId, setPrevReviewId] = useState<string | null>(null);

  // Sync form state when myReview loads or editing target changes (render-time pattern)
  if (myReview && !editingId && myReview.id !== prevReviewId) {
    setPrevReviewId(myReview.id);
    setReviewContent(myReview.content);
    setReviewRating(myReview.rating);
  }

  const submitReview = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return api.put(`/api/reviews/${editingId}`, {
          content: reviewContent,
          rating: reviewRating,
        });
      }
      return api.post(`/api/movies/${movie.data!.id}/reviews`, {
        content: reviewContent,
        rating: reviewRating,
      });
    },
    onSuccess: () => {
      toast.success(editingId ? t("movie.updateReview") : t("movie.postReview"));
      setEditingId(null);
      setReviewContent("");
      setReviewRating(7);
      qc.invalidateQueries({ queryKey: ["movie-reviews", movie.data?.id] });
      qc.invalidateQueries({ queryKey: ["movie", id] });
    },
    onError: (e: unknown) => {
      const err = e as { error?: string };
      toast.error(err.error || t("error"));
    },
  });

  const deleteReview = useMutation({
    mutationFn: (rid: string) => api.del(`/api/reviews/${rid}`),
    onSuccess: () => {
      toast.success(t("movie.deleteReview"));
      setEditingId(null);
      setReviewContent("");
      qc.invalidateQueries({ queryKey: ["movie-reviews", movie.data?.id] });
      qc.invalidateQueries({ queryKey: ["movie", id] });
    },
  });

  const addToWatchlist = useMutation({
    mutationFn: (listId: string) =>
      api.post(`/api/watchlists/${listId}/movies`, { movieId: movie.data!.id }),
    onSuccess: () => {
      toast.success(t("watchlist.added"));
      qc.invalidateQueries({ queryKey: ["watchlists"] });
    },
  });

  const startWatchParty = useMutation({
    mutationFn: () =>
      api
        .post<{ id: string }>("/api/rooms", {
          name: `${movie.data!.title} — Watch Party`,
          movieId: movie.data!.id,
          isPublic: true,
        })
        .then((r) => r.data!),
    onSuccess: (data) => {
      navigate(`/room/${data.id}`);
    },
    onError: () => {
      toast.error(t("error"));
    },
  });

  if (movie.isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Skeleton className="h-64 sm:h-80 w-full rounded-2xl mb-6" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="aspect-[2/3] rounded-xl" />
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!movie.data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="size-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">{t("error")}</p>
      </div>
    );
  }

  const m = movie.data;
  const trailerKey = m.trailerUrl
    ? m.trailerUrl.split("v=")[1]?.split("&")[0]
    : null;

  // determine watch embed url
  let watchEmbed: string | null = null;
  let streamEmbed: string | null = null;

  if (m.tmdbId) {
    // switch to autoembed as a reliable fallback, bypassing most common adblock/dns issues
    streamEmbed = `https://autoembed.co/movie/tmdb/${m.tmdbId}`;
  }

  if (m.videoUrl) {
    if (m.source === "ARCHIVE" || m.videoUrl.includes("archive.org")) {
      const aid = m.archiveId || m.videoUrl.split("/").pop();
      watchEmbed = `https://archive.org/embed/${aid}`;
    } else if (m.source === "YOUTUBE" || m.videoUrl.includes("youtube.com") || m.videoUrl.includes("youtu.be")) {
      const ytId = m.videoUrl.includes("youtu.be")
        ? m.videoUrl.split("/").pop()
        : m.videoUrl.split("v=")[1]?.split("&")[0] || m.videoUrl.split("/embed/")[1]?.split("?")[0];
      watchEmbed = `https://www.youtube.com/embed/${ytId}`;
    } else if (m.source === "VIMEO" || m.videoUrl.includes("vimeo.com")) {
      const vimId = m.videoUrl.split("/video/")[1]?.split("?")[0] || m.videoUrl.split("/").pop();
      watchEmbed = `https://player.vimeo.com/video/${vimId}`;
    } else {
      watchEmbed = m.videoUrl;
    }
  }

  return (
    <div>
      {/* Backdrop */}
      <div className="relative h-56 sm:h-80 w-full overflow-hidden border-b border-border">
        {m.backdrop ? (
          <Image
            src={m.backdrop}
            alt={m.title}
            fill
            unoptimized
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-red-950/40 via-card to-card" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-24 sm:-mt-32 relative z-10">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Poster + actions */}
          <div>
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-border shadow-2xl bg-card max-w-xs mx-auto md:mx-0">
              {m.poster ? (
                <Image
                  src={m.poster}
                  alt={m.title}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 768px) 60vw, 240px"
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Film className="size-12 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-4 max-w-xs mx-auto md:mx-0">
              {watchEmbed && (
                <Dialog open={showTrailer && !!watchEmbed} onOpenChange={setShowTrailer}>
                  <DialogTrigger asChild>
                    <Button className="bg-red-600 hover:bg-red-700 w-full">
                      <Play className="size-4 me-2" /> {t("movie.watchNow")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl p-0 overflow-hidden">
                    <div className="aspect-video">
                      <iframe src={watchEmbed} className="size-full" allowFullScreen allow="autoplay; fullscreen" />
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {streamEmbed && !watchEmbed && (
                <Dialog open={showTrailer && !!streamEmbed} onOpenChange={setShowTrailer}>
                  <DialogTrigger asChild>
                    <Button className="bg-red-600 hover:bg-red-700 w-full">
                      <Play className="size-4 me-2" /> Watch Free Stream
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl sm:rounded-2xl">
                    <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/80 border-b border-white/10 backdrop-blur-md">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span className="font-semibold text-sm text-white/90 uppercase tracking-wider">Free Stream</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-white/40">External Provider</p>
                      </div>
                    </div>
                    <div className="aspect-video w-full bg-black relative">
                      <div className="absolute inset-0 flex items-center justify-center -z-10">
                        <Loader2 className="size-8 animate-spin text-red-600/50" />
                      </div>
                      <iframe src={streamEmbed} className="size-full absolute inset-0" allowFullScreen allow="autoplay; fullscreen" />
                    </div>
                    <div className="bg-zinc-900 px-4 py-2 flex items-start gap-3">
                       <span className="text-xl">💡</span>
                       <div>
                         <p className="text-xs text-white/80 font-medium">Player not loading?</p>
                         <p className="text-[11px] text-white/50 mt-0.5">Change the server from the settings gear icon inside the player, or try pausing AdBlockers.</p>
                       </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {m.trailerUrl && (
                <Dialog open={showTrailer && !watchEmbed && !streamEmbed} onOpenChange={setShowTrailer}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Youtube className="size-4 me-2" /> {t("movie.trailer")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl p-0 overflow-hidden">
                    <div className="aspect-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${trailerKey}`}
                        className="size-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {user ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Plus className="size-4 me-2" /> {t("movie.addToList")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-56">
                      {watchlists.data?.length ? (
                        watchlists.data.map((wl) => (
                          <DropdownMenuItem
                            key={wl.id}
                            onClick={() => addToWatchlist.mutate(wl.id)}
                            disabled={wl.items.some((it) => it.movieId === m.id)}
                          >
                            {wl.items.some((it) => it.movieId === m.id) ? "✓ " : ""}
                            {wl.name}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem onClick={() => navigate("/watchlist")}>
                          {t("watchlist.noLists")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => startWatchParty.mutate()}
                    disabled={startWatchParty.isPending}
                  >
                    {startWatchParty.isPending ? (
                      <Loader2 className="size-4 me-2 animate-spin" />
                    ) : (
                      <Users className="size-4 me-2" />
                    )}
                    {t("movie.startWatchParty")}
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {/* Info */}
          <div className="md:col-span-2">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">{m.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              {m.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-4" /> {m.year}
                </span>
              )}
              {m.runtime && (
                <span className="flex items-center gap-1">
                  <Clock className="size-4" /> {t("movie.runtime", { min: m.runtime })}
                </span>
              )}
              {m.genre && <Badge variant="secondary">{m.genre}</Badge>}
              {m.source === "ARCHIVE" && (
                <Badge className="bg-emerald-600 hover:bg-emerald-700">Free to watch</Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-6 mb-6">
              {m.rating && (
                <div className="flex items-center gap-2">
                  <div className="size-12 rounded-full bg-card border border-border flex items-center justify-center font-bold text-primary">
                    {m.rating.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div>TMDB</div>
                    <div>{t("movie.rating")}</div>
                  </div>
                </div>
              )}
              {m.avgRating && (
                <div className="flex flex-col items-center">
                  <StarRating value={m.avgRating} size={20} />
                  <span className="text-xs text-muted-foreground mt-1">
                    {m.avgRating.toFixed(1)} · {t("movie.reviewsCount", { count: m.reviewCount })}
                  </span>
                </div>
              )}
            </div>

            {m.description && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-2">{t("movie.overview")}</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {m.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-12 grid lg:grid-cols-3 gap-8">
          {/* Write review */}
          <div className="lg:col-span-1">
            <Card className="p-5 sticky top-20">
              <h2 className="font-semibold mb-3">
                {myReview || editingId ? t("movie.editReview") : t("movie.writeReview")}
              </h2>
              {!user ? (
                <p className="text-sm text-muted-foreground">{t("movie.loginToReview")}</p>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                      {t("movie.yourRating")}
                    </label>
                    <RatingInput value={reviewRating} onChange={setReviewRating} />
                  </div>
                  <Textarea
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    placeholder={t("movie.reviewPlaceholder")}
                    className="mb-3 min-h-24"
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      disabled={!reviewContent.trim() || submitReview.isPending}
                      onClick={() => submitReview.mutate()}
                    >
                      {submitReview.isPending && <Loader2 className="size-4 me-2 animate-spin" />}
                      {editingId ? t("movie.updateReview") : t("movie.postReview")}
                    </Button>
                    {myReview && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingId(myReview.id);
                          setReviewContent(myReview.content);
                          setReviewRating(myReview.rating);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* Reviews list */}
          <div className="lg:col-span-2">
            <h2 className="font-semibold mb-4">
              {t("movie.reviews")} ({reviews.data?.length ?? 0})
            </h2>
            {reviews.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            ) : reviews.data?.length ? (
              <div className="space-y-3">
                {reviews.data.map((r) => (
                  <Card key={r.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <button onClick={() => navigate(`/profile/${r.user.username}`)}>
                        <UserAvatar username={r.user.username} avatar={r.user.avatar} size={40} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => navigate(`/profile/${r.user.username}`)}
                            className="font-medium text-sm hover:text-primary"
                          >
                            {r.user.username}
                          </button>
                          <StarRating value={r.rating} size={12} />
                          <span className="text-xs text-muted-foreground">
                            {r.rating.toFixed(0)}/10
                          </span>
                          {r.updatedAt !== r.createdAt && (
                            <span className="text-xs text-muted-foreground italic">
                              {t("review.edited")}
                            </span>
                          )}
                          {r.user.id === user?.id && (
                            <div className="ms-auto flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingId(r.id);
                                  setReviewContent(r.content);
                                  setReviewRating(r.rating);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                className="text-muted-foreground hover:text-primary p-1"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                onClick={() => deleteReview.mutate(r.id)}
                                className="text-muted-foreground hover:text-destructive p-1"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          )}
                          {user?.role === "ADMIN" && r.user.id !== user?.id && (
                            <button
                              onClick={() => deleteReview.mutate(r.id)}
                              className="ms-auto text-muted-foreground hover:text-destructive p-1"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm mt-1.5 whitespace-pre-line">{r.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                {t("movie.noReviews")}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

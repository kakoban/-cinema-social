"use client";

import { useState, useEffect, useRef } from "react";
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
  ChevronDown,
  Check,
  Zap,
  Maximize2,
  Minimize2,
  Sparkles,
  Bot,
  Subtitles,
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
import { SubtitleSelector } from "@/components/cinema/subtitle-selector";
import { SubtitleOverlay } from "@/components/cinema/subtitle-overlay";
import { AiLoadingOverlay } from "@/components/cinema/ai-loading-overlay";

export interface ServerConfig {
  name: string;
  url: string;
  sandbox?: boolean | string;
}

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

  const [activeModal, setActiveModal] = useState<"watch" | "stream" | "trailer" | null>(null);
  const [activeServerIdx, setActiveServerIdx] = useState(0);
  const [isMaximized, setIsMaximized] = useState(false);
  const [subtitleTrackUrl, setSubtitleTrackUrl] = useState<string | null>(null);
  useEffect(() => {
    if (subtitleTrackUrl) {
      toast.success("زیرنویس نمایش داده شد! در صورت عدم هماهنگی از دکمه «هماهنگی زیرنویس» روی پلیر استفاده کنید.");
    }
  }, [subtitleTrackUrl]);
  const modalRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    const el = modalRef.current;
    if (!el) return;
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => setIsMaximized((v) => !v));
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      } else {
        setIsMaximized((v) => !v);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => setIsMaximized(false));
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else {
        setIsMaximized(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsMaximized(!!document.fullscreenElement || !!(document as any).webkitFullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  // Intercept SmashyStream and player actions (Watch Party, Bookmark, Search, Like) to route to our site
  useEffect(() => {
    if (!activeModal || activeModal !== "stream") return;

    const currentMovie = movie.data;

    const handleWatchPartyAction = async () => {
      if (!user) {
        toast.error("برای ساخت اتاق واچ پارتی لطفاً ابتدا وارد حساب کاربری خود شوید.");
        navigate("/login");
        return;
      }
      if (!currentMovie) return;

      toast.info("در حال ایجاد و انتقال به اتاق واچ پارتی سینما...");
      try {
        const res = await api.post<{ id: string }>("/api/rooms", {
          name: `واچ پارتی: ${currentMovie.title}`,
          description: `تماشای گروهی و هم‌زمان فیلم ${currentMovie.title}`,
          movieId: currentMovie.id,
          isPublic: true,
        });
        if (res.data?.id) {
          setActiveModal(null);
          navigate(`/room/${res.data.id}`);
        }
      } catch (err: any) {
        console.error("Watch party creation error:", err);
        toast.error("خطا در ایجاد اتاق واچ پارتی سینما");
      }
    };

    const handleBookmarkAction = async () => {
      if (!user) {
        toast.error("برای افزودن به لیست تماشا ابتدا وارد حساب کاربری شوید.");
        return;
      }
      if (!currentMovie) return;

      try {
        let userLists = watchlists.data || [];
        let targetListId: string | undefined = userLists[0]?.id;

        if (!targetListId) {
          const createRes = await api.post<{ id: string }>("/api/watchlists", { name: "لیست من" });
          targetListId = createRes.data?.id;
        }

        if (targetListId) {
          await api.post(`/api/watchlists/${targetListId}/movies`, { movieId: currentMovie.id });
          qc.invalidateQueries({ queryKey: ["watchlists"] });
          toast.success(`فیلم «${currentMovie.title}» به لیست تماشای شما اضافه شد!`);
        }
      } catch (err) {
        toast.error("خطا در افزودن به لیست تماشا");
      }
    };

    // 1. PostMessage Event Listener
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;
      const rawData = typeof event.data === "string" ? event.data : JSON.stringify(event.data);
      const lower = rawData.toLowerCase();

      // Check for Watch Party keywords
      if (
        lower.includes("watchparty") || 
        lower.includes("watch_party") || 
        lower.includes("create_room") || 
        lower.includes("party")
      ) {
        handleWatchPartyAction();
      }
      // Check for Bookmark / Watchlist keywords
      else if (lower.includes("bookmark") || lower.includes("favorite") || lower.includes("watchlist")) {
        handleBookmarkAction();
      }
      // Check for Search keywords
      else if (lower.includes("search") && !lower.includes("subtitle")) {
        setActiveModal(null);
        navigate("/movies");
      }
      // Check for Like / Review keywords
      else if (lower.includes("like") || lower.includes("review")) {
        setActiveModal(null);
        const reviewSection = document.getElementById("reviews-section");
        if (reviewSection) {
          reviewSection.scrollIntoView({ behavior: "smooth" });
        }
      }
    };

    // 2. Override window.open to catch popup links from embed servers
    const originalOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string) {
      const urlStr = url ? url.toString().toLowerCase() : "";
      // Handle SmashyStream actions → route to our site
      if (
        urlStr.includes("watchparty") || 
        urlStr.includes("watch_party") || 
        urlStr.includes("smashy") || 
        urlStr.includes("party") || 
        urlStr.includes("room")
      ) {
        handleWatchPartyAction();
        return null;
      }
      if (urlStr.includes("bookmark") || urlStr.includes("favorite")) {
        handleBookmarkAction();
        return null;
      }
      // Block ad popups from embed servers (allow only same-site URLs)
      const currentHost = window.location.hostname;
      try {
        const popupHost = new URL(url?.toString() || "", window.location.href).hostname;
        if (popupHost !== currentHost) {
          console.log("[Ad Blocker] Blocked popup:", urlStr.substring(0, 80));
          return null;
        }
      } catch { /* invalid URL, block it */ return null; }
      return originalOpen.apply(this, arguments as any);
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.open = originalOpen;
    };
  }, [activeModal, user, movie.data, watchlists.data, qc, navigate]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);

  const runAiServerFinder = async () => {
    if (!movie.data) return;
    setAiLoading(true);
    setAiRecommendation(null);
    try {
      const tmdb = movie.data.tmdbId || movie.data.id;
      const imdb = (movie.data as any).imdbId || "";
      const title = movie.data.title;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`/api/movies/ai-server-finder?tmdbId=${tmdb}&imdbId=${imdb}&title=${encodeURIComponent(title)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data.aiRecommendation) {
          setAiRecommendation(data.aiRecommendation);
        }
        if (data.recommendedServer?.name) {
          const recName = data.recommendedServer.name.toLowerCase();
          const targetIdx = allServers.findIndex((s) => s.name.toLowerCase().includes(recName) || recName.includes(s.name.toLowerCase()));
          if (targetIdx !== -1) {
            setActiveServerIdx(targetIdx);
          } else if (typeof data.recommendedIndex === "number" && data.recommendedIndex < allServers.length) {
            setActiveServerIdx(data.recommendedIndex);
          }
        }
      } else {
        toast.error("AI Server Finder موقتاً در دسترس نیست. از دکمه Next Server استفاده کنید.");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        toast.error("جستجوی هوشمند سرور timeout شد. سرور بعدی رو امتحان کنید.");
      } else {
        console.error("AI Server Finder error:", err);
        toast.error("خطا در جستجوی هوشمند سرور. از دکمه Next Server استفاده کنید.");
      }
    } finally {
      setAiLoading(false);
    }
  };

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

  const allServers: ServerConfig[] = [];

  const defaultSandbox = "allow-same-origin allow-scripts allow-presentation allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-top-navigation-by-user-activation allow-downloads";

  if (m.tmdbId) {
    allServers.push(
      // ✅ Live-tested working servers (sorted by reliability)
      { name: "VidLink Pro", url: `https://vidlink.pro/movie/${m.tmdbId}`, sandbox: false },
      
    );
  }

  if (watchEmbed) {
    allServers.push({ name: "Archive / Direct", url: watchEmbed });
  }

  const activeServer = allServers[activeServerIdx] || allServers[0];
  const activeServerUrl = activeServer?.url || null;

  const handleNextServer = () => {
    if (allServers.length === 0) return;
    setActiveServerIdx((prev) => (prev + 1) % allServers.length);
    toast.info("Switched to next stream server");
  };

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
              {allServers.length > 0 && (
                <Button className="bg-red-600 hover:bg-red-700 w-full" onClick={() => setActiveModal("stream")}>
                  <Play className="size-4 me-2" /> {t("movie.watchNow")}
                </Button>
              )}

              {m.trailerUrl && (
                <Button variant="outline" className="w-full" onClick={() => setActiveModal("trailer")}>
                  <Youtube className="size-4 me-2" /> {t("movie.trailer")}
                </Button>
              )}

              <Dialog open={activeModal !== null} onOpenChange={(open) => !open && setActiveModal(null)}>
                <DialogContent className="sm:max-w-5xl md:max-w-6xl w-[95vw] p-0 overflow-hidden bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl sm:rounded-2xl" dir="ltr">
                  {activeModal === "stream" && activeServerUrl && (
                    <div ref={modalRef} className={isMaximized ? "fixed inset-0 z-[99999] w-screen h-screen bg-black flex flex-col overflow-hidden" : "flex flex-col"} dir="ltr">
                      {/* Premium Stream Header Bar */}
                      <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/90 border-b border-white/10 backdrop-blur-md gap-3 shrink-0">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                          </span>
                          <span className="font-bold text-xs sm:text-sm text-white uppercase tracking-wider">Stream Player</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {allServers.length > 1 && (
                            <>
                              {/* Server Selector Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs bg-zinc-900/90 border-white/20 text-white hover:bg-white/10 gap-1.5 px-3 rounded-lg max-w-[160px] sm:max-w-[240px] justify-between shadow-sm"
                                  >
                                    <span className="text-red-400 font-semibold shrink-0">Server:</span>
                                    <span className="truncate">{allServers[activeServerIdx]?.name || "Select"}</span>
                                    <ChevronDown className="size-3.5 text-white/50 shrink-0" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 bg-zinc-900/95 backdrop-blur-xl border-white/15 text-white p-1 shadow-2xl z-[100]">
                                  {allServers.map((srv, idx) => (
                                    <DropdownMenuItem
                                      key={idx}
                                      className={`text-xs p-2 rounded-md cursor-pointer flex items-center justify-between ${activeServerIdx === idx ? "bg-red-600 text-white font-medium" : "hover:bg-white/10 text-white/80"}`}
                                      onClick={() => setActiveServerIdx(idx)}
                                    >
                                      <span className="truncate">{srv.name}</span>
                                      {activeServerIdx === idx && <Check className="size-3.5 shrink-0 ms-1 text-white" />}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>

                              {/* AI Smart Server Finder Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs bg-purple-950/80 border-purple-500/40 text-purple-200 hover:bg-purple-900/60 gap-1.5 px-2.5 rounded-lg font-medium shadow-md shrink-0"
                                onClick={runAiServerFinder}
                                disabled={aiLoading}
                                title="Run OpenRouter AI Server Health Finder"
                              >
                                {aiLoading ? (
                                  <Loader2 className="size-3.5 animate-spin text-purple-400" />
                                ) : (
                                  <Sparkles className="size-3.5 text-purple-400 fill-purple-400/30" />
                                )}
                                <span className="hidden sm:inline">AI Finder</span>
                              </Button>

                              {/* Smart Next Server Button */}
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white gap-1 px-2.5 rounded-lg font-medium shadow-md shrink-0"
                                onClick={handleNextServer}
                                title="Try Next Server"
                              >
                                <Zap className="size-3.5 fill-current text-yellow-300 shrink-0" />
                                <span className="hidden sm:inline">Next Server</span>
                              </Button>
                            </>
                          )}

                          {/* Fullscreen Button */}
                          <SubtitleSelector title={m.title} onSubtitleReady={setSubtitleTrackUrl} />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 bg-zinc-900/90 border-white/20 text-white hover:bg-white/10 shrink-0"
                            onClick={toggleFullscreen}
                            title={isMaximized ? "Exit Fullscreen" : "Fullscreen"}
                          >
                            {isMaximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                          </Button>
                        </div>
                      </div>

                      {/* Video Container */}
                      <div className={`w-full bg-black relative ${isMaximized ? "flex-1 min-h-0" : "aspect-video"}`}>
                        {aiLoading && (
                          <AiLoadingOverlay recommendation={aiRecommendation} />
                        )}

                        <div className="absolute inset-0 flex items-center justify-center -z-10">
                          <Loader2 className="size-8 animate-spin text-red-600/50" />
                        </div>
                        <iframe
                          key={activeServerUrl}
                          src={activeServerUrl}
                          className="size-full absolute inset-0 border-0"
                          allowFullScreen={true}
                          allow="autoplay *; fullscreen *; encrypted-media *; picture-in-picture *; accelerometer *; gyroscope *"
                        />
                        <SubtitleOverlay vttUrl={subtitleTrackUrl} />
                      </div>

                      {/* Footer Tip Bar */}
                      <div className="bg-zinc-950/90 px-4 py-2.5 flex items-center justify-between gap-3 border-t border-white/10" dir="ltr">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {aiRecommendation ? (
                            <>
                              <Bot className="size-4 text-purple-400 shrink-0" />
                              <p className="text-xs text-purple-200 font-medium truncate" dir="rtl">
                                🤖 هوش مصنوعی: {aiRecommendation}
                              </p>
                            </>
                          ) : (
                            <>
                              <span className="text-sm shrink-0">💡</span>
                              <p className="text-xs text-white/70 truncate">
                                If current mirror is slow or blocked, use <strong className="text-purple-400">AI Finder</strong> or click <strong className="text-red-400 font-semibold">Next Server</strong>.
                              </p>
                            </>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] text-white/60 border-white/15 shrink-0 hidden md:inline-flex">
                          HD 1080p
                        </Badge>
                      </div>
                    </div>
                  )}

                  {activeModal === "trailer" && trailerKey && (
                    <div className="aspect-video" dir="ltr">
                      <iframe
                        src={`https://www.youtube.com/embed/${trailerKey}`}
                        className="size-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  )}
                </DialogContent>
              </Dialog>

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

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import {
  Send,
  Users,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Crown,
  LogOut,
  Video,
  AlertCircle,
  Loader2,
  Film,
  Music,
  SmilePlus,
  Subtitles,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { useNavigate } from "@/stores/router";
import { useAuthStore } from "@/stores/auth-store";
import { useI18n } from "@/i18n";
import { UserAvatar } from "@/components/cinema/user-avatar";
import YouTube from "react-youtube";
import { Player, HTMLPlayer, YouTubePlayer } from "@/components/cinema/player";
import { VideoChat } from "@/components/cinema/video-chat";

interface RoomMember {
  userId: string;
  username: string;
  isHost: boolean;
}
interface ChatMessage {
  id: string;
  userId: string | null;
  username: string;
  content: string;
  type: "TEXT" | "SYSTEM";
  createdAt: string;
}
interface RoomDetail {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  maxUsers: number;
  status: string;
  currentTime: number;
  isPlaying: boolean;
  host: { id: string; username: string; avatar: string | null };
  movie: {
    id: string;
    title: string;
    poster: string | null;
    videoUrl: string | null;
    trailerUrl: string | null;
    source: string;
    archiveId: string | null;
    description: string | null;
    year: number | null;
  } | null;
  members: { id: string; role: string; user: { id: string; username: string; avatar: string | null } }[];
  memberCount: number;
}

function videoKind(url: string | null): "direct" | "youtube" | "archive" | "vimeo" | "embed" | "none" {
  if (!url) return "none";
  const u = url.toLowerCase();
  if (u.includes("youtube.com/watch") || u.includes("youtube.com/embed") || u.includes("youtu.be")) return "youtube";
  if (u.includes("vimeo.com")) return "vimeo";
  if (u.includes("archive.org/download/") || /\.(mp4|ogv|webm|m4v|mpeg|mpg|mp3|wav|ogg|m4a|aac)(\?|$)/.test(u)) return "direct";
  if (u.includes("archive.org/embed")) return "archive";
  if (u.includes("autoembed.co") || u.includes("/embed/")) return "embed";
  return "embed";
}

function youtubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function RoomView({ id }: { id: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const room = useQuery<RoomDetail>({
    queryKey: ["room", id],
    queryFn: () => api.get<RoomDetail>(`/api/rooms/${id}`).then((r) => r.data!),
  });

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, { username: string; ts: number }>>({});
  const [reactions, setReactions] = useState<{ id: string; emoji: string; username: string }[]>([]);
  const [playback, setPlayback] = useState({ currentTime: 0, isPlaying: false });
  const [hostOffline, setHostOffline] = useState(false);
  const [joined, setJoined] = useState(false);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [localFileFingerprint, setLocalFileFingerprint] = useState<string | null>(null);
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const [expectedFileName, setExpectedFileName] = useState<string | null>(null);
  const [expectedFingerprint, setExpectedFingerprint] = useState<string | null>(null);
  const [fingerprintMismatch, setFingerprintMismatch] = useState(false);
  const [subtitleSearchOpen, setSubtitleSearchOpen] = useState(false);
  const [subtitlesSearching, setSubtitlesSearching] = useState(false);
  const [subtitleResults, setSubtitleResults] = useState<any[]>([]);
  const [subtitleSource, setSubtitleSource] = useState<'opensubtitles' | 'subscene'>('subscene');
  const [subtitleQuery, setSubtitleQuery] = useState('');

  const [changeMovieOpen, setChangeMovieOpen] = useState(false);
  const [movieSearchQuery, setMovieSearchQuery] = useState("");
  const [movieSearchResults, setMovieSearchResults] = useState<any[]>([]);
  const [isSearchingMovies, setIsSearchingMovies] = useState(false);
  const [customMovieUrl, setCustomMovieUrl] = useState("");
  const [customMovieTitle, setCustomMovieTitle] = useState("");
  const [activeRoomServerIdx, setActiveRoomServerIdx] = useState(0);

  const handleSearchMovies = async (q: string) => {
    setMovieSearchQuery(q);
    if (!q.trim()) {
      setMovieSearchResults([]);
      return;
    }
    setIsSearchingMovies(true);
    try {
      const res = await api.get<{ data: { results: any[] } }>(`/api/movies/search?q=${encodeURIComponent(q)}`);
      setMovieSearchResults(res.data?.results || []);
    } catch {
      toast.error("Failed to search movies");
    } finally {
      setIsSearchingMovies(false);
    }
  };

  const handleSelectMovie = async (mId: string) => {
    try {
      const res = await api.put<{ data: RoomDetail }>(`/api/rooms/${id}`, { movieId: mId });
      setChangeMovieOpen(false);
      qc.invalidateQueries({ queryKey: ["room", id] });
      toast.success("Movie changed successfully!");
      if (socket) {
        socket.emit("room:change-movie", { roomId: id, movie: res.data?.movie });
      }
    } catch {
      toast.error("Failed to change movie");
    }
  };

  const handleSelectSearchResult = async (item: any) => {
    try {
      let targetId = item.id;
      if (!targetId && item.tmdbId) {
        const mRes = await api.get<{ data: any }>(`/api/movies/${item.tmdbId}`);
        targetId = mRes.data?.id;
      }
      if (targetId) {
        await handleSelectMovie(targetId);
      }
    } catch {
      toast.error("Failed to import movie");
    }
  };

  const handleAddCustomUrlMovie = async () => {
    if (!customMovieUrl.trim()) return;
    try {
      const created = await api.post<{ data: { id: string } }>("/api/movies/custom", {
        title: customMovieTitle.trim() || "Custom Movie Stream",
        videoUrl: customMovieUrl.trim(),
      });
      if (created.data?.id) {
        await handleSelectMovie(created.data.id);
        setCustomMovieUrl("");
        setCustomMovieTitle("");
      }
    } catch {
      toast.error("Failed to add custom movie URL");
    }
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Player | null>(null);
  const ytPlayerInstance = useRef<any>(null);
  const isHostRef = useRef(false);
  const localFileNameRef = useRef<string | null>(null);
  const localFingerprintRef = useRef<string | null>(null);
  const lastSyncEmit = useRef(0);

  useEffect(() => { localFileNameRef.current = localFileName; }, [localFileName]);
  useEffect(() => { localFingerprintRef.current = localFileFingerprint; }, [localFileFingerprint]);
  useEffect(() => () => { if (localVideoUrl) URL.revokeObjectURL(localVideoUrl); }, [localVideoUrl]);

  // Fast file fingerprint: hash first 1MB + last 1MB + file size
  async function computeFingerprint(file: File): Promise<string> {
    const CHUNK = 1024 * 1024; // 1MB
    const head = file.slice(0, CHUNK);
    const tail = file.slice(Math.max(0, file.size - CHUNK));
    const combined = new Uint8Array(await new Blob([head, tail]).arrayBuffer());
    const hash = await crypto.subtle.digest("SHA-256", combined);
    const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 16)}_${file.size}`;
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);

    const url = URL.createObjectURL(file);
    const fp = await computeFingerprint(file);
    setLocalVideoUrl(url);
    setLocalFileName(file.name);
    setLocalFileFingerprint(fp);
    setFingerprintMismatch(false);

    // Check fingerprint match if we're a viewer
    if (!isHostRef.current && expectedFingerprint && fp !== expectedFingerprint) {
      setFingerprintMismatch(true);
    } else {
      setFingerprintMismatch(false);
    }

    if (isHostRef.current && socket) {
      socket.emit("chat:message", {
        roomId: id,
        content: `__LOCAL_FILE__:${file.name}|${fp}`,
        type: "SYSTEM",
      });
    }
  };

  const handleSubtitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // We only need the URL object to supply to the video track
    // If it's SRT, ideally we convert to VTT. For simplicity, many browsers support simple VTT.
    // Full support would require an SRT parser/converter, but we can try to feed it if it's VTT.

    // Convert SRT to VTT if needed
    let finalUrl = "";
    if (file.name.endsWith(".srt")) {
        const text = await file.text();
        // Super simple SRT -> VTT conversion
        const vttText = "WEBVTT\n\n" + text.replace(/,/g, '.');
        const blob = new Blob([vttText], { type: "text/vtt" });
        finalUrl = URL.createObjectURL(blob);
    } else {
        finalUrl = URL.createObjectURL(file);
    }

    if (subtitleUrl) URL.revokeObjectURL(subtitleUrl);
    setSubtitleUrl(finalUrl);
  };

  const searchSubtitles = async () => {
    if (!room.data?.movie) return;
    setSubtitlesSearching(true);
    try {
      const q = subtitleQuery || room.data.movie.title;
      setSubtitleQuery(q);
      
      let endpoint = '';
      if (subtitleSource === 'subscene') {
        endpoint = `/api/subtitles/subscene?action=search&q=${encodeURIComponent(q)}&languages=fa,en`;
      } else {
        endpoint = `/api/subtitles?action=search&q=${encodeURIComponent(q)}`;
      }
      
      const res = await api.get<{ data: any[] }>(endpoint);
      setSubtitleResults(res.data || []);
    } catch (err) {
      toast.error("Failed to search subtitles");
    } finally {
      setSubtitlesSearching(false);
    }
  };

  const downloadAndSetSubtitle = async (fileId: string) => {
    try {
      let vttText = '';
      
      if (subtitleSource === 'subscene') {
        // For Subscene, fileId is actually the subtitle path
        const res = await fetch(`/api/subtitles/subscene?action=download&path=${encodeURIComponent(fileId)}`);
        if (!res.ok) throw new Error("Failed");
        
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('json')) {
          // If response is JSON, it means we got a download URL
          const data = await res.json();
          if (data.downloadUrl) {
            // Open the download URL in a new tab
            window.open(data.downloadUrl, '_blank');
            toast.info("Please download the subtitle file and load it manually");
            return;
          }
          throw new Error("No download URL");
        }
        
        vttText = await res.text();
      } else {
        // For OpenSubtitles
        const res = await fetch(`/api/subtitles?action=download&fileId=${fileId}`);
        if (!res.ok) throw new Error("Failed");
        vttText = await res.text();
      }

      const blob = new Blob([vttText], { type: "text/vtt" });
      const finalUrl = URL.createObjectURL(blob);

      if (subtitleUrl) URL.revokeObjectURL(subtitleUrl);
      setSubtitleUrl(finalUrl);
      setSubtitleSearchOpen(false);
      toast.success("Subtitle loaded");
    } catch (err) {
      toast.error("Failed to load subtitle");
    }
  };

  const driftFixing = useRef(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHost = !!user && room.data?.host.id === user.id;
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  // Set up the player interface based on the active player type
  useEffect(() => {
    const effectiveUrl = localVideoUrl || room.data?.movie?.videoUrl || null;
    const kind = videoKind(effectiveUrl);

    if (kind === "direct") {
      playerRef.current = new HTMLPlayer("main-video-player");
    } else if (kind === "youtube" && ytPlayerInstance.current) {
      playerRef.current = new YouTubePlayer(ytPlayerInstance.current, "main-youtube-player");
    }
  }, [localVideoUrl, room.data?.movie?.videoUrl]);

  // Drift-correction for viewers (native video only)
  const applyViewerSync = useCallback(
    (targetTime: number, targetPlaying: boolean, serverTs: number) => {
      const p = playerRef.current;
      if (!p || isHostRef.current) return;

      // Allow sync for both direct network videos and local blob files
      const effectiveUrl = localVideoUrl || room.data?.movie?.videoUrl || null;
      const kind = videoKind(effectiveUrl);
      if (kind !== "direct" && kind !== "youtube") return;

      // compensate for transit time
      const elapsed = targetPlaying ? (Date.now() - serverTs) / 1000 : 0;
      const effective = targetTime + elapsed;
      const diff = p.getCurrentTime() - effective;

      if (Math.abs(diff) > 5) {
        // hard seek
        p.seekVideo(effective);
        driftFixing.current = false;
      } else if (Math.abs(diff) > 1.5) {
        // nudge playback rate
        driftFixing.current = true;
        p.setPlaybackRate(diff > 0 ? 0.97 : 1.03);
      } else {
        driftFixing.current = false;
        p.setPlaybackRate(1);
      }

      const isActuallyPlaying = !p.shouldPlay();
      if (targetPlaying && !isActuallyPlaying) {
        p.playVideo().catch(() => null);
      } else if (!targetPlaying && isActuallyPlaying) {
        p.pauseVideo();
      }
    },
    [room.data?.movie?.videoUrl, localVideoUrl]
  );

  // Join via API + socket once we have room + user (or guest)
  useEffect(() => {
    if (!room.data) return;
    let sock: Socket | null = null;
    let cancelled = false;

    (async () => {
      // Join DB membership if logged in
      if (user) {
        try {
          await api.post(`/api/rooms/${id}/join`);
        } catch {
          /* ignore */
        }
      }
      if (cancelled) return;
      setJoined(true);

      sock = io("/?XTransformPort=3003", {
        transports: ["websocket", "polling"],
        reconnection: true,
      });
      setSocket(sock);

      const me = user
        ? { userId: user.id, username: user.username, isHost: isHostRef.current }
        : { userId: `guest-${Math.random().toString(36).slice(2, 8)}`, username: `Guest`, isHost: false };

      sock.emit("join:room", {
        roomId: id,
        userId: me.userId,
        username: me.username,
        isHost: me.isHost,
      });

      sock.on("chat:message", (msg: ChatMessage) => {
        // Intercept local file system messages
        if (msg.type === "SYSTEM" && msg.content.startsWith("__LOCAL_FILE__:")) {
          const payload = msg.content.replace("__LOCAL_FILE__:", "");
          const [fname, fp] = payload.split("|");
          if (!isHostRef.current) {
            setExpectedFileName(fname);
            if (fp) setExpectedFingerprint(fp);

            // Check if viewer already loaded a file but it's the wrong one
            if (localFingerprintRef.current && fp && localFingerprintRef.current !== fp) {
              setFingerprintMismatch(true);
            } else if (localFingerprintRef.current && fp === localFingerprintRef.current) {
              setFingerprintMismatch(false);
            }
          }
          return;
        }
        setMessages((prev) => [...prev, msg]);
      });
      sock.on("chat:typing", (data: { userId: string; username: string }) => {
        setTypingUsers((prev) => ({
          ...prev,
          [data.userId]: { username: data.username, ts: Date.now() },
        }));
      });
      sock.on("chat:reaction", (data: { id: string; emoji: string; username: string }) => {
        setReactions((prev) => [...prev, data]);
        // Remove reaction after animation completes (approx 3 seconds)
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== data.id));
        }, 3000);
      });
      sock.on("room:members", (data: { members: RoomMember[] }) => {
        setMembers(data.members || []);
      });
      sock.on("room:system", (data: { message: string }) => {
        // optional system event from server
      });
      sock.on("playback:sync", (data: { currentTime: number; isPlaying: boolean; serverTimestamp: number }) => {
        setHostOffline(false);
        setPlayback({ currentTime: data.currentTime, isPlaying: data.isPlaying });
        applyViewerSync(data.currentTime, data.isPlaying, data.serverTimestamp);
      });
      sock.on("playback:request-sync", () => {
        // host: send current state to a late joiner
        if (isHostRef.current && playerRef.current) {
          sock!.emit("playback:sync", {
            roomId: id,
            currentTime: playerRef.current.getCurrentTime(),
            isPlaying: !playerRef.current.shouldPlay(),
          });
          // Also tell late joiner about local file if one is selected
          if (localFileNameRef.current) {
            const fp = localFingerprintRef.current ? `|${localFingerprintRef.current}` : "";
            sock!.emit("chat:message", {
              roomId: id,
              content: `__LOCAL_FILE__:${localFileNameRef.current}${fp}`,
              type: "SYSTEM",
            });
          }
        }
      });
      sock.on("room:movie-changed", () => {
        qc.invalidateQueries({ queryKey: ["room", id] });
      });
      sock.on("room:full", () => {
        toast.error(t("rooms.roomFull"));
        navigate("/rooms");
      });
    })();

    return () => {
      cancelled = true;
      if (sock) {
        sock.disconnect();
      }
    };
  }, [room.data?.id, user?.id]);

  // Cleanup: leave room on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
      // best-effort API leave
      if (user) {
        api.post(`/api/rooms/${id}/leave`).catch(() => null);
      }
    };
  }, []);

  // clear stale typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const next: typeof prev = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.ts < 3000) next[k] = v;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Host: emit sync every 5s
  useEffect(() => {
    if (!isHost || !socket) return;
    const kind = localVideoUrl ? "direct" : videoKind(room.data?.movie?.videoUrl || null);
    if (kind !== "direct" && kind !== "youtube") return;
    const interval = setInterval(() => {
      const p = playerRef.current;
      if (p && socket) {
        socket.emit("playback:sync", {
          roomId: id,
          currentTime: p.getCurrentTime(),
          isPlaying: p.isPlaying(),
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isHost, socket, id, room.data?.movie?.videoUrl, localVideoUrl]);

  const emitSync = useCallback(() => {
    if (!socket || !isHostRef.current) return;
    const p = playerRef.current;
    if (!p) return;
    socket.emit("playback:sync", {
      roomId: id,
      currentTime: p.getCurrentTime(),
      isPlaying: p.isPlaying(),
    });
    lastSyncEmit.current = Date.now();
  }, [socket, id]);

  const onVideoTimeUpdate = useCallback(() => {
    if (!socket || !isHostRef.current) return;
    const p = playerRef.current;
    if (!p) return;
    if (p.isPlaying()) {
      const now = Date.now();
      if (now - lastSyncEmit.current > 4000) {
        lastSyncEmit.current = now;
        socket.emit("playback:sync", {
          roomId: id,
          currentTime: p.getCurrentTime(),
          isPlaying: true,
        });
      }
    }
  }, [socket, id]);

  // Custom polling for YouTube to mock timeupdate events
  useEffect(() => {
    if (!isHost) return;
    const kind = localVideoUrl ? "direct" : videoKind(room.data?.movie?.videoUrl || null);
    if (kind !== "youtube") return;

    const ytInterval = setInterval(() => {
      onVideoTimeUpdate();
    }, 1000);
    return () => clearInterval(ytInterval);
  }, [isHost, room.data?.movie?.videoUrl, onVideoTimeUpdate, localVideoUrl]);

  const handlePlayPause = () => {
    const p = playerRef.current;
    if (!p || !isHost) return;
    if (p.shouldPlay()) p.playVideo().catch(() => null);
    else p.pauseVideo();
    setTimeout(emitSync, 100);
  };

  const handleSeek = (delta: number) => {
    const p = playerRef.current;
    if (!p || !isHost) return;
    p.seekVideo(Math.max(0, p.getCurrentTime() + delta));
    setTimeout(emitSync, 100);
  };

  const onLocalVideoTimeUpdate = () => {
    if (isHost) {
      const p = playerRef.current;
      if (p) setPlayback((pb) => ({ ...pb, currentTime: p.getCurrentTime(), isPlaying: !p.shouldPlay() }));
    }
  };

  // Custom polling for YouTube to mock timeupdate events
  useEffect(() => {
    if (!isHost) return;
    const kind = videoKind(room.data?.movie?.videoUrl || null);
    if (kind !== "youtube") return;

    const ytInterval = setInterval(() => {
      onVideoTimeUpdate();
    }, 1000);
    return () => clearInterval(ytInterval);
  }, [isHost, room.data?.movie?.videoUrl]);

  const onYtReady = (e: any) => {
    ytPlayerInstance.current = e.target;
    playerRef.current = new YouTubePlayer(e.target, "main-youtube-player");
  };

  const onYtStateChange = (e: any) => {
    if (isHost) {
      emitSync();
      onVideoTimeUpdate();
    }
  };

  const sendMessage = () => {
    if (!input.trim() || !socket || !user) return;
    socket.emit("chat:message", {
      roomId: id,
      userId: user.id,
      username: user.username,
      content: input.trim(),
    });
    setInput("");
  };

  const sendReaction = (emoji: string) => {
    if (!socket || !user) return;
    socket.emit("chat:reaction", {
      roomId: id,
      emoji,
      userId: user.id,
      username: user.username,
    });
  };

  const onTyping = () => {
    if (!socket || !user) return;
    if (typingTimer.current) return;
    socket.emit("chat:typing", { roomId: id, userId: user.id, username: user.username });
    typingTimer.current = setTimeout(() => {
      typingTimer.current = null;
    }, 2000);
  };

  const leaveRoom = useMutation({
    mutationFn: () => api.post(`/api/rooms/${id}/leave`),
    onSuccess: () => {
      navigate("/rooms");
    },
  });

  const deleteRoom = useMutation({
    mutationFn: () => api.del(`/api/rooms/${id}`),
    onSuccess: () => {
      toast.success(t("rooms.delete"));
      navigate("/rooms");
    },
  });

  if (room.isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 aspect-video rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!room.data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="size-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-4">{t("rooms.noRooms")}</p>
        <Button onClick={() => navigate("/rooms")} variant="outline">{t("back")}</Button>
      </div>
    );
  }

  const r = room.data;

  const roomTmdbServers = r?.movie?.tmdbId ? [
    { name: "Server 1 (Smashy)", url: `https://player.smashy.stream/movie/${r.movie.tmdbId}` },
    { name: "Server 2 (VidSrc.me)", url: `https://vidsrc.me/embed/movie?tmdb=${r.movie.tmdbId}` },
    { name: "Server 3 (VidSrc.cc)", url: `https://vidsrc.cc/v2/embed/movie/${r.movie.tmdbId}` },
    { name: "Server 4 (VidSrc.xyz)", url: `https://vidsrc.xyz/embed/movie/${r.movie.tmdbId}` },
    { name: "Server 5 (VidLink)", url: `https://vidlink.pro/movie/${r.movie.tmdbId}` },
    { name: "Server 6 (2Embed)", url: `https://www.2embed.cc/embed/${r.movie.tmdbId}` },
  ] : [];

  // Use local file if available, otherwise use active mirror or room movie URL
  const rawMovieUrl = r.movie?.tmdbId && roomTmdbServers[activeRoomServerIdx]
    ? roomTmdbServers[activeRoomServerIdx].url
    : (r.movie?.videoUrl || (r.movie?.tmdbId ? `https://player.smashy.stream/movie/${r.movie.tmdbId}` : null));
  const videoUrl = localVideoUrl || rawMovieUrl;
  const kind = localVideoUrl ? ("direct" as const) : videoKind(rawMovieUrl);
  const ytId = kind === "youtube" && videoUrl ? youtubeId(videoUrl) : null;
  const isAudio = localFileName
    ? /\.(mp3|wav|ogg|m4a|aac)$/i.test(localFileName)
    : (rawMovieUrl ? /\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(rawMovieUrl) : false);

  const typingList = Object.values(typingUsers).filter((tp) => tp.username !== user?.username);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold truncate">{r.name}</h1>
            {r.movie && <Badge variant="secondary" className="shrink-0"><Film className="size-3 me-1" /> {r.movie.title}</Badge>}
          </div>
          {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Crown className="size-3.5 text-yellow-500" />
              {r.host.username}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {members.length || r.memberCount} / {r.maxUsers}
            </span>
            {playback.isPlaying ? (
              <Badge className="bg-red-600 hover:bg-red-700"><Play className="size-3 me-1" />{t("rooms.live")}</Badge>
            ) : (
              <Badge variant="secondary"><Pause className="size-3 me-1" />{t("rooms.waiting")}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isHost && (
            <Dialog open={changeMovieOpen} onOpenChange={setChangeMovieOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Film className="size-4 me-1" /> Change Movie
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Select Movie for Watch Party</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Search Movie (Database / TMDB / Archive)</label>
                    <Input
                      placeholder="Search title..."
                      value={movieSearchQuery}
                      onChange={(e) => handleSearchMovies(e.target.value)}
                    />
                  </div>
                  {isSearchingMovies ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : movieSearchResults.length > 0 ? (
                    <ScrollArea className="max-h-56 border rounded-md p-2 space-y-1">
                      {movieSearchResults.map((m, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectSearchResult(m)}
                          className="flex items-center justify-between p-2 hover:bg-muted/80 rounded cursor-pointer transition text-sm"
                        >
                          <span className="font-medium truncate">{m.title} {m.year ? `(${m.year})` : ""}</span>
                          <Badge variant="secondary" className="text-xs">{m.source || "TMDB"}</Badge>
                        </div>
                      ))}
                    </ScrollArea>
                  ) : movieSearchQuery ? (
                    <p className="text-xs text-muted-foreground text-center">No movies found</p>
                  ) : null}

                  <Separator />

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground block">Or enter custom stream / video URL</label>
                    <Input
                      placeholder="Title (optional)"
                      value={customMovieTitle}
                      onChange={(e) => setCustomMovieTitle(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://example.com/video.mp4 or embed URL"
                        value={customMovieUrl}
                        onChange={(e) => setCustomMovieUrl(e.target.value)}
                      />
                      <Button onClick={handleAddCustomUrlMovie} disabled={!customMovieUrl.trim()}>
                        Set URL
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline" size="sm" onClick={() => leaveRoom.mutate()} disabled={leaveRoom.isPending}>
            <LogOut className="size-4 me-1" /> {t("rooms.leave")}
          </Button>
          {isHost && (
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteRoom.mutate()} disabled={deleteRoom.isPending}>
              {t("rooms.delete")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Player */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-0 overflow-hidden bg-black relative">
            {/* Overlay: Host is playing local file, viewer hasn't selected yet or selected wrong file */}
            {expectedFileName && !isHost && (!localVideoUrl || fingerprintMismatch) && (
              <div className="absolute inset-0 z-20 bg-black/95 flex flex-col items-center justify-center p-8 text-center">
                <Film className="size-12 text-red-500 mb-4" />
                <p className="text-white text-lg font-semibold mb-2">Host is playing a local file</p>
                <p className="text-white/70 text-sm mb-4">
                  <strong className="text-yellow-400">{expectedFileName}</strong>
                </p>
                {fingerprintMismatch ? (
                  <p className="text-red-500 text-sm mb-4" dir="rtl">
                    <AlertCircle className="size-4 inline me-1" />
                    فایل انتخاب شده توسط شما با فایل میزبان تفاوت دارد (محتوا یکسان نیست). لطفاً فایل درست را انتخاب کنید.
                  </p>
                ) : (
                  <p className="text-white/50 text-xs mb-4" dir="rtl">
                    لطفاً همین فایل را از کامپیوتر خود انتخاب کنید تا پخش هماهنگ شروع شود.
                  </p>
                )}
                <label className="cursor-pointer bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition flex items-center gap-2">
                  <Video className="size-4" /> Select File
                  <input type="file" accept="video/mp4,video/webm,video/ogg,audio/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            )}
            {kind === "none" ? (
              <div className="aspect-video flex flex-col items-center justify-center text-center p-8">
                <Video className="size-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">{t("rooms.noMovie")}</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">{t("rooms.pickMovie")}</p>
                {isHost && (
                  <Button className="mt-4 bg-red-600 hover:bg-red-700" onClick={() => setChangeMovieOpen(true)}>
                    <Film className="size-4 me-2" /> Select Movie
                  </Button>
                )}
              </div>
            ) : kind === "direct" ? (
              <div className="relative overflow-hidden">
                {reactions.map((r, i) => (
                  <div
                    key={r.id}
                    className="absolute z-50 text-4xl pointer-events-none animate-float-up"
                    style={{
                      left: `${10 + (Math.random() * 80)}%`,
                      bottom: "0",
                      animationDelay: `${i * 0.1}s`
                    }}
                  >
                    {r.emoji}
                  </div>
                ))}
                {isAudio && (
                  <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center pointer-events-none z-10">
                    <div className="size-24 rounded-full bg-primary/20 flex items-center justify-center mb-4 animate-pulse">
                      <Music className="size-10 text-primary" />
                    </div>
                    <p className="text-muted-foreground text-sm font-medium">Playing Audio</p>
                    <p className="text-muted-foreground/50 text-xs mt-1">{localFileName || "Synced stream"}</p>
                  </div>
                )}
                <video
                  id="main-video-player"
                  ref={videoRef}
                  src={videoUrl!}
                  className={`w-full bg-black ${isAudio ? "h-32" : "aspect-video"}`}
                  controls={isHost}
                  playsInline
                  onPlay={emitSync}
                  onPause={emitSync}
                  onSeeked={emitSync}
                  onTimeUpdate={onLocalVideoTimeUpdate}
                >
                  {subtitleUrl && (
                    <track
                      kind="subtitles"
                      src={subtitleUrl}
                      srcLang="fa"
                      label="Persian"
                      default
                    />
                  )}
                </video>
                {!isHost && (
                  <div className="absolute top-2 start-2 bg-black/70 backdrop-blur px-2.5 py-1 rounded-full text-xs text-white flex items-center gap-1.5">
                    <Users className="size-3" />
                    {t("rooms.syncedPlayback")}
                  </div>
                )}
                {hostOffline && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <p className="text-white text-sm flex items-center gap-2">
                      <AlertCircle className="size-4" /> {t("rooms.hostDisconnected")}
                    </p>
                  </div>
                )}
              </div>
            ) : kind === "youtube" && ytId ? (
              <div className="relative">
                {reactions.map((r, i) => (
                  <div
                    key={r.id}
                    className="absolute z-50 text-4xl pointer-events-none animate-float-up"
                    style={{
                      left: `${10 + (Math.random() * 80)}%`,
                      bottom: "0",
                      animationDelay: `${i * 0.1}s`
                    }}
                  >
                    {r.emoji}
                  </div>
                ))}
                <YouTube
                  videoId={ytId}
                  id="main-youtube-player"
                  className="w-full aspect-video"
                  iframeClassName="w-full h-full"
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: {
                      autoplay: 0,
                      controls: isHost ? 1 : 0,
                      modestbranding: 1,
                      rel: 0,
                    },
                  }}
                  onReady={onYtReady}
                  onStateChange={onYtStateChange}
                  onPlay={emitSync}
                  onPause={emitSync}
                />
                {!isHost && (
                  <div className="absolute top-2 start-2 bg-black/70 backdrop-blur px-2.5 py-1 rounded-full text-xs text-white">
                    {t("rooms.syncedPlayback")} (YouTube)
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                {roomTmdbServers.length > 0 && (
                  <div className="bg-zinc-950 px-3 py-1.5 border-b border-white/10 flex items-center justify-between gap-2 overflow-x-auto">
                    <span className="text-xs text-white/70 font-medium shrink-0">Mirror Server:</span>
                    <div className="flex items-center gap-1">
                      {roomTmdbServers.map((srv, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          variant={activeRoomServerIdx === idx ? "default" : "outline"}
                          className={`h-6 text-[11px] px-2 ${activeRoomServerIdx === idx ? "bg-red-600 hover:bg-red-700 text-white" : "bg-black/40 text-white/80 border-white/20 hover:bg-white/10"}`}
                          onClick={() => setActiveRoomServerIdx(idx)}
                        >
                          {srv.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <iframe
                  key={videoUrl}
                  src={videoUrl!}
                  className="aspect-video w-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  referrerPolicy="no-referrer"
                />
                {!isHost && (
                  <div className="absolute top-2 start-2 bg-black/70 backdrop-blur px-2.5 py-1 rounded-full text-xs text-white">
                    {t("rooms.syncedPlayback")}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Host controls (native video only) */}
          {isHost && kind === "direct" && (
            <Card className="p-3 flex items-center justify-center gap-3">
              <Button variant="outline" size="icon" onClick={() => handleSeek(-10)} title="-10s">
                <SkipBack className="size-4" />
              </Button>
              <Button onClick={handlePlayPause} size="lg" className="bg-red-600 hover:bg-red-700 rounded-full size-12 p-0">
                {playback.isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleSeek(10)} title="+10s">
                <SkipForward className="size-4" />
              </Button>
              <span className="text-sm text-muted-foreground ms-2">
                {Math.floor(playback.currentTime / 60)}:{String(Math.floor(playback.currentTime % 60)).padStart(2, "0")}
              </span>
              <span className="text-xs text-muted-foreground ms-auto">{t("rooms.hostControls")}</span>
            </Card>
          )}

          {kind !== "direct" && kind !== "none" && !isHost && (
            <Card className="p-3 text-xs text-muted-foreground text-center">
              {t("rooms.syncedPlayback")} · {t("rooms.hostControls")}
            </Card>
          )}

          {/* Local File Sync */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Film className="size-4 text-primary" /> Local File Sync
            </h3>
            <p className="text-xs text-muted-foreground mb-3" dir="rtl">
              فایل ویدیویی خود را از هارد انتخاب کنید. زمان پخش بین تمام اعضا هماهنگ می‌شود. هیچ فایلی آپلود نمی‌شود.
            </p>
            <label className="flex items-center justify-center gap-2 cursor-pointer border border-dashed border-border rounded-lg p-4 hover:border-primary/50 hover:bg-primary/5 transition">
              <Video className="size-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {localFileName || "Select video file (mp4, webm, ogg)"}
              </span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/ogg,audio/mp3,audio/mpeg,audio/ogg"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <div className="flex gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer border border-dashed border-border rounded-lg p-3 hover:border-primary/50 hover:bg-primary/5 transition">
                <Subtitles className="size-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {subtitleUrl ? "Subtitle loaded" : "Add Local Subtitle (.srt, .vtt)"}
                </span>
                <input
                  type="file"
                  accept=".srt,.vtt"
                  onChange={handleSubtitleChange}
                  className="hidden"
                />
              </label>
              <Dialog open={subtitleSearchOpen} onOpenChange={setSubtitleSearchOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-auto p-3" onClick={searchSubtitles}>
                    <Search className="size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Search Subtitles</DialogTitle>
                  </DialogHeader>
                  
                  {/* Source Tabs */}
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant={subtitleSource === 'subscene' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSubtitleSource('subscene');
                        setSubtitleResults([]);
                      }}
                    >
                      Subscene (رایگان)
                    </Button>
                    <Button
                      variant={subtitleSource === 'opensubtitles' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSubtitleSource('opensubtitles');
                        setSubtitleResults([]);
                      }}
                    >
                      OpenSubtitles
                    </Button>
                  </div>

                  {/* Search Input */}
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Search subtitles..."
                      value={subtitleQuery}
                      onChange={(e) => setSubtitleQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchSubtitles()}
                    />
                    <Button onClick={searchSubtitles} disabled={subtitlesSearching}>
                      {subtitlesSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                    </Button>
                  </div>

                  {/* Results */}
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {subtitlesSearching ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : subtitleResults.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground">
                        {subtitleQuery ? 'No subtitles found' : 'Enter a search query'}
                      </p>
                    ) : (
                      subtitleResults.map((sub, i) => (
                        <button
                          key={i}
                          onClick={() => downloadAndSetSubtitle(sub.fileId || sub.id)}
                          className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition flex items-center justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate" title={sub.fileName || sub.title}>
                              {sub.fileName || sub.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {sub.languageName || sub.language}
                              </Badge>
                              {sub.hearingImpaired && (
                                <Badge variant="outline" className="text-xs">HI</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {sub.source || 'opensubtitles'}
                              </span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="ml-2 shrink-0">
                            Select
                          </Badge>
                        </button>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {localFileName && !fingerprintMismatch && (
              <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Loaded: {localFileName}
              </p>
            )}
            {fingerprintMismatch && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1" dir="rtl">
                <AlertCircle className="size-4" />
                خطا: محتوای فایل شما با فایل میزبان یکسان نیست!
              </p>
            )}
            {expectedFileName && !isHost && localFileName !== expectedFileName && !fingerprintMismatch && (
              <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                <p className="text-sm text-yellow-500 mb-2 font-medium">
                  🎬 Host is playing: <strong>{expectedFileName}</strong>
                </p>
                <p className="text-xs text-yellow-500/70" dir="rtl">
                  لطفاً همین فایل را از کامپیوتر خود انتخاب کنید تا همگام‌سازی شروع شود.
                </p>
              </div>
            )}
          </Card>

          {/* Movie info */}
          <div className="w-full">
            <VideoChat
              socket={socket}
              roomId={id}
              userId={user?.id || 'guest'}
              members={members}
            />
          </div>

          {r.movie && (
            <Card className="p-4">
              <h3 className="font-semibold mb-1">{r.movie.title}</h3>
              {r.movie.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">{r.movie.description}</p>
              )}
            </Card>
          )}
        </div>

        {/* Chat + members */}
        <div className="space-y-4">
          <Card className="flex flex-col h-[60vh] min-h-[420px]">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-sm flex items-center gap-2">
                {t("rooms.chat")}
              </span>
              <Badge variant="secondary" className="text-xs">
                <Users className="size-3 me-1" />
                {members.length}
              </Badge>
            </div>
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto scroll-cinema p-3 space-y-2.5">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {t("rooms.chat")} · {t("rooms.messagePlaceholder")}
                </p>
              ) : (
                messages.map((msg) =>
                  msg.type === "SYSTEM" ? (
                    <div key={msg.id} className="text-center">
                      <span className="text-xs text-muted-foreground italic px-2 py-0.5 rounded-full bg-muted/50">
                        {msg.content}
                      </span>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex gap-2">
                      <UserAvatar username={msg.username} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-medium">{msg.username}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm break-words">{msg.content}</p>
                      </div>
                    </div>
                  )
                )
              )}
              {typingList.length > 0 && (
                <p className="text-xs text-muted-foreground italic px-1">
                  {typingList.length === 1
                    ? t("rooms.typing", { name: typingList[0].username })
                    : t("rooms.peopleTyping", { count: typingList.length })}
                </p>
              )}
            </div>
            <Separator />
            <div className="p-3">
              {user ? (
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      onTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={t("rooms.messagePlaceholder")}
                    className="bg-card"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="icon" variant="outline" type="button">
                        <SmilePlus className="size-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2 mb-2" side="top" align="center">
                      <div className="flex items-center gap-1">
                        {["😂", "❤️", "😮", "👏", "🔥", "😢"].map((emoji) => (
                          <Button
                            key={emoji}
                            variant="ghost"
                            className="h-10 w-10 text-xl"
                            onClick={() => sendReaction(emoji)}
                          >
                            {emoji}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button size="icon" onClick={sendMessage} disabled={!input.trim()} className="bg-red-600 hover:bg-red-700">
                    <Send className="size-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-center text-muted-foreground py-1">{t("rooms.needLogin")}</p>
              )}
            </div>
          </Card>

          {/* Members */}
          <Card className="p-3">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="size-4" /> {t("rooms.membersTitle")}
            </h3>
            <ScrollArea className="max-h-48">
              <div className="space-y-1.5">
                {(members.length ? members : r.members.map((m) => ({ userId: m.user.id, username: m.user.username, isHost: m.role === "HOST" }))).map((m) => (
                  <div key={m.userId} className="flex items-center gap-2">
                    <UserAvatar username={m.username} size={26} />
                    <span className="text-sm flex-1 truncate">{m.username}</span>
                    {m.isHost && <Crown className="size-3.5 text-yellow-500" />}
                    <Badge variant="outline" className="text-[10px]">
                      {m.isHost ? t("rooms.host") : t("rooms.viewer")}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
}

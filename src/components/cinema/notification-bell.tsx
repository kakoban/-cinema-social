"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck } from "lucide-react";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api-client";
import { useNavigate } from "@/stores/router";
import { useAuthStore } from "@/stores/auth-store";
import { UserAvatar } from "./user-avatar";
import { useI18n } from "@/i18n";

interface NotifItem {
  id: string;
  userId: string;
  actorId: string | null;
  type: string;
  content: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  actor: { id: string; username: string; avatar: string | null } | null;
}

interface NotifData {
  items: NotifItem[];
  unreadCount: number;
}

export function NotificationBell() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data } = useQuery<NotifData>({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotifData>("/api/notifications").then((r) => r.data!),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.put(`/api/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: () => api.put("/api/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (!user) return;
    const targetSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:3003" : "/?XTransformPort=3003");
    const sock = io(targetSocketUrl, {
      path: "/",
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    sock.emit("user:register", { userId: user.id });

    sock.on("notification:new", (data) => {
      // Invalidate to fetch fresh data from server or optimistically add
      qc.invalidateQueries({ queryKey: ["notifications"] });
      // We could also show a toast here for instant feedback
      if (typeof window !== "undefined") {
         const { toast } = require("sonner");
         toast.info("New Notification", { description: data.content });
      }
    });

    return () => {
      sock.disconnect();
    };
  }, [user, qc]);

  if (!user) return null;
  const unread = data?.unreadCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notifications">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -end-0.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="font-semibold text-sm">{t("notifications.title")}</span>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAll.mutate()}
            >
              <CheckCheck className="size-3.5 me-1" />
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {!data?.items?.length ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {t("notifications.empty")}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markRead.mutate(n.id);
                    if (n.link) navigate(n.link.replace(/^#/, ""));
                  }}
                  className={`flex gap-2.5 w-full text-start px-3 py-2.5 hover:bg-accent transition-colors ${
                    !n.isRead ? "bg-red-500/5" : ""
                  }`}
                >
                  {n.actor ? (
                    <UserAvatar username={n.actor.username} avatar={n.actor.avatar} size={32} />
                  ) : (
                    <div className="size-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <Bell className="size-4 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-card-foreground line-clamp-2">{n.content}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.isRead && <span className="size-2 rounded-full bg-red-600 mt-1.5 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

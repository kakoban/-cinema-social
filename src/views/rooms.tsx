"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Lock, Globe, Play, Pause, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useNavigate } from "@/stores/router";
import { useAuthStore } from "@/stores/auth-store";
import { useI18n } from "@/i18n";
import { UserAvatar } from "@/components/cinema/user-avatar";

interface Room {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  maxUsers: number;
  status: string;
  isPlaying: boolean;
  createdAt: string;
  host: { id: string; username: string; avatar: string | null };
  movie: { id: string; title: string; poster: string | null } | null;
  memberCount: number;
}

export function RoomsView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const rooms = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: () => api.get<Room[]>("/api/rooms").then((r) => r.data!),
    refetchInterval: 15_000,
  });

  const createRoom = useMutation({
    mutationFn: () =>
      api
        .post<{ id: string }>("/api/rooms", {
          name: name.trim(),
          description: description.trim() || undefined,
          isPublic,
        })
        .then((r) => r.data!),
    onSuccess: (data) => {
      toast.success(t("rooms.create"));
      setOpen(false);
      setName("");
      setDescription("");
      setIsPublic(true);
      qc.invalidateQueries({ queryKey: ["rooms"] });
      navigate(`/room/${data.id}`);
    },
    onError: () => toast.error(t("error")),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">{t("rooms.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("rooms.subtitle")}</p>
        </div>
        {user && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="size-4 me-2" />
                {t("rooms.create")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("rooms.createTitle")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rn">{t("rooms.roomName")}</Label>
                  <Input
                    id="rn"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("rooms.roomName")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rd">{t("rooms.roomDesc")}</Label>
                  <Textarea
                    id="rd"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("rooms.roomDesc")}
                    className="min-h-20"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    {isPublic ? <Globe className="size-4 text-emerald-500" /> : <Lock className="size-4 text-muted-foreground" />}
                    <Label htmlFor="rp" className="cursor-pointer">{t("rooms.roomPublic")}</Label>
                  </div>
                  <Switch id="rp" checked={isPublic} onCheckedChange={setIsPublic} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t("cancel")}</Button>
                </DialogClose>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  disabled={!name.trim() || createRoom.isPending}
                  onClick={() => createRoom.mutate()}
                >
                  {createRoom.isPending && <Loader2 className="size-4 me-2 animate-spin" />}
                  {t("create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {rooms.isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : rooms.data?.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.data.map((r) => (
            <Card
              key={r.id}
              className="p-0 overflow-hidden card-lift cursor-pointer"
              onClick={() => navigate(`/room/${r.id}`)}
            >
              <div className="flex gap-3 p-4">
                <div className="size-16 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {r.movie?.poster ? (
                    <img src={r.movie.poster} alt={r.movie.title} className="size-full object-cover" />
                  ) : (
                    <Video className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <h3 className="font-semibold text-sm line-clamp-1 flex-1">{r.name}</h3>
                    {r.isPublic ? (
                      <Globe className="size-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Lock className="size-3.5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  {r.movie && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{r.movie.title}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <UserAvatar username={r.host.username} avatar={r.host.avatar} size={16} />
                      {r.host.username}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {t("rooms.members", { count: r.memberCount, max: r.maxUsers })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 bg-card/50 border-t border-border">
                <Badge
                  variant={r.isPlaying ? "default" : "secondary"}
                  className={r.isPlaying ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  {r.isPlaying ? (
                    <>
                      <Play className="size-3 me-1" /> {t("rooms.live")}
                    </>
                  ) : (
                    <>
                      <Pause className="size-3 me-1" /> {t("rooms.waiting")}
                    </>
                  )}
                </Badge>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 h-7">
                  {t("rooms.join")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-16 text-center">
          <Users className="size-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">{t("rooms.noRooms")}</p>
          {user && (
            <Button
              className="mt-4 bg-red-600 hover:bg-red-700"
              onClick={() => setOpen(true)}
            >
              <Plus className="size-4 me-2" />
              {t("rooms.create")}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}

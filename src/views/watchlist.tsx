"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ListVideo, Loader2, Lock, Globe, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useNavigate } from "@/stores/router";
import { useAuthStore } from "@/stores/auth-store";
import { useI18n } from "@/i18n";
import { MovieCard } from "@/components/cinema/movie-card";

interface WatchlistItem {
  id: string;
  movieId: string;
  movie: { id: string; title: string; poster: string | null; year: number | null; source: string };
}
interface Watchlist {
  id: string;
  name: string;
  isPublic: boolean;
  items: WatchlistItem[];
}

export function WatchlistView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const lists = useQuery<Watchlist[]>({
    queryKey: ["watchlists"],
    queryFn: () => api.get<Watchlist[]>("/api/watchlists").then((r) => r.data!),
    enabled: !!user,
  });

  const createList = useMutation({
    mutationFn: () => api.post("/api/watchlists", { name: name.trim(), isPublic }).then((r) => r.data!),
    onSuccess: () => {
      toast.success(t("watchlist.createList"));
      setOpen(false);
      setName("");
      setIsPublic(false);
      qc.invalidateQueries({ queryKey: ["watchlists"] });
    },
  });

  const deleteList = useMutation({
    mutationFn: (id: string) => api.del(`/api/watchlists/${id}`),
    onSuccess: () => {
      toast.success(t("watchlist.deleteList"));
      qc.invalidateQueries({ queryKey: ["watchlists"] });
    },
  });

  const removeMovie = useMutation({
    mutationFn: ({ listId, movieId }: { listId: string; movieId: string }) =>
      api.del(`/api/watchlists/${listId}/movies/${movieId}`),
    onSuccess: () => {
      toast.success(t("watchlist.removed"));
      qc.invalidateQueries({ queryKey: ["watchlists"] });
    },
  });

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">{t("watchlist.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("watchlist.subtitle")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="size-4 me-2" />
              {t("watchlist.newList")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("watchlist.newList")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="ln">{t("watchlist.listName")}</Label>
                <Input id="ln" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("watchlist.listName")} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  {isPublic ? <Globe className="size-4 text-emerald-500" /> : <Lock className="size-4 text-muted-foreground" />}
                  <Label htmlFor="lp" className="cursor-pointer">{t("watchlist.public")}</Label>
                </div>
                <Switch id="lp" checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t("cancel")}</Button>
              </DialogClose>
              <Button className="bg-red-600 hover:bg-red-700" disabled={!name.trim() || createList.isPending} onClick={() => createList.mutate()}>
                {createList.isPending && <Loader2 className="size-4 me-2 animate-spin" />}
                {t("watchlist.createList")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {lists.isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : lists.data?.length ? (
        <div className="space-y-8">
          {lists.data.map((list) => (
            <Card key={list.id} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ListVideo className="size-5 text-primary" />
                  <h2 className="text-lg font-semibold">{list.name}</h2>
                  <Badge variant={list.isPublic ? "default" : "secondary"} className={list.isPublic ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                    {list.isPublic ? (
                      <><Globe className="size-3 me-1" />{t("watchlist.public")}</>
                    ) : (
                      <><Lock className="size-3 me-1" />{t("watchlist.private")}</>
                    )}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{t("watchlist.movies", { count: list.items.length })}</span>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteList.mutate(list.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {list.items.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {list.items.map((item) => (
                    <div key={item.id} className="relative group">
                      <MovieCard
                        movie={{
                          id: item.movie.id,
                          title: item.movie.title,
                          poster: item.movie.poster,
                          year: item.movie.year,
                          source: item.movie.source,
                        }}
                      />
                      <button
                        onClick={() => removeMovie.mutate({ listId: list.id, movieId: item.movie.id })}
                        className="absolute top-1.5 end-1.5 size-7 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                        aria-label={t("delete")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {t("watchlist.empty")}
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-16 text-center">
          <ListVideo className="size-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground mb-4">{t("watchlist.noLists")}</p>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => setOpen(true)}>
            <Plus className="size-4 me-2" />
            {t("watchlist.newList")}
          </Button>
        </Card>
      )}
    </div>
  );
}

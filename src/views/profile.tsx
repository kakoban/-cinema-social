"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Loader2, UserPlus, UserCheck, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useNavigate } from "@/stores/router";
import { useAuthStore } from "@/stores/auth-store";
import { useI18n } from "@/i18n";
import { UserAvatar } from "@/components/cinema/user-avatar";
import { StarRating } from "@/components/cinema/star-rating";

interface Profile {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  role: string;
  language: string;
  theme: string;
  createdAt: string;
  reviewCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isMe: boolean;
}

interface UserReview {
  id: string;
  content: string;
  rating: number;
  createdAt: string;
  movie: { id: string; title: string; poster: string | null; year: number | null };
}

export function ProfileView({ username }: { username: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");

  const profile = useQuery<Profile>({
    queryKey: ["profile", username],
    queryFn: () => api.get<Profile>(`/api/users/${username}`).then((r) => r.data!),
  });

  const reviews = useQuery<UserReview[]>({
    queryKey: ["user-reviews", username],
    queryFn: () => api.get<UserReview[]>(`/api/users/${username}/reviews`).then((r) => r.data!),
  });

  const follow = useMutation({
    mutationFn: () => api.post(`/api/users/${profile.data!.id}/follow`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", username] });
    },
  });
  const unfollow = useMutation({
    mutationFn: () => api.del(`/api/users/${profile.data!.id}/follow`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", username] });
    },
  });

  const saveProfile = useMutation({
    mutationFn: () => api.put(`/api/users/${profile.data!.id}`, { bio, avatar: avatar || undefined }),
    onSuccess: (data) => {
      toast.success(t("profile.saved"));
      if (me?.id === profile.data!.id) setUser(data as never);
      qc.invalidateQueries({ queryKey: ["profile", username] });
      setEditOpen(false);
    },
  });

  const openEdit = () => {
    setBio(profile.data?.bio || "");
    setAvatar(profile.data?.avatar || "");
    setEditOpen(true);
  };

  if (profile.isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-32 rounded-xl mb-6" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!profile.data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">{t("noResults")}</p>
        <Button variant="outline" onClick={() => navigate("/")}>{t("back")}</Button>
      </div>
    );
  }

  const p = profile.data;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header card */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <UserAvatar username={p.username} avatar={p.avatar} size={88} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{p.username}</h1>
              {p.role === "ADMIN" && <Badge className="bg-red-600 hover:bg-red-700">ADMIN</Badge>}
              {p.isMe && <Badge variant="secondary">{t("profile.isYou")}</Badge>}
            </div>
            {p.bio && <p className="text-sm text-muted-foreground mt-2">{p.bio}</p>}
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {t("profile.memberSince", {
                date: new Date(p.createdAt).toLocaleDateString(),
              })}
            </p>

            <div className="flex items-center gap-6 mt-4">
              <div>
                <span className="font-bold">{p.reviewCount}</span>{" "}
                <span className="text-sm text-muted-foreground">{t("profile.reviews")}</span>
              </div>
              <div>
                <span className="font-bold">{p.followersCount}</span>{" "}
                <span className="text-sm text-muted-foreground">{t("profile.followers")}</span>
              </div>
              <div>
                <span className="font-bold">{p.followingCount}</span>{" "}
                <span className="text-sm text-muted-foreground">{t("profile.following")}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {p.isMe ? (
              <Button variant="outline" onClick={openEdit}>
                <Pencil className="size-4 me-2" /> {t("profile.editProfile")}
              </Button>
            ) : me ? (
              p.isFollowing ? (
                <Button variant="outline" onClick={() => unfollow.mutate()} disabled={unfollow.isPending}>
                  <UserCheck className="size-4 me-2" /> {t("profile.unfollow")}
                </Button>
              ) : (
                <Button className="bg-red-600 hover:bg-red-700" onClick={() => follow.mutate()} disabled={follow.isPending}>
                  <UserPlus className="size-4 me-2" /> {t("profile.follow")}
                </Button>
              )
            ) : null}
          </div>
        </div>
      </Card>

      {/* Reviews */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {t("profile.reviews")} ({reviews.data?.length ?? 0})
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
              <Card key={r.id} className="p-4 flex gap-3">
                <button
                  onClick={() => navigate(`/movie/${r.movie.id}`)}
                  className="size-14 rounded-lg overflow-hidden bg-muted shrink-0"
                >
                  {r.movie.poster ? (
                    <img src={r.movie.poster} alt={r.movie.title} className="size-full object-cover" />
                  ) : (
                    <div className="size-full" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/movie/${r.movie.id}`)}
                    className="font-medium text-sm hover:text-primary"
                  >
                    {r.movie.title} {r.movie.year && `(${r.movie.year})`}
                  </button>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating value={r.rating} size={12} />
                    <span className="text-xs text-muted-foreground">{r.rating.toFixed(0)}/10</span>
                  </div>
                  <p className="text-sm mt-1.5 line-clamp-3">{r.content}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {t("profile.noReviews")}
          </Card>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("profile.editProfile")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="avatar">{t("settings.avatar")}</Label>
              <Input id="avatar" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">{t("profile.bio")}</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("profile.bioPlaceholder")} className="min-h-24" maxLength={300} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("cancel")}</Button>
            </DialogClose>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
              {saveProfile.isPending && <Loader2 className="size-4 me-2 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

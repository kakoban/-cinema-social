"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Ban, CheckCircle, Trash2, Search, Loader2, Users, Film, MessageSquare, Bot, Sparkles, Save, Key, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { useNavigate } from "@/stores/router";
import { useAuthStore } from "@/stores/auth-store";
import { useI18n } from "@/i18n";
import { UserAvatar } from "@/components/cinema/user-avatar";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar: string | null;
  banned: boolean;
  createdAt: string;
  reviewCount: number;
  followersCount: number;
  followingCount: number;
}
interface AdminRoom {
  id: string;
  name: string;
  isPublic: boolean;
  status: string;
  createdAt: string;
  host: { id: string; username: string };
  movie: { id: string; title: string } | null;
  memberCount: number;
}
interface AdminReview {
  id: string;
  content: string;
  rating: number;
  createdAt: string;
  user: { id: string; username: string; avatar: string | null };
  movie: { id: string; title: string; poster: string | null };
}

export function AdminView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const isAdmin = me && (me.role === "ADMIN" || me.email === "nafa.1395@gmail.com");

  useEffect(() => {
    if (me && !isAdmin) navigate("/");
    if (!me) navigate("/login");
  }, [me, isAdmin, navigate]);

  const aiSettings = useQuery<{ openRouterModel: string; openRouterApiKeyMasked: string; aiServerFinderEnabled: boolean }>({
    queryKey: ["admin-ai-settings"],
    queryFn: async () => {
      const res = await api.get<{ openRouterModel: string; openRouterApiKeyMasked: string; aiServerFinderEnabled: boolean }>("/api/admin/settings");
      return res.data || { openRouterModel: "google/gemini-2.5-flash-lite", openRouterApiKeyMasked: "", aiServerFinderEnabled: true };
    },
    enabled: !!isAdmin,
  });

  const [modelInput, setModelInput] = useState("google/gemini-2.5-flash-lite");
  const [apiKeyInput, setApiKeyInput] = useState("");

  useEffect(() => {
    if (aiSettings.data?.openRouterModel) {
      setModelInput(aiSettings.data.openRouterModel);
    }
  }, [aiSettings.data]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: { openRouterModel?: string; openRouterApiKey?: string; aiServerFinderEnabled?: boolean }) =>
      api.put("/api/admin/settings", data),
    onSuccess: () => {
      toast.success("تنظیمات مدل هوش مصنوعی با موفقیت بروزرسانی شد! 🤖✨");
      qc.invalidateQueries({ queryKey: ["admin-ai-settings"] });
    },
    onError: () => {
      toast.error("خطا در بروزرسانی تنظیمات هوش مصنوعی");
    },
  });

  const users = useQuery<{ users: AdminUser[] }>({
    queryKey: ["admin-users", q],
    queryFn: async () => {
      const res = await api.get<{ users: AdminUser[] }>(`/api/admin/users?q=${encodeURIComponent(q)}`);
      return (res.data as { users: AdminUser[] }) || { users: [] };
    },
    enabled: !!isAdmin,
  });
  const rooms = useQuery<AdminRoom[]>({
    queryKey: ["admin-rooms"],
    queryFn: async () => {
      const res = await api.get<AdminRoom[]>("/api/admin/rooms");
      return (res.data as AdminRoom[]) || [];
    },
    enabled: !!isAdmin,
  });
  const reviews = useQuery<AdminReview[]>({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const res = await api.get<AdminReview[]>("/api/admin/reviews");
      return (res.data as AdminReview[]) || [];
    },
    enabled: !!isAdmin,
  });

  const banUser = useMutation({
    mutationFn: (id: string) => api.put(`/api/admin/users/${id}/ban`),
    onSuccess: () => {
      toast.success(t("admin.ban"));
      qc.invalidateQueries({ queryKey: ["admin-users", q] });
    },
  });
  const unbanUser = useMutation({
    mutationFn: (id: string) => api.put(`/api/admin/users/${id}/unban`),
    onSuccess: () => {
      toast.success(t("admin.unban"));
      qc.invalidateQueries({ queryKey: ["admin-users", q] });
    },
  });
  const deleteRoom = useMutation({
    mutationFn: (id: string) => api.del(`/api/admin/rooms/${id}`),
    onSuccess: () => {
      toast.success(t("admin.deleteUser"));
      qc.invalidateQueries({ queryKey: ["admin-rooms"] });
    },
  });
  const deleteReview = useMutation({
    mutationFn: (id: string) => api.del(`/api/admin/reviews/${id}`),
    onSuccess: () => {
      toast.success(t("admin.deleteReview"));
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });

  if (!me || !isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-xl bg-red-600 flex items-center justify-center text-white">
          <Shield className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t("admin.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("admin.subtitle")}</p>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-6">
          <TabsTrigger value="users"><Users className="size-4 me-1.5" />{t("admin.users")}</TabsTrigger>
          <TabsTrigger value="rooms"><Film className="size-4 me-1.5" />{t("admin.rooms")}</TabsTrigger>
          <TabsTrigger value="reviews"><MessageSquare className="size-4 me-1.5" />{t("admin.reviews")}</TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <Bot className="size-4 me-1.5 text-purple-400" />تنظیمات هوش مصنوعی
          </TabsTrigger>
        </TabsList>

        {/* Users */}
        <TabsContent value="users">
          <Card className="p-4">
            <div className="relative max-w-sm mb-4">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.searchUsers")} className="ps-9 bg-card" />
            </div>
            {users.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : users.data?.users?.length ? (
              <div className="divide-y divide-border">
                {users.data.users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 py-3">
                    <UserAvatar username={u.username} avatar={u.avatar} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{u.username}</span>
                        {u.role === "ADMIN" && <Badge className="bg-red-600 hover:bg-red-700 text-[10px]">{t("admin.promoted")}</Badge>}
                        {u.banned ? (
                          <Badge variant="destructive" className="text-[10px]">{t("admin.banned")}</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">{t("admin.active")}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{u.email} · {u.reviewCount} {t("profile.reviews")} · {u.followersCount} {t("profile.followers")}</p>
                    </div>
                    <div className="flex gap-2">
                      {u.id !== me.id && (
                        u.banned ? (
                          <Button size="sm" variant="outline" onClick={() => unbanUser.mutate(u.id)} disabled={unbanUser.isPending}>
                            <CheckCircle className="size-3.5 me-1" /> {t("admin.unban")}
                          </Button>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-destructive">
                                <Ban className="size-3.5 me-1" /> {t("admin.ban")}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("admin.ban")}</AlertDialogTitle>
                                <AlertDialogDescription>{t("admin.confirmBan")}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => banUser.mutate(u.id)} className="bg-red-600 hover:bg-red-700">
                                  {t("admin.ban")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">{t("admin.noUsers")}</p>
            )}
          </Card>
        </TabsContent>

        {/* Rooms */}
        <TabsContent value="rooms">
          <Card className="p-4">
            {rooms.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : rooms.data?.length ? (
              <div className="divide-y divide-border">
                {rooms.data.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-3">
                    <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Film className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.host.username} · {r.memberCount} {t("rooms.membersTitle")} · {r.movie?.title || "—"}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive">
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("admin.deleteUser")}</AlertDialogTitle>
                          <AlertDialogDescription>{t("admin.confirmDeleteRoom")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteRoom.mutate(r.id)} className="bg-red-600 hover:bg-red-700">
                            {t("delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">{t("admin.noRooms")}</p>
            )}
          </Card>
        </TabsContent>

        {/* Reviews */}
        <TabsContent value="reviews">
          <Card className="p-4">
            {reviews.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : reviews.data?.length ? (
              <div className="divide-y divide-border">
                {reviews.data.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 py-3">
                    <UserAvatar username={r.user.username} avatar={r.user.avatar} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{r.user.username}</span>
                        <Badge variant="secondary" className="text-[10px]">{r.rating}/10</Badge>
                        <span className="text-xs text-muted-foreground">on {r.movie.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.content}</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive">
                          <Trash2 className="size-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("admin.deleteReview")}</AlertDialogTitle>
                          <AlertDialogDescription>{t("admin.confirmDeleteReview")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteReview.mutate(r.id)} className="bg-red-600 hover:bg-red-700">
                            {t("delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">{t("admin.noReviews")}</p>
            )}
          </Card>
        </TabsContent>

        {/* AI Model Config Tab */}
        <TabsContent value="ai">
          <Card className="p-6 bg-zinc-900/90 border-purple-500/20 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="size-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">مدیریت مدل هوش مصنوعی (OpenRouter AI)</h2>
                <p className="text-xs text-muted-foreground">مدل و کلید API مورد استفاده برای سرویس هوشمند انتخاب سرورها را تغییر دهید</p>
              </div>
            </div>

            {/* Model Presets */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Cpu className="size-4 text-purple-400" /> انتخاب مدل پیش‌فرض:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {[
                  { name: "Gemini 2.5 Flash Lite", id: "google/gemini-2.5-flash-lite", badge: "پیشنهادی (بسیار سریع)" },
                  { name: "Gemini 2.0 Flash Lite (Free)", id: "google/gemini-2.0-flash-lite:free", badge: "رایگان" },
                  { name: "Gemini 2.5 Flash", id: "google/gemini-2.5-flash", badge: "متوازن" },
                  { name: "Claude 3.5 Haiku", id: "anthropic/claude-3.5-haiku", badge: "پریمیوم Anthropic" },
                  { name: "GPT-4o Mini", id: "openai/gpt-4o-mini", badge: "پریمیوم OpenAI" },
                  { name: "Llama 3.3 70B", id: "meta-llama/llama-3.3-70b-instruct", badge: "متن‌باز قدرتمند" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={cn(
                      "p-3 rounded-xl border text-start transition-all flex flex-col justify-between gap-2",
                      modelInput === m.id
                        ? "bg-purple-950/80 border-purple-500 text-white shadow-lg ring-1 ring-purple-500"
                        : "bg-black/40 border-white/10 hover:border-white/20 text-muted-foreground"
                    )}
                    onClick={() => setModelInput(m.id)}
                  >
                    <span className="font-semibold text-xs text-white truncate">{m.name}</span>
                    <Badge variant="outline" className="text-[10px] w-fit border-purple-500/30 text-purple-300">
                      {m.badge}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Model Input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/80">شناسه مدل سفارشی OpenRouter (Custom Model Identifier):</label>
              <Input
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                placeholder="e.g. google/gemini-2.5-flash-lite"
                className="bg-black/60 border-white/20 text-white font-mono text-xs dir-ltr"
              />
            </div>

            {/* API Key Update */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Key className="size-4 text-purple-400" /> کلید API جدید OpenRouter (اختیاری):
              </label>
              <p className="text-xs text-muted-foreground">
                کلید فعلی: <span className="font-mono text-purple-300">{aiSettings.data?.openRouterApiKeyMasked || "ثبت نشده"}</span>
              </p>
              <Input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="اگر قصد تغییر کلید API را دارید کلید جدید را وارد کنید (sk-or-v1-...)"
                className="bg-black/60 border-white/20 text-white font-mono text-xs dir-ltr"
              />
            </div>

            {/* Save Button */}
            <div className="pt-4 flex justify-end">
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2 px-6 rounded-xl font-medium shadow-lg"
                disabled={updateSettingsMutation.isPending}
                onClick={() => {
                  updateSettingsMutation.mutate({
                    openRouterModel: modelInput,
                    ...(apiKeyInput.trim() ? { openRouterApiKey: apiKeyInput.trim() } : {}),
                  });
                }}
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                ذخیره تنظیمات هوش مصنوعی
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

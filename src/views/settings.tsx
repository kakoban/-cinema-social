"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Loader2, Moon, Sun, Monitor, Save, Palette, User as UserIcon, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useNavigate } from "@/stores/router";
import { useAuthStore } from "@/stores/auth-store";
import { useI18n } from "@/i18n";

export function SettingsView() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(false);
  const [prevUserId, setPrevUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  // Sync form from the loaded user (render-time pattern)
  if (user && user.id !== prevUserId) {
    setPrevUserId(user.id);
    setUsername(user.username);
    setEmail(user.email);
    setAvatar(user.avatar || "");
  }

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const res = await api.put(`/api/users/${user.id}`, {
      username,
      bio,
      avatar: avatar || undefined,
      language: lang,
      theme: theme || "dark",
    });
    setLoading(false);
    if (res.success && res.data) {
      setUser(res.data as never);
      toast.success(t("settings.saved"));
    } else {
      toast.error(res.error || t("error"));
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">{t("settings.title")}</h1>

      <div className="space-y-6">
        {/* Appearance */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="size-5 text-primary" />
            <h2 className="font-semibold">{t("settings.appearance")}</h2>
          </div>

          <div className="space-y-1.5 mb-5">
            <Label>{t("settings.theme")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: "light", icon: Sun, label: t("settings.themeLight") },
                { v: "dark", icon: Moon, label: t("settings.themeDark") },
                { v: "system", icon: Monitor, label: t("settings.themeSystem") },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setTheme(opt.v)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    theme === opt.v
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <opt.icon className="size-5" />
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Globe className="size-4" />{t("settings.language")}</Label>
            <RadioGroup
              value={lang}
              onValueChange={(v) => setLang(v as "en" | "fa")}
              className="grid grid-cols-2 gap-2"
            >
              {[
                { v: "en", label: t("settings.languageEn") },
                { v: "fa", label: t("settings.languageFa") },
              ].map((opt) => (
                <Label
                  key={opt.v}
                  htmlFor={`lang-${opt.v}`}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    lang === opt.v ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <RadioGroupItem id={`lang-${opt.v}`} value={opt.v} />
                  <span className="text-sm">{opt.label}</span>
                </Label>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground mt-1">{t("settings.rtlNote")}</p>
          </div>
        </Card>

        {/* Account */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserIcon className="size-5 text-primary" />
            <h2 className="font-semibold">{t("settings.account")}</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="su">{t("settings.username")}</Label>
              <Input id="su" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="se">{t("settings.email")}</Label>
              <Input id="se" value={email} disabled className="opacity-60" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa">{t("settings.avatar")}</Label>
              <Input id="sa" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sb">{t("settings.bio")}</Label>
              <Textarea id="sb" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} className="min-h-20" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button className="bg-red-600 hover:bg-red-700" onClick={save} disabled={loading}>
              {loading ? <Loader2 className="size-4 me-2 animate-spin" /> : <Save className="size-4 me-2" />}
              {t("settings.save")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Loader2, Film, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { useNavigate } from "@/stores/router";
import { useI18n } from "@/i18n";

export function RegisterView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const user = useAuthStore((s) => s.user);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.length < 3 || username.length > 30) {
      toast.error(t("validation.usernameLength"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("validation.passwordLength"));
      return;
    }
    setLoading(true);
    const res = await register(username, email, password);
    setLoading(false);
    if (res.ok) {
      toast.success(t("auth.registered"));
      navigate("/");
    } else {
      toast.error(res.error || t("error"));
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="text-center mb-6">
        <div className="size-14 rounded-2xl bg-red-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-red-600/30">
          <Film className="size-7" />
        </div>
        <h1 className="text-2xl font-bold">{t("auth.registerTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("auth.registerSubtitle")}</p>
      </div>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">{t("auth.username")}</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={30}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">{t("auth.usernameHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
          </div>
          <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
            {loading ? <Loader2 className="size-4 me-2 animate-spin" /> : <UserPlus className="size-4 me-2" />}
            {t("auth.register")}
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-border text-center text-sm">
          <span className="text-muted-foreground">{t("auth.haveAccount")} </span>
          <button onClick={() => navigate("/login")} className="text-primary hover:underline font-medium">
            {t("auth.loginHere")}
          </button>
        </div>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Loader2, Film, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { useNavigate } from "@/stores/router";
import { useI18n } from "@/i18n";

export function LoginView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      toast.success(t("auth.loggedIn", { name: email }));
      navigate("/");
    } else {
      toast.error(res.error || t("auth.invalidCreds"));
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="text-center mb-6">
        <div className="size-14 rounded-2xl bg-red-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-red-600/30">
          <Film className="size-7" />
        </div>
        <h1 className="text-2xl font-bold">{t("auth.loginTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("auth.loginSubtitle")}</p>
      </div>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
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
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
            {loading ? <Loader2 className="size-4 me-2 animate-spin" /> : <LogIn className="size-4 me-2" />}
            {t("auth.login")}
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-border text-center text-sm">
          <span className="text-muted-foreground">{t("auth.noAccount")} </span>
          <button onClick={() => navigate("/register")} className="text-primary hover:underline font-medium">
            {t("auth.signUpHere")}
          </button>
        </div>
      </Card>

      <div className="mt-4 rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
        <p className="font-medium text-card-foreground">{t("auth.demoAdmin")}</p>
        <p className="mt-1">{t("auth.demoAdminHint")}</p>
      </div>
    </div>
  );
}

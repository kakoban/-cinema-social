"use client";

import { Film, Github, Heart } from "lucide-react";
import { useNavigate } from "@/stores/router";
import { useI18n } from "@/i18n";

export function Footer() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <footer className="mt-auto border-t border-border bg-card/50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
                <Film className="size-4" />
              </div>
              <span className="font-bold">{t("brand")}</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">{t("footer.rights")}</p>
            <p className="text-xs text-muted-foreground mt-2">{t("tagline")}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">{t("nav.explore")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => navigate("/")} className="hover:text-primary transition-colors">{t("nav.home")}</button></li>
              <li><button onClick={() => navigate("/explore")} className="hover:text-primary transition-colors">{t("explore.tmdbResults")}</button></li>
              <li><button onClick={() => navigate("/explore?src=archive")} className="hover:text-primary transition-colors">{t("explore.archiveResults")}</button></li>
              <li><button onClick={() => navigate("/rooms")} className="hover:text-primary transition-colors">{t("nav.rooms")}</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Credits</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t("footer.tmdbCredit")}</li>
              <li>{t("footer.archiveCredit")}</li>
              <li className="flex items-center gap-1.5">{t("footer.builtWith")} <Heart className="size-3 text-red-600 fill-red-600" /></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {t("brand")}</p>
          <p>A demo project — movie data &amp; films belong to their respective rights holders.</p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n";

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Switch language">
          <Globe className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLang("en")}>
          <span className="me-2">🇬🇧</span> English
          {lang === "en" && <span className="ms-auto text-primary">●</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLang("fa")}>
          <span className="me-2">🇮🇷</span> فارسی
          {lang === "fa" && <span className="ms-auto text-primary">●</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

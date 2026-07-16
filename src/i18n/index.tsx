"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { en, type Dictionary } from "./en";
import { fa } from "./fa";

export type Lang = "en" | "fa";

const dicts: Record<Lang, Dictionary> = { en, fa };

type I18nContextValue = {
  lang: Lang;
  dir: "ltr" | "rtl";
  t: (path: string, vars?: Record<string, string | number>) => string;
  setLang: (l: Lang) => void;
};

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  dir: "ltr",
  t: (p) => p,
  setLang: () => {},
});

function resolve(dict: Dictionary, path: string): string {
  const parts = path.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}

function interpolate(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    // Read from cookie first, fall back to browser
    const match = document.cookie
      .split("; ")
      .find((c) => c.startsWith("lang="));
    const cookieLang = match?.split("=")[1] as Lang | undefined;
    if (cookieLang === "en" || cookieLang === "fa") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLangState(cookieLang);
    } else if (typeof navigator !== "undefined" && navigator.language.startsWith("fa")) {
      setLangState("fa");
    }
  }, []);

  const dir: "ltr" | "rtl" = lang === "fa" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.cookie = `lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      const str = resolve(dicts[lang] || en, path);
      return interpolate(str, vars);
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, dir, t, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

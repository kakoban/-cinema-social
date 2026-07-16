"use client";

import { create } from "zustand";

// Hash-based SPA router: supports paths like #/movie/abc, #/room/xyz
interface Route {
  path: string; // e.g. "/", "/movie/abc"
  segments: string[];
  query: Record<string, string>;
}

function parseHash(): Route {
  let hash = window.location.hash.replace(/^#/, "");
  if (!hash) hash = "/";
  const [pathPart, queryPart] = hash.split("?");
  const path = pathPart || "/";
  const segments = path.split("/").filter(Boolean);
  const query: Record<string, string> = {};
  if (queryPart) {
    for (const pair of queryPart.split("&")) {
      const [k, v] = pair.split("=");
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || "");
    }
  }
  return { path, segments, query };
}

interface RouterState {
  route: Route;
  navigate: (to: string) => void;
  back: () => void;
  init: () => () => void;
}

export const useRouterStore = create<RouterState>((set, get) => ({
  route:
    typeof window !== "undefined"
      ? parseHash()
      : { path: "/", segments: [], query: {} },
  navigate: (to) => {
    const target = to.startsWith("#") ? to : `#${to.startsWith("/") ? to : `/${to}`}`;
    if (window.location.hash === target) {
      // force re-render even if same
      set({ route: parseHash() });
    } else {
      window.location.hash = target;
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  },
  back: () => window.history.back(),
  init: () => {
    const handler = () => set({ route: parseHash() });
    window.addEventListener("hashchange", handler);
    // ensure initial hash exists
    if (!window.location.hash) {
      window.location.hash = "#/";
    } else {
      set({ route: parseHash() });
    }
    return () => window.removeEventListener("hashchange", handler);
  },
}));

export function useNavigate() {
  return useRouterStore((s) => s.navigate);
}

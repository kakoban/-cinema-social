"use client";

import { useEffect, Suspense, useState } from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { useRouterStore, useNavigate } from "@/stores/router";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n";

import { HomeView } from "@/views/home";
import { ExploreView } from "@/views/explore";
import { MovieView } from "@/views/movie";
import { RoomsView } from "@/views/rooms";
import { RoomView } from "@/views/room";
import { LoginView } from "@/views/login";
import { RegisterView } from "@/views/register";
import { ProfileView } from "@/views/profile";
import { WatchlistView } from "@/views/watchlist";
import { SettingsView } from "@/views/settings";
import { AdminView } from "@/views/admin";
import { PlatformsView } from "@/views/platforms";
import { MessagesView } from "@/views/messages";

function Router() {
  const route = useRouterStore((s) => s.route);
  const navigate = useNavigate();
  const { t } = useI18n();
  const { segments } = route;

  let view: React.ReactNode;
  let key = route.path;

  if (segments.length === 0) {
    view = <HomeView />;
  } else if (segments[0] === "explore") {
    view = <ExploreView query={route.query.q} source={route.query.src} />;
  } else if (segments[0] === "movie" && segments[1]) {
    view = <MovieView id={segments[1]} />;
    key = `movie-${segments[1]}`;
  } else if (segments[0] === "rooms" && !segments[1]) {
    view = <RoomsView />;
  } else if (segments[0] === "room" && segments[1]) {
    view = <RoomView id={segments[1]} />;
    key = `room-${segments[1]}`;
  } else if (segments[0] === "messages") {
    view = <MessagesView targetUsername={segments[1]} />;
    key = `messages-${segments[1] || "index"}`;
  } else if (segments[0] === "login") {
    view = <LoginView />;
  } else if (segments[0] === "register") {
    view = <RegisterView />;
  } else if (segments[0] === "profile" && segments[1]) {
    view = <ProfileView username={segments[1]} />;
    key = `profile-${segments[1]}`;
  } else if (segments[0] === "watchlist") {
    view = <WatchlistView />;
  } else if (segments[0] === "settings") {
    view = <SettingsView />;
  } else if (segments[0] === "admin") {
    view = <AdminView />;
  } else if (segments[0] === "platforms") {
    view = <PlatformsView />;
  } else {
    view = (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-4">
        <h1 className="text-3xl font-bold mb-2">404</h1>
        <p className="text-muted-foreground mb-6">{t("noResults")}</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          {t("nav.home")}
        </button>
      </div>
    );
  }

  return (
    <main className="flex-1 w-full animate-fade-in-up" key={key}>
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 py-10">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
              ))}
            </div>
          </div>
        }
      >
        {view}
      </Suspense>
    </main>
  );
}

export function AppShell() {
  const init = useRouterStore((s) => s.init);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const cleanup = init();
    return cleanup;
  }, [init]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (!mounted) {
    return null; // Prevents SSR mismatch completely
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <Router />
      <Footer />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Film, Menu, Search, LogOut, User as UserIcon, Settings, Shield, ListVideo, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useAuthStore } from "@/stores/auth-store";
import { useRouterStore, useNavigate } from "@/stores/router";
import { useI18n } from "@/i18n";
import { UserAvatar } from "./user-avatar";
import { ThemeToggle } from "./theme-toggle";
import { LangToggle } from "./lang-toggle";
import { NotificationBell } from "./notification-bell";
import { AddCustomMovie } from "./add-custom-movie";
import { cn } from "@/lib/utils";

function NavLink({ to, label }: { to: string; label: string }) {
  const route = useRouterStore((s) => s.route);
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const active = mounted && (route.path === to || route.path.startsWith(to + "/"));

  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active
          ? "text-primary bg-primary/10"
          : "text-muted-foreground hover:text-card-foreground hover:bg-accent"
      )}
    >
      {label}
    </button>
  );
}

export function Header() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const init = useRouterStore((s) => s.init);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const cleanup = init();
    return cleanup;
  }, [init]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/explore?q=${encodeURIComponent(search.trim())}`);
    }
  };

  const navItems = (
    <>
      <NavLink to="/" label={t("nav.home")} />
      <NavLink to="/explore" label={t("nav.explore")} />
      <NavLink to="/platforms" label="Free Platforms" />
      <NavLink to="/rooms" label={t("nav.rooms")} />
      {user && <NavLink to="/watchlist" label={t("nav.watchlist")} />}
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 glass">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3">
        {/* Brand */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 shrink-0"
        >
          <div className="size-9 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
            <Film className="size-5" />
          </div>
          <span className="font-bold text-lg hidden sm:block tracking-tight">
            Cinema<span className="text-primary">Social</span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ms-2">
          {navItems}
        </nav>

        {/* Search (desktop) */}
        <form onSubmit={submitSearch} className="hidden lg:flex flex-1 max-w-md mx-2">
          <div className="relative w-full">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("explore.searchPlaceholder")}
              className="ps-9 bg-card"
            />
          </div>
        </form>

        <div className="flex-1 lg:flex-none" />

        {/* Right controls */}
        <div className="flex items-center gap-1">
          {mounted && user && (
            <div className="hidden lg:block me-2">
              <AddCustomMovie />
            </div>
          )}
          <div className="hidden sm:flex items-center gap-1">
            <LangToggle />
            <ThemeToggle />
            {mounted && user && <NotificationBell />}
          </div>

          {mounted && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ms-1 rounded-full ring-2 ring-transparent hover:ring-primary/40 transition">
                  <UserAvatar username={user.username} avatar={user.avatar} size={34} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <UserAvatar username={user.username} avatar={user.avatar} size={32} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/profile/${user.username}`)}>
                  <UserIcon className="size-4 me-2" /> {t("nav.profile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/watchlist")}>
                  <ListVideo className="size-4 me-2" /> {t("nav.watchlist")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="size-4 me-2" /> {t("nav.settings")}
                </DropdownMenuItem>
                {user.role === "ADMIN" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="size-4 me-2" /> {t("nav.admin")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4 me-2" /> {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : mounted ? (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                {t("nav.login")}
              </Button>
              <Button size="sm" onClick={() => navigate("/register")} className="bg-red-600 hover:bg-red-700">
                {t("nav.register")}
              </Button>
            </div>
          ) : (
            <div className="size-9" />
          )}

          {/* Mobile menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="start" className="w-72 p-0">
                <div className="flex items-center gap-2 p-4 border-b border-border">
                  <div className="size-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
                    <Film className="size-4" />
                  </div>
                  <span className="font-bold">CinemaSocial</span>
                </div>
                <form onSubmit={submitSearch} className="p-3 border-b border-border">
                  <div className="relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("explore.searchPlaceholder")}
                      className="ps-9 bg-card"
                    />
                  </div>
                </form>
                <nav className="flex flex-col p-2 gap-1">
                  <SheetClose asChild>
                    <button onClick={() => navigate("/")} className="text-start px-3 py-2.5 rounded-lg hover:bg-accent text-sm font-medium">
                      {t("nav.home")}
                    </button>
                  </SheetClose>
                  <SheetClose asChild>
                    <button onClick={() => navigate("/explore")} className="text-start px-3 py-2.5 rounded-lg hover:bg-accent text-sm font-medium">
                      {t("nav.explore")}
                    </button>
                  </SheetClose>
                  <SheetClose asChild>
                    <button onClick={() => navigate("/rooms")} className="text-start px-3 py-2.5 rounded-lg hover:bg-accent text-sm font-medium">
                      {t("nav.rooms")}
                    </button>
                  </SheetClose>
                  {user && (
                    <SheetClose asChild>
                      <button onClick={() => navigate("/watchlist")} className="text-start px-3 py-2.5 rounded-lg hover:bg-accent text-sm font-medium">
                        {t("nav.watchlist")}
                      </button>
                    </SheetClose>
                  )}
                  {user && (
                    <SheetClose asChild>
                      <button onClick={() => navigate(`/profile/${user.username}`)} className="text-start px-3 py-2.5 rounded-lg hover:bg-accent text-sm font-medium">
                        {t("nav.profile")}
                      </button>
                    </SheetClose>
                  )}
                  {user && (
                    <SheetClose asChild>
                      <button onClick={() => navigate("/settings")} className="text-start px-3 py-2.5 rounded-lg hover:bg-accent text-sm font-medium">
                        {t("nav.settings")}
                      </button>
                    </SheetClose>
                  )}
                  {user?.role === "ADMIN" && (
                    <SheetClose asChild>
                      <button onClick={() => navigate("/admin")} className="text-start px-3 py-2.5 rounded-lg hover:bg-accent text-sm font-medium flex items-center gap-2">
                        <Shield className="size-4" /> {t("nav.admin")}
                      </button>
                    </SheetClose>
                  )}
                </nav>
                <div className="p-3 border-t border-border flex items-center justify-between">
                  <LangToggle />
                  <ThemeToggle />
                </div>
                {!user && (
                  <div className="p-3 border-t border-border flex flex-col gap-2">
                    <SheetClose asChild>
                      <Button variant="outline" onClick={() => navigate("/login")}>{t("nav.login")}</Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button onClick={() => navigate("/register")} className="bg-red-600 hover:bg-red-700">{t("nav.register")}</Button>
                    </SheetClose>
                  </div>
                )}
                {user && (
                  <div className="p-3 border-t border-border">
                    <SheetClose asChild>
                      <Button variant="outline" className="w-full" onClick={async () => { await logout(); navigate("/"); }}>
                        <LogOut className="size-4 me-2" /> {t("nav.logout")}
                      </Button>
                    </SheetClose>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

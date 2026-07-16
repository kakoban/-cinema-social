# Cinema Social — Worklog

---
Task ID: all
Agent: main (Z.ai Code)
Task: Build Cinema Social — a social movie platform with discovery, reviews, watchlists, follow, synchronized watch parties (Socket.IO), notifications, i18n (en/fa RTL), theming, and admin moderation.

Work Log:
- Installed packages: jsonwebtoken, bcryptjs, socket.io-client (+ dev types).
- Configured next.config.ts with image remote patterns (TMDB, archive.org) and .env (JWT secret, TMDB_API_KEY empty).
- Wrote Prisma schema with all models (User, RefreshToken, Movie, Room, RoomMember, Message, Review, Follow, Watchlist, WatchlistItem, Notification) and ran db:push.
- Built design system: globals.css with cinema palette (red-600 accent, dark default, CSS vars --bg/--text/--card/--border/--muted), Inter + Vazirmatn fonts, RTL font swap, custom scrollbar, card-lift, glass header.
- Built i18n: en + fa dictionaries, React context provider, cookie persistence, RTL dir switching.
- Built lib: db client, auth (JWT access 15m + rotated refresh 7d httpOnly cookie + tokenVersion session invalidation + bcrypt hashing), response helpers, zod validation, per-IP rate limiting, TMDB client (graceful no-key fallback), Archive.org client (search/metadata/direct-mp4 resolution), client api-fetch with refresh-on-401.
- Built all API routes: auth (register/login/refresh/logout/me), users (profile/reviews/followers/following/follow), movies (search/trending/detail/trailer/archive search+detail/featured/reviews CRUD), reviews CRUD, rooms CRUD + join/leave, watchlists CRUD + movies, notifications, feed, admin (users/rooms/reviews + ban/unban with tokenVersion bump).
- Built frontend stores: auth (zustand, bootstrap restores session via refresh cookie on reload), hash-based SPA router.
- Built shell: sticky header (nav, search, theme/lang toggles, notification bell, user menu, mobile sheet), sticky footer, providers (next-themes + TanStack Query + i18n + auth bootstrap).
- Built all SPA views on `/`: home (hero, TMDB setup banner, trending, archive classics, activity feed), explore (TMDB + archive search), movie detail (backdrop, poster, trailer, watch, reviews, write/edit/delete review, add-to-list, start watch party), rooms list + create, room (Socket.IO chat + system messages + typing + members + native synced video with drift-correction + host controls), login, register, profile (follow/unfollow, edit, reviews), watchlist (create/manage), settings (theme/lang/account), admin (users/rooms/reviews moderation).
- Built Socket.IO mini-service on port 3003: join/leave/chat:typing/chat:message/playback:sync/playback:seek with in-memory room state, host-authoritative playback, server-timestamped sync for drift compensation, host-disconnect freeze, late-joiner sync request, 50-member cap, auto-delete empty rooms.
- Seeded admin (admin@cinema.dev / admin123), demo user (cinephile), and 4 public-domain films with resolved direct mp4 URLs + a demo review/watchlist.
- Fixed bugs found during verification: wrong module import for ensureMovieFromArchive; /api/auth/me reading a non-existent cookie instead of the Authorization header; bootstrap not attempting refresh on reload (session lost on reload); unique-constraint noise in join route (now checks existing membership first); invalid archive.org demo identifiers replaced with valid ones that expose direct mp4 files.
- Self-verified end-to-end with Agent Browser through the Caddy gateway (port 81, required for XTransformPort socket routing): home renders, login + session restore via refresh, movie detail with reviews, watch party with live Socket.IO chat + system join messages + native synced video that plays + host controls, theme toggle, Persian RTL (dir=rtl + translated nav), explore archive search, watchlist creation, admin dashboard, rooms list, sticky footer (sticks on short content, scrolls on tall content).

Stage Summary:
- Production-ready Cinema Social app on Next.js 16 (App Router) + Prisma/SQLite + Socket.IO mini-service.
- Single user-facing route `/` (SPA with hash routing) per sandbox constraint; full REST API under `/api/*`; real-time service on port 3003.
- All core features working and browser-verified. Lint clean. Both dev server (3000) and realtime service (3003) running.
- Demo admin: admin@cinema.dev / admin123. TMDB optional (graceful fallback to Archive.org free classics when no key).

# Project Overview: Bike Log (Mobile)

## Overview

Bike Log's mobile app is an Expo (SDK 54) + `expo-router` React Native app, the client for the already-complete `bikelog_server` REST API (Express + Mongoose, see `../../bikelog_server/context/`) — the same backend `bikelog_client(web)` already talks to. It lets a rider log fuel fill-ups, maintenance events, issues, and an accessory wishlist for their motorcycle(s), and see derived average mileage, km-based maintenance reminders, and total spending.

**This is the real target, not another prototype.** `bikelog_client(web)`'s own `project-overview.md` says explicitly: "The developer's actual main target for this project is a React Native app — this Next.js build is a deliberately-sequenced first prototype." That prototype has now shipped and been used to validate the product end-to-end against the real API (all 12 web specs complete, see `../../bikelog_client(web)/context/progress-tracker.md`). This app is what it was sequenced *for* — build it to last, not to prove a concept a second time.

This app is not started from scratch either, in spirit: it's built to match the folder structure, component approach, and library choices of `expenseTrackerReactNative` (`../../expenseTrackerReactNative`), a separate, finished, working React Native app by the same developer. That project is the coding-convention reference the same way the web app's old shop-admin scaffold was a component-library reference — see `architecture.md`'s "Reused vs. adapted from `expenseTrackerReactNative`" for exactly what's kept as-is vs. deliberately changed. `../PLAN.md` is the original analysis this whole context set was built from; treat it as the detailed rationale behind the summaries in these six files, not a duplicate to keep in sync separately.

## Goals

1. Reach feature-parity with the already-shipped, already-verified web app (`bikelog_client(web)`) — same 11 screens, same backend contract, nothing more, nothing less for v1.
2. Match `expenseTrackerReactNative`'s actual coding habits (plain `useState` forms, `Swipeable` row actions, Paper modals, Context+AsyncStorage auth) so the codebase reads as one continuous style across the developer's RN projects, not a fresh set of conventions per app.
3. Ship something that feels native — pull-to-refresh, swipe gestures, `Alert.alert()` confirmations — rather than a literal port of the web app's browser-shaped interactions (`confirm()`, hover states, click-to-reveal action menus).
4. Stay small: no feature the web app doesn't already have, no dependency the reference project doesn't already justify (see `ai-workflow-rules.md`'s Scoping Rules).

## Roles

Same as the web app: `bikelog_server` has `user`/`admin` in its schema/JWT payload, but nothing is role-gated server-side yet. This app builds the `user`-role experience only — no admin screens, no role-conditional UI. If an admin panel is ever built, it's a separate, later, explicitly-scoped addition, not something to leave placeholder folders for now.

## Core User Flows

### First launch (unauthenticated)

1. Opening the app with no stored token lands on the login screen (`app/auth.tsx`) — `AuthGuard` (in `utils/AuthGuard.tsx`, mirroring the reference project's own file of the same name and job) redirects here whenever `user` is `null` and the current route isn't already an auth screen.
2. From login, a link goes to register (`app/register.tsx`); from register, a link goes back to login.
3. No tab/bike screen is reachable without a valid session — enforced by `AuthGuard` wrapping the `(tabs)` layout, checked against the `UserProvider` context's `user`/`isLoading` state (see `architecture.md`'s Auth & Access Model). This is the RN equivalent of the web app's `app/(main)/layout.tsx` hard gate, adapted for async `AsyncStorage` reads instead of a synchronous cookie read.

### Rider (`user` role — single-user-per-account, no shared-bike concept)

1. Registers / logs in — JWT returned by the API, stored via `AsyncStorage` (`token`, `user` keys) and mirrored into `UserContext` for the rest of the app to read synchronously.
2. Lands on the Dashboard tab — a list of their bikes, with a create-bike modal.
3. Opens a bike (`/bikes/[bikeId]`) — a hub screen with the bike's info, an active reminders banner, and six nav tiles into that bike's fuel logs, mileage stats, maintenance logs, spending summary, issues, and accessories (the same six the web app's `BikeDetailPage` already surfaces — see `../../bikelog_client(web)/components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx` for the exact tile set/order to mirror).
4. Logs a fuel fill-up — odometer, liters, price, full-tank toggle — via a Paper `Modal`.
5. Checks mileage stats — History / Monthly / Yearly / Lifetime, tab-switched on one screen.
6. Logs a maintenance event, picking a maintenance type and (for oil changes) an oil type from small catalog selects; sees due/overdue/upcoming reminders as a banner.
7. Checks spending — Month / Year / Lifetime, tab-switched.
8. Logs a bike issue (title/description/date), and later marks it resolved or reopens it via a dedicated action — not the generic edit form (see `../../bikelog_client(web)/context/specs/11-bike-issue.md` for why this is a separate guarded action, already implemented once on web).
9. Tracks an accessory wishlist item (name/urgency/status), freely changing status through the same edit form — no guarded workflow here, unlike issues.
10. Manages the maintenance-type/engine-oil-type catalogs from a settings screen, only when an existing seeded type doesn't fit.

## Features by Category

- **Auth:** register, login, AsyncStorage-persisted JWT + user, Context-driven route gate.
- **Bike management:** list/create/edit/delete a bike; bike hub screen linking to everything scoped to it.
- **Fuel & mileage:** fuel-log CRUD; mileage history (exact + rolling-average), monthly, yearly, lifetime stat views.
- **Maintenance & reminders:** maintenance-type / engine-oil-type catalog (create + list only); maintenance-log CRUD; due/overdue/upcoming reminders banner.
- **Spending:** total + category-breakdown summary, switchable by period.
- **Issues:** open/resolved lifecycle tracking per bike, status changed only via a dedicated action.
- **Accessories:** per-bike purchase wishlist with urgency/status, plain CRUD.

## In Scope (v1)

- Every screen `bikelog_client(web)` already has, listed exhaustively in `code-standards.md`'s Route Table — 100% parity with the existing, verified web feature set, nothing more.
- `user`-role functionality only.
- Native interaction patterns (swipe actions, pull-to-refresh, native `Alert`) in place of the web app's browser-shaped equivalents, per `architecture.md`.

## Out of Scope

**Deferred, not abandoned:**
- Admin panel / any `admin`-role functionality — same stance as the web app.
- Push notifications — `bikelog_server`'s original plan (`bikelog_server/context/specs/bike-log-plan.md`) mentions Expo push as a Phase-2 idea for exactly this app; not building it in v1. The in-app reminders banner is the only mechanism for now.
- Charts of any kind — plain totals/cards only. (Spec 18 briefly added Spending/Mileage trend charts for v2; spec 25 removed them per direct user instruction, restoring this stance. Web keeps and widens its own charts — this is a mobile-only exclusion.)

**Not relevant to Bike Log at all:**
- `expenseTrackerReactNative`'s `smart-add` (AI prompt-to-transaction) screen and its backing endpoint — a feature specific to that app's domain, with no `bikelog_server` equivalent. See `../PLAN.md` §8 for the full "don't copy" list, including a real bug in that project's axios interceptor this app must not inherit.

## Success Criteria

- A rider can register, log in, add a bike, log a fuel fill-up, and see a mileage figure without touching the backend directly.
- Every screen the web app has, this app also has, verified against the same live `bikelog_server` instance.
- Swipe-to-delete/edit and pull-to-refresh work smoothly on real list screens (fuel logs, maintenance logs, issues, accessories) — not just the reference project's single transaction list.
- The whole v1 ships without inventing new architectural patterns beyond what `expenseTrackerReactNative` already proved out, plus the one deliberate fix noted in `architecture.md` (the axios error-interceptor rejection bug).

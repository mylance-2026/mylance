# Mylance implementation checklist

Only items verified by a command are ticked.

## Phase 1 — Audit
- [x] Repo was empty (greenfield); no auth, DB, payments or deploy config existed.

## Phase 2 — Foundation
- [x] Next.js 16 (App Router, TS, Tailwind 4, ESLint) scaffolded
- [x] Deps: zod, @supabase/supabase-js, @supabase/ssr, lucide-react, vitest
- [x] `.env.example` (placeholders only)
- [x] Migration `supabase/migrations/0001_core_schema.sql` rewritten (all tables, RLS, column grants, order/dispute/payout functions). NOT yet applied to the live Supabase project
- [ ] Supabase clients, auth middleware, env validation
- [ ] Design tokens and UI kit

## Domain logic (pure, tested)
- [x] Integer minor-unit money (per-currency exponent) — 10 unit tests pass
- [x] Fee calculation (bps, half-up), order state machine, proposal eligibility, ledger balance check
- [x] `npx tsc --noEmit` clean

## Frontend (UI only, no backend; focus per user request)
- [x] Design tokens, header/footer, UI kit; build + lint + tsc pass
- [x] Pages: /, /explore, /categories(+/[slug]), /how-it-works, /pricing, /about, /contact, /terms, /privacy, /community-guidelines, /login, /signup, /projects/new, /dashboard/*
- Forms are disabled/labelled "not connected"; lists show honest empty states (no fake data)
- [x] Added: /projects(+/[id]), /freelancers(+/[username]), /services/[slug](+/checkout), /forgot-password, /reset-password, /onboarding, dashboard orders(+/[id]), services(+/new), messages, earnings, reviews, settings, full /admin/* shell, error/loading/sitemap
- [x] Dev-only fixtures (`UI_FIXTURES=1` in .env.local, never in production) let detail screens be previewed; `src/lib/data.ts` is the seam for the real backend
- [x] Build (62 pages), lint, tsc pass; routes smoke-tested (HTTP 200) on dev server; home and service pages checked visually at phone width
- [x] No horizontal overflow at 375px on 24 static routes (production build); header collapses to menu below 1024px
- [ ] Detail pages (service/profile/project/order) only eyeballed for the service page; legal pages are draft placeholders

## Local preview mode (end-to-end frontend, no backend)
- [x] `NEXT_PUBLIC_DEMO_MODE=1` enables a browser-only data layer (`src/lib/demo/`): signup/login, profiles, services (draft/publish/pause/archive, moderation), explore with real filters/sort/pagination, checkout, orders (pay/start/deliver/revision/approve/cancel/dispute), projects + proposals (atomic single award), messaging with unread counts, reviews, notifications, earnings + payout requests, reports, contact, full admin (users, moderation, disputes, payouts, fee settings, audit log)
- [x] Business rules reuse the tested domain modules (fees in bps, order state machine, proposal eligibility)
- [x] 13 automated flow tests in `src/lib/demo/flows.test.ts` (23 tests total pass); lint, tsc, build (63 pages) pass
- [x] Browser-verified: signup -> publish service -> appears in /explore
- [x] Cancellation-request flow on paid orders (notifies the other party; no state change, disputes remain the resolution path) + unit test
- [x] `/verify-email` placeholder page (honest: needs email provider)
- [x] Portfolio (title/link/description, max 12) shown on profiles and edited in Settings; favourites (heart on service cards + /dashboard/favourites); disabled upload pickers (avatar, portfolio images, service cover) that say storage is not connected
- [x] Local-preview password reset (/forgot-password -> /reset-password, single-use, 1h token; no email is sent, the link is shown on the page). With the flag off both stay disabled.
- [x] Legal pages expanded to structured drafts. They are NOT legal advice and still need lawyer review (company name, governing law, liability, retention, contact are marked as to-be-added)
- [x] 27 automated tests pass (portfolio, favourites, password reset, cancellation request included)
- [x] Browser checks: no horizontal overflow at 375px (orders, order detail, messages, project, dashboard project, settings, explore) and at 768px (18 routes sampled; admin services/users/disputes/payouts). Tablet admin tables scroll inside their card.
- [ ] Not browser-verified: every button in every flow at every width; cancellation-request prompt dialog; password-reset UI (logic is unit-tested); admin settings and audit-log screens at tablet width
- Known dev-only console notice: Next.js "instant navigation ... segment dropped" on client-rendered dashboard/admin pages. Production build is unaffected.
- Preview-only shortcuts that MUST NOT exist in production: "Enable admin" button, "Pay (local test)", plaintext-ish password hash, localStorage data. The real adapter replaces `src/lib/demo/*`.
- Without the env flag every action shows "backend not connected".

## Backend (started)
- [x] Supabase project created; URL, publishable key and service key saved in `.env.local` (gitignored). Keys verified to authenticate; project database was empty.
- [x] Schema runs in a real Postgres engine (PGlite) and 24 tests check RLS, column grants, fee freezing, order state machine (identical to the TypeScript one), disputes, payouts, ledger immutability, messaging privacy, proposal acceptance. These are NOT run against the live project.
- [ ] Apply migration in the Supabase SQL editor and report any error
- [ ] Turn off email confirmation in Supabase (dev only), then switch the app from `src/lib/demo/*` to the Supabase adapter (auth first)
- [ ] Rotate the service-role key (it was pasted in chat) before launch
- [ ] Not tested: real concurrency (two simultaneous accept_proposal / payout calls), Realtime, Storage policies, Auth hooks

## Not started (backend)
Public pages, onboarding, services, projects/proposals UI, orders UI, messaging, uploads (R2), reviews,
notifications, payment provider + webhook handler, payouts, admin area, SEO, integration/E2E tests,
threat model and deployment docs.

## Known risks to verify when the DB exists
- `profiles_self_update` / `services_update` policies use self-referencing subqueries; confirm no RLS recursion.
- Remaining tables from the spec (reviews, notifications, messages, disputes, refunds, payouts, etc.) are not yet in a migration.
- `accept_proposal` concurrency needs a real-Postgres test.

## External configuration required
Supabase project, payment provider (capabilities for marketplace payouts must be verified), Cloudflare R2, email provider.

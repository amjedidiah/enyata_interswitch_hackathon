# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AjoFlow** is an AI-powered digital ROSCA (Rotating Savings and Credit Association) platform for the Interswitch x Enyata Hackathon (March 23–27, 2026). It digitizes traditional Nigerian "Ajoo/Esusu" savings circles with trustless wallet and AI-based trust scoring.

## Commands

All commands use **bun** (not npm/yarn).

```bash
# Install all dependencies (root + server + client)
bun run install:all

# Run backend (from root or server/)
bun run dev:server        # root shortcut
cd server && bun run dev  # direct

# Run frontend (from root or client/)
bun run dev:client        # root shortcut
cd client && bun run dev  # direct
```

**Seed the database** (requires running server):

```bash
curl -X POST http://localhost:4000/api/seed \
  -H "x-seed-secret: <SEED_SECRET from .env>"
```

**Manually trigger cron deductions** (requires `CRON_SECRET` from `.env`):

```bash
curl -X POST http://localhost:4000/api/cron/run-deductions \
  -H "x-cron-secret: <CRON_SECRET from .env>"
```

## Architecture

### Monorepo Structure

- `server/` — Node.js + Express + TypeScript backend (port 4000)
- `client/` — Next.js 16 frontend (port 3000, App Router)
- `docs/` — Architecture and planning docs

### Backend (`server/src/`)

**Entry point**: `index.ts` — mounts routes, connects MongoDB.

**Route auth levels:**

- Public (no auth): `GET /health`, `/auth`, `GET /api/pods`, `GET /api/pods/:id`, `GET /api/pods/:id/payout-history`, `GET /api/stats`
- Secret-gated (`x-seed-secret` header): `POST /api/seed`
- JWT-protected (any authenticated user): `POST /api/pods`, `/api/trust`, `POST /api/payments/join`, `POST /api/payments/contribute`
- JWT-protected (member only): `GET /api/pods/:id/activity`, `GET /api/pods/:id/trust-scores`, `GET /api/pods/:id/wallet-balance`, `GET /api/pods/:id/my-contributions`, `GET /api/stats/me`
- JWT-protected (admin/creator only): `POST /api/pods/:id/evaluate`, `POST /api/pods/:id/payout`, `POST /api/pods/:id/reset`, `POST /api/pods/:id/provision-wallet`, `GET /api/pods/:id/contribution-matrix`, `POST /api/payments/manual`

**Services** (`server/src/services/`):

| File | Responsibility |
|------|---------------|
| `interswitch.ts` | Interswitch API wrapper — OAuth token caching, wallet CRUD, virtual account callback credit, disbursement |
| `trustAgent.ts` | DeepSeek V3 AI via LangChain — scores user reliability 0–100 with structured Zod output |
| `queueService.ts` | Scores all pod members, reorders queue (risky members with score <50 move to end) |
| `payoutService.ts` | Validates wallet balance, triggers Interswitch disbursement, updates pod state |
| `contributionService.ts` | Records contribution cycles — cap validation, smart cycle assignment (skips paid cycles), duplicate guard, transaction creation, wallet credit |
| `wallet.ts` | Credits pod wallet via virtual account callback + increments `contributionTotal` ledger |

**AI Trust Agent** uses `@langchain/deepseek` (not OpenAI GPT-4 as originally planned). Input: per-user payment stats. Output: `{ score: number, reasoning: string, riskFlag: boolean }`.

### Frontend (`client/`)

**Next.js App Router pages:**

Three route groups. `<Navbar />` is in root `layout.tsx` (global); `(auth)/layout.tsx` overrides with a bare shell.

- `/` — Marketing/landing page, `(public)` group
- `/pods` — Public pod browser with search + frequency filter; platform stats above grid, `(public)` group
- `/pods/[id]` — Public pod detail: queue, activity feed, join button, member contributions, `(public)` group
- `/login`, `/register` — Auth pages, `(auth)` group (bare shell, no Navbar)
- `(protected)` route group — JWT-gated via `(protected)/layout.tsx`:
  - `/dashboard` — Hub page: `UserQuickStats` + links to `/pods` and `/my-pods`
  - `/my-pods` — User's pods list (`GET /api/pods?member=true`); "Manage →" link for owned pods
  - `/my-pods/[id]` — Member pod detail (same content as public pod detail, but auth-gated)
  - `/my-pods/[id]/manage` — Admin controls: trigger payout, run AI evaluation (15s polling)
  - `/settings` — Bank details form (bank code + account number) for payout disbursement

`(protected)/layout.tsx` uses `useAuthContext()` and waits for `isInitialized` before redirecting to `/login` if no token is present. This eliminates the flash caused by the previous `localStorage` approach.

**`client/contexts/AuthContext.tsx`** — `AuthProvider` wraps the app. On mount, if a `session_hint` cookie is present it silently calls `POST /auth/refresh` (with credentials) to obtain a fresh access token without a visible login prompt. Exposes `{ user, hasToken, isInitialized, setAuth, clearAuth }` via `useAuthContext()`.

**`client/lib/auth.ts`** — Module-level in-memory access token store (`getAccessToken` / `setAccessToken`). Survives React re-renders but is cleared on hard refresh — the `AuthContext` silent refresh restores it on page load.

**`client/lib/api.ts`** — Axios instance that reads the in-memory access token via `getAccessToken()` and attaches it as `Authorization: Bearer <token>`. On 401, silently calls `POST /auth/refresh` once to rotate the token and retries the original request. Multiple concurrent 401s are queued and drained together. Auth endpoints (`/auth/*`) are excluded from the refresh retry to prevent loops.

**`client/lib/fetchers.ts`** — typed server-side fetch helpers for use in Next.js Server Components (e.g. fetching pod lists for SSR on the public pods page).

**Tailwind theme tokens** (defined in `tailwind.config.ts`):

- `brand-primary` (navy), `brand-accent` (gold), `brand-surface`, `brand-text`, `brand-success`, `brand-danger`

### Core Flows

**Pay-In:** User joins pod → `POST /api/payments/join` → member admitted immediately → wallet credited via Interswitch virtual account callback (`creditWalletViaCallback`) → user sees transfer details (bank name, account number) to send funds.

**AI Queue Reorder:** Admin triggers `POST /api/pods/:id/evaluate` → backend scores every member via DeepSeek → members with score <50 move to queue end → frontend animates reorder + shows reasoning in `TrustScoreCard`.

**Pay-Out:** Admin triggers `POST /api/pods/:id/payout` → verifies wallet balance ≥ `contributionAmount × members.length` → Interswitch disbursement to first queue recipient's bank account.

### Environment Variables

Copy `server/.env.example` to `server/.env`. Key variables:

```txt
MONGODB_URI          # MongoDB Atlas connection string
JWT_SECRET           # For signing JWTs (7-day expiry)
SEED_SECRET          # Guards POST /api/seed
SEED_PASSWORD        # Password for all seeded demo users
DEEPSEEK_API_KEY     # For AI trust scoring
INTERSWITCH_*        # Client ID, secret, merchant code, pay item ID, callback token
CLIENT_URL           # Frontend URL for CORS (default: http://localhost:3000)
```

### Seed Data

The seed endpoint creates 4 demo users (`amara@demo.com`, `bola@demo.com`, `chidi@demo.com`, `dami@demo.com`) with varied payment histories, 1 pod ("Lagos Gig Workers Pod"), and 50+ transactions. All share the password in `SEED_PASSWORD`.

## Interswitch API Integration

Uses Interswitch's **sandbox** (`https://qa.interswitchng.com`). Three integration surfaces:

1. **Virtual Account Callback** — credits pod wallet via `POST /paymentgateway/api/v1/virtualaccounts/wema/callback`; uses a static Bearer token (`INTERSWITCH_CALLBACK_TOKEN`), not the OAuth token
2. **Wallet API** — pooled fund holding (never admin's personal account); `createWallet`, `creditWalletViaCallback`, `getWalletBalance`
3. **Disbursement API** — lump-sum payout to bank account; `disburseFunds`

If wallet creation hits sandbox limits, the pod is still created with `walletId: null`. Admin can retry via `POST /api/pods/:id/provision-wallet`.

## Key Judging Criteria

Days 2–4 evaluation focus: Interswitch API integration depth and AI orchestration quality. The AI reasoning displayed in `TrustScoreCard.tsx` ("why was this user moved?") is explicitly a judging criterion — prioritize surfacing it in the UI.

## Submission

- **Hackathon ended**: March 27, 2026
- Public GitHub repo, live MVP (Vercel + Render), test credentials for judges
- Sectors: Payments (P), Social Services (S), Emerging Tech (AI)

# Product Requirement Document: StellarPay Stabilization & Launch

## 1. Executive Summary
**Objective:** Consolidate the monorepo into a clean structure, finalize the Express + Prisma backend on Supabase, connect Web and Mobile clients end-to-end, and deploy.
**Current Status:** Fragmented code (root vs. `frontend/web`), git divergence, unfinished backend, and disconnected clients.
**Goal:** Clean `main` with integrated Web/Mobile talking to a Railway-deployed backend.

---

## 2. Architecture Restructuring (The "Cleanup")

### 2.1 Target Directory Structure
```
/                      
├── apps/ (from frontend/)
│   ├── web/        (Next.js App Router)
│   └── mobile/     (Expo Router)
├── packages/
│   └── backend/    (Express + Prisma + Soroban)
├── package.json    (workspace root)
├── pnpm-workspace.yaml
└── shared configs (eslint, tsconfig base, etc.)
```

### 2.2 Restructure Tasks
- Move root `app/`, `components/`, `lib/`, tests, config into `apps/web/` (currently `frontend/web`).
- Remove duplicate root configs that belong to web; keep single source in `apps/web/`.
- Normalize workspaces: `apps/*`, `packages/*` in `pnpm-workspace.yaml` and root `package.json`.
- Ensure dev scripts (`web:dev`, `mobile:start`, `backend:dev`) reference new paths.

---

## 3. Backend Implementation (Express + Prisma + Supabase)

### 3.1 Stack
- Runtime: Node.js/Express.
- DB: Supabase PostgreSQL.
- ORM: Prisma (type-safe client, migrations).
- Chain: Stellar SDK + Soroban client.

### 3.2 Deliverables
- Prisma setup in `packages/backend`:
  - `prisma schema` aligned to Supabase (pull from remote, then model-led changes).
  - Migrations checked in; `prisma generate` wired to build.
- Auth: challenge/response using Stellar keys (LumenVault). Store sessions/tokens in DB (Supabase) with TTL.
- Transactions: submit to Stellar, persist ledger entries, polling/webhook handling for status.
- Telegram: link Telegram ID to public key; minimal routes to set/get link.
- Stocks/RWA: service layer (AlphaVantage or mock), routes returning priced assets.
- Health/ops: `/health`, `/ready`, `/metrics` endpoints.

### 3.3 Deployment
- Railway service for backend.
- Env: `DATABASE_URL` (Supabase), `STELLAR_NETWORK`, `HORIZON_URL`, `ALPHAVANTAGE_API_KEY`, `TELEGRAM_BOT_TOKEN`.
- Build command: `pnpm --filter backend build` (or `tsc`), start `node dist/server.js`.

---

## 4. Frontend Integration

### 4.1 Web (apps/web)
- API base: `NEXT_PUBLIC_API_URL` -> backend host.
- Replace mock/local calls with backend REST endpoints for auth/tx/telegram/stocks.
- Ensure wallet signing flow uses backend challenges.

### 4.2 Mobile (apps/mobile)
- Centralize API base/config; align to backend host (dev/prod toggles).
- Use SecureStore keys to sign backend challenges; reuse web flows.
- Test payment + balance fetch end-to-end.

---

## 5. Execution Plan (Phased)

### Phase 1: Repo CPR
- Fix git divergence (rebase or reset after backup/stash).
- Move files into `apps/web`; update workspace configs.
- Clean install with pnpm; fix lint/build.

### Phase 2: Backend Power-Up
- Initialize Prisma; connect to Supabase.
- Implement auth, transactions, telegram, stocks routes; wire services.
- Add migrations and generate client.

### Phase 3: End-to-End Wiring
- Point web/mobile envs to backend; swap mock data for live endpoints.
- Verify flows: auth challenge -> sign -> session; send payment -> ledger record -> status; telegram link.

### Phase 4: Deploy & Harden
- Deploy backend to Railway; set env vars.
- Update frontend envs to production URLs.
- Add basic CI (lint/test) and healthchecks.

---

## 6. Success Criteria
- `pnpm dev` works across apps without errors.
- Web: login/sign succeeds; payment flow records in DB and reflects in UI.
- Mobile: same auth/payment flow works against backend.
- Deployed backend healthy on Railway; frontends consume production API.

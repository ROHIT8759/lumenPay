## StellarPay Monorepo

Unified web, mobile, and Soroban contract code for the StellarPay stack. The product behaves like a UPI-style wallet on Stellar: custodial wallets, QR/ID payments, KYC, loans, rewards, and on-chain auditability.

### What’s inside
- Web: Next.js 14 + TypeScript + Tailwind with server actions/api routes in `/app`
- Mobile: Expo Router + React Native in `/mobile`
- Backend services: Supabase auth/DB, Stellar SDK, server-side signing via `lib/walletService.ts`
- Contracts: Soroban/Rust contracts in `/contracts`
- Database: Supabase schema and migrations in `/supabase`

### Repository layout
```
app/           Next.js routes (pages, API), server actions
components/    Shared UI + feature components
lib/           Services (wallet, kyc, loans, encryption, stellar helpers)
contracts/     Soroban smart contracts (Rust)
supabase/      SQL schema and migrations
mobile/        Expo Router mobile app
docs/          Architecture, deployment, feature guides
public/        Static assets
scripts/       Utility scripts (e.g., comment stripping)
```

## Getting started

### Prerequisites
- Node.js 18+
- npm or yarn
- Rust toolchain + `wasm32-unknown-unknown` target (contracts)
- Supabase CLI (optional, for local DB)
- Expo CLI or Expo Go app (mobile)

### Web (Next.js)
```bash
npm install
cp .env.local.example .env.local   # add your keys
npm run dev
# http://localhost:3000
```

Env hints:
```
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Mobile (Expo Router)
```bash
cd mobile
npm install
npx expo start
# press i / a for simulators or scan with Expo Go
```
Configure the mobile API base URL and Supabase keys to point at the same backend as web.

### Contracts (Soroban/Rust)
```bash
cd contracts
rustup target add wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown
# use Soroban CLI to deploy/test
```

### Database (Supabase)
- Schema/migrations: `/supabase`
- Run locally: `supabase start` then `supabase db reset`

## Documentation map
- Architecture: [docs/ARCHITECTURE_FULL.md](docs/ARCHITECTURE_FULL.md)
- Deployment: [docs/DEPLOYMENT_PRODUCTION.md](docs/DEPLOYMENT_PRODUCTION.md) and staging notes in [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md)
- Expo/mobile features: [docs/EXPO_FEATURE.md](docs/EXPO_FEATURE.md)
- Transactions dashboard: [docs/TRANSACTIONS_DASHBOARD.md](docs/TRANSACTIONS_DASHBOARD.md)
- Integration examples: [docs/TRANSACTION_INTEGRATION_EXAMPLES.md](docs/TRANSACTION_INTEGRATION_EXAMPLES.md)
- Full codebase analysis: [docs/CODEBASE_ANALYSIS.md](docs/CODEBASE_ANALYSIS.md)

## Fix at the Hackathon (blunt list)
- Product naming is inconsistent ("Steller" vs "StellarPay" in branding and repo URL) — align all assets and references.
- No shared `.env.local.example` files for web/mobile — add templates with required keys to unblock onboarding.
- Comment stripping was run against generated type files (e.g., `next-env.d.ts`, `mobile/env.d.ts`) — regenerate these to avoid subtle type drift.
- Mobile app lacks documented API base URL and Supabase config — add config plumbing and docs so it points at the same backend as web.
- No automated checks noted for mobile or contracts — add lint/test scripts and CI to stop regressions.

---
Built by the StellarPay team. Pull requests welcome.

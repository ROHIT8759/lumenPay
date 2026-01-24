
# LumenPay

LumenPay is a non-custodial payment and financial services platform built on the Stellar Network. It features a robust backend for transaction indexing, smart contract interaction (Escrow, KYC), and real-time notifications via Telegram.

## Architecture

- **Frontend**: Next.js (Web) / React Native (Mobile)
- **Backend**: Node.js + Express + Prisma (PostgreSQL)
- **Blockchain**: Stellar Network (Horizon API + Soroban)
- **Database**: Supabase (PostgreSQL)

## Deployment

### 1. Prerequisites

- **Supabase Project**: Create a project at [supabase.com](https://supabase.com).
- **Stellar Account**: Create a testnet account.
- **Telegram Bot**: Create a bot via @BotFather.

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Critical variables:
- `DATABASE_URL`: Connection string from Supabase (Transaction Pooler).
- `DIRECT_URL`: Direct connection string (Session Pooler).
- `STELLAR_NETWORK`: `testnet` or `public`.
- `TELEGRAM_BOT_TOKEN`: From BotFather.

### 3. Docker Deployment (Recommended)

To run the full backend stack (API + Event Indexer):

```bash
docker-compose up -d --build
```

This starts:
- `lumenpay-api` at `http://localhost:3001`
- `lumenpay-indexer` (Background worker)

### 4. Railway / Cloud Deployment

The repository is configured for Railway deployment via `nixpacks.toml` and `railway.toml`.

**For Backend:**
1. Connect GitHub repo to Railway.
2. Set Root Directory to `backend` (or use provided config).
3. Add Environment Variables from `.env`.
4. Deploy.

**For Cron/Workers:**
Deploy a second service (or worker) using the start command:
`npm run start:indexer`

## Development

### Backend

```bash
cd backend
npm install
npx prisma generate
npm run dev
```

### Frontend (Web)

```bash
cd frontend/web
npm install
npm run dev
```

## Features Implemented (Phase 5 Complete)

- ✅ **Event Indexer**: Polls Stellar Horizon for payments involving registered users.
- ✅ **Notifications**: Sends Telegram alerts for Received/Sent payments.
- ✅ **KYC & Escrow**: Mockup and Database Schema ready for Soroban integration.
- ✅ **Auth**: Non-custodial wallet auth (S.E.P. style challenge).

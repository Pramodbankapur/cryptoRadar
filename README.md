# Crypto Radar

Crypto Radar is a full-stack TypeScript MVP for tracking new and boosted crypto tokens, scoring them, saving the results in MongoDB, and sending Telegram alerts when a token crosses your configured thresholds.

This app is intentionally not a trading bot. It does not include wallet access, private keys, order routing, or buy/sell execution.

## Stack

- Backend: Node.js, Express, TypeScript, MongoDB, Mongoose, node-cron
- Frontend: React, TypeScript, Vite
- Alerts: Telegram Bot API `sendMessage`
- Market data: DexScreener API

## Project structure

```text
.
├── backend
│   ├── src
│   │   ├── config/env.ts
│   │   ├── jobs/scanTokens.job.ts
│   │   ├── models/Alert.ts
│   │   ├── models/Token.ts
│   │   ├── routes/alerts.routes.ts
│   │   ├── routes/tokens.routes.ts
│   │   ├── services/dexscreener.service.ts
│   │   ├── services/telegram.service.ts
│   │   ├── utils/logger.ts
│   │   └── utils/scoreToken.ts
│   └── package.json
├── frontend
│   ├── src
│   │   ├── api/client.ts
│   │   ├── components/
│   │   ├── App.tsx
│   │   └── styles.css
│   └── package.json
├── .env.example
└── package.json
```

## Features

- Pulls DexScreener latest token profiles, latest boosted tokens, top boosted tokens, and token pair details
- Applies a 100-point scoring model with risk flags
- Saves token snapshots into MongoDB
- Stores scan history snapshots for charting and trend review
- Sends Telegram alerts for high-score, high-liquidity, high-volume tokens
- Prevents duplicate alerts within a 12-hour cooldown window
- Runs a scanner every 5 minutes by default
- Shows a searchable, filterable dashboard with auto-refresh
- Supports server-side pagination and filtering
- Includes a manual watchlist with notes and tags

## Environment setup

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/crypto-radar
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
SCAN_INTERVAL_MINUTES=5
MIN_ALERT_SCORE=70
MIN_LIQUIDITY_USD=50000
MIN_VOLUME_24H_USD=100000
VITE_API_BASE_URL=/api
```

## Install

Install everything from the repo root:

```bash
npm install
```

## MongoDB setup

Use a local MongoDB server or MongoDB Atlas.

For local MongoDB:

```bash
mongod --dbpath /path/to/your/db
```

Then keep `MONGO_URI=mongodb://localhost:27017/crypto-radar`.

## Telegram bot setup

1. Open Telegram and message `@BotFather`.
2. Run `/newbot` and follow the prompts.
3. Copy the bot token into `TELEGRAM_BOT_TOKEN`.
4. Send at least one message to your new bot from the chat where you want alerts delivered.
5. Open this URL in your browser and find the `chat.id` in the response:

```text
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

6. Copy that value into `TELEGRAM_CHAT_ID`.

If you leave Telegram values blank, the app still runs, but alert delivery is skipped and only logs are written.

## Run the app

Start backend and frontend together:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:backend
npm run dev:frontend
```

Frontend: `http://localhost:5173`

Backend API: `http://localhost:5000/api`

## Build for production

```bash
npm run build
```

Run the backend build:

```bash
npm run start
```

For a production frontend deployment, serve `frontend/dist` with your preferred static host after running `npm run build`.

## API routes

- `GET /api/tokens` returns paginated tokens with server-side filters
- `GET /api/tokens/high-score` returns high-score tokens
- `GET /api/tokens/:chainId/:tokenAddress` returns one token snapshot
- `GET /api/tokens/:chainId/:tokenAddress/history` returns scan history points for charts
- `GET /api/alerts` returns paginated alerts
- `GET /api/watchlist` returns watchlist entries with token snapshots
- `POST /api/watchlist` creates or upserts a watchlist entry
- `PATCH /api/watchlist/:watchlistId` updates note or tags
- `DELETE /api/watchlist/:watchlistId` removes a watchlist entry
- `GET /api/health` returns backend health status

## Scoring model

Score additions:

- Liquidity above `50,000` adds `20`
- 24h volume above `100,000` adds `20`
- 24h price change between `5%` and `80%` adds `15`
- 1h volume above the 6h average adds `15`
- Pair age below 7 days adds `10`
- Website or socials adds `10`
- Boosted token adds `10`

Risk flags:

- `HIGH_RISK` for liquidity below `10,000`
- `POSSIBLE_PUMP` for 24h change above `300%`
- `LOW_INFO` when websites/socials are missing
- `VERY_NEW` when pair age is below one hour
- `EXIT_LIQUIDITY_RISK` when volume is high but liquidity stays thin

## Notes on rate limits

DexScreener boosted/profile feeds are rate-limited around `60 requests/minute`, so the backend uses a paced request queue plus retry handling for `429` and transient `5xx` responses.

Pair lookups are paced separately with a safer interval under DexScreener's higher pair limits.

## Docker

Run the full stack with one command:

```bash
npm run docker:up
```

This starts:

- `mongo` on `mongodb://localhost:27017`
- backend on `http://localhost:5000`
- frontend on `http://localhost:5173`

If your local `.env` already points at MongoDB Atlas, Docker will use Atlas. If `MONGO_URI` is missing, Docker Compose falls back to the bundled `mongo` container.

Stop everything with:

```bash
npm run docker:down
```

## Deployment

### Render

- `render.yaml` is included at the repo root for a Node backend service and a static frontend service.
- Set `MONGO_URI`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and `VITE_API_BASE_URL` in Render.
- Point `VITE_API_BASE_URL` to your Render backend, for example `https://your-backend.onrender.com/api`.

### Vercel

- `frontend/vercel.json` is included for SPA rewrites.
- In Vercel, set the project root directory to `frontend`.
- Set `VITE_API_BASE_URL` to your deployed backend API URL.

### Railway

- `railway.json` is included for backend deployment from `backend/Dockerfile`.
- Add your `MONGO_URI` and Telegram variables in Railway service variables.
- Use the backend public URL plus `/api` as the frontend API base if you deploy the frontend elsewhere.

## Suggestions for the next iteration

- Add user-configurable per-watchlist thresholds
- Add a lightweight audit signal layer, such as contract renounce or holder concentration
- Add alert routing for Discord or Slack beside Telegram
- Add multi-user auth if you want shared teams, not just a single personal radar

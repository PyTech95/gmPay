# 1gmPay — Live Bullion Rates Platform (PRD)

## Original Problem Statement
User uploaded `gold-main.zip` and asked to "develop from here". The zip was an existing Emergent
project (React + FastAPI + MongoDB) named **1gmPay Live Rates** for **SHRI SILVER TECHNOLOGIES PVT LTD** —
an Indian bullion (gold/silver) dealer live-rates website. (The auto-generated portfolio/alerts plan was
based on wrong assumptions and did not match the actual repo.)

## Architecture
- Frontend: React 19 + CRACO + Tailwind + shadcn/ui, Recharts-style SVG sparkline, react-router.
- Backend: FastAPI (async) + Motor/MongoDB, JWT admin auth, background feed loop.
- DB: MongoDB — `rates` (single doc `_id=current`), `rate_history`, `bookings`.

## User Personas
- Public visitors: view live gold/silver buy/sell rates, history, place booking requests.
- Dealer/Admin: control rates (auto live feed or manual), premiums, badla, ticker notice; view pending orders.

## Core Requirements (static)
- Public live rates (RETAIL / RTGS / COINS) with buy/sell = MCX base + badla − spread.
- Live spot cards (Gold $, Silver $, USD/INR), rate history chart, scrolling notice ticker.
- Admin panel (single password) to publish rates to all visitors.
- Booking desk + pending orders.

## Implemented (with dates)
- 2026-06: Ported existing repo into /app; app running (backend + frontend + Mongo).
- 2026-06: **Live price feed** — server-side scheduled fetch (60s), single shared fetch, last-good caching, STALE detection.
- 2026-06: **Real MCX feed (primary source)** — front-month GOLD (₹/10g) + SILVER (₹/kg) pulled from
  stock.indianapi.in (`INDIAN_API_KEY` in backend/.env). Falls back to international spot parity
  (gold-api.com + exchangerate-api) if MCX is unavailable, then to last-good/STALE. USD spot + USD/INR
  still shown on the display cards. Front-month contract month + daily % change surfaced on the UI (MCX chips).
- 2026-06: Admin **Auto/Manual feed toggle**, per-metal multiplier (default 1.0, nudges the live MCX base),
  manual MCX entry in manual mode, "Refresh now" button.
- 2026-06: Live/Stale/Manual status badge with source + "updated Xs ago"; Booking Desk test-ids.
- Verified: testing agent iteration 1 (backend 100% / frontend 100%) + curl/screenshot for the MCX source swap.

## Data Sources
- 2026-06 (iteration 2): Added **MCX Live Board** (`/market`, GET /api/commodities) for all commodities;
  **Contract Picker** (admin chooses gold/silver contract month, AUTO=front); **Rate Snapshot Share**
  (html2canvas → Web Share / WhatsApp); **mobile app-like UI** (fixed bottom tab bar, responsive tables,
  hamburger). Rates table now shows **Badla | Buy | Sell** (negative badla supported). Bank details =
  Union Bank only; contact info updated. Verified: testing agent iteration 2 (backend 13/13, frontend 100%).

- Primary MCX: GET https://stock.indianapi.in/commodities (header x-api-key = INDIAN_API_KEY).
- USD spot display: api.gold-api.com (XAU/XAG); USD/INR: open.er-api.com. All no extra cost / keyless except MCX.

## Key Endpoints
- GET /api/rates, GET /api/history?metal=gold|silver
- POST /api/admin/login, PUT /api/rates (auth), POST /api/rates/reset (auth)
- POST /api/feed/toggle (auth), POST /api/feed/refresh (auth)
- POST /api/bookings, GET /api/bookings

## Credentials
- Admin password: `admin123` (backend/.env ADMIN_PASSWORD). See /app/memory/test_credentials.md.

## Backlog / Next (P1/P2)
- P1: Price alerts (threshold up/down) — needs email provider (Resend/SendGrid) or in-app.
- P1: Historical range selector (1D/1W/1M/1Y) with real longer-term snapshots.
- P2: Customer accounts + saved watchlist.
- P2: Multi-currency display; UI redesign pass.

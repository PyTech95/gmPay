# 1gmPay Live Rates - API Contracts

## Overview
Backend stores rates centrally in MongoDB. Admin logs in (JWT) and updates rates.
All visitors read the same rates via public GET endpoint. Live "jitter" animation
stays on frontend for visual liveliness; base values come from backend.

## Auth
- Admin password stored in backend/.env (ADMIN_PASSWORD). JWT signed with JWT_SECRET.
- POST /api/admin/login  { password } -> { token }
- Protected routes use header: Authorization: Bearer <token>

## Data model (single doc in `rates`, id="current")
spot: { goldUsd:number, silverUsd:number, inr:number }
gold/silver/coins: [ { id, name, buy:number|null, buyLow, sell, sellHigh } ]
updatedAt: ISO string

## Endpoints
- GET  /api/rates                -> full rates doc (auto-seeds defaults if empty)
- POST /api/admin/login          -> { token }
- PUT  /api/rates    (auth)      -> body = full rates doc (spot,gold,silver,coins); saves & returns
- POST /api/rates/reset (auth)   -> reset to seed defaults
- POST /api/bookings             -> { name, phone, metal, type, qty } create booking
- GET  /api/bookings             -> list bookings (pending orders)

## Mock replacement (frontend)
- mock.js localStorage store (loadStore/saveStore) -> replaced by axios calls to backend.
- LiveRates: GET /api/rates on load + poll every ~8s; keep 3s client jitter for animation.
- Admin: login -> token; load GET /api/rates; Save -> PUT /api/rates; Reset -> POST /api/rates/reset.
- BookingDesk: POST /api/bookings. PendingOrders: GET /api/bookings.
- Seed defaults (DEFAULT_SPOT/GOLD/SILVER/COINS) kept in mock.js AND mirrored in backend seed.

from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import asyncio
import random
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me-secret')
JWT_ALGO = 'HS256'
INDIAN_API_KEY = os.environ.get('INDIAN_API_KEY', '')

# Troy ounce -> grams
TROY_OZ_G = 31.1035
GOLD_API = "https://api.gold-api.com/price/XAU"
SILVER_API = "https://api.gold-api.com/price/XAG"
FX_API = "https://open.er-api.com/v6/latest/USD"
MCX_API = "https://stock.indianapi.in/commodities"

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------- Models ----------------
class RateItem(BaseModel):
    id: str
    name: str
    metal: str  # "gold" or "silver"
    badla: Optional[float] = 0
    buy: Optional[float] = None   # computed on output
    sell: Optional[float] = None  # computed on output

class Spot(BaseModel):
    goldUsd: float
    silverUsd: float
    inr: float

class Mcx(BaseModel):
    gold: float    # INR per 10g
    silver: float  # INR per kg

class Premium(BaseModel):
    gold: float = 1.0    # optional fine-tune multiplier applied on top of real MCX base
    silver: float = 1.0

class FeedMeta(BaseModel):
    ok: bool = False
    lastAt: Optional[str] = None      # last successful fetch
    lastCheck: Optional[str] = None   # last attempt (success or fail)
    source: Optional[str] = None

class RatesDoc(BaseModel):
    spot: Spot
    mcx: Mcx
    spread: float = 500
    premium: Optional[Premium] = None
    spotPremium: Optional[dict] = None
    feedMode: Optional[str] = None
    autoFeed: bool = True
    contracts: Optional[dict] = None
    mcxMeta: Optional[dict] = None
    retail: List[RateItem]
    rtgs: List[RateItem]
    coins: List[RateItem]
    ticker: Optional[str] = None
    updatedAt: Optional[str] = None

class LoginBody(BaseModel):
    password: str

class FeedToggle(BaseModel):
    autoFeed: bool

class FeedMode(BaseModel):
    mode: str

class BookingCreate(BaseModel):
    name: str
    phone: str
    metal: str
    type: str
    qty: str

class Booking(BookingCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "PENDING"
    at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ---------------- Seed ----------------
def seed_rates() -> dict:
    return {
        "spot": {"goldUsd": 4388.4, "silverUsd": 64.93, "inr": 88.5},
        "mcx": {"gold": 148000, "silver": 235000},
        "spread": 500,
        "premium": {"gold": 1.0, "silver": 1.0},
        "spotPremium": {"gold": 1.152, "silver": 1.184},
        "feedMode": "spot",
        "autoFeed": True,
        "contracts": {"gold": "AUTO", "silver": "AUTO"},
        "feed": {"ok": False, "lastAt": None, "lastCheck": None, "source": None},
        "mcxMeta": {"goldContract": None, "silverContract": None, "goldChange": None, "goldPct": None, "silverChange": None, "silverPct": None, "availableGold": [], "availableSilver": []},
        "retail": [
            {"id": "r0", "name": "SILVER MAX", "metal": "silver", "badla": 0},
            {"id": "r1", "name": "SILVER 98.5", "metal": "silver", "badla": 1000},
            {"id": "r2", "name": "SILVER 99.5", "metal": "silver", "badla": 4300},
            {"id": "r3", "name": "SILVER SILCUT", "metal": "silver", "badla": 3000},
            {"id": "r4", "name": "GOLD MAX", "metal": "gold", "badla": 0},
            {"id": "r5", "name": "GOLD 99.5", "metal": "gold", "badla": 2300},
            {"id": "r6", "name": "GOLD 99", "metal": "gold", "badla": 1400},
        ],
        "rtgs": [
            {"id": "t0", "name": "SILVER MAX", "metal": "silver", "badla": 500},
            {"id": "t1", "name": "SILVER 98.5", "metal": "silver", "badla": 1800},
            {"id": "t2", "name": "SILVER 99.5", "metal": "silver", "badla": 5100},
            {"id": "t3", "name": "SILVER SILCUT", "metal": "silver", "badla": 3800},
            {"id": "t4", "name": "GOLD MAX", "metal": "gold", "badla": 900},
            {"id": "t5", "name": "GOLD 99.5", "metal": "gold", "badla": 3200},
            {"id": "t6", "name": "GOLD 99", "metal": "gold", "badla": 2300},
        ],
        "coins": [
            {"id": "c0", "name": "SILVER MAX", "metal": "silver", "badla": 2000},
            {"id": "c1", "name": "SILVER 98.5", "metal": "silver", "badla": 4000},
            {"id": "c2", "name": "SILVER 99.5", "metal": "silver", "badla": 7000},
            {"id": "c3", "name": "SILVER SILCUT", "metal": "silver", "badla": 6000},
            {"id": "c4", "name": "GOLD MAX", "metal": "gold", "badla": 3000},
            {"id": "c5", "name": "GOLD 99.5", "metal": "gold", "badla": 7000},
            {"id": "c6", "name": "GOLD 99", "metal": "gold", "badla": 6000},
        ],
        "ticker": "LATE CHARGES AFTER T+2 DAY  \u2022  GOLD \u20b910,000 / DAY / KG  \u2022  SILVER \u20b9500 / DAY / KG",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }

def compute_rates(doc: dict) -> dict:
    """Compute Buy/Sell for every product: Sell = MCX + Badla, Buy = Sell - spread."""
    mcx = doc.get("mcx", {}) or {}
    spread = doc.get("spread", 500) or 0
    for cat in ("retail", "rtgs", "coins"):
        for p in doc.get(cat, []) or []:
            base = mcx.get(p.get("metal"), 0) or 0
            badla = p.get("badla") or 0
            sell = base + badla
            p["sell"] = round(sell)
            p["buy"] = round(sell - spread)
    return doc

async def get_or_seed():
    doc = await db.rates.find_one({"_id": "current"})
    if not doc:
        data = seed_rates()
        await db.rates.insert_one({"_id": "current", **data})
        return data
    doc.pop("_id", None)
    seed = seed_rates()
    for k in ("ticker", "mcx", "premium", "feed", "mcxMeta", "contracts", "spotPremium", "feedMode"):
        if not doc.get(k):
            doc[k] = seed[k]
    if doc.get("spread") is None:
        doc["spread"] = seed["spread"]
    if doc.get("autoFeed") is None:
        doc["autoFeed"] = seed["autoFeed"]
    return doc

# ---------------- Live price feed ----------------
def _parse_expiry(s):
    from datetime import datetime as _dt
    try:
        return _dt.strptime(s, "%d %b %Y")
    except Exception:
        return None

async def fetch_commodities_raw() -> Optional[list]:
    """Fetch the full live MCX commodities list from stock.indianapi.in."""
    if not INDIAN_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=15) as hc:
            r = await hc.get(MCX_API, headers={"x-api-key": INDIAN_API_KEY, "accept": "application/json"})
        rows = r.json()
        return rows if isinstance(rows, list) else None
    except Exception as e:
        logger.warning(f"fetch_commodities_raw failed: {e}")
        return None

def _price_of(row):
    for k in ("last_traded_price", "sell_price", "buy_price"):
        v = row.get(k)
        if v not in (None, "", "0.00"):
            return float(v)
    return None

def _contracts_for(rows, product):
    items = [x for x in rows if x.get("product") == product and _parse_expiry(x.get("expiry", ""))]
    items.sort(key=lambda x: _parse_expiry(x["expiry"]))
    return items

def _pick_contract(rows, product, selected):
    items = _contracts_for(rows, product)
    if not items:
        return None
    if selected and selected != "AUTO":
        for it in items:
            if it.get("expiry") == selected:
                return it
    return items[0]

def build_mcx(rows, contracts) -> Optional[dict]:
    """Pick GOLD (INR/10g) + SILVER (INR/kg) contracts and return prices + meta."""
    g = _pick_contract(rows, "GOLD", (contracts or {}).get("gold"))
    s = _pick_contract(rows, "SILVER", (contracts or {}).get("silver"))
    if not g or not s:
        return None
    gold = _price_of(g)
    silver = _price_of(s)
    if not gold or not silver:
        return None
    return {
        "gold": round(gold),
        "silver": round(silver),
        "meta": {
            "goldContract": g.get("expiry"),
            "silverContract": s.get("expiry"),
            "goldChange": g.get("change"),
            "goldPct": g.get("per_change"),
            "silverChange": s.get("change"),
            "silverPct": s.get("per_change"),
            "availableGold": [x.get("expiry") for x in _contracts_for(rows, "GOLD")],
            "availableSilver": [x.get("expiry") for x in _contracts_for(rows, "SILVER")],
        },
    }

async def fetch_spot() -> Optional[dict]:
    """Fetch international gold/silver spot (USD/oz) + USD/INR for the display cards. None on failure."""
    try:
        async with httpx.AsyncClient(timeout=12) as hc:
            g, s, fx = await asyncio.gather(
                hc.get(GOLD_API), hc.get(SILVER_API), hc.get(FX_API),
                return_exceptions=True,
            )
        if any(isinstance(r, Exception) for r in (g, s, fx)):
            return None
        gj, sj, fxj = g.json(), s.json(), fx.json()
        gold_usd = float(gj["price"])
        silver_usd = float(sj["price"])
        inr = float(fxj["rates"]["INR"])
        if gold_usd <= 0 or silver_usd <= 0 or inr <= 0:
            return None
        return {"goldUsd": round(gold_usd, 2), "silverUsd": round(silver_usd, 2), "inr": round(inr, 2)}
    except Exception as e:
        logger.warning(f"fetch_spot failed: {e}")
        return None

def parity_to_mcx(spot: dict, premium: dict) -> dict:
    """Fallback: derive local INR MCX base from international spot when the MCX feed is unavailable."""
    inr = spot["inr"]
    gold = spot["goldUsd"] * inr / TROY_OZ_G * 10 * (premium.get("gold") or 1.0)
    silver = spot["silverUsd"] * inr / TROY_OZ_G * 1000 * (premium.get("silver") or 1.0)
    return {"gold": round(gold), "silver": round(silver)}

async def refresh_feed():
    """Single shared fetch. Real MCX is primary; on failure (e.g. 429) we reuse the CACHED real MCX so rates stay correct — parity is only a last resort when we've never fetched MCX."""
    doc = await get_or_seed()
    now = datetime.now(timezone.utc).isoformat()
    if not doc.get("autoFeed", True):
        return  # manual mode -> admin controls mcx directly

    premium = doc.get("premium") or {"gold": 1.0, "silver": 1.0}
    contracts = doc.get("contracts") or {"gold": "AUTO", "silver": "AUTO"}

    # FREE LIVE MODE: derive INR from live international spot × calibration (no MCX API, no rate limit)
    if (doc.get("feedMode") or "spot") == "spot":
        spot = await fetch_spot()
        if spot is None:
            await db.rates.update_one({"_id": "current"}, {"$set": {"feed.ok": False, "feed.lastCheck": now}})
            return
        sp = doc.get("spotPremium") or {"gold": 1.152, "silver": 1.184}
        await db.rates.update_one({"_id": "current"}, {"$set": {
            "spot": spot,
            "mcx": parity_to_mcx(spot, sp),
            "feed": {"ok": True, "lastAt": now, "lastCheck": now, "source": "Live spot \u00d7 calibration (free)"},
            "updatedAt": now,
        }}, upsert=True)
        return

    rows, spot = await asyncio.gather(fetch_commodities_raw(), fetch_spot())

    update = {}
    if spot is not None:
        update["spot"] = spot

    fresh = rows is not None
    cache_at = now
    if fresh:
        await db.commodities.update_one({"_id": "cache"}, {"$set": {"rows": rows, "at": now}}, upsert=True)
    else:
        cache = await db.commodities.find_one({"_id": "cache"})
        if cache and cache.get("rows"):
            rows = cache.get("rows")
            cache_at = cache.get("at") or now

    mcx_data = build_mcx(rows, contracts) if rows else None

    if mcx_data is not None:
        update["mcx"] = {
            "gold": round(mcx_data["gold"] * (premium.get("gold") or 1.0)),
            "silver": round(mcx_data["silver"] * (premium.get("silver") or 1.0)),
        }
        update["mcxMeta"] = mcx_data["meta"]
        if fresh:
            update["feed"] = {"ok": True, "lastAt": now, "lastCheck": now, "source": "MCX (stock.indianapi.in)"}
        else:
            # live call failed (rate-limit/timeout) -> show last real MCX from cache
            update["feed"] = {"ok": True, "lastAt": cache_at, "lastCheck": now, "source": "MCX (cached)"}
    elif spot is not None:
        # only when we have never had a real MCX value to cache
        update["mcx"] = parity_to_mcx(spot, premium)
        update["feed"] = {"ok": True, "lastAt": now, "lastCheck": now, "source": "spot parity (MCX unavailable)"}
    else:
        await db.rates.update_one({"_id": "current"}, {"$set": {"feed.ok": False, "feed.lastCheck": now}})
        return

    update["updatedAt"] = now
    await db.rates.update_one({"_id": "current"}, {"$set": update}, upsert=True)

# ---------------- Auth ----------------
def create_token() -> str:
    payload = {"sub": "admin", "exp": datetime.now(timezone.utc) + timedelta(hours=12)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def require_admin(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if creds is None:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return True

# ---------------- Routes ----------------
@api_router.get("/")
async def root():
    return {"message": "1gmPay Live Rates API"}

@api_router.get("/rates")
async def get_rates():
    doc = await get_or_seed()
    return compute_rates(doc)

@api_router.get("/commodities")
async def get_commodities():
    """Live MCX board (all commodities), served from the cached feed."""
    cache = await db.commodities.find_one({"_id": "cache"})
    if not cache:
        rows = await fetch_commodities_raw()
        if rows:
            now = datetime.now(timezone.utc).isoformat()
            await db.commodities.update_one({"_id": "cache"}, {"$set": {"rows": rows, "at": now}}, upsert=True)
            cache = {"rows": rows, "at": now}
    if not cache:
        return {"asOf": None, "items": [], "stale": True}

    rows = cache.get("rows", [])
    items = []
    for r in rows:
        items.append({
            "id": r.get("id"),
            "product": r.get("product"),
            "expiry": r.get("expiry"),
            "ltp": r.get("last_traded_price"),
            "buy": r.get("buy_price"),
            "sell": r.get("sell_price"),
            "open": r.get("open_price"),
            "high": r.get("high_price"),
            "low": r.get("low_price"),
            "close": r.get("close_price"),
            "change": r.get("change"),
            "pct": r.get("per_change"),
            "unit": r.get("price_quotation_unit"),
            "oi": r.get("open_interest"),
            "oiResult": r.get("oiResult"),
        })
    return {"asOf": cache.get("at"), "items": items, "stale": False}

@api_router.post("/admin/login")
async def admin_login(body: LoginBody):
    if body.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Incorrect password")
    return {"token": create_token()}

@api_router.put("/rates")
async def update_rates(payload: RatesDoc, _: bool = Depends(require_admin)):
    data = payload.model_dump(exclude_none=True)
    data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    existing = await get_or_seed()
    data.setdefault("feed", existing.get("feed"))
    await db.rates.update_one({"_id": "current"}, {"$set": data}, upsert=True)
    # In auto mode, re-pull real MCX so the saved premium is applied to live prices
    if data.get("autoFeed", True):
        await refresh_feed()
    return compute_rates(await get_or_seed())

@api_router.post("/feed/toggle")
async def toggle_feed(body: FeedToggle, _: bool = Depends(require_admin)):
    await db.rates.update_one({"_id": "current"}, {"$set": {"autoFeed": body.autoFeed}}, upsert=True)
    if body.autoFeed:
        await refresh_feed()
    return compute_rates(await get_or_seed())

@api_router.post("/feed/mode")
async def set_feed_mode(body: FeedMode, _: bool = Depends(require_admin)):
    mode = body.mode if body.mode in ("spot", "mcx") else "spot"
    await db.rates.update_one({"_id": "current"}, {"$set": {"feedMode": mode}}, upsert=True)
    await refresh_feed()
    return compute_rates(await get_or_seed())

@api_router.post("/feed/refresh")
async def manual_refresh(_: bool = Depends(require_admin)):
    await refresh_feed()
    await snapshot_rates()
    return compute_rates(await get_or_seed())

@api_router.post("/rates/reset")
async def reset_rates(_: bool = Depends(require_admin)):
    data = seed_rates()
    await db.rates.update_one({"_id": "current"}, {"$set": data}, upsert=True)
    if data.get("autoFeed", True):
        await refresh_feed()
    return compute_rates(await get_or_seed())

@api_router.post("/bookings", response_model=Booking)
async def create_booking(body: BookingCreate):
    booking = Booking(**body.model_dump())
    await db.bookings.insert_one(booking.model_dump())
    return booking

@api_router.get("/bookings", response_model=List[Booking])
async def list_bookings():
    items = await db.bookings.find().sort("at", -1).to_list(200)
    return [Booking(**{k: v for k, v in it.items() if k != "_id"}) for it in items]

# ---------------- Rate history ----------------
async def snapshot_rates():
    data = await get_or_seed()
    mcx = data.get("mcx", {}) or {}
    point = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "goldUsd": data["spot"]["goldUsd"],
        "silverUsd": data["spot"]["silverUsd"],
        "goldInr": mcx.get("gold"),
        "silverInr": mcx.get("silver"),
    }
    await db.rate_history.insert_one(point)

async def backfill_if_empty():
    count = await db.rate_history.count_documents({})
    if count >= 12:
        return
    data = await get_or_seed()
    mcx = data.get("mcx", {}) or {}
    gi = mcx.get("gold") or 148000
    si = mcx.get("silver") or 235000
    gu = data["spot"]["goldUsd"]
    su = data["spot"]["silverUsd"]
    now = datetime.now(timezone.utc)
    pts = []
    n = 96
    for i in range(n, 0, -1):
        drift = (n - i) / n
        gi_v = round(gi * (0.985 + 0.03 * random.random() + 0.004 * drift))
        si_v = round(si * (0.985 + 0.03 * random.random() + 0.004 * drift))
        pts.append({
            "ts": (now - timedelta(minutes=15 * i)).isoformat(),
            "goldUsd": round(gu * (0.99 + 0.02 * random.random()), 2),
            "silverUsd": round(su * (0.99 + 0.02 * random.random()), 2),
            "goldInr": gi_v,
            "silverInr": si_v,
        })
    if pts:
        await db.rate_history.insert_many(pts)

@api_router.get("/history")
async def get_history(metal: str = "gold", points: int = 96):
    await backfill_if_empty()
    field = "goldInr" if metal.lower() == "gold" else "silverInr"
    ufield = "goldUsd" if metal.lower() == "gold" else "silverUsd"
    docs = await db.rate_history.find().sort("ts", -1).to_list(max(12, min(points, 300)))
    docs = list(reversed(docs))
    series = [{"ts": d["ts"], "inr": d.get(field), "usd": d.get(ufield)} for d in docs if d.get(field) is not None]
    today = datetime.now(timezone.utc).date().isoformat()
    todays = [s["inr"] for s in series if s["ts"][:10] == today] or [s["inr"] for s in series]
    day_high = max(todays) if todays else None
    day_low = min(todays) if todays else None
    change = None
    if len(series) >= 2 and series[0]["inr"]:
        change = round(series[-1]["inr"] - series[0]["inr"])
    return {
        "metal": metal.lower(),
        "series": series,
        "dayHigh": day_high,
        "dayLow": day_low,
        "current": series[-1]["inr"] if series else None,
        "change": change,
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

async def _history_loop():
    # live feed refresh + periodic snapshot. 180s keeps us well under the MCX API rate limit.
    while True:
        try:
            await refresh_feed()
            await snapshot_rates()
        except Exception as e:
            logger.warning(f"feed/snapshot failed: {e}")
        await asyncio.sleep(300)

@app.on_event("startup")
async def _startup():
    try:
        await refresh_feed()
    except Exception as e:
        logger.warning(f"initial feed failed: {e}")
    try:
        await backfill_if_empty()
    except Exception as e:
        logger.warning(f"backfill failed: {e}")
    asyncio.create_task(_history_loop())

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

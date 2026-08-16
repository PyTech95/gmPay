"""Backend tests for 1gmPay Live Rates."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://spot-price-2.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/admin/login", json={"password": "admin123"})
    assert r.status_code == 200, r.text
    tok = r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------------- Rates ----------------
class TestRates:
    def test_get_rates_shape(self, session):
        r = session.get(f"{API}/rates")
        assert r.status_code == 200
        d = r.json()
        for k in ("spot", "mcx", "premium", "autoFeed", "retail", "rtgs", "coins"):
            assert k in d, f"missing {k}"
        for k in ("goldUsd", "silverUsd", "inr"):
            assert k in d["spot"]
        for k in ("gold", "silver"):
            assert k in d["mcx"]
            assert k in d["premium"]
        assert "feed" in d
        for k in ("ok", "lastAt", "lastCheck", "source"):
            assert k in d["feed"]
        for cat in ("retail", "rtgs", "coins"):
            assert isinstance(d[cat], list) and len(d[cat]) >= 1
            for item in d[cat]:
                assert "sell" in item and "buy" in item
                base = d["mcx"][item["metal"]]
                assert item["sell"] == round(base + (item.get("badla") or 0))
                assert item["buy"] == round(item["sell"] - d.get("spread", 500))


# ---------------- PRIMARY BUG FIX: real MCX magnitude, not parity ----------------
class TestPrimaryBugFix:
    def test_mcx_real_magnitude_and_source(self, session):
        r = session.get(f"{API}/rates")
        assert r.status_code == 200
        d = r.json()
        gold = d["mcx"]["gold"]
        silver = d["mcx"]["silver"]
        assert 145000 <= gold <= 165000, f"gold {gold} outside real MCX range (parity bug?)"
        assert 225000 <= silver <= 245000, f"silver {silver} outside real MCX range (parity bug?)"
        assert d["feed"]["ok"] is True
        src = d["feed"]["source"]
        # In new default 'spot' mode source is "Live spot × calibration (free)"; in mcx mode starts with "MCX"
        assert src.startswith("MCX") or "spot" in src.lower(), f"unexpected feed.source '{src}'"
        assert "parity" not in src.lower(), f"feed.source must NOT be parity fallback: {src}"
        # spot cards still present and positive
        assert d["spot"]["goldUsd"] > 0
        assert d["spot"]["silverUsd"] > 0
        assert d["spot"]["inr"] > 0
        # GOLD MAX sell ≈ mcx.gold (badla=0)
        gold_max = next((it for it in d["retail"] if it["name"] == "GOLD MAX"), None)
        assert gold_max is not None, "GOLD MAX not found in retail"
        assert gold_max["sell"] == round(gold + (gold_max.get("badla") or 0))


# ---------------- NEW: Free Live Spot Mode + Mode Switching ----------------
class TestSpotMode:
    def test_default_spot_mode(self, session):
        r = session.get(f"{API}/rates")
        assert r.status_code == 200
        d = r.json()
        assert d.get("feedMode") == "spot", f"expected feedMode=spot got {d.get('feedMode')}"
        assert d["feed"]["ok"] is True
        assert d["feed"]["source"] == "Live spot \u00d7 calibration (free)", d["feed"]["source"]
        gold = d["mcx"]["gold"]; silver = d["mcx"]["silver"]
        assert 145000 <= gold <= 165000, f"gold {gold} outside realistic MCX range"
        assert 225000 <= silver <= 245000, f"silver {silver} outside realistic MCX range"

    def test_switch_mode_mcx_then_spot(self, session, auth_headers):
        # Switch to MCX
        r = session.post(f"{API}/feed/mode", json={"mode": "mcx"}, headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("feedMode") == "mcx"
        assert d["feed"]["source"].startswith("MCX"), d["feed"]["source"]
        assert d["feed"]["ok"] is True
        # Rate magnitudes remain realistic (cached MCX)
        assert 145000 <= d["mcx"]["gold"] <= 165000
        assert 225000 <= d["mcx"]["silver"] <= 245000

        # Switch back to spot
        r = session.post(f"{API}/feed/mode", json={"mode": "spot"}, headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d.get("feedMode") == "spot"
        assert d["feed"]["source"] == "Live spot \u00d7 calibration (free)"
        assert 145000 <= d["mcx"]["gold"] <= 165000
        assert 225000 <= d["mcx"]["silver"] <= 245000

    def test_calibration_save_updates_mcx(self, session, auth_headers):
        # Ensure spot mode
        session.post(f"{API}/feed/mode", json={"mode": "spot"}, headers=auth_headers)
        before = session.get(f"{API}/rates").json()
        gold_before = before["mcx"]["gold"]
        # Bump gold calibration by ~10%
        new_gold_cal = round((before.get("spotPremium", {}).get("gold") or 1.152) * 1.10, 4)
        new_silver_cal = before.get("spotPremium", {}).get("silver") or 1.184
        payload = dict(before)
        payload["spotPremium"] = {"gold": new_gold_cal, "silver": new_silver_cal}
        payload["feedMode"] = "spot"
        for cat in ("retail", "rtgs", "coins"):
            for it in payload[cat]:
                it.pop("buy", None); it.pop("sell", None)
        r = session.put(f"{API}/rates", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        after = session.get(f"{API}/rates").json()
        gold_after = after["mcx"]["gold"]
        # Should have increased by ~10% (allow tolerance for spot drift)
        ratio = gold_after / gold_before
        assert 1.05 <= ratio <= 1.15, f"gold ratio {ratio} (before={gold_before}, after={gold_after})"
        # Restore
        payload["spotPremium"] = {"gold": 1.152, "silver": 1.184}
        for cat in ("retail", "rtgs", "coins"):
            for it in payload[cat]:
                it.pop("buy", None); it.pop("sell", None)
        session.put(f"{API}/rates", json=payload, headers=auth_headers)


# ---------------- Auth ----------------
class TestAuth:
    def test_login_success(self, session):
        r = session.post(f"{API}/admin/login", json={"password": "admin123"})
        assert r.status_code == 200
        assert "token" in r.json()

    def test_login_wrong(self, session):
        r = session.post(f"{API}/admin/login", json={"password": "wrong"})
        assert r.status_code == 401

    def test_protected_no_token(self, session):
        for method, path, body in [
            ("PUT", "/rates", {}),
            ("POST", "/feed/toggle", {"autoFeed": True}),
            ("POST", "/feed/refresh", None),
            ("POST", "/rates/reset", None),
        ]:
            r = session.request(method, f"{API}{path}", json=body)
            assert r.status_code == 401, f"{method} {path} returned {r.status_code}"


# ---------------- Feed ----------------
class TestFeed:
    def test_toggle_manual_then_auto(self, session, auth_headers):
        # Manual
        r = session.post(f"{API}/feed/toggle", json={"autoFeed": False}, headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["autoFeed"] is False

        # Auto (recomputes mcx from live spot)
        r = session.post(f"{API}/feed/toggle", json={"autoFeed": True}, headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["autoFeed"] is True
        # feed.ok should be true if external APIs reachable (graceful stale if not)
        assert "feed" in d

    def test_refresh(self, session, auth_headers):
        # ensure auto
        session.post(f"{API}/feed/toggle", json={"autoFeed": True}, headers=auth_headers)
        r = session.post(f"{API}/feed/refresh", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert "feed" in d
        # lastCheck should be updated (present)
        assert d["feed"].get("lastCheck") is not None


# ---------------- PUT rates manual ----------------
class TestManualUpdate:
    def test_put_rates_manual(self, session, auth_headers):
        # Switch to manual
        session.post(f"{API}/feed/toggle", json={"autoFeed": False}, headers=auth_headers)
        current = session.get(f"{API}/rates").json()
        current["autoFeed"] = False
        current["mcx"] = {"gold": 150000, "silver": 240000}
        # strip computed buy/sell before sending
        for cat in ("retail", "rtgs", "coins"):
            for it in current[cat]:
                it.pop("buy", None)
                it.pop("sell", None)
        r = session.put(f"{API}/rates", json=current, headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["mcx"]["gold"] == 150000
        assert d["mcx"]["silver"] == 240000
        # verify persistence
        d2 = session.get(f"{API}/rates").json()
        assert d2["mcx"]["gold"] == 150000
        # check buy/sell recomputed
        for cat in ("retail", "rtgs", "coins"):
            for it in d2[cat]:
                base = d2["mcx"][it["metal"]]
                assert it["sell"] == round(base + (it.get("badla") or 0))


# ---------------- Reset ----------------
class TestReset:
    def test_reset(self, session, auth_headers):
        r = session.post(f"{API}/rates/reset", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["autoFeed"] is True
        assert len(d["retail"]) == 7


# ---------------- Bookings ----------------
class TestBookings:
    def test_create_and_list(self, session):
        payload = {"name": "TEST_User", "phone": "9999999999", "metal": "gold", "type": "BUY", "qty": "10g"}
        r = session.post(f"{API}/bookings", json=payload)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["status"] == "PENDING"
        assert b["name"] == "TEST_User"
        assert "id" in b
        # list
        r = session.get(f"{API}/bookings")
        assert r.status_code == 200
        assert any(x["id"] == b["id"] for x in r.json())


# ---------------- Commodities (MCX Board) ----------------
class TestCommodities:
    def test_commodities_shape(self, session):
        r = session.get(f"{API}/commodities")
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and isinstance(d["items"], list)
        # If live feed reachable, expect items and product/expiry/ltp fields
        if d["items"]:
            for k in ("product", "expiry", "ltp", "pct", "oi"):
                assert k in d["items"][0], f"missing {k}"


# ---------------- MCX Contract picker ----------------
class TestContractPicker:
    def test_available_contracts_in_rates(self, session):
        r = session.get(f"{API}/rates")
        assert r.status_code == 200
        d = r.json()
        assert "mcxMeta" in d
        # Should contain availableGold / availableSilver arrays (may be empty if feed down)
        assert "availableGold" in d["mcxMeta"]
        assert "availableSilver" in d["mcxMeta"]

    def test_select_specific_gold_contract(self, session, auth_headers):
        # Contract picker only applies in MCX mode
        session.post(f"{API}/feed/mode", json={"mode": "mcx"}, headers=auth_headers)
        # Get available contracts
        cur = session.get(f"{API}/rates").json()
        avail = cur.get("mcxMeta", {}).get("availableGold") or []
        if len(avail) < 2:
            pytest.skip("Need >=2 gold contracts for this test")
        # Pick a non-front-month contract (second in list)
        chosen = avail[1]
        cur["contracts"] = {"gold": chosen, "silver": "AUTO"}
        for cat in ("retail", "rtgs", "coins"):
            for it in cur[cat]:
                it.pop("buy", None); it.pop("sell", None)
        r = session.put(f"{API}/rates", json=cur, headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        # After save+refresh, goldContract should match selection
        assert d.get("mcxMeta", {}).get("goldContract") == chosen, f"expected {chosen} got {d.get('mcxMeta',{}).get('goldContract')}"
        # Restore AUTO
        d["contracts"] = {"gold": "AUTO", "silver": "AUTO"}
        for cat in ("retail", "rtgs", "coins"):
            for it in d[cat]:
                it.pop("buy", None); it.pop("sell", None)
        session.put(f"{API}/rates", json=d, headers=auth_headers)
        # Restore spot mode
        session.post(f"{API}/feed/mode", json={"mode": "spot"}, headers=auth_headers)


# ---------------- History ----------------
class TestHistory:
    def test_history(self, session):
        r = session.get(f"{API}/history?metal=gold&points=48")
        assert r.status_code == 200
        d = r.json()
        assert d["metal"] == "gold"
        assert isinstance(d["series"], list) and len(d["series"]) >= 12

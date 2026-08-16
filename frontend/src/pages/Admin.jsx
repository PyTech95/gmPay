import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LOGO_URL, COMPANY } from "../mock";
import { ratesApi, feedApi } from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useToast } from "../hooks/use-toast";
import { Lock, LogOut, RotateCcw, Save, ArrowLeft, RefreshCw, Zap } from "lucide-react";

const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
const fmt = (v) => (v == null ? "-" : Number(v).toLocaleString("en-IN"));

const RateEditor = ({ title, items, onChange, mcx, spread }) => (
  <div className="rounded-lg border border-white/10 bg-[#0b0b0b] p-4">
    <h3 className="mb-1 text-sm font-bold tracking-wide text-[#f0c33c]">{title}</h3>
    <p className="mb-3 text-[11px] text-gray-500">Sell = MCX + Badla &nbsp;|&nbsp; Buy = Sell − {spread}</p>
    <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr] gap-2 border-b border-white/10 pb-1 text-[10px] uppercase tracking-wide text-gray-500">
      <span>Product</span><span>Badla (₹)</span><span className="text-right">Buy</span><span className="text-right">Sell</span>
    </div>
    <div className="space-y-2 pt-2">
      {items.map((it, idx) => {
        const base = (mcx && mcx[it.metal]) || 0;
        const sell = base + (Number(it.badla) || 0);
        const buy = sell - (Number(spread) || 0);
        const isBase = /MAX$/.test(it.name || "");
        return (
          <div key={it.id} className="grid grid-cols-[2fr_1.2fr_1fr_1fr] items-center gap-2 border-b border-white/5 pb-2 last:border-0">
            <div className={`text-sm font-semibold ${isBase ? "text-[#f0c33c]" : "text-gray-100"}`}>{it.name}</div>
            <Input
              type="number"
              value={it.badla ?? ""}
              onChange={(e) => onChange(idx, "badla", num(e.target.value))}
              className="h-8 bg-black border-white/15 text-white num"
            />
            <div className="num text-right text-sm text-gray-300">{fmt(buy)}</div>
            <div className="num text-right text-sm font-semibold text-white">{fmt(sell)}</div>
          </div>
        );
      })}
    </div>
  </div>
);

const PremiumTool = ({ onApply }) => {
  const [cat, setCat] = useState("retail");
  const [mode, setMode] = useState("amount");
  const [badlaVal, setBadlaVal] = useState("");

  const apply = () => {
    onApply(cat, mode, Number(badlaVal || 0));
    setBadlaVal("");
  };

  const btn = (v, cur, set, label) => (
    <button
      type="button"
      onClick={() => set(v)}
      className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
        cur === v ? "bg-[#f0c33c] text-black" : "text-gray-400 hover:text-gray-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-lg border border-[#f0c33c]/30 bg-[#0b0b0b] p-4">
      <h3 className="mb-1 text-sm font-bold tracking-wide text-[#f0c33c]">BADLA QUICK ADJUST</h3>
      <p className="mb-3 text-[11px] text-gray-500">
        Change the Badla (premium) of all products in a group at once. Use negative to reduce. Click Apply, then Save to publish.
      </p>
      <div className="grid gap-3 sm:grid-cols-[1.4fr_1.4fr_1fr_auto] sm:items-end">
        <div>
          <span className="text-[10px] uppercase text-gray-500">Group</span>
          <div className="mt-1 flex rounded-md border border-white/10 p-0.5">
            {btn("retail", cat, setCat, "RETAIL")}
            {btn("rtgs", cat, setCat, "RTGS")}
            {btn("coins", cat, setCat, "COINS")}
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase text-gray-500">Mode</span>
          <div className="mt-1 flex rounded-md border border-white/10 p-0.5">
            {btn("amount", mode, setMode, "\u20b9 Add/Sub")}
            {btn("percent", mode, setMode, "% Percent")}
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase text-gray-500">Badla {mode === "percent" ? "(%)" : "(\u20b9)"}</span>
          <Input type="number" value={badlaVal} onChange={(e) => setBadlaVal(e.target.value)} placeholder="e.g. 200 or -100" className="h-9 bg-black border-white/15 text-white num" />
        </div>
        <Button onClick={apply} className="h-9 bg-[#f0c33c] text-black font-bold hover:bg-[#e0b02a]">APPLY</Button>
      </div>
    </div>
  );
};


const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [token, setToken] = useState(() => sessionStorage.getItem("sst_admin_token") || "");
  const authed = !!token;
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState({ spot: { goldUsd: 0, silverUsd: 0, inr: 0 }, mcx: { gold: 0, silver: 0 }, premium: { gold: 1.0, silver: 1.0 }, spotPremium: { gold: 1.152, silver: 1.184 }, feedMode: "spot", autoFeed: true, spread: 500, retail: [], rtgs: [], coins: [] });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authed) return;
    ratesApi
      .get()
      .then((d) => d && d.spot && setStore(d))
      .catch(() => toast({ title: "Error", description: "Could not load rates." }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { token: t } = await ratesApi.login(pwd);
      sessionStorage.setItem("sst_admin_token", t);
      setToken(t);
      toast({ title: "Welcome", description: "Admin access granted." });
    } catch (err) {
      toast({ title: "Incorrect password", description: "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem("sst_admin_token");
    setToken("");
  };

  const updateItem = (cat) => (idx, field, value) => {
    setStore((s) => {
      const copy = { ...s, [cat]: s[cat].map((x, i) => (i === idx ? { ...x, [field]: value } : x)) };
      return copy;
    });
  };

  const setSpot = (field, value) =>
    setStore((s) => ({ ...s, spot: { ...s.spot, [field]: Number(value) } }));

  const setMcx = (field, value) =>
    setStore((s) => ({ ...s, mcx: { ...s.mcx, [field]: Number(value) } }));

  const setSpread = (value) => setStore((s) => ({ ...s, spread: Number(value) }));

  const setPremium = (field, value) =>
    setStore((s) => ({ ...s, premium: { ...(s.premium || {}), [field]: Number(value) } }));

  const setSpotPremium = (field, value) =>
    setStore((s) => ({ ...s, spotPremium: { ...(s.spotPremium || {}), [field]: Number(value) } }));

  const setMode = async (mode) => {
    setStore((s) => ({ ...s, feedMode: mode }));
    setBusy(true);
    try {
      const d = await feedApi.setMode(mode, token);
      setStore(d);
      toast({ title: mode === "spot" ? "Free Live mode ON" : "MCX mode ON", description: mode === "spot" ? "Rates update from live spot × your calibration — free, no limit." : "Rates come from the MCX API (needs a valid key)." });
    } catch (err) {
      toast({ title: "Failed", description: "Could not switch rate source." });
    } finally {
      setBusy(false);
    }
  };

  const setContract = (field, value) =>
    setStore((s) => ({ ...s, contracts: { ...(s.contracts || {}), [field]: value } }));

  const toggleFeed = async (on) => {
    setStore((s) => ({ ...s, autoFeed: on }));
    setBusy(true);
    try {
      const d = await feedApi.toggle(on, token);
      setStore(d);
      toast({ title: on ? "Live feed ON" : "Manual mode ON", description: on ? "Rates auto-update from the market." : "You now set MCX base manually." });
    } catch (err) {
      toast({ title: "Failed", description: "Could not switch feed mode." });
    } finally {
      setBusy(false);
    }
  };

  const refreshNow = async () => {
    setBusy(true);
    try {
      const d = await feedApi.refresh(token);
      setStore(d);
      toast({ title: "Refreshed", description: "Pulled the latest market prices." });
    } catch (err) {
      toast({ title: "Refresh failed", description: "Market source may be unavailable." });
    } finally {
      setBusy(false);
    }
  };

  const applyPremium = (cat, mode, delta) => {
    const adj = (v) => {
      const base = Number(v) || 0;
      return mode === "percent" ? Math.round(base * (1 + delta / 100)) : Math.round(base + delta);
    };
    setStore((s) => ({
      ...s,
      [cat]: s[cat].map((x) => ({ ...x, badla: adj(x.badla) })),
    }));
  };

  const save = async () => {
    try {
      const payload = { spot: store.spot, mcx: store.mcx, premium: store.premium, spotPremium: store.spotPremium, feedMode: store.feedMode, autoFeed: store.autoFeed, contracts: store.contracts, spread: store.spread, retail: store.retail, rtgs: store.rtgs, coins: store.coins, ticker: store.ticker };
      const d = await ratesApi.update(payload, token);
      setStore(d);
      toast({ title: "Saved", description: "Rates published live to all visitors." });
    } catch (err) {
      if (err?.response?.status === 401) { logout(); toast({ title: "Session expired", description: "Please log in again." }); }
      else toast({ title: "Save failed", description: "Please try again." });
    }
  };

  const doReset = async () => {
    try {
      const d = await ratesApi.reset(token);
      setStore(d);
      toast({ title: "Reset", description: "Rates restored to defaults." });
    } catch (err) {
      toast({ title: "Reset failed", description: "Please try again." });
    }
  };

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <form onSubmit={login} className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0b0b0b] p-8">
          <div className="mb-6 flex flex-col items-center gap-1">
            <span className="inline-block pb-1 leading-[1.2] text-3xl font-bold tracking-tight bg-gradient-to-b from-[#f9e39a] to-[#e0a92a] bg-clip-text text-transparent">
              1gm<span className="font-semibold">Pay</span>
            </span>
            <h1 className="text-lg font-bold text-white">Admin Login</h1>
            <p className="text-xs text-gray-500">{COMPANY.name}</p>
          </div>
          <Label className="text-gray-300">Password</Label>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Enter password" className="pl-9 bg-black border-white/15 text-white" />
          </div>
          <Button type="submit" disabled={loading} className="mt-5 w-full bg-[#f0c33c] text-black font-bold hover:bg-[#e0b02a]">{loading ? "LOGGING IN..." : "LOGIN"}</Button>
          <button type="button" onClick={() => navigate("/")} className="mt-4 flex w-full items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-300">
            <ArrowLeft className="h-3 w-3" /> Back to Live Rates
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-block pb-0.5 leading-[1.2] text-xl font-bold tracking-tight bg-gradient-to-b from-[#f9e39a] to-[#e0a92a] bg-clip-text text-transparent">1gm<span className="font-semibold">Pay</span></span>
            <span className="font-bold text-[#f0c33c]">Rates Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={doReset} variant="outline" className="border-white/15 bg-transparent text-gray-200 hover:bg-white/5">
              <RotateCcw className="mr-1 h-4 w-4" /> Reset
            </Button>
            <Button onClick={save} className="bg-[#f0c33c] text-black font-bold hover:bg-[#e0b02a]">
              <Save className="mr-1 h-4 w-4" /> Save
            </Button>
            <Button onClick={logout} variant="ghost" className="text-gray-400 hover:text-white">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <div className="rounded-lg border border-[#f0c33c]/30 bg-[#0b0b0b] p-4" data-testid="feed-mode-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#f0c33c]" />
              <h3 className="text-sm font-bold tracking-wide text-[#f0c33c]">LIVE MARKET FEED</h3>
            </div>
            <div className="flex items-center gap-3">
              {store.autoFeed && (
                <Button onClick={refreshNow} disabled={busy} variant="outline" size="sm" className="border-white/15 bg-transparent text-gray-200 hover:bg-white/5" data-testid="feed-refresh-btn">
                  <RefreshCw className={`mr-1 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Refresh
                </Button>
              )}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${store.autoFeed ? "text-green-400" : "text-gray-500"}`}>{store.autoFeed ? "AUTO" : "MANUAL"}</span>
                <Switch checked={!!store.autoFeed} onCheckedChange={toggleFeed} data-testid="feed-toggle" />
              </div>
            </div>
          </div>
          <p className="mb-3 text-[11px] text-gray-500">
            {store.autoFeed
              ? ((store.feedMode || "spot") === "spot"
                ? "FREE LIVE: base tracks live international spot (gold/silver $ + USD-INR) every 5 min — no API key, no rate limit. Set the calibration × so the base matches your MCX terminal; badla is added on top."
                : "MCX: base comes from the live MCX front-month contracts (needs a valid API key). If the key is rate-limited it shows the last cached MCX. Badla is added on top.")
              : "Auto feed is OFF. Enter the MCX base manually below. All products = MCX + Badla."}
          </p>

          {store.autoFeed && (
            <div className="mb-4 inline-flex rounded-md border border-white/10 p-0.5" data-testid="feed-mode-selector">
              <button
                onClick={() => setMode("spot")}
                disabled={busy}
                data-testid="mode-spot-btn"
                className={`rounded px-3 py-1.5 text-xs font-bold transition-colors ${(store.feedMode || "spot") === "spot" ? "bg-[#f0c33c] text-black" : "text-gray-400 hover:text-gray-200"}`}
              >
                FREE LIVE (SPOT)
              </button>
              <button
                onClick={() => setMode("mcx")}
                disabled={busy}
                data-testid="mode-mcx-btn"
                className={`rounded px-3 py-1.5 text-xs font-bold transition-colors ${(store.feedMode || "spot") === "mcx" ? "bg-[#f0c33c] text-black" : "text-gray-400 hover:text-gray-200"}`}
              >
                MCX (API KEY)
              </button>
            </div>
          )}

          {store.autoFeed ? (
            <>
              {(store.feedMode || "spot") === "mcx" && (
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="contract-picker">
                <div>
                  <span className="text-[10px] uppercase text-gray-500">GOLD CONTRACT MONTH</span>
                  <Select value={(store.contracts?.gold) || "AUTO"} onValueChange={(v) => setContract("gold", v)}>
                    <SelectTrigger className="h-9 bg-black border-white/15 text-white" data-testid="gold-contract-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTO">AUTO (front month)</SelectItem>
                      {(store.mcxMeta?.availableGold || []).map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-500">SILVER CONTRACT MONTH</span>
                  <Select value={(store.contracts?.silver) || "AUTO"} onValueChange={(v) => setContract("silver", v)}>
                    <SelectTrigger className="h-9 bg-black border-white/15 text-white" data-testid="silver-contract-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTO">AUTO (front month)</SelectItem>
                      {(store.mcxMeta?.availableSilver || []).map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              )}
              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-md border border-white/10 bg-black/40 px-3 py-2">
                  <div className="text-[10px] uppercase text-gray-500">Gold spot ($/oz)</div>
                  <div className="num text-sm font-bold text-white">{Number(store.spot?.goldUsd || 0).toLocaleString("en-US")}</div>
                </div>
                <div className="rounded-md border border-white/10 bg-black/40 px-3 py-2">
                  <div className="text-[10px] uppercase text-gray-500">Silver spot ($/oz)</div>
                  <div className="num text-sm font-bold text-white">{Number(store.spot?.silverUsd || 0).toLocaleString("en-US")}</div>
                </div>
                <div className="rounded-md border border-white/10 bg-black/40 px-3 py-2">
                  <div className="text-[10px] uppercase text-gray-500">USD / INR</div>
                  <div className="num text-sm font-bold text-white">{Number(store.spot?.inr || 0).toFixed(2)}</div>
                </div>
                <div className="rounded-md border border-[#f0c33c]/30 bg-black/40 px-3 py-2">
                  <div className="text-[10px] uppercase text-gray-500">Feed status</div>
                  <div className={`text-sm font-bold ${store.feed?.ok ? "text-green-400" : "text-amber-400"}`}>{store.feed?.ok ? "LIVE" : "STALE"}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <span className="text-[10px] uppercase text-gray-500">{(store.feedMode || "spot") === "spot" ? "GOLD CALIBRATION (×)" : "GOLD MULTIPLIER (×)"}</span>
                  {(store.feedMode || "spot") === "spot" ? (
                    <Input type="number" step="0.001" value={store.spotPremium?.gold ?? 1.152} onChange={(e) => setSpotPremium("gold", e.target.value)} className="h-9 bg-black border-white/15 text-white num" data-testid="gold-calibration-input" />
                  ) : (
                    <Input type="number" step="0.01" value={store.premium?.gold ?? 1.0} onChange={(e) => setPremium("gold", e.target.value)} className="h-9 bg-black border-white/15 text-white num" data-testid="gold-premium-input" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-500">{(store.feedMode || "spot") === "spot" ? "SILVER CALIBRATION (×)" : "SILVER MULTIPLIER (×)"}</span>
                  {(store.feedMode || "spot") === "spot" ? (
                    <Input type="number" step="0.001" value={store.spotPremium?.silver ?? 1.184} onChange={(e) => setSpotPremium("silver", e.target.value)} className="h-9 bg-black border-white/15 text-white num" data-testid="silver-calibration-input" />
                  ) : (
                    <Input type="number" step="0.01" value={store.premium?.silver ?? 1.0} onChange={(e) => setPremium("silver", e.target.value)} className="h-9 bg-black border-white/15 text-white num" data-testid="silver-premium-input" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-500">GOLD MCX (₹ / 10g) · {store.mcxMeta?.goldContract || "live"}</span>
                  <div className="num flex h-9 items-center rounded-md border border-white/10 bg-black/40 px-3 text-sm text-gray-300">{fmt(store.mcx?.gold)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-gray-500">SILVER MCX (₹ / kg) · {store.mcxMeta?.silverContract || "live"}</span>
                  <div className="num flex h-9 items-center rounded-md border border-white/10 bg-black/40 px-3 text-sm text-gray-300">{fmt(store.mcx?.silver)}</div>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-[10px] uppercase text-gray-500">BUY/SELL SPREAD (₹)</span>
                <Input type="number" value={store.spread ?? 500} onChange={(e) => setSpread(e.target.value)} className="h-9 max-w-[180px] bg-black border-white/15 text-white num" />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] uppercase text-gray-500">GOLD MCX (₹ / 10g)</span>
                <Input type="number" value={store.mcx?.gold ?? 0} onChange={(e) => setMcx("gold", e.target.value)} className="h-9 bg-black border-white/15 text-white num" data-testid="gold-mcx-input" />
              </div>
              <div>
                <span className="text-[10px] uppercase text-gray-500">SILVER MCX (₹ / kg)</span>
                <Input type="number" value={store.mcx?.silver ?? 0} onChange={(e) => setMcx("silver", e.target.value)} className="h-9 bg-black border-white/15 text-white num" data-testid="silver-mcx-input" />
              </div>
              <div>
                <span className="text-[10px] uppercase text-gray-500">BUY/SELL SPREAD (₹)</span>
                <Input type="number" value={store.spread ?? 500} onChange={(e) => setSpread(e.target.value)} className="h-9 bg-black border-white/15 text-white num" />
              </div>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-white/10 bg-[#0b0b0b] p-4">
          <h3 className="mb-3 text-sm font-bold tracking-wide text-[#f0c33c]">SPOT DISPLAY (top cards)</h3>
          <div className="grid grid-cols-3 gap-3">
            {[["goldUsd","GOLD ($)"],["silverUsd","SILVER ($)"],["inr","INR (\u20b9)"]].map(([k,l]) => (
              <div key={k}>
                <span className="text-[10px] uppercase text-gray-500">{l}</span>
                <Input type="number" step="0.01" value={store.spot[k]} onChange={(e) => setSpot(k, e.target.value)} className="h-9 bg-black border-white/15 text-white num" />
              </div>
            ))}
          </div>
        </div>
        <PremiumTool onApply={applyPremium} />
        <RateEditor title="RETAIL" items={store.retail} onChange={updateItem("retail")} mcx={store.mcx} spread={store.spread} />
        <RateEditor title="RTGS" items={store.rtgs} onChange={updateItem("rtgs")} mcx={store.mcx} spread={store.spread} />
        <RateEditor title="COINS" items={store.coins} onChange={updateItem("coins")} mcx={store.mcx} spread={store.spread} />
        <div className="rounded-lg border border-white/10 bg-[#0b0b0b] p-4">
          <h3 className="mb-3 text-sm font-bold tracking-wide text-[#f0c33c]">NOTICE / TICKER MESSAGE</h3>
          <Input
            value={store.ticker || ""}
            onChange={(e) => setStore((s) => ({ ...s, ticker: e.target.value }))}
            placeholder="Scrolling notice shown on Live Rates page"
            className="h-9 bg-black border-white/15 text-white"
          />
          <p className="mt-2 text-[11px] text-gray-500">This text scrolls in the notice band above the rate tabs.</p>
        </div>
        <p className="pb-6 text-center text-xs text-gray-500">Click Save to publish. Live Rates page picks up changes automatically.</p>
      </div>
    </div>
  );
};

export default Admin;

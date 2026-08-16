import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import RatesTable from "../components/RatesTable";
import Marquee from "../components/Marquee";
import RateChart from "../components/RateChart";
import { ratesApi } from "../api";
import { Button } from "../components/ui/button";
import { Share2 } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { DEFAULT_SPOT, DEFAULT_RETAIL, DEFAULT_RTGS, DEFAULT_COINS, COMPANY } from "../mock";

const FALLBACK = {
  spot: { ...DEFAULT_SPOT },
  retail: DEFAULT_RETAIL,
  rtgs: DEFAULT_RTGS,
  coins: DEFAULT_COINS,
  ticker: "LATE CHARGES AFTER T+2 DAY  \u2022  GOLD \u20b910,000 / DAY / KG  \u2022  SILVER \u20b9500 / DAY / KG",
};

const TABS = [
  { key: "retail", label: "RETAIL" },
  { key: "rtgs", label: "RTGS" },
  { key: "coins", label: "COINS" },
];

const jitter = (v) => {
  if (v == null) return v;
  const delta = Math.round((Math.random() - 0.5) * Math.max(2, v * 0.0006));
  return v + delta;
};

const relTime = (iso) => {
  if (!iso) return "—";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

const FeedStatus = ({ store, clock }) => {
  const auto = store.autoFeed !== false;
  const ok = store.feed?.ok;
  const connecting = store.feed === undefined; // first paint, before any backend response
  const lastAt = store.feed?.lastAt || store.updatedAt;
  const source = store.feed?.source;

  let dot = "bg-green-500";
  let text = "text-green-400";
  let label = "LIVE";
  let cls = "live-dot";
  if (connecting) {
    dot = "bg-gray-400"; text = "text-gray-400"; label = "CONNECTING"; cls = "";
  } else if (!auto) {
    dot = "bg-[#f0c33c]"; text = "text-[#f0c33c]"; label = "MANUAL"; cls = "";
  } else if (!ok) {
    dot = "bg-amber-500"; text = "text-amber-400"; label = "STALE"; cls = "";
  }

  return (
    <div className="mb-4 flex items-center justify-between text-xs" data-testid="feed-status-bar">
      <div className={`flex items-center gap-2 ${text}`} data-testid="feed-status">
        <span className={`${cls} inline-block h-2 w-2 rounded-full ${dot}`} />
        <span className="font-semibold tracking-wide">{label}</span>
        {!connecting && auto && (
          <span className="text-gray-500">
            {ok ? `· ${source || "auto feed"}` : "· showing last good"} · updated {relTime(lastAt)}
          </span>
        )}
        {!connecting && !auto && <span className="text-gray-500">· dealer-set rates</span>}
      </div>
      <div className="num text-gray-400">{clock.toLocaleTimeString("en-GB")}</div>
    </div>
  );
};

const McxChip = ({ label, contract, pct }) => {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/40 px-3 py-2" data-testid={`mcx-chip-${label.toLowerCase()}`}>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-gray-500">MCX {label}</div>
        <div className="text-[11px] text-gray-400">{contract || "front month"}</div>
      </div>
      <div className={`num text-sm font-bold ${up ? "text-green-500" : "text-red-500"}`}>
        {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
      </div>
    </div>
  );
};

const SpotCard = ({ label, value, prev }) => {
  const up = prev != null && value > prev;
  const down = prev != null && value < prev;
  return (
    <div className="gold-gradient rounded-lg px-4 py-3 text-center shadow-[0_4px_14px_rgba(240,195,60,0.25)]">
      <div className="text-sm font-bold tracking-wide text-[#4a3600]">{label}</div>
      <div
        className={`num mt-1 text-2xl sm:text-3xl font-bold ${
          up ? "text-green-800" : down ? "text-red-700" : "text-black"
        }`}
      >
        {Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
      </div>
    </div>
  );
};

const LiveRates = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState("retail");
  const [store, setStore] = useState(FALLBACK);
  const [live, setLive] = useState(FALLBACK);
  const prevSpot = useRef(FALLBACK.spot);
  const [clock, setClock] = useState(new Date());
  const snapRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const shareSnapshot = async () => {
    if (!snapRef.current) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(snapRef.current, { backgroundColor: "#000000", scale: 2, useCORS: true });
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      const file = new File([blob], "1gmpay-rates.png", { type: "image/png" });
      const shareText = `${COMPANY.name} — Live Rates\n${new Date().toLocaleString("en-IN")}`;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText, title: "1gmPay Live Rates" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "1gmpay-rates.png";
        a.click();
        URL.revokeObjectURL(url);
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
        toast({ title: "Snapshot saved", description: "Image downloaded — attach it to your WhatsApp status/chat." });
      }
    } catch (e) {
      toast({ title: "Share failed", description: "Could not create the rate snapshot." });
    } finally {
      setSharing(false);
    }
  };

  // Fetch base store (admin-controlled) from backend + poll
  useEffect(() => {
    let active = true;
    const fetchRates = async () => {
      try {
        const data = await ratesApi.get();
        if (active && data && data.spot) {
          setStore(data);
          setLoaded(true);
        }
      } catch (e) {
        // keep fallback / previous
      }
    };
    fetchRates();
    const t = setInterval(fetchRates, 8000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  // Live jitter every 3s from the base store
  useEffect(() => {
    const apply = () => {
      prevSpot.current = live.spot;
      const next = {
        spot: {
          goldUsd: +(jitter(store.spot.goldUsd)).toFixed(2),
          silverUsd: +(jitter(store.spot.silverUsd)).toFixed(2),
          inr: store.spot.inr,
        },
        retail: store.retail.map((x) => ({ ...x, buy: jitter(x.buy), sell: jitter(x.sell) })),
        rtgs: store.rtgs.map((x) => ({ ...x, buy: jitter(x.buy), sell: jitter(x.sell) })),
        coins: store.coins.map((x) => ({ ...x, buy: jitter(x.buy), sell: jitter(x.sell) })),
        ticker: store.ticker,
      };
      setLive(next);
    };
    apply();
    const t = setInterval(apply, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const items = live[tab] || [];

  return (
    <section className="bg-black">
      {/* Notice ticker (circled band) */}
      <Marquee text={live.ticker || store.ticker} />

      {/* Tabs */}
      <div className="border-b border-white/10 bg-[#0b0b0b]">
        <div className="mx-auto max-w-4xl grid grid-cols-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative py-3 text-sm sm:text-base font-bold tracking-wide transition-colors ${
                tab === t.key ? "text-[#f0c33c]" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-[3px] rounded-full bg-[#f0c33c]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-3 py-5">
        {/* Live status bar */}
        <FeedStatus store={store} clock={clock} />

        {/* Share snapshot */}
        <div className="mb-3 flex justify-end">
          <Button
            onClick={shareSnapshot}
            disabled={sharing || !loaded}
            data-testid="share-rates-btn"
            className="h-8 gap-1.5 rounded-full bg-[#f0c33c] px-4 text-xs font-bold text-black hover:bg-[#e0b02a]"
          >
            <Share2 className="h-3.5 w-3.5" /> {sharing ? "PREPARING…" : "SHARE RATES"}
          </Button>
        </div>

        {!loaded ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center" data-testid="rates-loading">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f0c33c]/30 border-t-[#f0c33c]" />
            <p className="text-sm font-semibold tracking-wide text-gray-400">Fetching live rates…</p>
          </div>
        ) : (
          <>
            {/* Spot cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <SpotCard label="GOLD ($)" value={live.spot.goldUsd} prev={prevSpot.current?.goldUsd} />
              <SpotCard label="SILVER ($)" value={live.spot.silverUsd} prev={prevSpot.current?.silverUsd} />
              <SpotCard label={"INR (\u20b9)"} value={live.spot.inr} prev={prevSpot.current?.inr} />
            </div>

            {/* MCX front-month change chips */}
            {store.mcxMeta && (store.mcxMeta.goldPct != null || store.mcxMeta.silverPct != null) && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
                <McxChip label="GOLD" contract={store.mcxMeta.goldContract} pct={store.mcxMeta.goldPct} />
                <McxChip label="SILVER" contract={store.mcxMeta.silverContract} pct={store.mcxMeta.silverPct} />
              </div>
            )}

            {/* Rates table */}
            <div className="mt-5">
              <RatesTable items={items} />
            </div>

            {/* Rate history chart */}
            <div className="mt-5">
              <RateChart />
            </div>
          </>
        )}

        <p className="mt-4 text-center text-[11px] text-gray-500">
          Rates are indicative and update in real time. For confirmed bookings, please contact the Booking Desk.
        </p>
      </div>

      {/* Hidden snapshot card for WhatsApp sharing */}
      <div className="pointer-events-none fixed -left-[9999px] top-0" aria-hidden="true">
        <div ref={snapRef} style={{ width: 520 }} className="bg-black p-6">
          <div className="text-center">
            <div className="text-4xl font-bold leading-tight" style={{ color: "#f0c33c" }}>1gmPay</div>
            <div className="mt-1 text-[13px] font-bold tracking-wide text-white">{COMPANY.name} {COMPANY.suffix}</div>
            <div className="text-[11px] font-semibold tracking-[0.25em]" style={{ color: "#f0c33c" }}>{COMPANY.subtitle}</div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
            <span className="font-bold uppercase" style={{ color: "#f0c33c" }}>{tab} RATES</span>
            <span>{clock.toLocaleString("en-IN")}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {[["GOLD $", store.spot?.goldUsd], ["SILVER $", store.spot?.silverUsd], ["INR ₹", store.spot?.inr]].map(([l, v]) => (
              <div key={l} className="rounded-md py-2" style={{ background: "linear-gradient(180deg,#f7d774,#f0c33c)" }}>
                <div className="text-[10px] font-bold" style={{ color: "#4a3600" }}>{l}</div>
                <div className="text-lg font-bold text-black">{v != null ? Number(v).toLocaleString("en-US") : "-"}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 overflow-hidden rounded-md border border-white/10">
            <div className="grid grid-cols-[1.4fr_0.9fr_1fr_1fr] bg-[#111] text-[10px] font-bold tracking-widest text-gray-400">
              <div className="px-2 py-1.5" />
              <div className="px-2 py-1.5 text-center">BADLA</div>
              <div className="px-2 py-1.5 text-center">BUY</div>
              <div className="px-2 py-1.5 text-center">SELL</div>
            </div>
            {(store[tab] || []).map((it) => (
              <div key={it.id} className="grid grid-cols-[1.4fr_0.9fr_1fr_1fr] items-center border-t border-white/10">
                <div className="px-2 py-1.5 text-[12px] font-semibold uppercase text-gray-100">{it.name}</div>
                <div className="px-2 py-1.5 text-center text-[12px] text-gray-300">{it.badla ? (it.badla > 0 ? `+${Number(it.badla).toLocaleString("en-IN")}` : Number(it.badla).toLocaleString("en-IN")) : "—"}</div>
                <div className="px-2 py-1.5 text-center text-[14px] font-bold text-white">{it.buy != null ? Number(it.buy).toLocaleString("en-IN") : "-"}</div>
                <div className="px-2 py-1.5 text-center text-[14px] font-bold text-white">{it.sell != null ? Number(it.sell).toLocaleString("en-IN") : "-"}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-center text-[10px] text-gray-500">
            {COMPANY.phones?.[0]} · {COMPANY.email}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveRates;

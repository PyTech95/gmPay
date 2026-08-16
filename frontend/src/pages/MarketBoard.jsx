import React, { useEffect, useState } from "react";
import { PageShell } from "./ContactUs";
import { commoditiesApi } from "../api";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

const CATEGORIES = {
  Bullion: ["GOLD", "GOLDM", "GOLDGUINEA", "GOLDPETAL", "GOLDTEN", "SILVER", "SILVERM", "SILVERMIC", "SILVER100"],
  Energy: ["CRUDEOIL", "CRUDEOILM", "NATURALGAS", "NATGASMINI"],
  "Base Metals": ["COPPER", "ZINC", "ZINCMINI", "ALUMINIUM", "ALUMINI", "LEAD", "LEADMINI", "NICKEL"],
};

const catOf = (product) => {
  for (const [cat, list] of Object.entries(CATEGORIES)) {
    if (list.includes(product)) return cat;
  }
  return "Other";
};

const fmt = (v) => {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return n.toLocaleString("en-IN");
};

const relTime = (iso) => {
  if (!iso) return "—";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

const FILTERS = ["All", "Bullion", "Energy", "Base Metals"];

const MarketBoard = () => {
  const [data, setData] = useState({ items: [], asOf: null });
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const d = await commoditiesApi.get();
      setData(d);
    } catch (e) {
      // keep previous
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const rows = (data.items || [])
    .filter((r) => filter === "All" || catOf(r.product) === filter)
    .sort((a, b) => (catOf(a.product)).localeCompare(catOf(b.product)) || a.product.localeCompare(b.product));

  return (
    <PageShell title="MCX LIVE BOARD" subtitle="Live MCX futures across bullion, energy and base metals.">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-md border border-white/10 p-0.5" data-testid="board-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              data-testid={`board-filter-${f.toLowerCase().replace(/\s/g, "-")}`}
              className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                filter === f ? "bg-[#f0c33c] text-black" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button onClick={load} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#f0c33c]" data-testid="board-refresh">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {data.asOf ? `updated ${relTime(data.asOf)}` : "refresh"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#050505]">
        <div className="grid min-w-0 sm:min-w-[640px] grid-cols-[1.3fr_0.9fr_0.9fr_0.8fr] sm:grid-cols-[1.4fr_1fr_1fr_0.9fr_1fr_1fr] bg-[#0e0e0e] text-[10px] sm:text-[11px] font-bold tracking-wide text-gray-400">
          <div className="px-2 sm:px-3 py-2">PRODUCT</div>
          <div className="px-2 sm:px-3 py-2">EXPIRY</div>
          <div className="px-2 sm:px-3 py-2 text-right">LTP</div>
          <div className="px-2 sm:px-3 py-2 text-right">CHG%</div>
          <div className="hidden sm:block px-3 py-2 text-right">DAY H/L</div>
          <div className="hidden sm:block px-3 py-2 text-right">OI</div>
        </div>
        {rows.map((r) => {
          const up = (Number(r.pct) || 0) >= 0;
          return (
            <div key={r.id} className="grid min-w-0 sm:min-w-[640px] grid-cols-[1.3fr_0.9fr_0.9fr_0.8fr] sm:grid-cols-[1.4fr_1fr_1fr_0.9fr_1fr_1fr] items-center border-t border-white/10 text-sm hover:bg-white/[0.03]" data-testid={`board-row-${r.id}`}>
              <div className="px-2 sm:px-3 py-2.5 text-[13px] font-semibold text-gray-100">
                {r.product}
                <span className="ml-1.5 hidden sm:inline rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-gray-500">{catOf(r.product)}</span>
              </div>
              <div className="px-2 sm:px-3 py-2.5 text-[11px] sm:text-xs text-gray-400">{r.expiry}</div>
              <div className="num px-2 sm:px-3 py-2.5 text-right text-[13px] font-bold text-white">{fmt(r.ltp)}</div>
              <div className={`num px-2 sm:px-3 py-2.5 text-right text-[12px] font-semibold flex items-center justify-end gap-0.5 ${up ? "text-green-500" : "text-red-500"}`}>
                {up ? <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                {r.pct != null ? `${up ? "+" : ""}${Number(r.pct).toFixed(2)}%` : "-"}
              </div>
              <div className="hidden sm:block num px-3 py-2.5 text-right text-[11px] text-gray-400">
                <span className="text-green-500/80">{fmt(r.high)}</span> / <span className="text-red-500/80">{fmt(r.low)}</span>
              </div>
              <div className="hidden sm:block num px-3 py-2.5 text-right text-gray-300">{fmt(r.oi)}</div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-gray-500">
            {loading ? "Loading live board…" : "No commodities available right now."}
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-[11px] text-gray-500">
        Source: MCX via stock.indianapi.in. Prices are indicative and delayed; unit varies by contract (GRMS / KGS / BBL / mmBtu).
      </p>
    </PageShell>
  );
};

export default MarketBoard;

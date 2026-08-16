import React, { useEffect, useRef, useState } from "react";

const fmt = (v) => (v === null || v === undefined ? "-" : Number(v).toLocaleString("en-IN"));
const fmtBadla = (v) => {
  if (v === null || v === undefined) return "-";
  const n = Number(v);
  if (n === 0) return "—";
  return `${n > 0 ? "+" : ""}${n.toLocaleString("en-IN")}`;
};

const PriceCell = ({ value, flash }) => (
  <div className={`px-1 py-2.5 sm:px-2 sm:py-3 text-center rounded-md ${flash || ""}`}>
    <div className="num text-lg sm:text-3xl font-bold text-white leading-none">{fmt(value)}</div>
  </div>
);

const Row = ({ item }) => {
  const prev = useRef({ buy: item.buy, sell: item.sell });
  const [buyFlash, setBuyFlash] = useState("");
  const [sellFlash, setSellFlash] = useState("");

  useEffect(() => {
    if (item.buy != null && prev.current.buy != null) {
      if (item.buy > prev.current.buy) setBuyFlash("flash-up");
      else if (item.buy < prev.current.buy) setBuyFlash("flash-down");
    }
    if (item.sell != null && prev.current.sell != null) {
      if (item.sell > prev.current.sell) setSellFlash("flash-up");
      else if (item.sell < prev.current.sell) setSellFlash("flash-down");
    }
    prev.current = { buy: item.buy, sell: item.sell };
    const t = setTimeout(() => {
      setBuyFlash("");
      setSellFlash("");
    }, 900);
    return () => clearTimeout(t);
  }, [item.buy, item.sell]);

  const isBase = (item.badla ?? null) === 0 || /MAX$/.test(item.name || "");

  return (
    <div
      data-testid={`rate-row-${item.id}`}
      className={`grid grid-cols-[1.4fr_0.9fr_1fr_1fr] items-center border-b border-white/10 transition-colors ${isBase ? "bg-[#f0c33c]/[0.06]" : "hover:bg-white/[0.03]"}`}
    >
      <div className="px-2 py-3 text-left text-[12px] sm:text-[15px] font-semibold uppercase tracking-wide">
        <span className={isBase ? "text-[#f0c33c]" : "text-gray-100"}>{item.name}</span>
      </div>
      <div className="px-1 py-3 text-center">
        <span className="num text-xs sm:text-base font-semibold text-gray-300" data-testid={`rate-badla-${item.id}`}>
          {fmtBadla(item.badla)}
        </span>
      </div>
      <PriceCell value={item.buy} flash={buyFlash} />
      <PriceCell value={item.sell} flash={sellFlash} />
    </div>
  );
};

const RatesTable = ({ items }) => {
  return (
    <div className="rounded-lg border border-white/10 bg-[#050505] overflow-hidden">
      <div className="grid grid-cols-[1.4fr_0.9fr_1fr_1fr] border-b border-white/10 bg-[#0e0e0e]">
        <div className="px-3 py-2" />
        <div className="px-2 py-2 text-center text-xs font-bold tracking-[0.2em] text-gray-400">BADLA</div>
        <div className="px-2 py-2 text-center text-xs font-bold tracking-[0.2em] text-gray-400">BUY</div>
        <div className="px-2 py-2 text-center text-xs font-bold tracking-[0.2em] text-gray-400">SELL</div>
      </div>
      {items.map((it) => (
        <Row key={it.id} item={it} />
      ))}
      {items.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-gray-500">No rates available.</div>
      )}
    </div>
  );
};

export default RatesTable;

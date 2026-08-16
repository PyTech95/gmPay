import React, { useEffect, useState } from "react";
import { PageShell } from "./ContactUs";
import { Smartphone, Apple, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { ratesApi, bookingsApi } from "../api";
import { DEFAULT_RETAIL, DEFAULT_RTGS } from "../mock";

export const Download = () => (
  <PageShell title="DOWNLOAD" subtitle="Get live rates on the go with our mobile app.">
    <div className="grid gap-4 sm:grid-cols-2">
      <a href="#" onClick={(e)=>e.preventDefault()} className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0b0b0b] p-5 hover:border-[#f0c33c]/50 transition-colors">
        <Smartphone className="h-8 w-8 text-[#f0c33c]" />
        <div><div className="text-xs text-gray-500">GET IT ON</div><div className="text-lg font-bold text-white">Google Play</div></div>
      </a>
      <a href="#" onClick={(e)=>e.preventDefault()} className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0b0b0b] p-5 hover:border-[#f0c33c]/50 transition-colors">
        <Apple className="h-8 w-8 text-[#f0c33c]" />
        <div><div className="text-xs text-gray-500">DOWNLOAD ON THE</div><div className="text-lg font-bold text-white">App Store</div></div>
      </a>
    </div>
    <p className="mt-4 text-xs text-gray-500">App links are placeholders in this demo build.</p>
  </PageShell>
);

export const Trades = () => {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const build = (g, s) => {
      const all = [...g, ...s].slice(0, 8);
      return all.map((x, i) => ({
        id: x.id,
        name: x.name,
        price: x.sell,
        side: i % 2 === 0 ? "BUY" : "SELL",
        qty: [50, 100, 250, 500][i % 4],
        time: new Date(Date.now() - i * 240000).toLocaleTimeString("en-GB"),
      }));
    };
    ratesApi
      .get()
      .then((d) => setRows(build(d.retail || DEFAULT_RETAIL, d.rtgs || DEFAULT_RTGS)))
      .catch(() => setRows(build(DEFAULT_RETAIL, DEFAULT_RTGS)));
  }, []);
  return (
    <PageShell title="TRADES" subtitle="Recent executed trades (demo data).">
      <div className="overflow-hidden rounded-lg border border-white/10">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] bg-[#0e0e0e] text-[11px] font-bold tracking-wide text-gray-400">
          <div className="px-3 py-2">PRODUCT</div>
          <div className="px-3 py-2 text-center">SIDE</div>
          <div className="px-3 py-2 text-right">QTY</div>
          <div className="px-3 py-2 text-right">PRICE</div>
          <div className="px-3 py-2 text-right">TIME</div>
        </div>
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center border-t border-white/10 text-sm">
            <div className="px-3 py-2.5 text-gray-100 truncate">{r.name}</div>
            <div className={`px-3 py-2.5 text-center font-semibold flex items-center justify-center gap-1 ${r.side==="BUY"?"text-green-500":"text-red-500"}`}>
              {r.side==="BUY"?<TrendingUp className="h-3.5 w-3.5"/>:<TrendingDown className="h-3.5 w-3.5"/>}{r.side}
            </div>
            <div className="num px-3 py-2.5 text-right text-gray-200">{r.qty}</div>
            <div className="num px-3 py-2.5 text-right text-gray-200">{Number(r.price).toLocaleString("en-IN")}</div>
            <div className="num px-3 py-2.5 text-right text-gray-400">{r.time}</div>
          </div>
        ))}
      </div>
    </PageShell>
  );
};

export const PendingOrders = () => {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    bookingsApi.list().then(setOrders).catch(() => setOrders([]));
  }, []);
  return (
    <PageShell title="PENDING ORDERS" subtitle="Booking requests received from customers.">
      {orders.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-[#0b0b0b] p-10 text-center text-gray-500">
          <Clock className="mx-auto mb-3 h-8 w-8 text-gray-600" />
          No pending orders yet. Place one from the Booking Desk.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0b0b0b] p-4">
              <div>
                <div className="font-semibold text-white">{o.name} {"\u2022"} {o.metal} {o.type}</div>
                <div className="num text-xs text-gray-400">Qty {o.qty} {"\u2022"} {new Date(o.at).toLocaleString()}</div>
              </div>
              <span className="rounded-full bg-yellow-500/15 px-3 py-1 text-xs font-semibold text-yellow-400">{o.status}</span>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
};

import React, { useEffect, useState } from "react";
import { historyApi } from "../api";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

const fmt = (v) => (v == null ? "-" : Number(v).toLocaleString("en-IN"));

const Sparkline = ({ points, up }) => {
  if (!points || points.length < 2) return null;
  const w = 640;
  const h = 160;
  const pad = 8;
  const vals = points.map((p) => p.inr);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - pad * 2) * (1 - (p.inr - min) / range);
    return [x, y];
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${h - pad} L${coords[0][0].toFixed(1)},${h - pad} Z`;
  const stroke = up ? "#22c55e" : "#ef4444";
  const fillId = up ? "gradUp" : "gradDown";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40" preserveAspectRatio="none">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.30" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${fillId})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const Stat = ({ label, value, color = "text-gray-100", icon: Icon }) => (
  <div className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-center">
    <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
    <div className={`num mt-0.5 flex items-center justify-center gap-1 text-base font-bold ${color}`}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {value}
    </div>
  </div>
);

const RateChart = () => {
  const [metal, setMetal] = useState("gold");
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    const load = () => historyApi.get(metal).then((d) => active && setData(d)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [metal]);

  const up = (data?.change ?? 0) >= 0;
  const unit = metal === "gold" ? "/ 10g" : "/ kg";

  return (
    <div className="rounded-lg border border-white/10 bg-[#080808] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-wide text-[#f0c33c]">
          RATE HISTORY <span className="text-gray-500">(24h {unit})</span>
        </h3>
        <div className="flex rounded-md border border-white/10 p-0.5">
          {["gold", "silver"].map((m) => (
            <button
              key={m}
              onClick={() => setMetal(m)}
              className={`rounded px-3 py-1 text-xs font-semibold uppercase transition-colors ${
                metal === m ? "bg-[#f0c33c] text-black" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-4 gap-2">
        <Stat label="Current" value={fmt(data?.current)} color="text-white" />
        <Stat
          label="Change"
          value={data?.change != null ? `${up ? "+" : ""}${fmt(data.change)}` : "-"}
          color={up ? "text-green-500" : "text-red-500"}
          icon={up ? ArrowUpRight : ArrowDownRight}
        />
        <Stat label="Day High" value={fmt(data?.dayHigh)} color="text-green-500" icon={TrendingUp} />
        <Stat label="Day Low" value={fmt(data?.dayLow)} color="text-red-500" icon={TrendingDown} />
      </div>

      <Sparkline points={data?.series} up={up} />
    </div>
  );
};

export default RateChart;

import React from "react";
import { LOGO_URL, COMPANY } from "../mock";
import { MapPin } from "lucide-react";

const CityBadge = ({ label }) => (
  <div className="flex items-center gap-1 rounded-md border border-[#f0c33c]/70 bg-[#111] px-3 py-1.5 text-[#f0c33c] shadow-[0_0_12px_rgba(240,195,60,0.15)]">
    <MapPin className="h-3.5 w-3.5" />
    <span className="font-semibold tracking-wide text-sm">{label}</span>
  </div>
);

const Header = () => {
  return (
    <header className="w-full bg-gradient-to-b from-[#0a0a0a] to-[#141414] border-b border-[#f0c33c]/30">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="hidden sm:block">
          <CityBadge label={COMPANY.cities[0]} />
        </div>

        <div className="flex flex-1 items-center justify-center gap-3 sm:gap-4">
          <img
            src={LOGO_URL}
            alt="1gmPay logo"
            data-testid="brand-logo"
            className="h-14 w-14 sm:h-20 sm:w-20 rounded-full object-contain drop-shadow-[0_0_14px_rgba(240,195,60,0.35)]"
          />
          <div className="text-center">
            <h1 className="leading-tight">
              <span className="block pb-1 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.15] bg-gradient-to-b from-[#f9e39a] to-[#e0a92a] bg-clip-text text-transparent drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]">
                1gm<span className="font-extrabold">Pay</span>
              </span>
            </h1>
            <span className="mt-1 block text-[11px] sm:text-sm font-bold tracking-[0.15em] text-gray-100">
              {COMPANY.name} {COMPANY.suffix}
            </span>
          </div>
        </div>

        <div className="hidden sm:block">
          <CityBadge label={COMPANY.cities[1]} />
        </div>
      </div>

      {/* Bullion & coin dealer banner */}
      <div className="w-full border-t border-[#f0c33c]/20 bg-[#f0c33c]/10">
        <p className="py-1.5 text-center text-[11px] sm:text-sm font-extrabold tracking-[0.35em] text-[#f0c33c]" data-testid="dealer-banner">
          {COMPANY.subtitle}
        </p>
      </div>
    </header>
  );
};

export default Header;

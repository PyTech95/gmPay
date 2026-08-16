import React from "react";
import { Megaphone } from "lucide-react";

const Marquee = ({ text }) => {
  if (!text) return null;
  return (
    <div className="relative flex items-stretch overflow-hidden border-y border-[#f0c33c]/30 bg-gradient-to-r from-[#1a1400] via-[#241c00] to-[#1a1400]">
      <div className="z-10 flex shrink-0 items-center gap-1.5 bg-[#f0c33c] px-3 text-black">
        <Megaphone className="h-4 w-4" />
        <span className="text-xs font-bold tracking-wide">NOTICE</span>
      </div>
      <div className="relative flex-1 overflow-hidden py-2">
        <div className="marquee-track text-sm font-semibold tracking-wide text-[#f7d774]">
          {text}
          <span className="mx-8 text-[#f0c33c]/50">|</span>
          {text}
        </div>
      </div>
    </div>
  );
};

export default Marquee;

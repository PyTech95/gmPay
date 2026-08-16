import React from "react";
import { NavLink } from "react-router-dom";
import { TrendingUp, BarChart3, ClipboardList, Landmark, Phone } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Rates", icon: TrendingUp, end: true },
  { to: "/market", label: "MCX", icon: BarChart3 },
  { to: "/booking-desk", label: "Book", icon: ClipboardList },
  { to: "/bank-details", label: "Bank", icon: Landmark },
  { to: "/contact", label: "Contact", icon: Phone },
];

const BottomNav = () => {
  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-[#f0c33c]/25 bg-[#0a0a0a]/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      data-testid="mobile-bottom-nav"
    >
      <div className="grid grid-cols-5">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              data-testid={`bottomnav-${it.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold tracking-wide transition-colors ${
                  isActive ? "text-[#f0c33c]" : "text-gray-400 active:text-gray-200"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {it.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

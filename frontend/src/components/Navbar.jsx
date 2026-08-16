import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";

const LINKS = [
  { to: "/", label: "LIVE RATES" },
  { to: "/market", label: "MCX BOARD" },
  { to: "/booking-desk", label: "BOOKING DESK" },
  { to: "/download", label: "DOWNLOAD" },
  { to: "/bank-details", label: "BANK DETAILS" },
  { to: "/trades", label: "TRADES" },
  { to: "/pending-orders", label: "PENDING ORDERS" },
  { to: "/contact", label: "CONTACT US" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `px-3 py-3 text-[13px] font-semibold tracking-wide transition-colors duration-200 ${
      isActive
        ? "text-black bg-[#f0c33c]"
        : "text-[#2a2a2a] hover:text-black hover:bg-[#e6e6e6]"
    }`;

  return (
    <nav className="w-full bg-gradient-to-b from-[#e9e9e9] to-[#cfcfcf] border-b-2 border-[#b8b8b8] shadow-sm">
      <div className="mx-auto max-w-6xl px-2">
        <div className="flex items-center justify-between md:justify-center">
          <div className="hidden md:flex items-center flex-wrap justify-center">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass} end={l.to === "/"}>
                {l.label}
              </NavLink>
            ))}
          </div>

          <button
            className="md:hidden ml-auto my-2 rounded-md p-2 text-[#2a2a2a] hover:bg-[#dcdcdc]"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden flex flex-col pb-2">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                onClick={() => setOpen(false)}
                className={linkClass}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

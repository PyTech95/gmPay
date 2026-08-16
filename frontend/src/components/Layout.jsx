import React from "react";
import { Outlet, Link } from "react-router-dom";
import Header from "./Header";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import InstallPrompt from "./InstallPrompt";
import { COMPANY } from "../mock";
import { Phone, MapPin } from "lucide-react";

const Layout = () => {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col pb-14 md:pb-0">
      <Header />
      <Navbar />
      <InstallPrompt />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-[#f0c33c]/25 bg-[#0a0a0a]">
        <div className="mx-auto max-w-6xl px-4 py-8 grid gap-6 md:grid-cols-3">
          <div>
            <h4 className="text-[#f0c33c] font-bold tracking-wide">{COMPANY.name}</h4>
            <p className="mt-1 text-xs text-gray-400">{COMPANY.suffix}</p>
            <p className="mt-3 text-xs text-gray-400">{COMPANY.tagline}</p>
            <p className="mt-3 text-[11px] text-gray-500">
              Directors: {COMPANY.directors.join(", ")}
            </p>
          </div>
          <div className="text-sm text-gray-300">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-[#f0c33c]" />
              <span className="text-xs">{COMPANY.officeAddress}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#f0c33c]" />
              <span className="text-xs">{COMPANY.phones.join(" / ")}</span>
            </div>
          </div>
          <div className="text-sm text-gray-300">
            <h5 className="font-semibold text-gray-200">Quick Links</h5>
            <div className="mt-2 flex flex-col gap-1 text-xs">
              <Link to="/" className="hover:text-[#f0c33c]">Live Rates</Link>
              <Link to="/bank-details" className="hover:text-[#f0c33c]">Bank Details</Link>
              <Link to="/contact" className="hover:text-[#f0c33c]">Contact Us</Link>
              <Link to="/admin" className="hover:text-[#f0c33c]">Admin Login</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 py-3 text-center text-[11px] text-gray-500">
          © {new Date().getFullYear()} {COMPANY.name} {COMPANY.suffix}. All rights reserved.
        </div>
      </footer>
      <BottomNav />
    </div>
  );
};

export default Layout;

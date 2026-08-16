import "./App.css";
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import LiveRates from "./pages/LiveRates";
import ContactUs from "./pages/ContactUs";
import BankDetails from "./pages/BankDetails";
import BookingDesk from "./pages/BookingDesk";
import MarketBoard from "./pages/MarketBoard";
import { Download, Trades, PendingOrders } from "./pages/MiscPages";
import Admin from "./pages/Admin";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<LiveRates />} />
            <Route path="/market" element={<MarketBoard />} />
            <Route path="/booking-desk" element={<BookingDesk />} />
            <Route path="/download" element={<Download />} />
            <Route path="/bank-details" element={<BankDetails />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/pending-orders" element={<PendingOrders />} />
            <Route path="/contact" element={<ContactUs />} />
          </Route>
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

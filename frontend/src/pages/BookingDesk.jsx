import React, { useState } from "react";
import { PageShell } from "./ContactUs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { useToast } from "../hooks/use-toast";
import { Phone } from "lucide-react";
import { COMPANY } from "../mock";
import { bookingsApi } from "../api";

const BookingDesk = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", phone: "", metal: "", qty: "", type: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.metal || !form.qty || !form.type) {
      toast({ title: "Missing details", description: "Please fill all fields." });
      return;
    }
    try {
      await bookingsApi.create(form);
      const msg =
        `*New Booking - 1gmPay*%0A%0A` +
        `Name: ${form.name}%0A` +
        `Phone: ${form.phone}%0A` +
        `Metal: ${form.metal}%0A` +
        `Type: ${form.type}%0A` +
        `Qty: ${form.qty}`;
      window.open(`https://wa.me/${COMPANY.whatsapp}?text=${msg}`, "_blank");
      toast({ title: "Booking placed", description: "Opening WhatsApp to confirm with our desk." });
      setForm({ name: "", phone: "", metal: "", qty: "", type: "" });
    } catch (err) {
      toast({ title: "Failed", description: "Could not place booking. Try again." });
    }
  };

  return (
    <PageShell title="BOOKING DESK" subtitle="Place a buy / sell booking request. Our team will confirm on call.">
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-[#f0c33c]/30 bg-[#0b0b0b] p-3">
        <Phone className="h-4 w-4 text-[#f0c33c]" />
        <span className="text-sm text-gray-200">Booking Desk: <b className="text-[#f0c33c]">{COMPANY.phones[0]}</b></span>
      </div>

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 rounded-lg border border-white/10 bg-[#0b0b0b] p-5">
        <div className="space-y-1.5">
          <Label className="text-gray-300">Name</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" className="bg-black border-white/15 text-white" data-testid="booking-name-input" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-300">Phone</Label>
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Mobile number" className="bg-black border-white/15 text-white" data-testid="booking-phone-input" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-300">Metal</Label>
          <Select value={form.metal} onValueChange={(v) => set("metal", v)}>
            <SelectTrigger className="bg-black border-white/15 text-white" data-testid="booking-metal-select"><SelectValue placeholder="Select metal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="GOLD">Gold</SelectItem>
              <SelectItem value="SILVER">Silver</SelectItem>
              <SelectItem value="COIN">Coin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-300">Type</Label>
          <Select value={form.type} onValueChange={(v) => set("type", v)}>
            <SelectTrigger className="bg-black border-white/15 text-white" data-testid="booking-type-select"><SelectValue placeholder="Buy or Sell" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BUY">Buy</SelectItem>
              <SelectItem value="SELL">Sell</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-gray-300">Quantity (grams / pieces)</Label>
          <Input value={form.qty} onChange={(e) => set("qty", e.target.value)} placeholder="e.g. 100" className="bg-black border-white/15 text-white" data-testid="booking-qty-input" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" className="w-full bg-[#f0c33c] text-black font-bold hover:bg-[#e0b02a]" data-testid="booking-submit-btn">
            PLACE BOOKING & SEND ON WHATSAPP
          </Button>
        </div>
      </form>
    </PageShell>
  );
};

export default BookingDesk;

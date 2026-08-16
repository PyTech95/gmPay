import React from "react";
import { COMPANY } from "../mock";
import { Phone, MapPin, Mail, Building2, Clock } from "lucide-react";

const PageShell = ({ title, subtitle, children }) => (
  <section className="mx-auto max-w-4xl px-4 py-8">
    <div className="mb-6">
      <div className="inline-block border-b-2 border-[#f0c33c] pb-1">
        <h2 className="text-2xl font-bold tracking-wide text-white">{title}</h2>
      </div>
      {subtitle && <p className="mt-2 text-sm text-gray-400">{subtitle}</p>}
    </div>
    {children}
  </section>
);

export { PageShell };

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#0b0b0b] p-4">
    <div className="rounded-md bg-[#f0c33c]/15 p-2 text-[#f0c33c]">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm text-gray-100">{value}</div>
    </div>
  </div>
);

const ContactUs = () => {
  return (
    <PageShell title="CONTACT US" subtitle="Reach out to us for bookings, rates and enquiries.">
      <div className="grid gap-4 sm:grid-cols-2">
        <InfoRow icon={Phone} label="Phone" value={COMPANY.phones.join("  /  ")} />
        <InfoRow icon={Mail} label="Email" value={COMPANY.email} />
        <InfoRow icon={MapPin} label="Office Address" value={COMPANY.officeAddress} />
        <InfoRow icon={Building2} label="Registered Address" value={COMPANY.regAddress} />
        <InfoRow icon={MapPin} label="Contact Address" value={COMPANY.contactAddress} />
        <InfoRow icon={Clock} label="Working Hours" value="Mon \u2013 Sat, 10:00 AM \u2013 8:00 PM" />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-white/10">
        <iframe
          title="map"
          className="w-full h-64"
          src="https://www.google.com/maps?q=Sarafa+Bazar+Jhansi&output=embed"
          loading="lazy"
        />
      </div>
    </PageShell>
  );
};

export default ContactUs;

import React from "react";
import { BANKS, COMPANY } from "../mock";
import { PageShell } from "./ContactUs";
import { Landmark, Copy, Check } from "lucide-react";
import { useToast } from "../hooks/use-toast";

const Field = ({ label, value }) => {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 py-2 last:border-0">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
        <div className="num text-sm font-semibold text-gray-100">{value}</div>
      </div>
      <button onClick={copy} className="rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-[#f0c33c]">
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
};

const BankDetails = () => {
  return (
    <PageShell title="BANK DETAILS" subtitle={`Kindly transfer only to the accounts of ${COMPANY.name}.`}>
      <div className="grid gap-4 sm:grid-cols-2">
        {BANKS.map((b) => (
          <div key={b.number} className="rounded-lg border border-white/10 bg-[#0b0b0b] p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-md bg-[#f0c33c]/15 p-2 text-[#f0c33c]"><Landmark className="h-5 w-5" /></div>
              <h3 className="text-lg font-bold text-white">{b.bank}</h3>
            </div>
            <Field label="Account Name" value={b.account} />
            <Field label="Account Number" value={b.number} />
            {b.ifsc ? <Field label="IFSC Code" value={b.ifsc} /> : null}
            <Field label="Branch" value={b.branch} />
          </div>
        ))}
      </div>
      <p className="mt-5 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
        Note: Please verify account details over phone before making any transfer. Company is not responsible for transfers made to unverified accounts.
      </p>
    </PageShell>
  );
};

export default BankDetails;

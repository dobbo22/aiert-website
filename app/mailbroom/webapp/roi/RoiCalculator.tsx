"use client";

import { useMemo, useState } from "react";

const OVERAGE_RATE_PER_GB_MONTH = 0.16; // ~$0.20/GB, see sources on this page
const INCLUDED_GB_PER_MAILBOX = 100;
const CO2_KG_PER_GB = 0.233; // same factor used across the MailBroom app and site

const BANDS = [
  { max: 5, label: "1–5 seats", price: 25 },
  { max: 10, label: "6–10 seats", price: 45 },
  { max: 25, label: "11–25 seats", price: 105 },
  { max: 50, label: "26–50 seats", price: 200 },
  { max: 100, label: "51–100 seats", price: 350 },
];

function planFor(employees: number) {
  const band = BANDS.find((b) => employees <= b.max);
  if (band) return band;
  return { max: Infinity, label: "101+ seats", price: null as number | null };
}

function formatGBP(n: number): string {
  return `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

export default function RoiCalculator() {
  const [employees, setEmployees] = useState(50);
  const [avgMailboxGB, setAvgMailboxGB] = useState(150);

  const result = useMemo(() => {
    const emp = Math.max(0, employees);
    const avg = Math.max(0, avgMailboxGB);
    const reducedAvg = avg * 0.5;

    const excessBefore = Math.max(0, avg - INCLUDED_GB_PER_MAILBOX);
    const excessAfter = Math.max(0, reducedAvg - INCLUDED_GB_PER_MAILBOX);

    const overageCostBefore = emp * excessBefore * OVERAGE_RATE_PER_GB_MONTH;
    const overageCostAfter = emp * excessAfter * OVERAGE_RATE_PER_GB_MONTH;
    const overageCostSaved = overageCostBefore - overageCostAfter;

    const storageFreedGB = emp * (avg - reducedAvg);
    const co2SavedKg = storageFreedGB * CO2_KG_PER_GB;

    const plan = planFor(emp);
    const netMonthly = plan.price !== null ? overageCostSaved - plan.price : null;

    return { storageFreedGB, co2SavedKg, overageCostSaved, plan, netMonthly };
  }, [employees, avgMailboxGB]);

  return (
    <div className="card-glass rounded-3xl p-8 md:p-10">
      <div className="grid md:grid-cols-2 gap-8 mb-10">
        <div>
          <label htmlFor="employees" className="block text-xs font-semibold uppercase tracking-widest text-mist mb-2">
            Employees
          </label>
          <input
            id="employees"
            type="number"
            min={1}
            max={100000}
            value={employees}
            onChange={(e) => setEmployees(Number(e.target.value))}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cloud text-lg font-bold focus:outline-none focus:border-gold/60"
          />
        </div>
        <div>
          <label htmlFor="avgMailbox" className="block text-xs font-semibold uppercase tracking-widest text-mist mb-2">
            Average mailbox size today (GB)
          </label>
          <input
            id="avgMailbox"
            type="number"
            min={0}
            max={10000}
            value={avgMailboxGB}
            onChange={(e) => setAvgMailboxGB(Number(e.target.value))}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-cloud text-lg font-bold focus:outline-none focus:border-gold/60"
          />
        </div>
      </div>

      <p className="text-center text-xs text-mist mb-8">
        Assuming MailBroom reduces the average mailbox by 50% — a typical outcome once
        newsletters, notifications, and old attachments are cleared out.
      </p>

      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        <div className="text-center">
          <div className="text-3xl font-black gold-text">{Math.round(result.storageFreedGB).toLocaleString("en-GB")} GB</div>
          <div className="text-xs text-mist mt-1">storage freed</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black gold-text">{Math.round(result.co2SavedKg).toLocaleString("en-GB")} kg</div>
          <div className="text-xs text-mist mt-1">CO₂ saved</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black gold-text">{formatGBP(result.overageCostSaved)}/mo</div>
          <div className="text-xs text-mist mt-1">storage overage avoided</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-sm text-mist leading-relaxed">
          A MailBroom for Business plan at this headcount is{" "}
          <strong className="text-cloud">{result.plan.label}</strong>
          {result.plan.price !== null ? (
            <>
              {" "}— <strong className="text-cloud">{formatGBP(result.plan.price)}/month</strong>. That puts the net
              effect on storage overage alone at{" "}
              <strong className={result.netMonthly !== null && result.netMonthly >= 0 ? "text-gold" : "text-cloud"}>
                {result.netMonthly !== null ? `${result.netMonthly >= 0 ? "+" : ""}${formatGBP(Math.round(result.netMonthly))}/month` : "—"}
              </strong>
              {" "}— before counting IT time saved on quota tickets.
            </>
          ) : (
            <> — contact sales for pricing at this scale.</>
          )}
        </p>
      </div>

      <p className="text-center text-xs text-mist mt-6 max-w-2xl mx-auto leading-relaxed">
        Illustrative only — based on the sourced rates above, your own plan&apos;s included
        storage, and how far over it your mailboxes currently sit. Storage overage is only one
        part of the case; see IT time and compliance below.
      </p>
    </div>
  );
}

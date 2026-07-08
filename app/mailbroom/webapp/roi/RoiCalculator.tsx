"use client";

import { useMemo, useState } from "react";

const OVERAGE_RATE_PER_GB_MONTH = 0.16; // ~$0.20/GB, see sources on this page
const INCLUDED_GB_PER_MAILBOX = 100;
const CO2_KG_PER_GB = 0.233; // same factor used across the MailBroom app and site

// Microsoft's own documented OST performance threshold — pauses start appearing
// around 10GB regardless of your storage plan's quota, so this survives the
// 1 July 2026 quota increase to 100GB entirely (a mailbox can be well within
// quota and still be slow). Source 6.
const PERFORMANCE_THRESHOLD_GB = 10;
// HDI's 2025–2026 IT service desk benchmark: average cost per ticket $15.56,
// converted to GBP. Source 7.
const IT_TICKET_COST_GBP = 12;
// Estimate, not a published statistic: one avoidable "Outlook's slow / I can't
// find an email" ticket per employee per year once their mailbox is brought
// back under the performance threshold. Deliberately conservative.
const TICKETS_PER_FIXED_MAILBOX_PER_YEAR = 1;
// Mid-point of 2026 voluntary carbon market pricing for standard nature-based
// offsets (€8–30/tonne range), converted to GBP. Source 8.
const CARBON_OFFSET_GBP_PER_TONNE = 15;

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
    const co2OffsetValueGBP = (co2SavedKg / 1000) * CARBON_OFFSET_GBP_PER_TONNE;

    // Only counts a mailbox as "fixed" if cleanup actually brings it back under
    // the performance threshold — a mailbox that's still slow after a 50% cut
    // isn't counted, so this stays conservative rather than assuming partial
    // relief is worth a full ticket avoided.
    const employeesFixed = avg > PERFORMANCE_THRESHOLD_GB && reducedAvg <= PERFORMANCE_THRESHOLD_GB ? emp : 0;
    const itTimeSavedGBPPerYear = employeesFixed * TICKETS_PER_FIXED_MAILBOX_PER_YEAR * IT_TICKET_COST_GBP;
    const itTimeSavedGBPPerMonth = itTimeSavedGBPPerYear / 12;

    // True only when cleanup brought every mailbox back under quota with room
    // to spare — i.e. there's truly no overage story left, not just "small."
    const noOverageEitherWay = overageCostBefore === 0 && overageCostAfter === 0;

    const plan = planFor(emp);
    const netMonthly = plan.price !== null ? overageCostSaved + itTimeSavedGBPPerMonth - plan.price : null;

    return {
      storageFreedGB, co2SavedKg, co2OffsetValueGBP, overageCostSaved,
      employeesFixed, itTimeSavedGBPPerMonth, noOverageEitherWay, plan, netMonthly,
    };
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="text-center">
          <div className="text-3xl font-black gold-text">{Math.round(result.storageFreedGB).toLocaleString("en-GB")} GB</div>
          <div className="text-xs text-mist mt-1">storage freed</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black gold-text">{Math.round(result.co2SavedKg).toLocaleString("en-GB")} kg</div>
          <div className="text-xs text-mist mt-1">CO₂ saved · ~{formatGBP(Math.round(result.co2OffsetValueGBP))} in offsets<sup>8</sup></div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black gold-text">{formatGBP(result.overageCostSaved)}/mo</div>
          <div className="text-xs text-mist mt-1">storage overage avoided</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black gold-text">{formatGBP(Math.round(result.itTimeSavedGBPPerMonth))}/mo</div>
          <div className="text-xs text-mist mt-1">
            IT time saved{result.employeesFixed > 0 ? ` · ${result.employeesFixed} mailboxes fixed` : ""}
          </div>
        </div>
      </div>

      {result.noOverageEitherWay && (
        <div className="rounded-2xl border border-gold/20 bg-gold/5 p-5 text-center mb-6">
          <p className="text-sm text-mist leading-relaxed">
            At {Math.round(avgMailboxGB)}GB, these mailboxes sit inside Microsoft&apos;s 100GB
            quota already — so there&apos;s no overage fee to avoid here. That&apos;s not the
            same as &ldquo;nothing to gain&rdquo;: Outlook itself starts showing sync pauses
            around 10GB regardless of your storage quota<sup>6</sup>, which is why the IT-time
            figure above still counts for real once a mailbox crosses that line — and cleanup
            still buys headroom before these mailboxes grow into the next quota ceiling.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-sm text-mist leading-relaxed">
          A MailBroom for Business plan at this headcount is{" "}
          <strong className="text-cloud">{result.plan.label}</strong>
          {result.plan.price !== null ? (
            <>
              {" "}— <strong className="text-cloud">{formatGBP(result.plan.price)}/month</strong>. Combining storage
              overage avoided and IT time saved puts the net monthly effect at{" "}
              <strong className={result.netMonthly !== null && result.netMonthly >= 0 ? "text-gold" : "text-cloud"}>
                {result.netMonthly !== null ? `${result.netMonthly >= 0 ? "+" : ""}${formatGBP(Math.round(result.netMonthly))}/month` : "—"}
              </strong>
              {" "}— before counting compliance risk or the CO₂ offset value above.
            </>
          ) : (
            <> — contact sales for pricing at this scale.</>
          )}
        </p>
      </div>

      <p className="text-center text-xs text-mist mt-6 max-w-2xl mx-auto leading-relaxed">
        Storage freed, CO₂, and overage figures are calculated directly from the sourced rates
        above. IT time saved uses a published average ticket cost<sup>7</sup> applied to a
        conservative, clearly-labelled assumption (one avoidable ticket per mailbox brought back
        under Microsoft&apos;s documented performance threshold<sup>6</sup>, per year) — not a
        published statistic itself. Everything here is illustrative, not a quote.
      </p>
    </div>
  );
}

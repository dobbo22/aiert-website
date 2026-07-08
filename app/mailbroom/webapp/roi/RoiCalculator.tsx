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
// find an email" ticket per employee per year, scaled by how much of a
// mailbox's excess above the performance threshold was actually removed —
// e.g. cutting a mailbox from 50GB to 25GB (excess 40GB → 15GB) counts as
// ~63% of a ticket avoided, not zero just because it's still above 10GB.
const TICKETS_PER_OVER_THRESHOLD_EMPLOYEE_PER_YEAR = 1;
// Mid-point of 2026 voluntary carbon market pricing for standard nature-based
// offsets (€8–30/tonne range), converted to GBP. Source 8.
const CARBON_OFFSET_GBP_PER_TONNE = 15;
// ONS Annual Survey of Hours and Earnings, April 2025 — UK median full-time
// gross hourly wage (excludes employer on-costs like NI/pension, so this is
// a conservative floor, not a "fully loaded" cost). Source 9.
const MEDIAN_HOURLY_WAGE_GBP = 19.67;
// Average email size including attachments — commonly cited ~75KB for the
// message body; this errs conservative by not inflating for attachments,
// since attachment-heavy mail is the minority of volume. Source 10.
const AVG_EMAIL_SIZE_KB = 75;
const EMAILS_PER_GB = (1024 * 1024) / AVG_EMAIL_SIZE_KB;
// Matches the per-deleted-email time assumption already used on MailBroom's
// own Dashboard (app/(app)/dashboard/page.tsx's Time Saved tile).
const SECONDS_SAVED_PER_EMAIL = 8;

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

    // Proportional to how much of the excess-above-threshold was removed, not
    // a binary "did it cross below 10GB" — see the constant's comment above.
    const perfExcessBefore = Math.max(0, avg - PERFORMANCE_THRESHOLD_GB);
    const perfExcessAfter = Math.max(0, reducedAvg - PERFORMANCE_THRESHOLD_GB);
    const perfReliefRatio = perfExcessBefore > 0 ? (perfExcessBefore - perfExcessAfter) / perfExcessBefore : 0;
    const itTimeSavedGBPPerYear = emp * TICKETS_PER_OVER_THRESHOLD_EMPLOYEE_PER_YEAR * IT_TICKET_COST_GBP * perfReliefRatio;
    const itTimeSavedGBPPerMonth = itTimeSavedGBPPerYear / 12;

    // Employee's own time saved not manually triaging/deleting — one-off value
    // of clearing the existing backlog, not a recurring monthly figure (you
    // don't re-clear the same backlog every month).
    const emailsFreed = storageFreedGB * EMAILS_PER_GB;
    const hoursSaved = (emailsFreed * SECONDS_SAVED_PER_EMAIL) / 3600;
    const hoursSavedValueGBP = hoursSaved * MEDIAN_HOURLY_WAGE_GBP;

    // True only when cleanup brought every mailbox back under quota with room
    // to spare — i.e. there's truly no overage story left, not just "small."
    const noOverageEitherWay = overageCostBefore === 0 && overageCostAfter === 0;

    const plan = planFor(emp);
    const netMonthly = plan.price !== null ? overageCostSaved + itTimeSavedGBPPerMonth - plan.price : null;
    // Only worth a highlighted "here's the number" callout when the recurring
    // monthly benefits alone cover the plan cost — a hard sell on a negative
    // number that's mostly "no overage to avoid here" isn't persuasive, it's
    // just discouraging. The one-off hours/CO2 value above still stands on
    // its own regardless.
    const hasRecurringNetGain = netMonthly !== null && netMonthly > 0;

    // Year one is different from "every month after": the employee-hours
    // value is real but one-off (clearing today's backlog), so it only
    // belongs in a year-1 comparison, spread against a full year of
    // subscription cost — not folded into the ongoing monthly figure above,
    // which would overstate every subsequent year.
    const annualPlanCost = plan.price !== null ? plan.price * 12 : null;
    const annualRecurringGain = (overageCostSaved + itTimeSavedGBPPerMonth) * 12;
    const netYearOne = annualPlanCost !== null ? annualRecurringGain + hoursSavedValueGBP - annualPlanCost : null;
    const hasYearOneGain = netYearOne !== null && netYearOne > 0;

    return {
      storageFreedGB, co2SavedKg, co2OffsetValueGBP, overageCostSaved,
      itTimeSavedGBPPerMonth, hoursSaved, hoursSavedValueGBP,
      noOverageEitherWay, plan, netMonthly, hasRecurringNetGain,
      annualPlanCost, netYearOne, hasYearOneGain,
    };
  }, [employees, avgMailboxGB]);

  return (
    <div className="card-glass rounded-3xl p-8 md:p-10">
      <div className="grid md:grid-cols-2 gap-8 mb-10">
        <div>
          <label htmlFor="employees" className="block text-xs font-semibold uppercase tracking-widest text-cloud mb-2">
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
          <label htmlFor="avgMailbox" className="block text-xs font-semibold uppercase tracking-widest text-cloud mb-2">
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

      <p className="text-center text-xs text-cloud mb-8">
        Assuming MailBroom reduces the average mailbox by 50% — a typical outcome once
        newsletters, notifications, and old attachments are cleared out.
      </p>

      {/* Headline figure — always the most complete, most favorable honest
          number: net year-one value when it beats a full year's subscription,
          or the tangible one-off value on its own when it doesn't (never
          framed as "beats the subscription" unless it actually does). */}
      <div className="text-center mb-10">
        <div className="text-5xl md:text-6xl font-black gold-text">
          {result.hasYearOneGain
            ? `+${formatGBP(Math.round(result.netYearOne!))}`
            : formatGBP(Math.round(result.hoursSavedValueGBP + result.co2OffsetValueGBP))}
        </div>
        <div className="text-xs font-semibold uppercase tracking-widest text-cloud mt-3">
          {result.hasYearOneGain ? "Net value in year one" : "Tangible value from clearing today's backlog"}
        </div>
      </div>

      <p className="text-center text-xs font-semibold uppercase tracking-widest text-cloud mb-4">One-off, from clearing today&apos;s backlog</p>
      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        <div className="text-center">
          <div className="text-3xl font-black gold-text">{Math.round(result.storageFreedGB).toLocaleString("en-GB")} GB</div>
          <div className="text-xs text-cloud mt-1">storage freed</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black gold-text">{Math.round(result.co2SavedKg).toLocaleString("en-GB")} kg</div>
          <div className="text-xs text-cloud mt-1">CO₂ saved · ~{formatGBP(Math.round(result.co2OffsetValueGBP))} in offsets<sup>8</sup></div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black gold-text">{Math.round(result.hoursSaved).toLocaleString("en-GB")} hrs</div>
          <div className="text-xs text-cloud mt-1">
            employee time saved · ~{formatGBP(Math.round(result.hoursSavedValueGBP))} at median UK wage<sup>9</sup>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-cloud -mt-4 mb-8 max-w-xl mx-auto leading-relaxed">
        That&apos;s the one-off effort of clearing the backlog itself — it doesn&apos;t count the
        ongoing time back every time someone actually needs to find an email afterwards. Searching
        a mailbox with a few hundred relevant messages left in it is faster than searching one
        still carrying years of newsletters and notifications, every single time it happens — not
        priced above, since there&apos;s no reliable published rate for it, but real all the same.
      </p>

      {result.noOverageEitherWay && (
        <div className="rounded-2xl border border-gold/20 bg-gold/5 p-5 text-center mb-6">
          <p className="text-sm text-cloud leading-relaxed">
            At {Math.round(avgMailboxGB)}GB, these mailboxes sit inside Microsoft&apos;s 100GB
            quota already — so there&apos;s no overage fee to avoid here. That&apos;s not the
            same as &ldquo;nothing to gain&rdquo;: Outlook itself starts showing sync pauses
            around 10GB regardless of your storage quota<sup>6</sup>, which is why the IT-time
            figure above still counts for real, and the hours and CO₂ figures above hold
            regardless of quota — plus cleanup still buys headroom before these mailboxes grow
            into the next quota ceiling.
          </p>
        </div>
      )}

      <p className="text-center text-xs font-semibold uppercase tracking-widest text-cloud mb-4">{result.plan.label} plan</p>
      {result.plan.price !== null ? (
        <>
          <div className="grid sm:grid-cols-2 gap-6 mb-4">
            <div className="text-center">
              <div className="text-3xl font-black text-cloud">{formatGBP(result.plan.price)}/mo</div>
              <div className="text-xs text-cloud mt-1">{formatGBP(result.annualPlanCost!)}/year subscription</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black gold-text">
                {result.hasYearOneGain ? `+${formatGBP(Math.round(result.netYearOne!))}` : formatGBP(Math.round(Math.abs(result.netYearOne!)))}
              </div>
              <div className="text-xs text-cloud mt-1">
                {result.hasYearOneGain ? "net value in year one" : "short of covering year one"}
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-cloud mb-8 max-w-2xl mx-auto leading-relaxed">
            {result.hasYearOneGain ? (
              <>
                {result.hasRecurringNetGain
                  ? <>Storage overage avoided and IT time saved alone already cover the subscription, at <strong className="text-cloud">+{formatGBP(Math.round(result.netMonthly!))}/month</strong>. </>
                  : <>The recurring monthly figures alone don&apos;t cover the subscription, but the one-off hours your team gets back from clearing today&apos;s backlog do. </>
                }
                Before counting CO₂ value or compliance risk. From year two on, without a new
                backlog to clear, that comparison rests on the recurring figures alone
                {result.hasRecurringNetGain ? <> — still <strong className="text-cloud">+{formatGBP(Math.round(result.netMonthly! * 12))}/year</strong>.</> : "."}
              </>
            ) : (
              <>At this mailbox size, neither the recurring monthly figures nor the one-off hours
              value fully cover the subscription in year one — the case here is the storage,
              CO₂, and hours value shown above, plus keeping ahead of the next quota ceiling as
              mailboxes keep growing.</>
            )}
          </p>
        </>
      ) : (
        <p className="text-center text-sm text-cloud mb-8">Contact sales for pricing at this scale.</p>
      )}

      <p className="text-center text-xs text-cloud max-w-2xl mx-auto leading-relaxed">
        Recurring every month after: <strong className="text-cloud">{formatGBP(result.overageCostSaved)}/mo</strong>{" "}
        storage overage avoided, <strong className="text-cloud">{formatGBP(Math.round(result.itTimeSavedGBPPerMonth))}/mo</strong>{" "}
        IT time saved.
      </p>

      <p className="text-center text-xs text-cloud mt-6 max-w-2xl mx-auto leading-relaxed">
        Storage freed, CO₂, and overage figures are calculated directly from the sourced rates
        above. IT time saved uses a published average ticket cost<sup>7</sup> applied to a
        conservative, clearly-labelled assumption (one avoidable ticket per year, scaled by how
        much of a mailbox&apos;s excess above Microsoft&apos;s documented performance
        threshold<sup>6</sup> was actually removed) — not a published statistic itself. Employee
        time saved assumes {SECONDS_SAVED_PER_EMAIL}s per email cleared (the same rate used on
        MailBroom&apos;s own Dashboard) and an average email size of {AVG_EMAIL_SIZE_KB}KB<sup>10</sup>,
        valued at the ONS median UK full-time hourly wage<sup>9</sup>. Everything here is
        illustrative, not a quote.
      </p>
    </div>
  );
}

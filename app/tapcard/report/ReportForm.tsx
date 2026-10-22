"use client";

import { useState } from "react";

const REASONS: [string, string][] = [
  ["fake_business", "This isn't the real business"],
  ["scam_offer", "A fake or misleading offer"],
  ["offensive", "Offensive or inappropriate"],
  ["wrong_details", "Wrong details"],
  ["other", "Something else"],
];

export default function ReportForm({ card }: { card: string }) {
  const [reason, setReason] = useState("fake_business");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const res = await fetch("/api/tapcard/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card, reason, details }) }).catch(() => null);
    setState(res?.ok ? "done" : "error");
  }

  if (state === "done") return <p className="mt-6 rounded-xl bg-green-600 px-4 py-3 font-semibold">Thank you. We have your report and will look at it.</p>;
  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm text-white/80">What is wrong?</legend>
        {REASONS.map(([v, label]) => (
          <label key={v} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
            <input type="radio" name="reason" value={v} checked={reason === v} onChange={() => setReason(v)} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <label className="block text-sm text-white/80" htmlFor="details">Anything else we should know (optional)</label>
      <textarea id="details" value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={1000} className="w-full rounded-xl bg-white px-4 py-3 text-[#111318]" />
      {state === "error" ? <p className="text-sm">Couldn&apos;t send that. Check the connection and try again.</p> : null}
      <button type="submit" disabled={state === "busy"} className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-[#111318] disabled:opacity-50">Send report</button>
    </form>
  );
}

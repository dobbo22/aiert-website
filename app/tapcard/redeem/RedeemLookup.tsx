"use client";

import { useState } from "react";
import RedeemForm from "../o/[code]/RedeemForm";

interface Status { state: string; offerText?: string; cardName?: string; redeemedAt?: string | null }

const MESSAGES: Record<string, string> = {
  used: "Already used",
  expired: "This offer has ended",
  replaced: "This offer has been replaced",
  unknown: "Code not recognised. Check it and try again.",
};

export default function RedeemLookup() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setBusy(true);
    setStatus(null);
    const res = await fetch(`/api/tapcard/offer-code/${clean}`, { cache: "no-store" }).catch(() => null);
    setBusy(false);
    setStatus(res && res.ok ? await res.json() : { state: "unknown" });
  }

  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (
    <>
      <h1 className="text-xl font-bold">Redeem an offer</h1>
      {status?.state === "valid" ? (
        <>
          {status.cardName ? <p className="mt-3 text-sm text-white/80">{status.cardName}</p> : null}
          <p className="mt-1 text-lg font-bold">{status.offerText}</p>
          <RedeemForm code={clean} />
          <button type="button" onClick={() => { setStatus(null); setCode(""); }} className="mt-4 text-sm underline">Another code</button>
        </>
      ) : (
        <form onSubmit={check}>
          <label className="mt-5 block text-sm text-white/80" htmlFor="code">Code under the customer&apos;s QR code</label>
          <input
            id="code"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={14}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-2 w-full rounded-xl bg-white px-4 py-3 text-center text-xl font-mono tracking-widest text-[#111318]"
          />
          {status ? (
            <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 font-semibold">
              {MESSAGES[status.state] ?? "Not valid"}
              {status.state === "used" && status.redeemedAt ? ` on ${new Date(status.redeemedAt).toLocaleString("en-GB", { timeZone: "Europe/London" })}` : ""}
            </p>
          ) : null}
          <button type="submit" disabled={clean.length < 10 || busy} className="mt-4 w-full rounded-xl bg-white px-4 py-3 font-semibold text-[#111318] disabled:opacity-50">
            Check code
          </button>
        </form>
      )}
    </>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";

// A business's current offer on its public card page, so anyone who scans its QR code can claim it with nothing to install.
// A one-off offer gives a one-time QR code; a stamp card gives a card that fills up as staff scan it. After claiming, people
// are invited to get TapCard to hear about the next offers. The claim is the same one the apps make, so claiming twice from
// the same phone gives the same code, and a returning visitor sees their card again.
function claimant(): string {
  try {
    const k = "tapcard.claimant";
    let v = localStorage.getItem(k);
    if (!v || v.length < 16) { v = crypto.randomUUID() + crypto.randomUUID(); localStorage.setItem(k, v); }
    return v;
  } catch {
    return crypto.randomUUID() + crypto.randomUUID();
  }
}

function count(step: string) {
  try {
    void fetch("/api/tapcard/funnel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step, platform: "other", route: "" }), keepalive: true });
  } catch { /* counting must never get in the way */ }
}

interface Status {
  state: string; kind?: "once" | "stamps"; stamps?: number; stampsRequired?: number; rewardText?: string; rewardsGiven?: number;
  nextStampAt?: string | null; rewardReady?: boolean;
}

export default function ClaimOfferWeb({ cardId, business, offerText, expiresAt, getAppHref, kind, stampsRequired, rewardText }: {
  cardId: string; business: string; offerText: string; expiresAt: string | null; getAppHref: string;
  kind: "once" | "stamps"; stampsRequired?: number; rewardText?: string;
}) {
  const storeKey = `tapcard.claim.${cardId}`;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claim, setClaim] = useState<{ code: string; qr: string } | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  const load = useCallback(async (code: string) => {
    const res = await fetch(`/api/tapcard/offer-code/${code}`, { cache: "no-store" }).catch(() => null);
    if (res?.ok) setStatus((await res.json()) as Status);
  }, []);

  async function show(code: string, url: string) {
    setClaim({ code, qr: await QRCode.toDataURL(url, { margin: 1, width: 320 }) });
    await load(code);
  }

  // A returning visitor sees their card again.
  useEffect(() => {
    let code: string | null = null;
    try { code = localStorage.getItem(storeKey); } catch { /* none */ }
    if (code && /^[A-Z0-9]{10}$/.test(code)) void show(code, `https://tapcard.aiert.co.uk/o/${code}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A stamp card updates by itself when the staff stamp it.
  useEffect(() => {
    if (!claim || kind !== "stamps") return;
    const t = setInterval(() => { if (!document.hidden) void load(claim.code); }, 5000);
    return () => clearInterval(t);
  }, [claim, kind, load]);

  async function claimIt() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/tapcard/cards/${cardId}/offer/claim`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claimant: claimant() }),
      });
      const data = (await res.json().catch(() => ({}))) as { code?: string; url?: string; error?: string };
      if (res.ok && data.code && data.url) {
        try { localStorage.setItem(storeKey, data.code); } catch { /* fine */ }
        await show(data.code, data.url);
        count("web_offer_claimed");
      } else {
        setError(res.status === 409 ? "Sorry, this offer has all been claimed." : "This offer isn't available any more.");
      }
    } catch {
      setError("Couldn't claim it. Check your connection and try again.");
    }
    setBusy(false);
  }

  const isStamps = kind === "stamps";
  const required = status?.stampsRequired ?? stampsRequired ?? 0;
  const stamps = status?.stamps ?? 0;
  const reward = status?.rewardText ?? rewardText ?? "";
  const finished = status && status.state !== "valid" && status.state !== "unknown" ? status.state : null;

  return (
    <div className="mt-5 rounded-2xl p-4 text-center" style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)", color: "#111318" }}>
      <p className="text-xs font-extrabold uppercase tracking-wider">{isStamps ? "Stamp card" : "Special offer"}</p>
      <p className="mt-1 text-xl font-extrabold leading-snug">{offerText}</p>
      {isStamps && !claim && <p className="mt-1 text-sm font-semibold">Collect {required} stamps, then {reward}</p>}
      {expiresAt && <p className="mt-1 text-sm font-semibold">Ends {new Date(expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>}
      {claim && finished ? (
        <p className="mt-3 rounded-xl bg-[#111318] px-3 py-3 text-sm font-semibold text-white">
          {finished === "used" ? "This code has been used." : finished === "expired" ? "This offer has ended." : "This offer has been replaced."}
        </p>
      ) : claim ? (
        <div className="mt-3">
          {isStamps && (
            <>
              <div className="flex flex-wrap justify-center gap-2" aria-label={`${stamps} of ${required} stamps`}>
                {Array.from({ length: required }, (_, i) => (
                  <span key={i} className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold ${i < stamps ? "bg-[#111318] text-[#FBBF24]" : "bg-white/40"}`}>{i < stamps ? "✓" : i + 1}</span>
                ))}
              </div>
              <p className="mt-2 text-sm font-bold">
                {status?.rewardReady ? `Full! Show this to claim: ${reward}` : `${stamps} of ${required}. ${required - stamps} more for: ${reward}`}
              </p>
              {(status?.rewardsGiven ?? 0) > 0 && <p className="text-xs font-semibold">Rewards earned so far: {status?.rewardsGiven}</p>}
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={claim.qr} alt={isStamps ? "Your stamp card code" : "Your one-off offer code"} className="mx-auto mt-3 h-48 w-48 rounded-xl bg-white p-2" />
          <p className="mt-2 text-sm font-bold">{isStamps ? "Show this to the staff at each visit." : "Show this to the staff. It works once."}</p>
          <p className="font-mono text-xs">{claim.code}</p>
          <div className="mt-4 rounded-xl bg-[#111318] p-3 text-white">
            <p className="text-sm font-semibold">
              {isStamps ? `Keep your stamp card on your phone and be told about new offers. Get TapCard to follow ${business}.` : `Want more offers like this? Get TapCard to follow ${business} and be notified of new offers and news.`}
            </p>
            <a href={getAppHref} onClick={() => count("web_get_app_tapped")} className="mt-3 inline-block w-full rounded-xl bg-white px-4 py-3 font-bold text-[#111318]">
              Get the TapCard app
            </a>
          </div>
        </div>
      ) : (
        <>
          <button type="button" disabled={busy} onClick={claimIt} className="mt-3 w-full rounded-xl bg-[#111318] px-4 py-3 text-base font-bold text-white disabled:opacity-60">
            {busy ? "Getting it…" : isStamps ? "Get my stamp card" : "Claim this offer"}
          </button>
          {error && <p className="mt-2 text-sm font-semibold">{error}</p>}
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import QRCode from "qrcode";

// A business's current offer on its public card page, so anyone who scans its QR code can claim it with nothing to install.
// After claiming they are invited to get TapCard to hear about the next offers. The claim is the same one the apps make, so
// claiming twice from the same phone gives the same code.
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

export default function ClaimOfferWeb({ cardId, business, offerText, expiresAt, getAppHref }: {
  cardId: string; business: string; offerText: string; expiresAt: string | null; getAppHref: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claim, setClaim] = useState<{ code: string; qr: string } | null>(null);

  async function claimIt() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/tapcard/cards/${cardId}/offer/claim`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ claimant: claimant() }),
      });
      const data = (await res.json().catch(() => ({}))) as { code?: string; url?: string; error?: string };
      if (res.ok && data.code && data.url) {
        setClaim({ code: data.code, qr: await QRCode.toDataURL(data.url, { margin: 1, width: 320 }) });
        count("web_offer_claimed");
      } else {
        setError(res.status === 409 ? "Sorry, this offer has all been claimed." : "This offer isn't available any more.");
      }
    } catch {
      setError("Couldn't claim it. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-5 rounded-2xl p-4 text-center" style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)", color: "#111318" }}>
      <p className="text-xs font-extrabold uppercase tracking-wider">Special offer</p>
      <p className="mt-1 text-xl font-extrabold leading-snug">{offerText}</p>
      {expiresAt && <p className="mt-1 text-sm font-semibold">Ends {new Date(expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>}
      {claim ? (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={claim.qr} alt="Your one-off offer code" className="mx-auto h-48 w-48 rounded-xl bg-white p-2" />
          <p className="mt-2 text-sm font-bold">Show this to the staff. It works once.</p>
          <p className="font-mono text-xs">{claim.code}</p>
          <div className="mt-4 rounded-xl bg-[#111318] p-3 text-white">
            <p className="text-sm font-semibold">Want more offers like this? Get TapCard to follow {business} and be notified of new offers and news.</p>
            <a href={getAppHref} onClick={() => count("web_get_app_tapped")} className="mt-3 inline-block w-full rounded-xl bg-white px-4 py-3 font-bold text-[#111318]">
              Get the TapCard app
            </a>
          </div>
        </div>
      ) : (
        <>
          <button type="button" disabled={busy} onClick={claimIt} className="mt-3 w-full rounded-xl bg-[#111318] px-4 py-3 text-base font-bold text-white disabled:opacity-60">
            {busy ? "Claiming…" : "Claim this offer"}
          </button>
          {error && <p className="mt-2 text-sm font-semibold">{error}</p>}
        </>
      )}
    </div>
  );
}

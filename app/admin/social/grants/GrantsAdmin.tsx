"use client";

import { useState } from "react";

const field: React.CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.25)", background: "#fff", color: "#111318", width: "100%" };
const btn: React.CSSProperties = { padding: "8px 14px", borderRadius: 8, fontWeight: 600, background: "#FBBF24", color: "#111318", border: "none", cursor: "pointer" };
const ghost: React.CSSProperties = { ...btn, background: "rgba(255,255,255,.12)", color: "inherit" };

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/tapcard/grants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, data: (await res.json().catch(() => ({}))) as { error?: string; until?: string } };
}

export function GrantForm({ initialCard = "", initialReason = "", initialCharity = "", requestId }: { initialCard?: string; initialReason?: string; initialCharity?: string; requestId?: number }) {
  const [card, setCard] = useState(initialCard);
  const [months, setMonths] = useState("12");
  const [reason, setReason] = useState(initialReason);
  const [charity, setCharity] = useState(initialCharity);
  const [msg, setMsg] = useState<string | null>(null);
  const [check, setCheck] = useState<string | null>(null);

  async function lookup() {
    setCheck("Checking...");
    const res = await fetch(`/api/admin/tapcard/grants?charity=${encodeURIComponent(charity)}`).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    if (d.ok) setCheck(`${d.name}: ${d.registered ? "registered" : "NOT registered" + (d.removedOn ? ` (removed ${d.removedOn})` : "")}${d.web ? `, website ${d.web}` : ", no website listed"}`);
    else setCheck(d.error === "not_configured" ? "The register check is not switched on yet (needs CHARITY_COMMISSION_API_KEY)." : d.error === "not_found" ? "Not on the England and Wales register." : d.error === "bad_number" ? "A charity number is 5 to 8 digits." : "Couldn't reach the register.");
  }

  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 560 }}>
      <label>Card link or id<input style={field} value={card} onChange={(e) => setCard(e.target.value)} placeholder="https://tapcard.aiert.co.uk/c/..." /></label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 }}>
        <label>Reason<input style={field} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Registered charity / small society / early business" /></label>
        <label>Months<input style={field} value={months} onChange={(e) => setMonths(e.target.value.replace(/\D/g, ""))} /></label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
        <label>Charity number (optional)<input style={field} value={charity} onChange={(e) => setCharity(e.target.value)} /></label>
        <button type="button" style={ghost} onClick={lookup}>Check register</button>
      </div>
      {check && <p style={{ fontSize: 14 }}>{check}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" style={btn} onClick={async () => {
          const r = await post({ action: "grant", card, months: Number(months) || 12, reason: reason || "Granted by admin", charityNumber: charity, requestId });
          if (r.ok) { setMsg(`Granted until ${new Date(r.data.until ?? "").toLocaleDateString("en-GB")}`); setTimeout(() => window.location.reload(), 800); } else setMsg(r.data.error ?? "Failed");
        }}>Grant Promote</button>
        {requestId ? (
          <button type="button" style={ghost} onClick={async () => {
            const note = window.prompt("Optional short reason to include in the email (leave blank for none):");
            if (note === null) return;
            const r = await post({ action: "decline", requestId, note });
            if (r.ok) window.location.reload(); else setMsg(r.data.error ?? "Failed");
          }}>Decline</button>
        ) : null}
      </div>
      {msg && <p style={{ fontSize: 14, fontWeight: 600 }}>{msg}</p>}
    </div>
  );
}

export function RevokeButton({ cardId }: { cardId: string }) {
  return (
    <button type="button" style={ghost} onClick={async () => {
      if (!window.confirm("Remove this complimentary Promote now?")) return;
      const r = await post({ action: "revoke", card: cardId });
      if (r.ok) window.location.reload();
    }}>Revoke</button>
  );
}

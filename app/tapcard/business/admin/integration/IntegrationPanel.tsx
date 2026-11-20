"use client";

import { useState } from "react";
import type { DeliveryLogRow, KeyRow } from "@/lib/tapcardMemberLinks";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : "never");
type State = { log?: DeliveryLogRow[]; keys?: KeyRow[]; webhookUrl?: string; secret?: string; key?: string; test?: { ok: boolean; status: number | null; error: string }; error?: string };

export default function IntegrationPanel(props: { webhookUrl: string; counts: { linked: number; events: number; undelivered: number }; log: DeliveryLogRow[]; keys: KeyRow[] }) {
  const [url, setUrl] = useState(props.webhookUrl);
  const [log, setLog] = useState(props.log);
  const [keys, setKeys] = useState(props.keys);
  const [secret, setSecret] = useState("");
  const [fresh, setFresh] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const btn = "rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-cloud ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-50";
  const box = "rounded-2xl bg-charcoal p-6 ring-1 ring-white/10";

  async function post(body: Record<string, unknown>): Promise<State | null> {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/tapcard/biz/member-links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = (res ? await res.json().catch(() => ({})) : {}) as State;
    setBusy(false);
    if (!res?.ok) { setMsg({ ok: false, text: d.error ?? "Couldn't do that. Try again." }); return null; }
    if (d.log) setLog(d.log);
    if (d.keys) setKeys(d.keys);
    if (d.webhookUrl !== undefined) setUrl(d.webhookUrl);
    return d;
  }

  return (
    <>
      <div className={box}>
        <p className="text-cloud"><span className="font-semibold">{props.counts.linked}</span> members linked · <span className="font-semibold">{props.counts.events}</span> events recorded · <span className="font-semibold">{props.counts.undelivered}</span> waiting to be collected or sent</p>
      </div>

      <div className={box}>
        <h3 className="text-lg font-bold text-cloud">Send events to your system</h3>
        <p className="mt-1 text-cloud">An https address you run. Each event is a signed message: <code>{`{ id, event, token, card, group, at }`}</code>. Events are follow, unfollow, group_joined and offer_claimed. Leave it empty if you prefer to collect events with a key (below).</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block grow text-cloud">Address
            <input className="mt-1 block w-full rounded-lg bg-white px-3 py-2 text-[#111318] placeholder:text-[#4b5260]" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://members.example.com/tapcard-events" />
          </label>
          <button type="button" disabled={busy} className="btn-gold rounded-xl px-5 py-2 font-semibold disabled:opacity-50" onClick={async () => { const d = await post({ action: "set-webhook", url }); if (d) { if (d.secret) setSecret(d.secret); setMsg({ ok: true, text: url ? "Saved. Copy the signing secret below." : "Address removed." }); } }}>Save</button>
          <button type="button" disabled={busy || !url} className={btn} onClick={async () => { const d = await post({ action: "test" }); if (d?.test) setMsg({ ok: d.test.ok, text: d.test.ok ? `Test event delivered (your system answered ${d.test.status}).` : `Test failed: ${d.test.error}` }); }}>Send a test event</button>
        </div>
        <div className="mt-4 text-cloud">
          <p className="font-semibold">Signing secret</p>
          <p className="text-sm">Check the <code>X-TapCard-Signature</code> header (<code>t=&lt;seconds&gt;,v1=&lt;HMAC-SHA256 of &quot;t.body&quot;&gt;</code>) and refuse anything more than five minutes old.</p>
          {secret ? <p className="mt-2 break-all rounded-lg bg-white/10 p-3">{secret}</p> : null}
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy} className={btn} onClick={async () => { const d = await post({ action: "show-secret" }); if (d?.secret) setSecret(d.secret); }}>Show secret</button>
            <button type="button" disabled={busy} className={btn} onClick={async () => { if (window.confirm("Make a new secret? The old one stops working at once.")) { const d = await post({ action: "rotate-secret" }); if (d?.secret) setSecret(d.secret); } }}>Rotate secret</button>
          </div>
        </div>
      </div>

      <div className={box}>
        <h3 className="text-lg font-bold text-cloud">Collect events with a key</h3>
        <p className="mt-1 text-cloud">Your system asks for events when it likes: <code>GET https://tapcard.aiert.co.uk/api/tapcard/member-events?after=&lt;last id&gt;</code> with <code>Authorization: Bearer &lt;key&gt;</code>. A key is shown once; you can have up to five and revoke any at once.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block text-cloud">Name (optional)
            <input className="mt-1 block rounded-lg bg-white px-3 py-2 text-[#111318] placeholder:text-[#4b5260]" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} placeholder="CRM sync" />
          </label>
          <button type="button" disabled={busy} className="btn-gold rounded-xl px-5 py-2 font-semibold disabled:opacity-50" onClick={async () => { const d = await post({ action: "create-key", label }); if (d?.key) { setFresh(d.key); setLabel(""); } }}>Make a key</button>
        </div>
        {fresh && (
          <div className="mt-4 rounded-xl bg-white/10 p-4 text-cloud" role="status">
            <p className="font-semibold">Copy this key now. It is shown only once.</p>
            <p className="mt-1 break-all">{fresh}</p>
          </div>
        )}
        {keys.length > 0 && (
          <ul className="mt-4 divide-y divide-white/10">
            {keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-cloud">
                <div>
                  <p className="font-semibold">{k.label || "Key"}{k.revokedAt ? " (revoked)" : ""}</p>
                  <p className="text-sm">Made {when(k.createdAt)} · last used {when(k.lastUsedAt)}</p>
                </div>
                {!k.revokedAt && <button type="button" disabled={busy} className={btn} onClick={() => { if (window.confirm("Revoke this key? It stops working at once.")) void post({ action: "revoke-key", id: k.id }); }}>Revoke</button>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={box}>
        <h3 className="text-lg font-bold text-cloud">Recent events</h3>
        <p className="mt-1 text-cloud">What was recorded and whether it reached your system. Tokens are not shown here. Events are deleted after 90 days.</p>
        {log.length === 0 ? <p className="mt-3 text-cloud">Nothing yet.</p> : (
          <ul className="mt-3 grid gap-1 text-sm text-cloud">
            {log.map((l) => <li key={l.id}>{when(l.at)} · {l.event} · {l.delivered ? "delivered" : l.waiting ? `waiting${l.attempts ? `, ${l.attempts} tries` : ""}` : "gave up"}{l.error ? ` (${l.error})` : ""}</li>)}
          </ul>
        )}
      </div>
      {msg && <p className={`rounded-lg px-3 py-2 text-cloud ${msg.ok ? "bg-white/10" : "bg-red-500/20"}`} role="status">{msg.ok ? "✓" : "✗"} {msg.text}</p>}
    </>
  );
}

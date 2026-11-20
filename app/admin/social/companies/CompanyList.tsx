"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Btn, Chip, call, input } from "./ui";
import { ChangeCompany, LifeToggle, ListedToggle, RemoveManager } from "./Tools";

export interface CompanyData {
  id: string; name: string; createdAt: string; listed: boolean; freeForLife: boolean; seatBand: string; locations: number; seatLimit: number;
  billingStatus: string; cards: number; supportUntil: string | null; supportOpen: boolean; people: { email: string; role: string; confirmed: boolean }[];
}

const fmt = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const planOf = (c: CompanyData) => (c.freeForLife ? "Free for life" : c.seatBand === "trial" ? "Free trial" : c.seatBand === "locations" ? `${c.locations} locations` : c.seatBand || "-");

/// One company: a single row when closed (name, status tags, buttons on the right); everything else is inside, shown by Manage.
function CompanyCard({ c, open, onToggle }: { c: CompanyData; open: boolean; onToggle: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; ok: boolean; link?: string } | null>(null);

  // Every button says what it is doing, and afterwards says what happened (or why it did not).
  async function run(label: string, body: Record<string, unknown>, done: (r: { url?: string }) => string, after?: () => void) {
    setBusy(label); setNote({ text: `${label}…`, ok: true });
    const r = await call({ ...body, orgId: c.id });
    setBusy(null);
    if (!r.ok) { setNote({ text: r.data.error ?? "That didn't work. Try again.", ok: false }); return; }
    if (r.data.url) window.open(r.data.url, "_blank", "noopener");
    setNote({ text: done(r.data), ok: true, link: r.data.url });
    after?.();
    router.refresh();
  }

  const sectionTitle = { fontWeight: 700, fontSize: 14, margin: "0 0 8px", color: "#f1f5f9" } as const;
  return (
    <article style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${open ? "rgba(245,196,81,.55)" : "rgba(255,255,255,.14)"}`, borderRadius: 12 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", minWidth: 0, flex: "1 1 360px" }}>
          <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`${open ? "Close" : "Open"} ${c.name || c.id}`}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 800, fontSize: 18, textAlign: "left", padding: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden="true" style={{ display: "inline-block", width: 14, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▸</span>
            {c.name || c.id}
          </button>
          <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {c.listed && <Chip tone="amber">Listed company</Chip>}
            <Chip tone="teal">{planOf(c)}</Chip>
            <Chip>{c.billingStatus}</Chip>
            <Chip tone={c.supportOpen ? "green" : "red"}>{c.supportOpen ? `Support access until ${fmt(c.supportUntil!)}` : "Support access not allowed"}</Chip>
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn tone="primary" disabled={!!busy || !c.supportOpen} title={c.supportOpen ? "" : "The company must allow support access first"}
            onClick={() => run("Open admin (support)", { action: "open" }, () => "Sign-in link ready (it works once and lasts 15 minutes).")}>{busy === "Open admin (support)" ? "Opening…" : "Open admin (support)"}</Btn>
          <Btn ariaExpanded={open} onClick={onToggle}>{open ? "Close ▴" : "Manage ▾"}</Btn>
        </div>
      </header>

      {note && (
        <p style={{ margin: "0 16px 12px", padding: "8px 12px", borderRadius: 8, fontSize: 14, background: note.ok ? "rgba(34,197,94,.18)" : "rgba(248,113,113,.2)", border: `1px solid ${note.ok ? "rgba(34,197,94,.5)" : "rgba(248,113,113,.6)"}` }} role="status">
          {note.ok && !busy ? "✓ " : note.ok ? "" : "✗ "}{note.text}
          {note.link && <> <a href={note.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", fontWeight: 700 }}>Open the company admin</a></>}
        </p>
      )}

      {/* Always in the page (so what you type is kept when you close it), only shown when open. */}
      <div hidden={!open} style={{ borderTop: "1px solid rgba(255,255,255,.14)", padding: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
          <section>
            <p style={sectionTitle}>Summary</p>
            <p style={{ margin: 0, fontSize: 14 }}>Created {fmt(c.createdAt)}</p>
            <p style={{ margin: "4px 0 12px", fontSize: 14 }}>Cards: {c.cards} of {c.seatLimit}</p>
            <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
              <LifeToggle orgId={c.id} on={c.freeForLife} />
              <ListedToggle orgId={c.id} on={c.listed} />
            </div>
          </section>
          <section>
            <p style={sectionTitle}>People</p>
            {c.people.length === 0 && <p style={{ margin: 0, fontSize: 14 }}>No one yet.</p>}
            {c.people.map((p) => (
              <div key={p.email} style={{ fontSize: 14, margin: "0 0 8px" }}>
                {p.email} <span style={{ fontWeight: 700 }}>({p.role === "manager" ? "manager" : "admin"}{p.confirmed ? "" : ", not signed in yet"})</span>
                {p.role === "manager" && c.supportOpen ? <RemoveManager orgId={c.id} email={p.email} /> : null}
              </div>
            ))}
          </section>
        </div>
        <div style={{ marginTop: 20 }}>
          <p style={sectionTitle}>Change this company</p>
          {c.supportOpen ? <ChangeCompany orgId={c.id} locations={c.locations || 3} busy={busy} run={run} /> : <p style={{ margin: 0, fontSize: 14 }}>The company must allow support access before you can open or change it.</p>}
        </div>
      </div>
    </article>
  );
}

export default function CompanyList({ companies, error }: { companies: CompanyData[]; error: string }) {
  const [q, setQ] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const shown = useMemo(() => {
    const w = q.toLowerCase().trim();
    return w ? companies.filter((c) => `${c.name} ${c.people.map((p) => p.email).join(" ")}`.toLowerCase().includes(w)) : companies;
  }, [companies, q]);
  const toggle = (id: string) => setOpenIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <input style={{ ...input, width: 260 }} placeholder="Find a company or an email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a company" />
        <Btn small onClick={() => setOpenIds(new Set(shown.map((c) => c.id)))}>Open all</Btn>
        <Btn small onClick={() => setOpenIds(new Set())}>Close all</Btn>
        <span style={{ fontSize: 14 }}>{shown.length} of {companies.length}</span>
      </div>
      {error && <p style={{ color: "#fca5a5", fontSize: 14 }}>Couldn&apos;t load the companies: {error}</p>}
      <div style={{ display: "grid", gap: 10 }}>
        {shown.map((c) => <CompanyCard key={c.id} c={c} open={openIds.has(c.id)} onToggle={() => toggle(c.id)} />)}
        {shown.length === 0 && <p style={{ fontSize: 14 }}>No company matches that.</p>}
      </div>
    </div>
  );
}

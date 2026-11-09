import { isAdminRequest } from "@/lib/adminRequest";
import { allBusinesses, applyFilters, parseFilters, COFFEE_WORDS, SIGNUP_LABEL, type BizRow, type SignupType } from "@/lib/businessUsers";

export const metadata = { title: "Businesses — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const cell: React.CSSProperties = { padding: "6px 10px", textAlign: "right", whiteSpace: "nowrap" };
const left: React.CSSProperties = { ...cell, textAlign: "left", whiteSpace: "normal" };
const row: React.CSSProperties = { borderTop: "1px solid rgba(255,255,255,.1)" };

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; little?: string; email?: string; notest?: string; app?: string; all?: string }> }) {
  // The login screen comes from the layout, but the page's data must not be fetched, or sent in the page source, for anyone else.
  if (!(await isAdminRequest())) return null;
  const f = parseFilters(await searchParams);
  let all: BizRow[] = [];
  let personal = 0;
  let error: string | null = null;
  try {
    const d = await allBusinesses();
    all = d.rows;
    personal = d.personalCards;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load businesses";
  }
  const rows = applyFilters(all, f);
  const pool = all.filter((r) => f.all || !r.isPersonal);
  const counts = (Object.keys(SIGNUP_LABEL) as SignupType[]).map((t) => [t, pool.filter((r) => r.signup === t).length] as const);
  const qs = (extra: Record<string, string>) => new URLSearchParams({ ...(f.q ? { q: f.q } : {}), ...(f.type ? { type: f.type } : {}), ...(f.little ? { little: "1" } : {}), ...(f.email ? { email: f.email } : {}), ...(f.notest ? { notest: "1" } : {}), ...(f.app ? { app: "1" } : {}), ...(f.all ? { all: "1" } : {}), ...extra }).toString();
  const csv = `/api/admin/social/businesses?${qs({})}`;

  return (
    <div className="text-cloud">
      {error && <p className="social-compose-error">{error}</p>}
      <p style={{ marginBottom: "1rem" }}>
        Every card, and how it signed up. <strong>{all.length - personal}</strong> business cards and {personal} personal cards ({f.all ? "personal cards included" : "personal cards hidden: tick Include personal cards to see them"}).
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        {counts.map(([t, n]) => (
          <a key={t} href={`?${qs({ type: t })}`} style={{ border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, padding: "10px 16px", minWidth: 190, textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{n}</div>
            <div style={{ fontSize: ".82rem" }}>{SIGNUP_LABEL[t]}</div>
          </a>
        ))}
      </div>

      <form method="get" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <input name="q" defaultValue={f.q} placeholder="Name contains (comma separated)" style={{ minWidth: 280, background: "rgba(255,255,255,.05)", border: "1px solid rgba(148,163,184,.4)", borderRadius: 6, color: "inherit", padding: "6px 10px" }} />
        <select name="type" defaultValue={f.type} style={{ background: "#0f172a", border: "1px solid rgba(148,163,184,.4)", borderRadius: 6, color: "inherit", padding: "6px 10px" }}>
          <option value="">All sign-up types</option>
          {(Object.keys(SIGNUP_LABEL) as SignupType[]).map((t) => <option key={t} value={t}>{SIGNUP_LABEL[t]}</option>)}
        </select>
        <select name="email" defaultValue={f.email} style={{ background: "#0f172a", border: "1px solid rgba(148,163,184,.4)", borderRadius: 6, color: "inherit", padding: "6px 10px" }}>
          <option value="">Any email status</option>
          <option value="own">Own-domain email only (not Gmail etc.)</option>
          <option value="free">Free-mail only</option>
          <option value="any">Has any email</option>
          <option value="none">No email</option>
        </select>
        <label><input type="checkbox" name="notest" value="1" defaultChecked={f.notest} /> Hide test cards and our own</label>
        <label><input type="checkbox" name="app" value="1" defaultChecked={f.app} /> Made in the app</label>
        <label><input type="checkbox" name="all" value="1" defaultChecked={f.all} /> Include personal cards</label>
        <label><input type="checkbox" name="little" value="1" defaultChecked={f.little} /> Little used (no offers, under 5 followers)</label>
        <button type="submit" className="social-post-btn">Filter</button>
        <a className="underline" href="?">Clear</a>
      </form>
      <p style={{ marginBottom: 12 }}>
        Quick filters: <a className="underline" href={`?${new URLSearchParams({ q: COFFEE_WORDS.join(","), little: "1" })}`}>Coffee houses, little used</a> ·{" "}
        <a className="underline" href={`?${new URLSearchParams({ q: COFFEE_WORDS.join(",") })}`}>Coffee houses, all</a> ·{" "}
        <a className="underline" href={`?${new URLSearchParams({ email: "own", notest: "1", app: "1", all: "1" })}`}>Real app users with an own-domain email</a> ·{" "}
        <a className="underline" href={csv}>Download this list as CSV</a>
      </p>

      <p style={{ marginBottom: 8 }}>Showing <strong>{rows.length}</strong> of {pool.length}.</p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr><th style={left}>Business</th><th style={left}>Contact</th><th style={left}>Signed up as</th><th style={cell}>Created</th><th style={cell}>Views</th><th style={cell}>Followers</th><th style={cell}>Offers</th><th style={cell}>News</th><th style={cell}>Claimed</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={row}>
                <td style={left}><a className="underline" href={`https://tapcard.aiert.co.uk/c/${r.id}`} target="_blank" rel="noreferrer">{r.company || r.name || r.id}</a>{r.company && r.name ? <div style={{ fontSize: ".78rem", opacity: 0.7 }}>{r.name}</div> : null}</td>
                <td style={left}>{r.email || <span style={{ opacity: 0.5 }}>no email</span>}{r.email ? <div style={{ fontSize: ".74rem", opacity: 0.7 }}>{r.emailKind === "own" ? (r.emailOnSite ? "own domain, matches website" : "own domain") : "free mail"}{r.looksTest ? " · test or our own" : ""}</div> : r.looksTest ? <div style={{ fontSize: ".74rem", opacity: 0.7 }}>looks like a test card</div> : null}</td>
                <td style={left}><strong>{r.isPersonal && r.signup === "free" ? "Personal card" : SIGNUP_LABEL[r.signup]}</strong>{r.fromApp ? <span style={{ opacity: 0.7 }}> · app</span> : <span style={{ opacity: 0.7 }}> · web</span>}{r.detail ? <div style={{ fontSize: ".78rem", opacity: 0.75 }}>{r.detail}</div> : null}</td>
                <td style={cell}>{r.created_at.slice(0, 10)}</td><td style={cell}>{r.views}</td><td style={cell}>{r.followers}</td><td style={cell}>{r.offers}</td><td style={cell}>{r.news}</td><td style={cell}>{r.claims}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !error && <p style={{ marginTop: 12 }}>No businesses match.</p>}
      </div>
    </div>
  );
}

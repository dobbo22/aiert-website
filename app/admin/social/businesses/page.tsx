import { isAdminRequest } from "@/lib/adminRequest";
import { allBusinesses, applyFilters, parseFilters, COFFEE_WORDS, SIGNUP_LABEL, type BizRow, type SignupType } from "@/lib/businessUsers";

export const metadata = { title: "Businesses — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// A number that is zero fades back, so the cards that have followers, offers or claims stand out.
const Num = ({ n }: { n: number }) => <td className={`biz-num${n ? "" : " biz-zero"}`}>{n}</td>;

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
      <p className="biz-summary">
        Every card, and how it signed up. <strong>{all.length - personal}</strong> business cards and <strong>{personal}</strong> personal cards
        {" "}({f.all ? "personal cards included" : "personal cards hidden: switch on Include personal cards to see them"}).
      </p>

      <div className="biz-tiles">
        {counts.map(([t, n]) => (
          <a key={t} href={f.type === t ? `?${qs({ type: "" })}` : `?${qs({ type: t })}`} className={`biz-tile biz-tile-${t}${f.type === t ? " biz-tile-active" : ""}`} aria-current={f.type === t ? "true" : undefined} title={f.type === t ? "Showing only this type. Click to show every type again." : "Click to show only this type"}>
            <div className="biz-tile-n">{n}</div>
            <div className="biz-tile-l">{SIGNUP_LABEL[t]}</div>
          </a>
        ))}
      </div>

      <form method="get" className="biz-panel">
        <div className="biz-fields">
          <input name="q" defaultValue={f.q} placeholder="Search by name (separate several with commas)" aria-label="Name contains" className="biz-input" />
          <select name="type" defaultValue={f.type} aria-label="Sign-up type" className="biz-select">
            <option value="">All sign-up types</option>
            {(Object.keys(SIGNUP_LABEL) as SignupType[]).map((t) => <option key={t} value={t}>{SIGNUP_LABEL[t]}</option>)}
          </select>
          <select name="email" defaultValue={f.email} aria-label="Email status" className="biz-select">
            <option value="">Any email status</option>
            <option value="own">Own-domain email only (not Gmail etc.)</option>
            <option value="free">Free-mail only</option>
            <option value="any">Has any email</option>
            <option value="none">No email</option>
          </select>
        </div>
        <div className="biz-chips">
          <label className="biz-chip"><input type="checkbox" name="notest" value="1" defaultChecked={f.notest} /><span>Hide test cards and our own</span></label>
          <label className="biz-chip"><input type="checkbox" name="app" value="1" defaultChecked={f.app} /><span>Made in the app</span></label>
          <label className="biz-chip"><input type="checkbox" name="all" value="1" defaultChecked={f.all} /><span>Include personal cards</span></label>
          <label className="biz-chip"><input type="checkbox" name="little" value="1" defaultChecked={f.little} /><span>Little used (no offers, under 5 followers)</span></label>
        </div>
        <div className="biz-buttons">
          <button type="submit" className="biz-btn biz-btn-primary">Apply filters</button>
          <a className="biz-btn biz-btn-ghost" href="?">Clear all</a>
        </div>
      </form>

      <div className="biz-toolbar">
        <div className="biz-quick">
          <span className="biz-quick-label">Quick filters</span>
          <a className="biz-pill" href={`?${new URLSearchParams({ q: COFFEE_WORDS.join(","), little: "1" })}`}>Coffee houses, little used</a>
          <a className="biz-pill" href={`?${new URLSearchParams({ q: COFFEE_WORDS.join(",") })}`}>Coffee houses, all</a>
          <a className="biz-pill" href={`?${new URLSearchParams({ email: "own", notest: "1", app: "1", all: "1" })}`}>Real app users with an own-domain email</a>
        </div>
        <div className="biz-actions">
          <a className="biz-btn" href={csv}>↓ Download as CSV</a>
          <a className="biz-btn" href="/admin/social/businesses/email">✉ Preview the &ldquo;finish your card&rdquo; email</a>
        </div>
      </div>

      <p className="biz-count">Showing <strong>{rows.length}</strong> of {pool.length}</p>
      <div className="biz-scroll">
        <table className="biz-table">
          <thead>
            <tr>
              <th>Business</th><th>Contact</th><th>Signed up as</th><th className="biz-num">Created</th>
              <th className="biz-num">Views</th><th className="biz-num">Followers</th><th className="biz-num">Offers</th><th className="biz-num">News</th><th className="biz-num">Claimed</th><th><span className="sr-only">Card</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="biz-name">{r.company || r.name || r.id}</div>
                  {r.company && r.name ? <div className="biz-sub">{r.name}</div> : null}
                </td>
                <td>
                  {r.email ? (
                    <>
                      <div>{r.email}</div>
                      <div className="biz-tags">
                        {r.emailKind === "own" ? <span className="biz-tag biz-tag-good">{r.emailOnSite ? "own domain, matches website" : "own domain"}</span> : <span className="biz-tag biz-tag-warn">free mail</span>}
                        {r.looksTest ? <span className="biz-tag">test or our own</span> : null}
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="biz-none">no email</span>
                      {r.looksTest ? <div className="biz-tags"><span className="biz-tag">looks like a test card</span></div> : null}
                    </>
                  )}
                </td>
                <td>
                  <span className={`biz-badge biz-badge-${r.signup}`}>{r.isPersonal && r.signup === "free" ? "Personal card" : SIGNUP_LABEL[r.signup]}</span>
                  <div className="biz-tags"><span className="biz-tag">{r.fromApp ? "made in the app" : "made on the web"}</span></div>
                  {r.detail ? <div className="biz-sub">{r.detail}</div> : null}
                </td>
                <td className="biz-num">{r.created_at.slice(0, 10)}</td>
                <Num n={r.views} /><Num n={r.followers} /><Num n={r.offers} /><Num n={r.news} /><Num n={r.claims} />
                <td><a className="biz-btn biz-btn-sm" href={`https://tapcard.aiert.co.uk/c/${r.id}?preview=1`} target="_blank" rel="noreferrer">Open card ↗</a></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !error && <p className="biz-empty">No cards match these filters. Try <a className="underline" href="?">clearing them</a>.</p>}
      </div>
    </div>
  );
}

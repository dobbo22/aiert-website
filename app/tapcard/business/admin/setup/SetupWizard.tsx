"use client";

import { useState } from "react";
import HelpDot from "../HelpDot";

interface Admin { email: string; senior: boolean }
interface Props {
  cardId: string; company: string; me: string; meSenior: boolean; admins: Admin[]; approval: boolean; pageUrl: string; privacyUrl: string;
  groups: { slug: string; label: string }[]; adviser: { name: string; status: "approved" | "pending" } | null; hasTeamCards: boolean; hasPosted: boolean;
}

const card = "rounded-2xl bg-charcoal p-6 ring-1 ring-white/10";
const input = "mt-1 w-full rounded-lg bg-white px-3 py-2 text-[#111318] placeholder:text-[#4b5260]";
const quiet = "rounded-xl px-4 py-2 font-semibold text-cloud ring-1 ring-slate disabled:opacity-60";
const gold = "btn-gold rounded-xl px-5 py-2 font-semibold disabled:opacity-60";

async function post(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const data = (res ? await res.json().catch(() => ({})) : {}) as { error?: string; found?: number; groups?: { slug: string; label: string }[] };
  return { ok: !!res?.ok, data };
}

export default function SetupWizard(p: Props) {
  const [step, setStep] = useState(0);
  const [admins, setAdmins] = useState<Admin[]>(p.admins);
  const [approval, setApproval] = useState(p.approval);
  const [pageUrl, setPageUrl] = useState(p.pageUrl);
  const [savedPage, setSavedPage] = useState(!!p.pageUrl);
  const [privacyUrl, setPrivacyUrl] = useState(p.privacyUrl);
  const [savedPrivacy, setSavedPrivacy] = useState(!!p.privacyUrl);
  const [groups, setGroups] = useState(p.groups);
  const [wantsGroups, setWantsGroups] = useState<boolean | null>(p.groups.length > 0 ? true : null);
  const [wantsAdviser, setWantsAdviser] = useState<boolean | null>(p.adviser ? true : null);
  const [newEmail, setNewEmail] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const seniors = admins.filter((a) => a.senior).length;
  const say = (ok: boolean, text: string) => setMsg({ ok, text });
  const promote = (body: Record<string, unknown>) => post("/api/tapcard/biz/promote", { cardId: p.cardId, ...body });

  async function setSenior(email: string, on: boolean) {
    setBusy(true); setMsg(null);
    const r = await promote({ action: "setSenior", email, on });
    setBusy(false);
    if (!r.ok) return say(false, r.data.error ?? "Couldn't change that.");
    setAdmins((a) => a.map((x) => (x.email === email ? { ...x, senior: on } : x)));
    if (!on && seniors - 1 < 2 && approval) setApproval(false);
  }
  async function addAdmin() {
    setBusy(true); setMsg(null);
    const r = await post("/api/tapcard/biz/admins", { email: newEmail });
    setBusy(false);
    if (!r.ok) return say(false, r.data.error ?? "Couldn't add that person.");
    setAdmins((a) => [...a, { email: newEmail.trim().toLowerCase(), senior: false }]);
    setNewEmail(""); say(true, "Added. They have a sign-in link by email, and start as a general admin.");
  }
  async function chooseApproval(on: boolean) {
    setBusy(true); setMsg(null);
    const r = await promote({ action: "setApproval", on });
    setBusy(false);
    if (!r.ok) return say(false, r.data.error ?? "Couldn't change that.");
    setApproval(on); say(true, on ? "Second approval is on." : "Second approval is off.");
  }
  async function savePage() {
    setBusy(true); setMsg(null);
    const r = await post("/api/tapcard/biz/ir-feed", { cardId: p.cardId, action: "save", pageUrl });
    setBusy(false);
    if (!r.ok) return say(false, r.data.error ?? "We couldn't read that page.");
    setSavedPage(true); say(true, `Watching it. ${r.data.found ?? 0} announcements found; they are marked Earlier. New ones will be offered as headlines.`);
  }
  async function savePrivacy() {
    setBusy(true); setMsg(null);
    const r = await post("/api/tapcard/biz/privacy", { url: privacyUrl });
    setBusy(false);
    if (!r.ok) return say(false, r.data.error ?? "Please give a full address starting with https://");
    setSavedPrivacy(true); say(true, "Saved. The app shows it next to the form where a shareholder shares their details.");
  }
  async function addGroup() {
    setBusy(true); setMsg(null);
    const r = await promote({ action: "addGroup", name: newGroup });
    setBusy(false);
    if (!r.ok) return say(false, r.data.error ?? "Couldn't add that group.");
    setGroups((r.data.groups ?? []).map((g) => ({ slug: g.slug, label: g.label }))); setNewGroup(""); say(true, "Group added.");
  }

  const senior = p.meSenior;
  const needSenior = (text: string) => !senior && <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-cloud">{text} Ask a senior admin to do this step; you can still read it.</p>;
  const adviserMail = `mailto:enquiries@aiert.co.uk?subject=${encodeURIComponent(`Please set up our adviser for ${p.company}`)}&body=${encodeURIComponent(`We would like our IR adviser to work with ${p.company} on TapCard.\n\nAdviser firm:\nStaff who need access (name and work email, and who is senior):\n\nThank you`)}`;

  const steps: { id: string; title: string; done: boolean; body: React.ReactNode }[] = [
    {
      id: "team", title: "Who can release regulatory news?", done: admins.length >= 2 && seniors >= 1,
      body: (
        <>
          <p className="text-cloud">A <strong>senior admin</strong> can post and withdraw regulatory (RNS) headlines, approve other people&apos;s, and change these settings. Choose the people who could release an RNS anyway, usually the CEO, CFO and company secretary: two or three. Everyone else is a <strong>general admin</strong>: they can post events and webcasts, run groups and cards.</p>
          <ul className="mt-3 divide-y divide-white/10">
            {admins.map((a) => (
              <li key={a.email} className="flex flex-wrap items-center justify-between gap-3 py-2 text-cloud">
                <span>{a.email}{a.email === p.me.toLowerCase() ? " (you)" : ""} <span className="text-sm">· {a.senior ? "senior" : "general"}</span></span>
                {senior && <button type="button" disabled={busy} className={quiet} onClick={() => void setSenior(a.email, !a.senior)}>{a.senior ? "Make general" : "Make senior"}</button>}
              </li>
            ))}
          </ul>
          {senior && admins.length < 5 && (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="block text-cloud">Add an admin (their work email)<input className={input} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="cfo@yourcompany.com" /></label>
              <button type="button" disabled={busy || !newEmail.includes("@")} className={gold} onClick={() => void addAdmin()}>Add and email a sign-in link</button>
            </div>
          )}
          <p className="mt-3 text-sm text-cloud">A company can have up to five admins. Each person has their own login, so the audit trail shows who did what.</p>
          {needSenior("Only senior admins can change who is senior.")}
        </>
      ),
    },
    {
      id: "approval", title: "Do you want a second person to approve regulatory headlines?", done: approval || seniors < 2,
      body: (
        <>
          <p className="text-cloud">With <strong>second approval</strong>, one admin writes a regulatory headline and a <em>different</em> senior admin approves it before anything is sent. It is a second pair of eyes, and the audit trail records both people. It needs at least two senior admins.</p>
          <p className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-cloud">{seniors < 2 ? "You have one senior admin, so second approval can't work yet. Go back and make a second person senior to use it." : "You have enough senior admins. Most companies with two or more seniors switch it on."}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" disabled={busy || !senior || seniors < 2 || approval} className={approval ? quiet : gold} onClick={() => void chooseApproval(true)}>{approval ? "On" : "Yes, switch it on"}</button>
            <button type="button" disabled={busy || !senior || !approval} className={quiet} onClick={() => void chooseApproval(false)}>{approval ? "No, switch it off" : "Off"}</button>
          </div>
          {needSenior("Only senior admins can change second approval.")}
        </>
      ),
    },
    {
      id: "page", title: "Where do your announcements appear?", done: savedPage,
      body: (
        <>
          <p className="text-cloud">Give us the web address of the page on <strong>your own website</strong> that lists your RNS announcements. TapCard watches it: new items become one-tap headlines, and a regulatory headline is checked against it before it goes. We only read the page and never copy the announcements.</p>
          <label className="mt-3 block text-cloud">Announcements page<input className={input} value={pageUrl} onChange={(e) => { setPageUrl(e.target.value); setSavedPage(false); }} inputMode="url" placeholder="https://www.yourcompany.com/investors/rns" /></label>
          <button type="button" disabled={busy || pageUrl.trim().length < 8} className={`${gold} mt-3`} onClick={() => void savePage()}>{savedPage ? "Saved" : "Start watching this page"}</button>
        </>
      ),
    },
    {
      id: "adviser", title: "Do you work with an IR adviser or broker?", done: wantsAdviser === false || !!p.adviser,
      body: (
        <>
          <p className="text-cloud">An adviser can write general headlines and manage groups for you, and, only if you allow it, post regulatory news. Nothing is allowed until you approve it. You can only have one adviser at a time, you stay the owner of your data, and you can remove them at any moment.</p>
          {p.adviser ? (
            <p className="mt-3 rounded-lg bg-teal/20 px-3 py-2 text-cloud">{p.adviser.name} is {p.adviser.status === "approved" ? "approved" : "waiting for you to decide"}. Manage it on <a className="text-gold underline" href="/business/admin/news?tab=people#advisers">News &amp; RNS, People &amp; advisers</a>.</p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" className={wantsAdviser === true ? gold : quiet} onClick={() => setWantsAdviser(true)}>Yes</button>
                <button type="button" className={wantsAdviser === false ? gold : quiet} onClick={() => setWantsAdviser(false)}>No</button>
              </div>
              {wantsAdviser === true && (
                <ol className="ml-5 mt-3 space-y-1.5 text-cloud [&>li]:list-decimal!">
                  <li>AIERT sets your adviser&apos;s firm up and adds its staff. <a className="text-gold underline" href={adviserMail}>Email AIERT</a> the firm&apos;s name and who needs access.</li>
                  <li>The adviser asks for access from its portal (<span className="whitespace-nowrap">tapcard.aiert.co.uk/business/adviser</span>). Your senior admins get an email.</li>
                  <li>You approve it here, choose who pays and whether it may post regulatory news.</li>
                </ol>
              )}
              {wantsAdviser === false && <p className="mt-3 text-cloud">No problem. You can bring one in later from News &amp; RNS, People &amp; advisers.</p>}
            </>
          )}
        </>
      ),
    },
    {
      id: "audiences", title: "Do you want to message different shareholders separately?", done: wantsGroups === false || groups.length > 0,
      body: (
        <>
          <p className="text-cloud">Groups let you send a headline to one audience, such as <em>#group name</em>. Each group has its own link and QR code. A group is only a label on someone who follows: we don&apos;t ask for or keep a name or email for it.</p>
          <p className="mt-2 rounded-lg bg-gold/15 px-3 py-2 text-cloud ring-1 ring-gold/40"><strong>Groups take effect with the next TapCard app update.</strong> You can set them up now.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className={wantsGroups === true ? gold : quiet} onClick={() => setWantsGroups(true)}>Yes</button>
            <button type="button" className={wantsGroups === false ? gold : quiet} onClick={() => setWantsGroups(false)}>Not now</button>
          </div>
          {wantsGroups === true && (
            <div className="mt-3">
              {groups.length > 0 && <ul className="mb-2 text-cloud">{groups.map((g) => <li key={g.slug} className="ml-5 list-disc">#{g.label}</li>)}</ul>}
              <div className="flex flex-wrap items-end gap-3">
                <label className="block text-cloud">New group<input className={input} value={newGroup} maxLength={40} onChange={(e) => setNewGroup(e.target.value)} placeholder="#group name" /></label>
                <button type="button" disabled={busy || newGroup.replace(/#/g, "").trim().length < 1} className={gold} onClick={() => void addGroup()}>Add group</button>
              </div>
              <p className="mt-2 text-sm text-cloud">Links and QR codes for each group are on News &amp; RNS, Audiences.</p>
            </div>
          )}
        </>
      ),
    },
    {
      id: "privacy", title: "Link your privacy notice", done: savedPrivacy,
      body: (
        <>
          <p className="text-cloud">When a shareholder chooses to share their name and email, the app shows <strong>your</strong> privacy notice next to the form. You decide how their details are used, and you are responsible for that, so add the link to your own notice.</p>
          <label className="mt-3 block text-cloud">Privacy notice address<input className={input} value={privacyUrl} onChange={(e) => { setPrivacyUrl(e.target.value); setSavedPrivacy(false); }} inputMode="url" placeholder="https://www.yourcompany.com/privacy" /></label>
          <button type="button" disabled={busy || privacyUrl.trim().length < 12} className={`${gold} mt-3`} onClick={() => void savePrivacy()}>{savedPrivacy ? "Saved" : "Save"}</button>
        </>
      ),
    },
    {
      id: "finish", title: "All set: what next?", done: false,
      body: (
        <>
          <ul className="space-y-1 text-cloud">
            <li>{admins.length >= 2 && seniors >= 1 ? "✓" : "○"} Admins and seniors ({seniors} senior of {admins.length})</li>
            <li>{approval ? "✓" : "○"} Second approval {approval ? "on" : "off"}</li>
            <li>{savedPage ? "✓" : "○"} Announcements page watched</li>
            <li>{p.adviser ? "✓" : "○"} Adviser {p.adviser ? p.adviser.name : "none"}</li>
            <li>{groups.length ? "✓" : "○"} Groups ({groups.length})</li>
            <li>{savedPrivacy ? "✓" : "○"} Privacy notice linked</li>
          </ul>
          <p className="mt-4 text-cloud">Still to do on your own screens:</p>
          <ul className="mt-1 space-y-1.5 text-cloud">
            {!p.hasTeamCards && <li><a className="text-gold underline" href="/business/admin/cards?tab=team">Add the people who speak for the company</a>: chair, CEO, CFO, IR contact.</li>}
            <li><a className="text-gold underline" href="/business/admin/cards">Download your QR code</a> and put it on results slides, the annual report and the AGM notice.</li>
            <li>Follow your own card from your phone and post a harmless general headline to check it arrives. See it recorded in the <a className="text-gold underline" href="/business/admin/news?tab=audit">audit trail</a>.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="/business/admin" className="btn-gold rounded-xl px-5 py-2 font-semibold">Go to the Overview</a>
            <a href="/business/investor-guide/setup" className="rounded-xl px-5 py-2 font-semibold text-cloud ring-1 ring-slate">Read the setup guide</a>
          </div>
        </>
      ),
    },
  ];
  const cur = steps[step];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-teal">Guided setup</p>
        <h2 className="mt-1 text-2xl font-black text-cloud">Set up TapCard for {p.company}</h2>
        <p className="mt-1 text-cloud">A few questions, and we apply your answers. Everything can be changed later, and you can come back here any time.</p>
      </div>
      <ol className="flex flex-wrap gap-2" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s.id}>
            <button type="button" onClick={() => { setStep(i); setMsg(null); }} aria-current={i === step ? "step" : undefined}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ring-1 ${i === step ? "bg-gold text-black ring-gold" : s.done ? "bg-teal/20 text-cloud ring-teal/50" : "bg-white/[0.06] text-cloud ring-white/15"}`}>
              {s.done && i !== steps.length - 1 ? "✓ " : `${i + 1}. `}{s.title.replace(/\?$/, "").slice(0, 28)}{s.title.length > 29 ? "…" : ""}
            </button>
          </li>
        ))}
      </ol>
      <div className={card}>
        <p className="text-sm text-cloud">Step {step + 1} of {steps.length}</p>
        <h3 className="mt-1 text-xl font-bold text-cloud">{cur.title}<HelpDot setupAnchor={["roles", "roles", "steps", "advisers", "steps", "steps", "steps"][step]} label="More about this step in the setup guide" /></h3>
        <div className="mt-3">{cur.body}</div>
        {msg && <p className={`mt-4 rounded-lg px-3 py-2 text-cloud ${msg.ok ? "bg-teal/20" : "bg-red-500/20"}`} role="status">{msg.ok ? "✓ " : "✗ "}{msg.text}</p>}
        <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-4">
          <button type="button" className={quiet} disabled={step === 0} onClick={() => { setStep(step - 1); setMsg(null); }}>Back</button>
          {step < steps.length - 1 && <button type="button" className={cur.done ? gold : quiet} onClick={() => { setStep(step + 1); setMsg(null); }}>{cur.done ? "Next" : "Skip for now"}</button>}
        </div>
      </div>
    </div>
  );
}

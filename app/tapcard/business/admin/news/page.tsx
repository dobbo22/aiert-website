import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg, isOrgActive } from "@/lib/tapcardBiz";
import { listedSummary } from "@/lib/tapcardListedAdmin";
import { listFeedRows, syncFeed } from "@/lib/tapcardIrFeed";
import sql from "@/lib/db";
import { listGroupsWithCounts } from "@/lib/tapcardGroups";
import { approvalRequired, isSenior, listAudit, pendingDrafts, seniorAdmins } from "@/lib/tapcardNewsPolicy";
import PostHeadline from "./PostHeadline";
import NewsGovernance from "./NewsGovernance";
import NewsTabs from "./NewsTabs";
import { linksForOrg } from "@/lib/tapcardAdvisers";
import { adviserCoverActive, coverInfoForOrg } from "@/lib/tapcardAdviserBilling";

export const dynamic = "force-dynamic";

// A listed company posts a headline after its RNS: one line and a link, from the web, or one tap from its own announcements page. Admins only.
export default async function BizNewsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  const s = await listedSummary(org.id);
  const card = s.cards.find((c) => c.id === s.primaryCardId) ?? s.cards[0];
  if (!card) return <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">There is no company card yet. Ask AIERT to set it up.</p>;

  // The announcements page: what the company saved, or a suggestion from its card (a link called RNS or announcements, else its website).
  const cfg = await syncFeed(card.id).catch(() => null);
  const rows = cfg ? await listFeedRows(card.id).catch(() => []) : [];
  const cardRow = ((await sql`SELECT website, links FROM tapcard_cards WHERE id = ${card.id}`) as { website: string; links: string | null }[])[0];
  let suggested = cardRow?.website ?? "";
  try {
    const links = JSON.parse(cardRow?.links || "[]") as { label?: string; value?: string }[];
    suggested = links.find((l) => /announcement|rns|regulatory|news/i.test(l.label ?? "") && /^https:\/\//.test(l.value ?? ""))?.value ?? suggested;
  } catch { /* keep the website */ }

  const groups = await listGroupsWithCounts(card.id).catch(() => []);

  const meSenior = await isSenior(org.id, session.email, session.support === true).catch(() => false);
  const [approval, admins, drafts, audit, advisers] = await Promise.all([approvalRequired(org.id), seniorAdmins(org.id), pendingDrafts(org.id), listAudit(org.id, 50), linksForOrg(org.id)]).catch(() => [false, [], [], [], []] as const);

  const TABS = ["post", "audiences", "approvals", "people", "audit"] as const;
  const tab = (TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as (typeof TABS)[number]) : "post";
  const waiting = (drafts as { createdBy: string }[]).filter((d) => d.createdBy !== session.email.toLowerCase()).length;
  const asked = (advisers as { status: string }[]).filter((a) => a.status === "pending").length;
  const base = "/business/admin/news";
  const governance = (section: "approvals" | "people" | "audit") => (
    <NewsGovernance section={section} cardId={card.id} me={session.email} meSenior={meSenior} approval={approval as boolean} admins={admins as never} drafts={drafts as never} audit={audit as never} advisers={advisers as never} cover={coverInfo} />
  );
  const coverInfo = await coverInfoForOrg(org.id).catch(() => []);
  const coveredNow = await adviserCoverActive(org.id);
  const post = (part: "post" | "groups") => (
    <PostHeadline part={part} cardId={card.id} cardName={card.company || card.name} active={isOrgActive(org) || coveredNow} latest={s.latestNews?.text ?? null} followers={s.canBeNotified} groups={groups} meSenior={meSenior} approval={approval as boolean}
      feed={{ pageUrl: cfg?.pageUrl ?? null, lastCheckedAt: cfg?.lastCheckedAt ?? null, suggested, lastError: cfg?.lastError ?? "", rows }} />
  );

  return (
    <div className="space-y-6">
      {tab !== "approvals" && meSenior && waiting > 0 && (
        <a href={`${base}?tab=approvals`} className="block rounded-xl bg-gold/15 px-4 py-3 font-semibold text-cloud ring-1 ring-gold/50 no-underline">
          {waiting} {waiting === 1 ? "headline is" : "headlines are"} waiting for your approval. Review {waiting === 1 ? "it" : "them"} →
        </a>
      )}
      {tab !== "people" && meSenior && asked > 0 && (
        <a href={`${base}?tab=people#advisers`} className="block rounded-xl bg-gold/15 px-4 py-3 font-semibold text-cloud ring-1 ring-gold/50 no-underline">
          {asked} {asked === 1 ? "adviser has" : "advisers have"} asked to work with you. Decide →
        </a>
      )}
      <NewsTabs base={base} active={tab} tabs={[
        { id: "post", label: "Post" }, { id: "audiences", label: "Audiences" }, { id: "approvals", label: "Approvals", badge: waiting || undefined },
        { id: "people", label: "People & advisers", badge: asked || undefined }, { id: "audit", label: "Audit trail" },
      ]} />
      {tab === "post" && post("post")}
      {tab === "audiences" && post("groups")}
      {tab === "approvals" && governance("approvals")}
      {tab === "people" && governance("people")}
      {tab === "audit" && governance("audit")}
    </div>
  );
}

import { notFound } from "next/navigation";
import { approvedLink, requireAdviser } from "@/lib/tapcardAdvisers";
import { getOrg, isOrgActive } from "@/lib/tapcardBiz";
import { listedSummary } from "@/lib/tapcardListedAdmin";
import { listFeedRows, getFeedConfig } from "@/lib/tapcardIrFeed";
import { adviserCoverActive } from "@/lib/tapcardAdviserBilling";
import { listGroupsWithCounts } from "@/lib/tapcardGroups";
import { approvalRequired, pendingDrafts } from "@/lib/tapcardNewsPolicy";
import PostHeadline from "../../admin/news/PostHeadline";
import NewsGovernance from "../../admin/news/NewsGovernance";

export const dynamic = "force-dynamic";

// One company's headlines, as its approved adviser sees them: write and send headlines, manage groups, and (only if the company allowed
// regulatory news for this adviser and this person is senior) post or approve regulatory ones. No billing, no admins, no audit trail.
export default async function AdviserClientPage({ params }: { params: Promise<{ orgId: string }> }) {
  const me = await requireAdviser();
  if (!me) return null;
  const { orgId } = await params;
  const link = await approvedLink(me.adviserId, orgId);
  if (!link) notFound();
  const org = await getOrg(orgId);
  if (!org) notFound();
  const s = await listedSummary(orgId);
  const card = s.cards.find((c) => c.id === s.primaryCardId) ?? s.cards[0];
  if (!card) return <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">{org.name} has no company card yet.</p>;

  const cfg = await getFeedConfig(card.id).catch(() => null);
  const rows = cfg ? await listFeedRows(card.id).catch(() => []) : [];
  const [groups, approval, drafts] = await Promise.all([listGroupsWithCounts(card.id).catch(() => []), approvalRequired(orgId), pendingDrafts(orgId)]);
  const mayRegulatory = me.senior && link.canRegulatory;

  return (
    <div className="space-y-6">
      <p><a className="text-gold underline" href="/business/adviser">← All companies</a></p>
      <h2 className="text-xl font-black text-cloud">{org.name}</h2>
      <p className="rounded-xl bg-white/10 px-4 py-2 text-cloud">
        {link.canRegulatory
          ? (me.senior ? "You may post and approve regulatory news for this company." : "This company allows regulatory news for your firm, but only senior staff can post it. You can write general headlines.")
          : "This company has approved you for general headlines and groups. Regulatory news is posted by the company."}
      </p>
      <PostHeadline cardId={card.id} cardName={card.company || card.name} active={isOrgActive(org) || (await adviserCoverActive(orgId))} latest={s.latestNews?.text ?? null} followers={s.canBeNotified} groups={groups} meSenior={mayRegulatory} approval={approval} adviserOrgId={orgId}
        feed={{ pageUrl: cfg?.pageUrl ?? null, lastCheckedAt: cfg?.lastCheckedAt ?? null, suggested: "", lastError: cfg?.lastError ?? "", rows }} />
      <NewsGovernance cardId={card.id} me={me.email} meSenior={mayRegulatory} approval={approval} admins={[]} drafts={(mayRegulatory ? drafts : drafts.filter((d) => d.createdBy === me.email)) as never} audit={[]} adviserOrgId={orgId} />
    </div>
  );
}

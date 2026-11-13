import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg, isOrgActive } from "@/lib/tapcardBiz";
import { listedSummary } from "@/lib/tapcardListedAdmin";
import PostHeadline from "./PostHeadline";

export const dynamic = "force-dynamic";

// A listed company posts a headline after its RNS: one line and a link, from the web. Admins only.
export default async function BizNewsPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  const s = await listedSummary(org.id);
  const card = s.cards.find((c) => c.id === s.primaryCardId) ?? s.cards[0];
  if (!card) return <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">There is no company card yet. Ask AIERT to set it up.</p>;
  return (
    <PostHeadline cardId={card.id} cardName={card.company || card.name} active={isOrgActive(org)} latest={s.latestNews?.text ?? null} followers={s.canBeNotified} />
  );
}

import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg, isOrgActive } from "@/lib/tapcardBiz";
import { listedSummary } from "@/lib/tapcardListedAdmin";
import { listFeedRows, syncFeed } from "@/lib/tapcardIrFeed";
import sql from "@/lib/db";
import PostHeadline from "./PostHeadline";

export const dynamic = "force-dynamic";

// A listed company posts a headline after its RNS: one line and a link, from the web, or one tap from its own announcements page. Admins only.
export default async function BizNewsPage() {
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

  return (
    <PostHeadline cardId={card.id} cardName={card.company || card.name} active={isOrgActive(org)} latest={s.latestNews?.text ?? null} followers={s.canBeNotified}
      feed={{ pageUrl: cfg?.pageUrl ?? null, suggested, lastError: cfg?.lastError ?? "", rows }} />
  );
}

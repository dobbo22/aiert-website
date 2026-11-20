import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg, isOrgActive, listOrgCards } from "@/lib/tapcardBiz";
import { listGroupsWithCounts } from "@/lib/tapcardGroups";
import { adviserCoverActive } from "@/lib/tapcardAdviserBilling";
import GroupsPanel from "../news/GroupsPanel";

export const dynamic = "force-dynamic";

// Audiences for a TapCard for Business company: a group for each place, team or customer list (the four Chelsea lounges, say), each with its
// own QR code. Someone who follows through a group's QR joins that group, and the admin sees how many are in each. Admins only.
export default async function BizAudiencesPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  const active = isOrgActive(org) || (await adviserCoverActive(org.id).catch(() => false));
  const cards = await listOrgCards(org.id);
  const shopCards = cards.filter((c) => c.card_kind === "business");
  const staff = cards.filter((c) => c.card_kind !== "business");
  const withGroups = async (list: typeof cards) => Promise.all(list.map(async (c) => ({ c, groups: await listGroupsWithCounts(c.id).catch(() => []) })));
  const [shops, people] = await Promise.all([withGroups(shopCards), withGroups(staff)]);
  const nameOf = (c: (typeof cards)[number]) => c.name || c.title || "Card";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-cloud">Audiences</h2>
        <p className="mt-1 text-cloud">Make a group for each place or audience you want to count separately, such as each lounge, event or team. Each group gets its own QR code to print or send. When someone follows through it, they join that group.</p>
      </div>
      {!active && (
        <p className="rounded-xl bg-white/10 px-4 py-3 text-cloud">Your company&apos;s billing isn&apos;t active, so groups can&apos;t be changed right now. <a className="text-gold underline" href="/business/admin/billing">Billing</a></p>
      )}
      {cards.length === 0 && <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">There are no cards in this company yet. Groups belong to a card, so add a card first (Locations or Employees).</p>}
      {shops.map(({ c, groups }) => (
        <GroupsPanel key={c.id} cardId={c.id} initial={groups} business={{ cardName: nameOf(c), captionName: org.name }} />
      ))}
      {people.length > 0 && shops.length === 0 && (
        // No shop cards: the people's own cards are the only ones, so show them straight away.
        people.map(({ c, groups }) => <GroupsPanel key={c.id} cardId={c.id} initial={groups} business={{ cardName: nameOf(c), captionName: org.name }} />)
      )}
      {people.length > 0 && shops.length > 0 && (
        <details className="rounded-2xl bg-charcoal p-4 ring-1 ring-white/10">
          <summary className="cursor-pointer font-semibold text-cloud">Staff cards ({people.length}): groups on a person&apos;s own card</summary>
          <div className="mt-4 space-y-6">
            {people.map(({ c, groups }) => (
              <GroupsPanel key={c.id} cardId={c.id} initial={groups} business={{ cardName: nameOf(c), captionName: org.name }} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

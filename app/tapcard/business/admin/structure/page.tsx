import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg, listOrgCards } from "@/lib/tapcardBiz";
import { listUnits, rolledUpFollowers, unitOfCards } from "@/lib/tapcardUnits";
import StructurePanel from "./StructurePanel";

export const dynamic = "force-dynamic";

// The company tree: senior management above lounges or venues. Admins only.
export default async function BizStructurePage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  const [units, cardOf, followers, cards] = await Promise.all([listUnits(org.id), unitOfCards(org.id), rolledUpFollowers(org.id), listOrgCards(org.id)]);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-cloud">Structure</h2>
        <p className="mt-1 text-cloud">Build your company as a tree: senior management at the top, then regions, venues or lounges. Each group has one owner card. An owner can post offers and news, and manage audiences, for every location in their group and in the groups below it. When someone changes role, give the group a new owner: the cards, followers and QR codes stay where they are.</p>
      </div>
      <StructurePanel
        initial={{ units, cards: cardOf, followers }}
        companyCards={cards.map((c) => ({ id: c.id, name: c.name || c.title || "Card", location: c.card_kind === "business" }))}
      />
    </div>
  );
}

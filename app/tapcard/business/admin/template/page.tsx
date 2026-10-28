import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import TemplateForm from "./TemplateForm";
import { listLocations } from "@/lib/tapcardBizLocations";
import { parseStoredLinks } from "@/lib/tapcardLinks";

export default async function BizTemplatePage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;

  const locations = await listLocations(org.id).catch(() => []);
  const allowed = org.seat_band === "locations" ? Math.max(org.locations, 1) : 1;
  const shops = locations.map((l) => ({ key: l.id, id: l.id, name: l.name, address: l.address, phone: l.phone, email: l.email, website: l.website, hours: "", links: parseStoredLinks(l.links), claimed: !!l.claimed_card_id, cardId: l.claimed_card_id }));
  return <TemplateForm org={org} shops={shops} allowed={allowed} />;
}

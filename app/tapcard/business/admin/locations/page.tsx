import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import { listLocations } from "@/lib/tapcardBizLocations";
import LocationsManager from "./LocationsManager";

export const metadata = { title: "Locations — TapCard for Business", robots: { index: false, follow: false } };

export default async function BizLocationsPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  const locations = await listLocations(session.orgId);
  const allowed = org.seat_band === "locations" ? Math.max(org.locations, 1) : 1;
  return (
    <LocationsManager
      allowed={allowed}
      orgName={org.name}
      initial={locations.map((l) => ({ id: l.id, name: l.name, address: l.address, phone: l.phone, claimed: !!l.claimed_card_id }))}
    />
  );
}

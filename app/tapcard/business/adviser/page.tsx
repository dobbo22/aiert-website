import { linksForAdviser, requireAdviser } from "@/lib/tapcardAdvisers";
import AdviserHome from "./AdviserHome";

export const dynamic = "force-dynamic";

export default async function AdviserPage() {
  const me = await requireAdviser();
  if (!me) return null;
  const links = await linksForAdviser(me.adviserId);
  return <AdviserHome clients={links.map((l) => ({ orgId: l.orgId, name: l.orgName, status: l.status, canRegulatory: l.canRegulatory }))} />;
}

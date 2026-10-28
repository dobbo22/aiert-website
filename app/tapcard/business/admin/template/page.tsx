import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import TemplateForm from "./TemplateForm";
import { listLocations } from "@/lib/tapcardBizLocations";

export default async function BizTemplatePage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;

  const locationCount = (await listLocations(org.id).catch(() => [])).length;
  return <TemplateForm org={org} locationCount={locationCount} />;
}

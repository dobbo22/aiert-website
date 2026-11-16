import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import { listSharedFollowers } from "@/lib/tapcardShare";
import { listedSummary } from "@/lib/tapcardListedAdmin";
import FollowersView from "./FollowersView";

export const dynamic = "force-dynamic";

// Shareholders who followed one of this company's listed-company cards and chose to share their details. Admins only.
export default async function BizFollowersPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  const [rows, summary] = await Promise.all([listSharedFollowers(org.id), listedSummary(org.id).catch(() => null)]);
  return <FollowersView rows={rows} following={summary?.following ?? 0} />;
}

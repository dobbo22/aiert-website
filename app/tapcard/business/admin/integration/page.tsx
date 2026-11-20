import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import { deliveryLog, eventCounts, listMemberKeys, memberLinkConfig } from "@/lib/tapcardMemberLinks";
import IntegrationPanel from "./IntegrationPanel";

export const dynamic = "force-dynamic";

// Member links: how the company's own system hears about members who follow through a personal link. Admins only.
export default async function BizIntegrationPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  const cfg = await memberLinkConfig(org.id);
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-cloud">Integration</h2>
        <p className="mt-1 text-cloud">Member links let {org.name} recognise which of its own members follow, without TapCard ever holding a name, email, member number or ticket. You give each member a personal link with a token only you can match to a person; TapCard tells your system when that token follows, joins a lounge, unfollows or claims an offer.</p>
      </div>
      {!cfg ? (
        <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10 text-cloud">
          <p className="font-semibold">Member links are not switched on for your company.</p>
          <p className="mt-1">This is an enterprise feature. Email enquiries@aiert.co.uk and we will switch it on and walk you through it.</p>
        </div>
      ) : (
        <IntegrationPanel webhookUrl={cfg.webhookUrl} counts={await eventCounts(org.id)} log={await deliveryLog(org.id)} keys={await listMemberKeys(org.id)} />
      )}
    </div>
  );
}

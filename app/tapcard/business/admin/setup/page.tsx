import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import { orgIsListed, listedSummary } from "@/lib/tapcardListedAdmin";
import { approvalRequired, isSenior, seniorAdmins } from "@/lib/tapcardNewsPolicy";
import { getFeedConfig } from "@/lib/tapcardIrFeed";
import { getPrivacyUrl } from "@/lib/tapcardShare";
import { listGroupsWithCounts } from "@/lib/tapcardGroups";
import { linksForOrg } from "@/lib/tapcardAdvisers";
import { redirect } from "next/navigation";
import SetupWizard from "./SetupWizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Guided setup — TapCard for investor relations" };

// A short guided set-up for a listed company: it asks the questions that matter, applies the answers, and says what to do next.
// Every answer can be changed later on its own screen, and the wizard can be opened again at any time.
export default async function SetupPage() {
  const session = await requireBizSession();
  if (!session) return null;
  const org = await getOrg(session.orgId);
  if (!org) return null;
  if (!(await orgIsListed(org.id))) redirect("/business/admin");
  const s = await listedSummary(org.id);
  if (!s.primaryCardId) redirect("/business/admin");
  const [senior, admins, approval, feed, privacy, groups, links] = await Promise.all([
    isSenior(org.id, session.email, session.support === true).catch(() => false),
    seniorAdmins(org.id).catch(() => []), approvalRequired(org.id).catch(() => false),
    getFeedConfig(s.primaryCardId).catch(() => null), getPrivacyUrl(s.primaryCardId).catch(() => ""),
    listGroupsWithCounts(s.primaryCardId).catch(() => []), linksForOrg(org.id).catch(() => []),
  ]);
  const adviser = links.find((l) => l.status === "approved");
  return (
    <SetupWizard
      cardId={s.primaryCardId} company={org.name} me={session.email} meSenior={senior}
      admins={admins} approval={approval} pageUrl={feed?.pageUrl ?? ""} privacyUrl={privacy}
      groups={groups.map((g) => ({ slug: g.slug, label: g.label }))}
      adviser={adviser ? { name: adviser.adviserName, status: "approved" } : links.some((l) => l.status === "pending") ? { name: links.find((l) => l.status === "pending")!.adviserName, status: "pending" } : null}
      hasTeamCards={s.cards.length > 1} hasPosted={!!s.latestNews}
    />
  );
}

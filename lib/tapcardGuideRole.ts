// Which part of the investor-relations manual to open for the person reading it: from who is signed in, if anyone.
import { requireBizUser } from "@/lib/tapcardBizSession";
import { requireAdviser } from "@/lib/tapcardAdvisers";
import { isSenior } from "@/lib/tapcardNewsPolicy";

export { GUIDE_ROLES, isGuideRole, type GuideRole } from "@/lib/guideRoles";
import type { GuideRole } from "@/lib/guideRoles";

/// The role of the signed-in reader, or null when nobody is signed in (or it is AIERT support, who read the general guide).
export async function detectGuideRole(): Promise<GuideRole | null> {
  try {
    const biz = await requireBizUser();
    if (biz && !biz.support && biz.role === "admin") return (await isSenior(biz.orgId, biz.email)) ? "company-senior" : "company-general";
    const adv = await requireAdviser();
    if (adv) return adv.senior ? "adviser-senior" : "adviser-general";
  } catch { /* not signed in, or no database: show the role picker */ }
  return null;
}

import { isAdminRequest } from "@/lib/adminRequest";
import { listCompaniesForSupport, recentSupportLog } from "@/lib/tapcardBizSupport";
import CompaniesView from "./CompaniesView";
import { providerUsage } from "@/lib/providerCaps";

export const metadata = { title: "TapCard companies — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// TapCard for Business companies, for AIERT support. A company opens only while ITS OWN support-access window is open: the company turns
// it on in its Admins tab (7 days), or AIERT set the company up for it here (30 days). Support sessions last two hours, cannot touch
// billing, show a banner, and every entry is logged below.
export default async function CompaniesPage() {
  if (!(await isAdminRequest())) return null;
  const [loaded, log] = await Promise.all([
    listCompaniesForSupport().then((rows) => ({ rows, error: "" })).catch((e: unknown) => ({ rows: [] as Awaited<ReturnType<typeof listCompaniesForSupport>>, error: e instanceof Error ? e.message : String(e) })),
    recentSupportLog().catch(() => []),
  ]);
  const companies = loaded.rows;
  const listError = loaded.error;
  const nameOf = new Map(companies.map((c) => [c.id, c.name]));
  const usage = await providerUsage().catch(() => []);
  const used = (p: "apple" | "tomtom" | "here", period: "day" | "month") => usage.find((u) => u.provider === p && u.period.length === (period === "day" ? 10 : 7))?.n ?? 0;
  return <CompaniesView companies={companies} log={log} listError={listError} nameOf={nameOf} used={used} now={new Date().getTime()} />;
}

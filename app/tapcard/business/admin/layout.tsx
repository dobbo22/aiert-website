import { requireBizUser } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import LoginForm from "./LoginForm";
import AdminNav from "./AdminNav";
import LogoutButton from "./LogoutButton";
import LiveRefresh from "./LiveRefresh";
import DemoPresenter from "./DemoPresenter";
import { isDemoOrg } from "@/lib/tapcardDemoSim";
import { orgIsListed } from "@/lib/tapcardListedAdmin";

export const metadata = {
  title: "TapCard for Business — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BizAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireBizUser();
  if (!session) return <LoginForm />;

  const org = await getOrg(session.orgId);
  if (!org) return <LoginForm />;

  const listed = await orgIsListed(org.id);
  const demo = listed && (await isDemoOrg(org.id));
  return (
    <main className="biz-admin min-h-screen px-4 py-10">
      {demo && <DemoPresenter />}
      <div className="mx-auto max-w-4xl">
        {session.support && (
          <p className="mb-4 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-black print:hidden">
            AIERT support is viewing this company (allowed by the company, two-hour session, billing locked, logged).
          </p>
        )}
        <header className="flex items-center justify-between print:hidden">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wider text-teal">{listed ? "TapCard for investor relations" : "TapCard for Business"}</p>
            <h1 className="mt-1 text-2xl font-black text-cloud">{org.name}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a href={listed ? "/business/investor-guide" : "/business/guide"} target="_blank" rel="noopener noreferrer"
              className="whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-cloud ring-1 ring-slate hover:ring-mist">Help</a>
            <LiveRefresh />
            <LogoutButton />
          </div>
        </header>
        <AdminNav role={session.role} listed={listed} />
        <div className="mt-8">{children}</div>
        <footer className="mt-12 border-t border-slate pt-6 text-sm text-cloud print:hidden">
          {listed && <><a href="/business/investor-guide" className="text-gold underline">Investor relations guide &amp; FAQs</a> ·{" "}</>}
          <a href="/business/guide" className="text-gold underline">Admin guide</a> ·{" "}
          <a href="/business/security" className="text-gold underline">Security &amp; privacy</a>
        </footer>
      </div>
    </main>
  );
}

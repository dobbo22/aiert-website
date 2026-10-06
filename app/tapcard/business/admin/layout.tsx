import { requireBizSession } from "@/lib/tapcardBizSession";
import { getOrg } from "@/lib/tapcardBiz";
import LoginForm from "./LoginForm";
import AdminNav from "./AdminNav";
import LogoutButton from "./LogoutButton";

export const metadata = {
  title: "TapCard for Business — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BizAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireBizSession();
  if (!session) return <LoginForm />;

  const org = await getOrg(session.orgId);
  if (!org) return <LoginForm />;

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal">TapCard for Business</p>
            <h1 className="mt-1 text-2xl font-black text-cloud">{org.name}</h1>
          </div>
          <LogoutButton />
        </header>
        <AdminNav />
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

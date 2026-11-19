import { requireAdviser } from "@/lib/tapcardAdvisers";
import AdviserLoginForm from "./AdviserLoginForm";
import AdviserLogout from "./AdviserLogout";

export const metadata = { title: "TapCard adviser portal", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// The adviser portal: an IR firm or broker looking after the headlines of several listed companies. Its own sign-in, separate from the
// company admin. Access to each company exists only where that company has approved the adviser.
export default async function AdviserLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdviser();
  if (!me) return <AdviserLoginForm />;
  return (
    <main className="biz-admin min-h-screen px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wider text-teal">TapCard adviser portal</p>
            <h1 className="mt-1 text-2xl font-black text-cloud">{me.adviserName}</h1>
            <p className="text-sm text-cloud">{me.email}{me.senior ? " · senior" : ""}</p>
          </div>
          <AdviserLogout />
        </header>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { confirmNewsSignup } from "@/lib/tapcardNews";

export const metadata: Metadata = { title: "TapCard news", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ConfirmNews({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ok = await confirmNewsSignup(token).catch(() => false);
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="text-2xl font-bold">{ok ? "You're signed up" : "That link didn't work"}</h1>
      <p className="mt-4">
        {ok
          ? "Thank you. We'll email you occasional TapCard news, and every email has a link to stop them."
          : "It may have expired or been mistyped. Please ask for the confirmation email again from the TapCard app."}
      </p>
    </main>
  );
}

import type { Metadata } from "next";
import { getSendByToken } from "@/lib/tapcardInvites";
import WaitlistCard from "../../WaitlistCard";

export const metadata: Metadata = { title: "TapCard for Android", robots: { index: false, follow: false } };

// "Tell me when TapCard is on Android" from an invite email. Joining takes
// a button press (POST) rather than happening on page load: corporate mail
// scanners open every link in an email, and that mustn't sign anyone up.
export default async function AndroidWaitlistInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { token } = await params;
  const { done, error } = await searchParams;
  const send = await getSendByToken(token).catch(() => null);
  const firstName = send?.first_name || send?.name?.split(/\s+/)[0];
  return (
    <WaitlistCard
      heading={firstName ? `${firstName}, want TapCard on Android?` : "Want TapCard on Android?"}
      done={!!done}
      action={`/api/android-waitlist/${token}`}
      askEmail={!send?.email}
      knownEmail={send?.email}
      error={!!error}
    />
  );
}

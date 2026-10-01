import type { Metadata } from "next";
import WaitlistCard from "../WaitlistCard";

export const metadata: Metadata = {
  title: "TapCard for Android",
  description: "TapCard is coming to Google Play. Leave your email and we'll tell you the moment it's ready.",
};

// Public version of the Android waitlist, for anyone without an invite link.
export default async function AndroidWaitlistPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const { done, error } = await searchParams;
  return <WaitlistCard heading="Want TapCard on Android?" done={!!done} action="/api/android-waitlist" askEmail error={!!error} />;
}

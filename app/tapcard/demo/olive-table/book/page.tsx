import type { Metadata } from "next";
import BookingDemo from "./BookingDemo";

export const metadata: Metadata = {
  title: "The Olive Table – Book a table",
  robots: { index: false, follow: false },
};

// A pretend restaurant booking page, used only in TapCard's demo video and guide
// pictures. Nothing is stored or sent.
export default async function Page({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <BookingDemo initialStep={step === "done" ? "done" : step === "filled" ? "filled" : "form"} />
    </main>
  );
}

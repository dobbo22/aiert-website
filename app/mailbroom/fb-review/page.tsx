import type { Metadata } from "next";
import GoRedirect from "../GoRedirect";

export const metadata: Metadata = {
  title: "Redirecting…",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <GoRedirect to="https://thebusinessdive.com/mailbroom-review" />;
}

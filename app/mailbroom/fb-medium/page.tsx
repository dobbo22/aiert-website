import type { Metadata } from "next";
import GoRedirect from "../GoRedirect";

export const metadata: Metadata = {
  title: "Redirecting…",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <GoRedirect to="https://medium.com/p/your-50-000-emails-are-costing-the-planet-heres-the-cleaner-that-fixes-both-6ba92f1b2dee" />
  );
}

import type { Metadata } from "next";
import GoRedirect from "../GoRedirect";

export const metadata: Metadata = {
  title: "Redirecting…",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <GoRedirect to="https://www.facebook.com/profile.php?id=61594266844705&locale=en_GB" slug="fb-follow" />;
}

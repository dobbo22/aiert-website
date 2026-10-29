import { isAdminRequest } from "@/lib/adminRequest";
import WalkIn from "./WalkIn";

export const metadata = { title: "Walk-in demo — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// For walking into a shop, salon or restaurant: type the name, build their card, let them scan it to start (or email the link), and
// show what it does for the owner and for a customer. Inside the Social admin (layout.tsx handles the sign-in).
export default async function WalkInPage() {
  if (!(await isAdminRequest())) return null;
  return <WalkIn />;
}

import { redirect } from "next/navigation";

// The restaurant / cafe mailshot moved to Marketing (with its own results and lead tracking).
export default function MailshotMovedPage() {
  redirect("/admin/marketing/restaurants");
}

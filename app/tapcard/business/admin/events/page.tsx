import { redirect } from "next/navigation";

// Events live under Cards & QR now (company card, team cards, events, privacy notice). Old links keep working.
export default function BizEventsPage() {
  redirect("/business/admin/cards?tab=events");
}

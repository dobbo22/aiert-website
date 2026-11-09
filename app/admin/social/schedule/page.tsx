import { isAdminRequest } from "@/lib/adminRequest";
import { listQueue } from "@/lib/socialQueue";
import type { QueueRow } from "@/lib/socialQueueShared";
import ScheduleManager from "./ScheduleManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schedule — Admin", robots: { index: false, follow: false } };

export default async function SchedulePage() {
  // The login screen comes from the layout, but the page's data must not be fetched, or sent in the page source, for anyone else.
  if (!(await isAdminRequest())) return null;
  let rows: QueueRow[] = [];
  let error: string | null = null;
  try {
    rows = await listQueue(40);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load the queue";
  }
  return (
    <>
      {error && <p className="social-compose-error">{error}</p>}
      <ScheduleManager key={rows.map((r) => `${r.id}:${r.status}`).join(",")} initial={rows} />
    </>
  );
}

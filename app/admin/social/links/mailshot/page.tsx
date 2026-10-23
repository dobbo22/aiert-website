import { RESTAURANT_SUBJECTS, restaurantHtml, ensureMailshotSchema, mailshotBounces, mailshotLinks, mailshotStats, type BouncedRow } from "@/lib/mailshot";
import MailshotPanel from "./MailshotPanel";
import { isAdminRequest } from "@/lib/adminRequest";

// Each mailing keeps its own list and results; name a new one for a new area or batch.
const DEFAULT_CAMPAIGN = "restaurants";

export default async function MailshotPage() {
  // The login screen comes from the layout, but the page's data must not be fetched, or sent in the page source, for anyone else.
  if (!(await isAdminRequest())) return null;
  let error: string | null = null;
  let stats = null;
  let bounces: BouncedRow[] = [];
  try {
    await ensureMailshotSchema();
    stats = await mailshotStats(DEFAULT_CAMPAIGN);
    bounces = await mailshotBounces(DEFAULT_CAMPAIGN);
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't load";
  }
  const restaurantPreviewHtml = restaurantHtml("The Olive Table", mailshotLinks("preview"), "https://tapcard.aiert.co.uk/api/restaurant-sample?frame=1");
  return (
    <div>
      {error && <p className="social-compose-error">{error}</p>}
      <MailshotPanel initialCampaign={DEFAULT_CAMPAIGN} initialStats={stats} initialBounces={bounces} restaurantSubjects={RESTAURANT_SUBJECTS} restaurantPreviewHtml={restaurantPreviewHtml} />
    </div>
  );
}

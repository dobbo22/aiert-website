import { MAILSHOT_SUBJECTS, ensureMailshotSchema, mailshotBounces, mailshotHtml, mailshotLinks, mailshotStats, type BouncedRow } from "@/lib/mailshot";
import MailshotPanel from "./MailshotPanel";

const DEFAULT_CAMPAIGN = "mailshot-oct26";

export default async function MailshotPage() {
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
  const previewHtml = mailshotHtml("Alex", mailshotLinks("preview"));
  return (
    <div>
      {error && <p className="social-compose-error">{error}</p>}
      <MailshotPanel initialCampaign={DEFAULT_CAMPAIGN} initialStats={stats} initialBounces={bounces} subjects={MAILSHOT_SUBJECTS} previewHtml={previewHtml} />
    </div>
  );
}

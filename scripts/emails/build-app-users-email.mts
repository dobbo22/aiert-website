// @ts-nocheck  (standalone tsx script)
// Writes the "finish your TapCard" emails to disk for review (same builder as the admin page /admin/social/businesses/email). Sends nothing.
//   DATABASE_URL="$(neonctl connection-string --project-id tiny-brook-82758292 --database-name invites --role-name backup_reader --pooled)" \
//     npx tsx scripts/emails/build-app-users-email.mts <out-dir>
// The output holds email addresses: keep it OUT of the repo.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as m from "../../lib/appUserCampaign.ts";
const { buildAppUserEmails } = (m as any).buildAppUserEmails ? m : (m as any).default;
const out = process.argv[2];
if (!out) { console.error("Usage: build-app-users-email.mts <out-dir>"); process.exit(1); }
mkdirSync(join(out, "html"), { recursive: true });
const list = await buildAppUserEmails();
const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
const lines = ["email,first_name,business,subject,fixes,sent_to,card"];
for (const r of list) {
  const slug = r.email.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  writeFileSync(join(out, "html", `${slug}.html`), r.html);
  writeFileSync(join(out, "html", `${slug}.txt`), r.text);
  lines.push([r.email, r.firstName, r.business, r.subject, r.fixes.join(" + "), r.sentTo, `https://tapcard.aiert.co.uk/c/${r.cardId}`].map(q).join(","));
}
writeFileSync(join(out, "recipients.csv"), lines.join("\n"));
console.log(`wrote ${list.length} emails to ${out}`);

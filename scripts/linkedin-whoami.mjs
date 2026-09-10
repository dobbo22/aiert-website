// Resolves the LinkedIn organization URN(s) the authenticated member
// administers, for use as LINKEDIN_ORG_URN in .env.local. Run this after
// scripts/linkedin-auth.mjs has produced an access token.
//
// Usage: npm run linkedin:whoami
import { config } from "dotenv";

config({ path: ".env.local" });

const LINKEDIN_VERSION = "202604";
const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("Missing LINKEDIN_ACCESS_TOKEN in .env.local — run `npm run linkedin:auth` first.");
  process.exit(1);
}

const res = await fetch(
  "https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED",
  {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "Linkedin-Version": LINKEDIN_VERSION,
    },
  }
);

if (!res.ok) {
  console.error(`Lookup failed: ${res.status} ${await res.text()}`);
  console.error(
    "\nIf this is a 403, your token's scope may not include organization-admin lookups. " +
    "Fallback: open your Company Page admin view on LinkedIn — the numeric ID in the URL " +
    "(linkedin.com/company/{id}/admin/) is your organization ID. Use urn:li:organization:{id}."
  );
  process.exit(1);
}

const { elements } = await res.json();

if (!elements?.length) {
  console.log("No administered organizations found for this token.");
  process.exit(0);
}

console.log("Organizations you administer:\n");
for (const el of elements) {
  console.log(`  LINKEDIN_ORG_URN=${el.organization}`);
}

import { config } from "dotenv";
import crypto from "crypto";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"; // no 0/o/1/l/i to avoid confusion

function generateCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

const args = process.argv.slice(2);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let email = null;
if (args.length > 1 && EMAIL_RE.test(args[args.length - 1])) {
  email = args.pop();
}
const name = args.join(" ").trim();

if (!name) {
  console.error('Usage: node scripts/add-invitee.mjs "Guest Name" [email@example.com]');
  process.exit(1);
}

let code = generateCode();
// Retry on the rare unique collision.
for (let attempts = 0; attempts < 5; attempts++) {
  const existing = await sql`SELECT 1 FROM anniversary_invitees WHERE code = ${code}`;
  if (existing.length === 0) break;
  code = generateCode();
}

await sql`INSERT INTO anniversary_invitees (code, name, guest_email) VALUES (${code}, ${name}, ${email})`;

const baseUrl = process.env.SITE_URL || "https://aiert.co.uk";
console.log(`${name}${email ? ` (${email})` : ""}: ${baseUrl}/invite/${code}`);

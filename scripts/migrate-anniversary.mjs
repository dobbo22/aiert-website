import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS anniversary_invitees (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    view_count INTEGER NOT NULL DEFAULT 0,
    first_viewed_at TIMESTAMPTZ,
    last_viewed_at TIMESTAMPTZ,
    rsvp_status TEXT CHECK (rsvp_status IN ('accepted', 'declined')),
    guest_count INTEGER,
    dietary_notes TEXT,
    message TEXT,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

await sql`
  ALTER TABLE anniversary_invitees ADD COLUMN IF NOT EXISTS menu_choices JSONB
`;

await sql`
  CREATE TABLE IF NOT EXISTS anniversary_seats (
    seat_id INTEGER PRIMARY KEY,
    side TEXT NOT NULL,
    invitee_code TEXT REFERENCES anniversary_invitees(code) ON DELETE SET NULL,
    guest_label TEXT
  )
`;

console.log("anniversary_invitees table ready");
console.log("anniversary_invitees.menu_choices column ready");
console.log("anniversary_seats table ready");

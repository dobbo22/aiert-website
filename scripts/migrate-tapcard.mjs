import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

// One table, no relations — TapCard is a lead-gen funnel, not a product
// with a schema expected to grow much. See /Users/martin/.claude/plans
// for the approved plan. photo_url points at a Vercel Blob object; the
// photo itself is never stored in Postgres.
await sql`
  CREATE TABLE IF NOT EXISTS tapcard_cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    website TEXT NOT NULL DEFAULT '',
    linkedin_url TEXT NOT NULL DEFAULT '',
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

console.log("tapcard_cards table ready");

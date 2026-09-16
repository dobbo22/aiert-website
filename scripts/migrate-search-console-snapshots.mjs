import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS search_console_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    host TEXT NOT NULL,
    clicks INTEGER NOT NULL,
    impressions INTEGER NOT NULL,
    ctr NUMERIC NOT NULL,
    position NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (snapshot_date, host)
  )
`;

console.log("search_console_snapshots table ready");

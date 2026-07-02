import { neon } from "@neondatabase/serverless";

// Same Neon project as the invites DB — just the mailbroom database.
// Derives the URL by swapping the database name so no extra env var is needed.
const mailbroomUrl = (process.env.DATABASE_URL ?? "").replace(
  /\/invites(\?|$)/,
  "/mailbroom$1"
);

const mailbroomSql = neon(mailbroomUrl);

export default mailbroomSql;

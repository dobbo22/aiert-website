import { NextResponse } from "next/server";
import sql from "@/lib/db";

// Public, unauthenticated — intentionally. Only ever returns SHA-256 hashes,
// never the plaintext emails behind them, so this can't leak who's on the
// reviewer allowlist even though the endpoint itself has no access control.
// Fetched by MailBroom's StoreKitService to grant Pro to allowlisted reviewers.
export async function GET() {
  const rows = (await sql`SELECT email_hash FROM mailbroom_reviewers`) as {
    email_hash: string;
  }[];

  return NextResponse.json(
    rows.map((r) => r.email_hash),
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}

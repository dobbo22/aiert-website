import { NextResponse } from "next/server";
import crypto from "crypto";
import sql from "@/lib/db";

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

// Public, unauthenticated — intentionally. Only ever returns SHA-256 hashes,
// never the plaintext emails behind them, so this can't leak who's on the
// reviewer allowlist even though the endpoint itself has no access control.
// Fetched by MailBroom's StoreKitService to grant Pro to allowlisted reviewers.
//
// StoreKitService.isAllowlistedReviewer checks TWO hash forms against every
// connected account: sha256(username) and sha256("username@\(account.host)").
// account.host is the IMAP server hostname (e.g. "imap.gmail.com"), not the
// email's actual domain — so the second form never equals a hash of the
// reviewer's real email address (sha256("user@gmail.com") != sha256
// ("user@imap.gmail.com")). Only the username-only hash ever actually
// matches in practice. The stored email_hash column (hash of the real,
// full email — see lib/mailbroomReviewerHash.ts) alone was therefore
// silently non-functional for every reviewer added through the admin
// panel. Recomputing a username-only hash here from the stored plaintext
// `email` fixes matching for the whole existing list, not just new
// additions, with no iOS app update needed.
export async function GET() {
  const rows = (await sql`SELECT email, email_hash FROM mailbroom_reviewers`) as {
    email: string;
    email_hash: string;
  }[];

  const hashes = new Set<string>();
  for (const row of rows) {
    if (row.email_hash) hashes.add(row.email_hash);
    const username = row.email?.split("@")[0];
    if (username) hashes.add(sha256Hex(username));
  }

  return NextResponse.json(
    Array.from(hashes),
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}

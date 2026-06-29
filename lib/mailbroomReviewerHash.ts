import crypto from "crypto";

/**
 * Must exactly match StoreKitService.sha256Hex's normalisation in the MailBroom
 * iOS app (lowercase + trim, then SHA-256 hex) — the app hashes the connected
 * account's email and checks it against the hashes this site publishes, so a
 * reviewer's email is never sent anywhere in plaintext.
 */
export function hashReviewerEmail(email: string): string {
  const normalised = email.trim().toLowerCase();
  return crypto.createHash("sha256").update(normalised).digest("hex");
}

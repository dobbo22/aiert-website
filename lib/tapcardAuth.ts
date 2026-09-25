import crypto from "crypto";
import type { NextRequest } from "next/server";
import { claimEditToken, type TapCardRecord } from "@/lib/tapcardDb";

// The card id is public — it's in every share link and QR code — so it
// can't also be the write credential, or anyone who scanned a card could
// overwrite, re-photo or delete it. The iOS app instead generates a random
// edit token per card, keeps it on-device, and sends it as a Bearer token
// on every write; only its SHA-256 is stored here.

const MIN_TOKEN_LENGTH = 32;

export function hashSecret(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function readEditToken(req: NextRequest): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization") ?? "");
  const token = match?.[1];
  return token && token.length >= MIN_TOKEN_LENGTH && token.length <= 200 ? token : null;
}

/// True if `token` may edit `card`. A card shared before tokens existed has
/// no hash yet; the first request presenting a token claims it (a one-off
/// window that closes as soon as the owner's updated app next syncs).
export async function canEdit(card: TapCardRecord, token: string | null): Promise<boolean> {
  if (!token) return false;
  const hash = hashSecret(token);
  if (card.edit_token_hash) {
    const stored = Buffer.from(card.edit_token_hash);
    const given = Buffer.from(hash);
    return stored.length === given.length && crypto.timingSafeEqual(stored, given);
  }
  return claimEditToken(card.id, hash);
}

/// Only used to rate-limit card creation per client — the IP is stored
/// hashed, never raw.
export function clientIpHash(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return hashSecret(`tapcard-ip:${ip}`);
}

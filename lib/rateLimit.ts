// Best-effort per-IP limiter for public lookup endpoints. State is per server instance (resets on cold start and is not
// shared between instances), so it blunts casual abuse and runaway loops rather than guaranteeing a hard cap.
const hits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
}

/** True if this caller is over `max` requests in the last `windowMs` for `bucket`. */
export function rateLimited(req: Request, bucket: string, max: number, windowMs = 60_000): boolean {
  const key = `${bucket}:${clientIp(req)}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return recent.length > max;
}

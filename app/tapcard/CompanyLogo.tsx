"use client";

import { useEffect, useState } from "react";
import { probePlate } from "@/lib/logoBackdrop";

/// The company's own icon, via TapCard's favicon endpoint (lib/siteIcon —
/// the site's apple-touch-icon first, Google's service only as a fallback,
/// since Google caches stale icons for weeks). Absolute, because this page
/// is also served at www.aiert.co.uk/tapcard/c/…. Fails silently rather
/// than showing a broken-image icon when a domain has no icon.
export default function CompanyLogo({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false);
  const src = `https://tapcard.aiert.co.uk/api/favicon?domain=${encodeURIComponent(domain)}`;
  // The plate behind the icon is chosen from the icon's own colours so it is clearly visible (white until known).
  const [plate, setPlate] = useState<string | null>(null);
  useEffect(() => { probePlate(src, setPlate); }, [src]);
  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-6 w-6 rounded object-contain p-0.5"
      style={{ backgroundColor: plate ?? "rgba(255,255,255,0.9)" }}
      onError={() => setFailed(true)}
    />
  );
}

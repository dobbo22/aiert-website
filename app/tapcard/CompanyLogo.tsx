"use client";

import { useState } from "react";

/// The company's own icon, via TapCard's favicon endpoint (lib/siteIcon —
/// the site's apple-touch-icon first, Google's service only as a fallback,
/// since Google caches stale icons for weeks). Absolute, because this page
/// is also served at www.aiert.co.uk/tapcard/c/…. Fails silently rather
/// than showing a broken-image icon when a domain has no icon.
export default function CompanyLogo({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://tapcard.aiert.co.uk/api/favicon?domain=${encodeURIComponent(domain)}`}
      alt=""
      className="h-6 w-6 rounded bg-white/90 object-contain p-0.5"
      onError={() => setFailed(true)}
    />
  );
}

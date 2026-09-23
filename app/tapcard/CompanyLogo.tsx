"use client";

import { useState } from "react";

/// Google's favicon service — unauthenticated, no key, resolves a site's
/// favicon from its domain. (Clearbit's old logo.clearbit.com endpoint,
/// tried first, no longer resolves at all — looks fully decommissioned
/// since the HubSpot acquisition, not just flaky.) Favicons are lower
/// fidelity than a real logo (small, sometimes just a letter), but Google's
/// infrastructure backing this is far more durable. Fails silently rather
/// than showing a broken-image icon when a domain has no favicon.
export default function CompanyLogo({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`}
      alt=""
      className="h-6 w-6 rounded bg-white/90 object-contain p-0.5"
      onError={() => setFailed(true)}
    />
  );
}

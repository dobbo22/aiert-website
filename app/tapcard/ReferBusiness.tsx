"use client";

import { useState } from "react";

// "Know a business that would like a TapCard?" on a business's public card page: a customer sends the link on, and the
// owner lands on the 30-second card builder with nothing to install. Clicks are counted under Link clicks.
export default function ReferBusiness({ origin }: { origin: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${origin}/go/tapcard-web-referral-business`;
  const text = "Have you seen TapCard? It gives a business a free digital card, QR code and offers. Make yours in 30 seconds:";

  async function send() {
    try {
      if (navigator.share) { await navigator.share({ title: "TapCard for business", text, url }); return; }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
    } catch { /* the person closed the share sheet */ }
  }

  return (
    <p className="mt-4 text-center text-sm text-white">
      Know a business that would like a TapCard?{" "}
      <button type="button" onClick={send} className="font-semibold underline">{copied ? "Link copied" : "Send them this"}</button>
    </p>
  );
}

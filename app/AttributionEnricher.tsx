"use client";

import { useEffect } from "react";

// Tags every outbound link to the MailBroom web app with how this visitor
// arrived here, so mailbroom-web can attribute a signup back to a traffic
// source (Search Console query, referral site, or ad campaign) instead of
// just knowing "someone signed up." Can't use a shared cookie — app.
// mailbroom.app is a different domain — so it's passed as query params
// on the link itself, captured by that app's /sign-in page.
const APP_HOST = "app.mailbroom.app";

export default function AttributionEnricher() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;

      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }
      if (url.hostname !== APP_HOST) return;

      const here = new URL(window.location.href);
      const utmSource = here.searchParams.get("utm_source");
      const utmMedium = here.searchParams.get("utm_medium");
      const utmCampaign = here.searchParams.get("utm_campaign");

      if (utmSource) url.searchParams.set("utm_source", utmSource);
      if (utmMedium) url.searchParams.set("utm_medium", utmMedium);
      if (utmCampaign) url.searchParams.set("utm_campaign", utmCampaign);

      if (!utmSource && document.referrer) {
        try {
          const refHost = new URL(document.referrer).hostname.replace(/^www\./, "");
          if (refHost && refHost !== window.location.hostname) {
            url.searchParams.set("utm_source", refHost);
            url.searchParams.set("utm_medium", "referral");
          }
        } catch {
          // ignore malformed referrer
        }
      }

      url.searchParams.set("landing_page", window.location.pathname);
      anchor.href = url.toString();
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}

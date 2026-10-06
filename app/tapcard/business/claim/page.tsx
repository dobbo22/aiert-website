import type { Metadata } from "next";
import { headers } from "next/headers";
import { appStoreUrl, platformFromUserAgent, playStoreUrl } from "@/lib/tapcardInvites";
import ClaimLanding from "./ClaimLanding";

export const metadata: Metadata = {
  title: "Your company TapCard",
  robots: { index: false, follow: false },
};

// tapcard.aiert.co.uk/business/claim#<invite> — the link in every employee
// invite (lib/tapcardBizInvite.ts). With TapCard installed, iOS/Android hand
// the whole URL to the app (Universal Link / App Link — app/api/tapcard/aasa
// and assetlinks), which claims the card itself. This page is for everyone
// else: not installed yet, or on a computer. The invite after "#" never
// reaches this server; ClaimLanding reads it in the browser for display only.
export default async function BusinessClaimPage() {
  const platform = platformFromUserAgent((await headers()).get("user-agent") ?? "");
  return (
    <ClaimLanding
      appStoreHref={appStoreUrl("business", "claim")}
      playStoreHref={playStoreUrl("business", "claim")}
      isDesktop={platform === "desktop"}
    />
  );
}

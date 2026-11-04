import type { Metadata } from "next";
import { headers } from "next/headers";
import { appStoreUrl, platformFromUserAgent, playStoreUrl } from "@/lib/tapcardInvites";
import { contactSender } from "@/lib/tapcardPrebuilt";
import StartLanding from "./StartLanding";

export const metadata: Metadata = {
  title: "Your TapCard is ready",
  robots: { index: false, follow: false },
};

// tapcard.aiert.co.uk/start/<token> — the link in the "Build my TapCard" email. The app reads the card for this token on
// first launch (Play install referrer on Android; the copied link on iPhone), so there's no setup to do.
export default async function StartPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const platform = platformFromUserAgent((await headers()).get("user-agent") ?? "");
  const sender = await contactSender(token).catch(() => null);
  return (
    <StartLanding
      fromContact={sender !== null}
      sender={sender}
      token={token}
      appStoreHref={appStoreUrl("prebuilt", "demo")}
      playStoreHref={playStoreUrl("prebuilt", "demo")}
      isDesktop={platform === "desktop"}
    />
  );
}

import { ImageResponse } from "next/og";
import fs from "node:fs/promises";
import path from "node:path";
import { TRACKED_LINKS } from "@/lib/trackedLinks";

export const alt = "MailBroom";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Tracked links point at either the consumer iOS app or the M365 business
// product — picked by destination rather than a new field on every
// existing TRACKED_LINKS entry, so this works for links added before this
// file existed too.
function isBusinessLink(to: string): boolean {
  return to.includes("mailbroom.app/") && !to.startsWith("https://ios.mailbroom.app");
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const link = TRACKED_LINKS[slug];
  const business = link ? isBusinessLink(link.to) : false;

  const iconPath = business
    ? "app/mailbroom/webapp/icon.png"
    : "public/mailbroom-icon.png";
  const logoData = await fs.readFile(path.join(process.cwd(), iconPath));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  const heading = business ? (
    <>
      MailBroom&nbsp;<span style={{ color: "#FBBF24" }}>for Business</span>
    </>
  ) : (
    "MailBroom"
  );
  const subheading = business
    ? "Inbox cleanup for the whole company."
    : "Your email never leaves your device.";
  const tagline = business
    ? "M365 mailbox cleanup, company-wide."
    : "AI-powered inbox cleanup — 100% on-device.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0F1A",
          fontFamily: "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={168}
          height={168}
          style={{ borderRadius: 36, marginBottom: 40 }}
        />
        <div style={{ display: "flex", fontSize: business ? 64 : 60, fontWeight: 800, color: "#E2E8F0", letterSpacing: "-0.02em" }}>
          {heading}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: business ? 28 : 44,
            fontWeight: business ? 400 : 800,
            color: business ? "#94A3B8" : "#FBBF24",
            letterSpacing: "-0.02em",
            marginTop: business ? 20 : 8,
          }}
        >
          {subheading}
        </div>
        {!business && (
          <div style={{ display: "flex", fontSize: 28, color: "#94A3B8", marginTop: 24 }}>
            {tagline}
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}

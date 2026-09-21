import { ImageResponse } from "next/og";
import fs from "node:fs/promises";
import path from "node:path";

export const alt = "MailBroom — Your email never leaves your device.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoData = await fs.readFile(path.join(process.cwd(), "public/mailbroom-icon.png"));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

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
        <div style={{ display: "flex", fontSize: 60, fontWeight: 800, color: "#E2E8F0", letterSpacing: "-0.02em" }}>
          MailBroom
        </div>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: "#FBBF24", letterSpacing: "-0.02em", marginTop: 8 }}>
          Your email never leaves your device.
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#94A3B8", marginTop: 24 }}>
          AI-powered inbox cleanup — 100% on-device.
        </div>
      </div>
    ),
    { ...size }
  );
}

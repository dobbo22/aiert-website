import { ImageResponse } from "next/og";
import fs from "node:fs/promises";
import path from "node:path";

export const alt = "MailBroom for Business — User Guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoData = await fs.readFile(path.join(process.cwd(), "app/mailbroom/webapp/icon.png"));
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
          width={140}
          height={140}
          style={{ borderRadius: 30, marginBottom: 32 }}
        />
        <div style={{ display: "flex", fontSize: 60, fontWeight: 800, color: "#E2E8F0", letterSpacing: "-0.02em" }}>
          MailBroom&nbsp;<span style={{ color: "#FBBF24" }}>for Business</span>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#94A3B8", marginTop: 20 }}>
          Complete User Guide
        </div>
      </div>
    ),
    { ...size }
  );
}

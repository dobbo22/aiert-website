import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getCard } from "@/lib/tapcardDb";

// The picture a chat app shows when someone's card link is shared (WhatsApp, Messages, Slack...): their name, what they do and
// their photo or logo, on TapCard's dark card background. It deliberately has no phone number or email: chat apps and their
// servers keep link previews, and the details are on the card page itself for anyone who opens the link.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return new Response("not found", { status: 404 });

  const name = (card.name || card.company || "TapCard").slice(0, 60);
  const subtitle = [card.title, card.company && card.company !== card.name ? card.company : ""].filter(Boolean).join(" · ").slice(0, 70);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  const photo = card.photo_url && /^https:\/\//.test(card.photo_url) ? card.photo_url : null;

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: 56, background: "linear-gradient(135deg, #3b2a6b 0%, #16171c 45%, #111318 100%)", fontFamily: "sans-serif", color: "#ffffff" }}>
        <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 240, height: 240, borderRadius: 120, background: photo && card.card_kind === "business" ? "#ffffff" : "#3a3b42", border: "10px solid #0b0c10", overflow: "hidden", flexShrink: 0 }}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" width={240} height={240} style={{ objectFit: card.card_kind === "business" ? "contain" : "cover" }} />
            ) : (
              <div style={{ display: "flex", fontSize: 96, fontWeight: 700 }}>{initials}</div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 56 }}>
            <div style={{ display: "flex", fontSize: name.length > 28 ? 56 : 72, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
            {subtitle ? <div style={{ display: "flex", fontSize: 38, marginTop: 18, color: "#d6d3e6" }}>{subtitle}</div> : null}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 30, color: "#d6d3e6" }}>
          <div style={{ display: "flex" }}>Tap to see my card and save it</div>
          <div style={{ display: "flex", fontWeight: 700, color: "#ffffff" }}>TapCard</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } },
  );
}

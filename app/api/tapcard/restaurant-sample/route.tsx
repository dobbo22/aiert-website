import { inviteCardImage } from "@/lib/inviteCardImage";
import { inPhone } from "@/lib/phoneFrame";

// A made-up restaurant card, for the mailshot's restaurant preview (tapcard.aiert.co.uk/api/restaurant-sample).
export async function GET(req: Request) {
  const image = await inviteCardImage({
    name: "The Olive Table",
    company: "Restaurant · Maida Vale",
    email: "",
    phone: "020 7946 0123",
    website: "",
    address: "12 Warrington Crescent, London W9",
    booking_url: "olivetable.example/book",
    menu_url: "olivetable.example/menu",
    kind: "restaurant",
  });
  if (new URL(req.url).searchParams.get("frame") !== "1") return image;
  const framed = await inPhone(Buffer.from(await image.arrayBuffer()));
  return new Response(new Uint8Array(framed), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" } });
}

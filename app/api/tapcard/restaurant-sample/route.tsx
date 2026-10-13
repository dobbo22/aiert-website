import { inviteCardImage } from "@/lib/inviteCardImage";

// A made-up restaurant card, for the mailshot's restaurant preview (tapcard.aiert.co.uk/api/restaurant-sample).
export async function GET() {
  return inviteCardImage({
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
}

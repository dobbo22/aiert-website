import { NextRequest } from "next/server";
import { inviteCardImage } from "@/lib/inviteCardImage";
import { peekPrebuilt } from "@/lib/tapcardPrebuilt";

// A picture of a ready-made card, for the email a person sends their contact ("here is your TapCard"): the same drawing the invite emails
// use. Only someone with the secret token can fetch it, and fetching it records nothing.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await peekPrebuilt(token);
  if (!c) return new Response("not found", { status: 404 });
  const image = await inviteCardImage({
    name: c.name, company: c.company, email: c.email ?? "", phone: c.phone, title: c.title, website: c.website, address: c.address,
    facebook_url: c.facebookUrl, instagram_url: c.instagramUrl, x_url: c.twitterUrl, linkedin_url: c.linkedInUrl,
  });
  return image;
}

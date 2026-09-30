import CardPage, { generateMetadata as cardMetadata } from "../../c/[id]/page";

// The link inside every TapCard QR code: tapcard.aiert.co.uk/s/[id]. Same
// card page as /c/[id], plus an "Open in the app" button — see the comment
// on openInAppHref there for why QR codes don't use the /c/ Universal Link.
// Deliberately left out of the apple-app-site-association paths.
export const generateMetadata = cardMetadata;

export default async function QRCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ send?: string }>;
}) {
  const query = await searchParams;
  return CardPage({ params, searchParams: Promise.resolve({ ...query, via: "qr" }) });
}

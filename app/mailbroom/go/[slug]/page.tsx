import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TRACKED_LINKS } from "@/lib/trackedLinks";
import GoRedirect from "../../GoRedirect";

// Without an explicit openGraph/twitter block here, Next.js merges in the
// nearest ancestor's — which used to be the root layout's generic AIERT
// "fintech company" blurb, since neither this page nor any layout between
// here and the root defined one. That's what showed up when this link was
// shared on X. Defining it here (and its own opengraph-image.tsx sibling)
// overrides that fallback with something actually about MailBroom.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const link = TRACKED_LINKS[slug];
  const title = link ? link.label : "MailBroom";
  const description = "MailBroom connects to any IMAP inbox and cleans it with AI — 100% on-device. Your email never leaves your phone.";

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      siteName: "MailBroom",
      locale: "en_GB",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const link = TRACKED_LINKS[slug];
  if (!link) notFound();

  return <GoRedirect to={link.to} slug={slug} />;
}

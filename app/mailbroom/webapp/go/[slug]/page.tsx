import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TRACKED_LINKS } from "@/lib/trackedLinks";
import GoRedirect from "@/app/mailbroom/GoRedirect";

// Same tracked-redirect mechanism as /mailbroom/go/[slug], just served on
// mailbroom.app (the SaaS/webapp domain) instead of ios.mailbroom.app, for
// links that promote MailBroom for Business rather than the iOS app —
// sharing a link that says "ios.mailbroom.app" to an IT Director pitching
// the per-company web product sends the wrong signal before the redirect
// even fires.
export const metadata: Metadata = {
  title: "Redirecting…",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const link = TRACKED_LINKS[slug];
  if (!link) notFound();

  return <GoRedirect to={link.to} slug={slug} />;
}

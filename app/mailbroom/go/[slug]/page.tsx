import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TRACKED_LINKS } from "@/lib/trackedLinks";
import GoRedirect from "../../GoRedirect";

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

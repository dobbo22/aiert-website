import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/tapcard-blog.mjs";

const DESCRIPTION = "Practical guides on digital business cards, offers and news for restaurants, shops, clubs and charities.";

export const metadata: Metadata = {
  title: "TapCard blog – AIERT Ltd",
  description: DESCRIPTION,
  alternates: { canonical: "https://tapcard.aiert.co.uk/blog" },
  openGraph: {
    title: "TapCard blog",
    description: DESCRIPTION,
    images: ["https://www.aiert.co.uk/tapcard-og.png"],
    siteName: "TapCard",
    type: "website",
  },
};

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="" className="h-10 w-10 rounded-xl" />
          <span className="text-xl font-bold text-cloud">TapCard</span>
        </Link>
        <h1 className="mt-8 text-4xl font-black tracking-tight text-cloud">TapCard blog</h1>
        <p className="mt-3 text-lg text-cloud">{DESCRIPTION}</p>
        <div className="mt-8 space-y-4">
          {posts.map((p) => (
            <a key={p.slug} href={`/blog/${p.slug}`} className="block rounded-2xl bg-charcoal p-6 ring-1 ring-white/10 hover:ring-gold/60">
              <p className="text-sm text-cloud">{new Date(p.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
              <h2 className="mt-1 text-xl font-bold text-cloud">{p.title}</h2>
              <p className="mt-2 leading-relaxed text-cloud">{p.description}</p>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}

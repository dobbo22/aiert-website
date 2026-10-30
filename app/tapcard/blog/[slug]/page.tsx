import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getPost } from "@/lib/tapcard-blog.mjs";
import JsonLd from "../../JsonLd";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  const url = `https://tapcard.aiert.co.uk/blog/${post.slug}`;
  return {
    title: `${post.title} – TapCard`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      images: ["https://www.aiert.co.uk/tapcard-og.png"],
      siteName: "TapCard",
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const url = `https://tapcard.aiert.co.uk/blog/${post.slug}`;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: url,
    image: "https://www.aiert.co.uk/tapcard-og.png",
    author: { "@type": "Organization", name: "AIERT Ltd", url: "https://www.aiert.co.uk/" },
    publisher: { "@id": "https://www.aiert.co.uk/#org" },
  };
  return (
    <main className="min-h-screen px-4 py-12">
      <JsonLd data={articleLd} />
      <div className="mx-auto max-w-2xl">
        <Link href="/blog" className="inline-flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="" className="h-10 w-10 rounded-xl" />
          <span className="text-xl font-bold text-cloud">TapCard blog</span>
        </Link>
        <article className="mt-8 text-cloud leading-relaxed">
          <p className="text-sm">{new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · AIERT Ltd</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{post.title}</h1>
          {post.body.map((s, i) => (
            <section key={i} className="mt-6 space-y-3">
              {s.h && <h2 className="text-xl font-bold">{s.h}</h2>}
              {s.p.map((t, j) => <p key={j}>{t}</p>)}
            </section>
          ))}
          <div className="mt-10 rounded-2xl bg-charcoal p-6 ring-1 ring-gold/40">
            <p>{post.cta.text}</p>
            <p className="mt-4"><a href={post.cta.href} className="btn-gold inline-block rounded-xl px-5 py-3 font-semibold">{post.cta.label}</a></p>
          </div>
        </article>
        <footer className="mt-12 border-t border-slate pt-6 text-sm text-cloud">
          <p>
            TapCard is made by AIERT Ltd, registered in England &amp; Wales, No. 16587000.{" "}
            <a href="/blog" className="text-gold underline">All posts</a> ·{" "}
            <a href="/promote" className="text-gold underline">TapCard Promote</a> ·{" "}
            <a href="/privacy" className="text-gold underline">Privacy</a>
          </p>
        </footer>
      </div>
    </main>
  );
}

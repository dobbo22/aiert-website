import { listPagePosts } from "@/lib/facebookGraph";
import FacebookFeed from "./FacebookFeed";

export const dynamic = "force-dynamic";

export default async function FacebookTabPage() {
  let posts: Awaited<ReturnType<typeof listPagePosts>> = [];
  let error: string | null = null;

  try {
    posts = await listPagePosts(15);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load Facebook posts";
  }

  return (
    <>
      {error && <p className="social-compose-error">{error}</p>}
      <FacebookFeed initialPosts={posts} />
    </>
  );
}

import { listThreads } from "@/lib/threadsGraph";
import ThreadsFeed from "./ThreadsFeed";

export const dynamic = "force-dynamic";

export default async function ThreadsTabPage() {
  let posts: Awaited<ReturnType<typeof listThreads>> = [];
  let error: string | null = null;

  try {
    posts = await listThreads(15);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load Threads posts";
  }

  return (
    <>
      {error && <p className="social-compose-error">{error}</p>}
      <ThreadsFeed initialPosts={posts} />
    </>
  );
}

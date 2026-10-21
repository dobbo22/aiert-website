import { listThreads } from "@/lib/threadsGraph";
import ThreadsFeed from "./ThreadsFeed";
import { isAdminRequest } from "@/lib/adminRequest";

export const dynamic = "force-dynamic";

export default async function ThreadsTabPage() {
  // The login screen comes from the layout, but the page's data must not be fetched, or sent in the page source, for anyone else.
  if (!(await isAdminRequest())) return null;
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

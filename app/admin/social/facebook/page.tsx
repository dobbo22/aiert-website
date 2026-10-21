import { listPagePosts } from "@/lib/facebookGraph";
import FacebookFeed from "./FacebookFeed";
import { isAdminRequest } from "@/lib/adminRequest";

export const dynamic = "force-dynamic";

export default async function FacebookTabPage() {
  // The login screen comes from the layout, but the page's data must not be fetched, or sent in the page source, for anyone else.
  if (!(await isAdminRequest())) return null;
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

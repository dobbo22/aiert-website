import { listPagePosts } from "@/lib/facebookGraph";
import ComposeForm from "./ComposeForm";
import PostCard from "./PostCard";

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
    <div>
      <ComposeForm />
      {error && <p className="social-compose-error">{error}</p>}
      {!error && posts.length === 0 && <p className="social-empty">No posts yet.</p>}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

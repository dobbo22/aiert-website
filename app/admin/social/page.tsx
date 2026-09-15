import Link from "next/link";
import { listPagePosts } from "@/lib/facebookGraph";

export default async function SocialOverviewPage() {
  let posts: Awaited<ReturnType<typeof listPagePosts>> = [];
  let error: string | null = null;

  try {
    posts = await listPagePosts(5);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load Facebook posts";
  }

  const totalComments = posts.reduce((sum, p) => sum + (p.comments?.summary.total_count ?? 0), 0);

  return (
    <div>
      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-value">{error ? "—" : posts.length}</span>
          <span className="admin-stat-label">Recent FB posts</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{error ? "—" : totalComments}</span>
          <span className="admin-stat-label">Comments (last 5 posts)</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">1 / 4</span>
          <span className="admin-stat-label">Platforms wired up</span>
        </div>
      </div>

      <p className="admin-mailbroom-note">
        Facebook is live — compose posts and manage comments under the Facebook tab.
        Instagram, Threads, and LinkedIn tabs are placeholders until those posting flows
        are added here too.
      </p>

      {error && <p className="social-compose-error">{error}</p>}

      {!error && posts.length > 0 && (
        <>
          <h2 className="admin-subtitle" style={{ fontSize: "1rem", marginTop: "1.5rem" }}>
            Latest Facebook activity
          </h2>
          {posts.map((post) => (
            <div key={post.id} className="social-post-card">
              <div className="social-post-meta">
                <span>{new Date(post.created_time).toLocaleString()}</span>
                <span>{post.comments?.summary.total_count ?? 0} comments</span>
              </div>
              <p className="social-post-message">{post.message ?? "(no text)"}</p>
            </div>
          ))}
          <Link href="/admin/social/facebook" className="social-comments-toggle">
            Manage on Facebook tab →
          </Link>
        </>
      )}
    </div>
  );
}

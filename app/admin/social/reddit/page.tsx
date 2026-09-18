import { redditConfigured, listSubscribedSubreddits, listMyRecentPosts } from "@/lib/redditApi";
import RedditFeed from "./RedditFeed";

export const dynamic = "force-dynamic";

export default async function RedditTabPage() {
  if (!redditConfigured()) {
    return (
      <p className="social-coming-soon">
        Reddit isn&apos;t wired up yet — run <code>npm run reddit:auth</code> after creating an app at{" "}
        <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noreferrer">
          reddit.com/prefs/apps
        </a>{" "}
        and setting REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET / REDDIT_USER_AGENT in .env.local. See
        scripts/reddit-auth.mjs for the full steps.
      </p>
    );
  }

  let subreddits: Awaited<ReturnType<typeof listSubscribedSubreddits>> = [];
  let posts: Awaited<ReturnType<typeof listMyRecentPosts>> = [];
  let error: string | null = null;

  try {
    [subreddits, posts] = await Promise.all([listSubscribedSubreddits(), listMyRecentPosts(15)]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load Reddit data";
  }

  return (
    <>
      {error && <p className="social-compose-error">{error}</p>}
      <RedditFeed subreddits={subreddits} initialPosts={posts} />
    </>
  );
}

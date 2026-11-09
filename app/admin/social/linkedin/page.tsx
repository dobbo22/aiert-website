import { isAdminRequest } from "@/lib/adminRequest";
import { linkedinConfigured, listLinkedInPosts, type LinkedInPost } from "@/lib/linkedinApi";
import LinkedInFeed from "./LinkedInFeed";

export const dynamic = "force-dynamic";

export default async function LinkedInTabPage() {
  // The login screen comes from the layout, but the page's data must not be fetched, or sent in the page source, for anyone else.
  if (!(await isAdminRequest())) return null;
  if (!linkedinConfigured()) {
    return <p className="social-compose-error">Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_ORG_URN in Vercel to turn this tab on.</p>;
  }

  let posts: LinkedInPost[] = [];
  let error: string | null = null;
  try {
    posts = await listLinkedInPosts(15);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load LinkedIn posts";
  }

  return (
    <>
      {error && <p className="social-compose-error">{error}</p>}
      <LinkedInFeed initialPosts={posts} />
    </>
  );
}

import { listMedia } from "@/lib/instagramGraph";
import InstagramFeed from "./InstagramFeed";
import { isAdminRequest } from "@/lib/adminRequest";

export const dynamic = "force-dynamic";

export default async function InstagramTabPage() {
  // The login screen comes from the layout, but the page's data must not be fetched, or sent in the page source, for anyone else.
  if (!(await isAdminRequest())) return null;
  let media: Awaited<ReturnType<typeof listMedia>> = [];
  let error: string | null = null;

  try {
    media = await listMedia(15);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load Instagram posts";
  }

  return (
    <>
      {error && <p className="social-compose-error">{error}</p>}
      <InstagramFeed initialMedia={media} />
    </>
  );
}

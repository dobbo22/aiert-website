import { listMedia } from "@/lib/instagramGraph";
import InstagramFeed from "./InstagramFeed";

export const dynamic = "force-dynamic";

export default async function InstagramTabPage() {
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

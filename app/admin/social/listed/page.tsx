import { isAdminRequest } from "@/lib/adminRequest";
import { listUniverse } from "@/lib/tapcardListedUniverse";
import ListedView from "./ListedView";

export const metadata = { title: "Listed universe — Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Every London-listed share line AIERT could approach (Main Market and AIM): kept in step with the exchange's stock lists, then checked
// company by company (website, investor pages, published price and market cap, board) in the steps that follow.
export default async function ListedUniversePage() {
  if (!(await isAdminRequest())) return null;
  const loaded = await listUniverse().then((rows) => ({ rows, error: "" })).catch((e: unknown) => ({ rows: [] as Awaited<ReturnType<typeof listUniverse>>, error: e instanceof Error ? e.message : "Could not load the list." }));
  return <ListedView rows={loaded.rows} loadError={loaded.error} />;
}

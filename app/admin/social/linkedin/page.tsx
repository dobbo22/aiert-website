import { isAdminRequest } from "@/lib/adminRequest";
export default async function LinkedInTabPage() {
  // The login screen comes from the layout, but the page's data must not be fetched, or sent in the page source, for anyone else.
  if (!(await isAdminRequest())) return null;
  return <p className="social-coming-soon">LinkedIn compose &amp; comments coming soon — waiting on Community Management API approval.</p>;
}

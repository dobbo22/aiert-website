import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import LoginForm from "../mailbroom/LoginForm";
import AdminHeader from "../AdminHeader";
import TabNav from "./TabNav";
import "../mailbroom/admin.css";
import "./social.css";

export const metadata = {
  title: "Social Media — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SocialLayout({ children }: { children: React.ReactNode }) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;

  if (!isValidAdminSession(session)) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen hero-gradient grid-bg">
      <AdminHeader />
      <div className="admin-page">
        <h1 className="admin-title" style={{ marginBottom: "1rem" }}>
          Social
        </h1>
        <TabNav />
        {children}
      </div>
    </div>
  );
}

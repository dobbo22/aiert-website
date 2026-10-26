import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import LoginForm from "../../mailbroom/LoginForm";
import AdminHeader from "../../AdminHeader";
import MarketingTabs from "../MarketingTabs";
import RestaurantMarketing from "./RestaurantMarketing";
import "../../mailbroom/admin.css";
import "../../social/social.css";
import "./restaurants.css";

export const metadata = {
  title: "Restaurants & cafes — Marketing — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RestaurantsMarketingPage() {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) return <LoginForm />;
  return (
    <div className="min-h-screen hero-gradient grid-bg">
      <AdminHeader />
      <div className="admin-page">
        <h1 className="admin-title" style={{ marginBottom: "1rem" }}>Marketing</h1>
        <MarketingTabs />
        <RestaurantMarketing />
      </div>
    </div>
  );
}

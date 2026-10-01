import LinksTabNav from "./LinksTabNav";
import "./invites.css";

export default function LinksLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <LinksTabNav />
      {children}
    </div>
  );
}

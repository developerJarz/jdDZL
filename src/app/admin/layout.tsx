import type { Metadata } from "next";
import "./admin.css";
export const metadata: Metadata = {
  title: "Dazzle | Store administration",
  robots: { index: false, follow: false },
};
// Applies the administrator's saved light/dark preference before first paint.
const themeScript = `try{document.documentElement.classList.toggle("dark",localStorage.getItem("dz-admin-theme")==="dark")}catch(e){}`;
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-root">
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      {children}
    </div>
  );
}

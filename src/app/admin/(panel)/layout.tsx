import { redirect } from "next/navigation";
import { user } from "@/server/auth";
import { isStaffRole } from "@/lib/permissions";
export const dynamic = "force-dynamic";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let current;
  try {
    current = await user();
  } catch {
    redirect("/admin/login?error=database");
  }
  if (!current || !isStaffRole(current.role)) redirect("/admin/login");
  return children;
}

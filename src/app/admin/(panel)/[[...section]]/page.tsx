import { notFound, redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { SECTION_PERMISSIONS } from "@/lib/permissions";
import { user } from "@/server/auth";

const SECTIONS = Object.keys(SECTION_PERMISSIONS);

export default async function AdminPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section = [] } = await params;
  const current = await user();
  if (!current) redirect("/admin/login");
  const name = section[0] || (current.role === "staff" ? "workspace" : "overview");
  const recordId = section[1];
  // Only products have a nested route: /admin/products/new and /admin/products/<id>.
  const validRecord =
    !recordId ||
    (name === "products" &&
      section.length === 2 &&
      (recordId === "new" || /^[a-f0-9]{24}$/i.test(recordId)));
  if (section.length > 2 || !SECTIONS.includes(name) || !validRecord) notFound();
  const me = {
    id: current._id.toString(),
    name: current.name ?? "Staff",
    email: current.email ?? "",
    role: current.role,
    staffRole: current.staffRole ?? (current.role === "admin" ? "Store owner" : "Staff"),
    permissions: current.permissions ?? [],
  };
  return <AdminDashboard section={name} recordId={recordId} me={me} />;
}

import { db } from "./db";
import { json } from "./http";
import { can, type StaffUser } from "@/lib/permissions";
import type { Document } from "mongodb";

/** Return queues only for areas this staff account can use. Never include costs or integration secrets. */
export async function staffDashboard(current: Document) {
  const database = await db();
  const staff = current as unknown as StaffUser;
  const queues: { id: string; label: string; count: number; href: string; description: string }[] = [];
  const add = async (id: string, label: string, collection: string, filter: Document, href: string, description: string) =>
    queues.push({ id, label, count: await database.collection(collection).countDocuments(filter), href, description });
  if (can(staff, "orders")) {
    await add("pending", "Pending orders", "orders", { status: "pending" }, "/admin/orders?status=pending", "Confirm new orders and arrange delivery.");
    await add("assigned", "Assigned to you", "orders", { "assignedTo.id": current._id.toString(), status: { $nin: ["delivered", "cancelled"] } }, "/admin/orders", "Follow up on your active orders.");
    await add("incomplete", "Incomplete checkouts", "incompleteOrders", { status: { $nin: ["converted", "dismissed"] } }, "/admin/incomplete", "Help customers finish their orders.");
  }
  if (can(staff, "inventory")) {
    const settings = await database.collection("settings").findOne({ key: "store" }, { projection: { lowStockThreshold: 1 } });
    await add("inventory", "Stock needs attention", "products", { active: { $ne: false }, $expr: { $lte: ["$stock", { $ifNull: ["$lowStockThreshold", settings?.lowStockThreshold ?? 5] }] } }, "/admin/inventory", "Review low quantities and update stock.");
  }
  if (can(staff, "engagement")) {
    await add("support", "Open support requests", "tickets", { status: { $nin: ["resolved", "rejected"] } }, "/admin/tickets", "Reply to questions, returns and warranty requests.");
    await add("reviews", "Reviews to moderate", "reviews", { status: "pending" }, "/admin/reviews", "Review customer feedback before publishing.");
  }
  if (can(staff, "products")) await add("products", "Active products", "products", { active: { $ne: false } }, "/admin/products", "Manage prices, photos and product information.");
  const assigned = can(staff, "orders") ? await database.collection("orders").find(
    { "assignedTo.id": current._id.toString(), status: { $nin: ["delivered", "cancelled"] } },
    { projection: { _id: 0, orderNo: 1, status: 1, createdAt: 1 } },
  ).sort({ updatedAt: -1 }).limit(8).toArray() : [];
  return json({
    profile: { name: current.name, email: current.email, phone: current.phone || "", staffRole: current.staffRole || (current.role === "admin" ? "Store owner" : "Staff"), role: current.role },
    queues, assigned,
  });
}

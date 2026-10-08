import type { Product } from "@/types";
export interface AdminProduct extends Product {
  _id: string;
  stock: number;
  active: boolean;
  description?: string;
  shortDescription?: string;
}
export interface Order {
  delivery?: string;
  note?: string;
  shipment?: {
    courier: string;
    trackingNumber: string;
    trackingUrl: string;
    note: string;
  };
  refund?: { amount: number; reference: string; at: string };
  _id: string;
  orderNo: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
  };
  items: {
    slug: string;
    name: string;
    qty: number;
    unitPrice: number;
    variant: string;
  }[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  timeline: { status: string; at: string }[];
}
export interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  createdAt: string;
}
export interface Coupon {
  _id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  expiresAt: string;
  active: boolean;
}
export interface Message {
  _id: string;
  kind: string;
  data: Record<string, string>;
  status: string;
  createdAt: string;
}
export interface Subscriber {
  _id: string;
  email: string;
  active: boolean;
  createdAt: string;
}
export interface Audit {
  _id: string;
  action: string;
  detail: string;
  actorId: string;
  entityId: string;
  createdAt: string;
}
export interface Settings {
  name: string;
  email: string;
  phone: string;
  address: string;
  shippingFee: number;
  outsideDhakaFee?: number;
  pickupEnabled?: boolean;
  freeShippingAbove: number;
  lowStockThreshold: number;
  currency: "BDT";
}
export interface Overview {
  revenue: number;
  orders: number;
  customers: number;
  products: number;
  lowStock: AdminProduct[];
  recentOrders: Order[];
  series: { _id: string; revenue: number; orders: number }[];
  statuses: { _id: string; count: number }[];
  topProducts: { _id: string; name: string; qty: number; revenue: number }[];
  recentActivity: Audit[];
  days: number;
}
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/commerce/${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    if (
      response.status === 401 &&
      location.pathname.startsWith("/admin") &&
      location.pathname !== "/admin/login"
    )
      window.dispatchEvent(new Event("dazzle:session-expired"));
    throw new Error(result.message || "Request failed.");
  }
  return result as T;
}
export const money = (value: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value);
export const date = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));

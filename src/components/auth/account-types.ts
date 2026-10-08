import type { Order } from "@/components/admin/types";
export interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  default: boolean;
}
export interface Ticket {
  _id: string;
  kind: string;
  orderNo: string;
  subject: string;
  status: string;
  customerName: string;
  email: string;
  createdAt: string;
  refundAmount?: number;
  refundReference?: string;
  messages: { author: string; text: string; at: string }[];
}
export interface AccountData {
  profile: { name: string; email: string; phone: string; addresses: Address[] };
  orders: Order[];
  tickets: Ticket[];
  wishlist: { slug: string; name: string; price: number; inStock: boolean }[];
}

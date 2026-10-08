import { z } from "zod";

export const bdPhone = z
  .string()
  .trim()
  .regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladesh mobile number")
  .transform((v) => v.replace(/^\+?88/, ""));
export const addressSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(180),
  phone: bdPhone,
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(10).max(800),
  default: z.boolean().default(false),
});
export const ticketSchema = z.object({
  kind: z.enum(["support", "return", "warranty", "trade-in"]),
  orderNo: z.string().max(60).default(""),
  subject: z.string().trim().min(4).max(180),
  message: z.string().trim().min(10).max(4000),
});
export const ticketTransitions: Record<string, string[]> = {
  open: ["in-progress", "rejected"],
  "in-progress": ["awaiting-customer", "approved", "resolved", "rejected"],
  "awaiting-customer": ["in-progress", "resolved"],
  approved: ["received", "resolved"],
  received: ["resolved"],
  resolved: [],
  rejected: [],
};

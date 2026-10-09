import { notFound, redirect } from "next/navigation";
import { user } from "@/server/auth";
import { db } from "@/server/db";
import { cleanStoreIdentity } from "@/server/content-brand";
import { can, type StaffUser } from "@/lib/permissions";
import { PrintInvoice } from "@/components/auth/PrintInvoice";
import type { Order } from "@/components/admin/types";
import "./invoice.css";
export const metadata = {
  title: "Order invoice",
  robots: { index: false, follow: false },
};
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;
  const current = await user();
  if (!current)
    redirect(
      `/auth/login?redirect=${encodeURIComponent(`/account/invoice/${orderNo}`)}`,
    );
  const database = await db();
  const order = await database
    .collection("orders")
    .findOne({
      orderNo,
      ...(!can(current as unknown as StaffUser, "orders") ? { userId: current._id.toString() } : {}),
    });
  if (!order) notFound();
  const settings = cleanStoreIdentity((await database
    .collection("settings")
    .findOne({ key: "store" })) ?? {});
  const amount = (v: number) => `BDT ${v.toLocaleString("en-BD")}`;
  return (
    <main className="invoice-document">
      <div className="invoice-header">
        <div>
          <h1>{settings?.name || "dazzle.bd"}</h1>
          <p>{settings?.address}</p>
          <p>
            {settings?.phone} · {settings?.email}
          </p>
        </div>
        <div>
          <h2>ORDER INVOICE</h2>
          <strong>{order.orderNo}</strong>
          <p>
            {new Date(order.createdAt).toLocaleDateString("en-GB", {
              timeZone: "Asia/Dhaka",
            })}
          </p>
          <PrintInvoice />
        </div>
      </div>
      <div className="invoice-header">
        <div>
          <h3>Bill to</h3>
          <p>
            {order.customer.name}
            <br />
            {order.customer.address}, {order.customer.city}
            <br />
            {order.customer.phone}
            <br />
            {order.customer.email}
          </p>
        </div>
        <div>
          <h3>Order details</h3>
          <p>
            Status: {order.status}
            <br />
            Payment: {order.paymentStatus}
            <br />
            Cash on delivery ·{" "}
            {order.delivery === "pickup" ? "Store pickup" : "Home delivery"}
          </p>
        </div>
      </div>
      <div className="invoice-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(order.items as Order["items"]).map((item, i) => (
              <tr key={i}>
                <td>
                  {item.name}
                  <small>{item.variant}</small>
                </td>
                <td>{item.qty}</td>
                <td>{amount(item.unitPrice)}</td>
                <td>{amount(item.unitPrice * item.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl>
        {[
          ["Subtotal", order.subtotal],
          ["Discount", -order.discount],
          ["Delivery", order.shipping],
          ["Total", order.total],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <dt>{label}</dt>
            <dd>{amount(Number(value))}</dd>
          </div>
        ))}
        {order.refund && (
          <div>
            <dt>Refund recorded</dt>
            <dd>{amount(order.refund.amount)}</dd>
          </div>
        )}
      </dl>
      {order.shipment && (
        <p>
          Shipment: {order.shipment.courier} · {order.shipment.trackingNumber}
        </p>
      )}
      <p className="invoice-footnote">
        Keep this invoice for order support and warranty enquiries. Payment is
        confirmed when the order is marked paid. For help, contact the store or
        open a request in your account.
      </p>
    </main>
  );
}

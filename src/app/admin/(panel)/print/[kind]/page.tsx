import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { user } from "@/server/auth";
import { db } from "@/server/db";
import { canAny, type StaffUser } from "@/lib/permissions";
import { getStoreSettings } from "@/server/integrations/config";
import { BarcodeSheet, PrintToolbar } from "@/components/admin/print/PrintParts";
import "@/components/admin/print/print.css";

export const metadata = { title: "Print", robots: { index: false, follow: false } };

const taka = (v: number) => `৳${Math.round(v).toLocaleString("en-BD")}`;
const dhaka = (d: Date | string) => new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const ids = (value?: string) => (value ?? "").split(",").filter((v) => /^[a-f0-9]{24}$/i.test(v)).slice(0, 200).map((v) => new ObjectId(v));

export default async function PrintPage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ kind }, query, current] = await Promise.all([params, searchParams, user()]);
  if (!current) redirect("/admin/login");
  const staff = current as unknown as StaffUser;
  const database = await db();
  const store = await getStoreSettings();

  if (kind === "invoices" || kind === "receipt") {
    if (!canAny(staff, kind === "receipt" ? ["pos", "orders"] : ["orders"])) notFound();
    const orders = await database.collection("orders").find({ _id: { $in: ids(query.ids ?? query.id) } }).sort({ createdAt: 1 }).toArray();
    if (!orders.length) notFound();
    if (kind === "receipt") {
      const o = orders[0];
      const paid = (o.payments ?? []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
      const tendered = Number(query.tendered) || paid;
      return (
        <main className="receipt">
          <PrintToolbar auto={query.auto === "1"} />
          <h1>{store.name}</h1>
          <p className="center">{store.address}</p>
          <p className="center">{store.phone}</p>
          <hr />
          <p>
            Receipt: <strong>{o.orderNo}</strong>
            <br />
            {dhaka(o.createdAt)}
            <br />
            Cashier: {o.assignedTo?.name ?? "Staff"}
            {o.customer?.name && o.customer.name !== "Walk-in customer" && (
              <>
                <br />
                Customer: {o.customer.name} {o.customer.phone}
              </>
            )}
          </p>
          <hr />
          <table>
            <tbody>
              {o.items.map((i: { name: string; variant: string; qty: number; unitPrice: number }, n: number) => (
                <tr key={n}>
                  <td>
                    {i.name}
                    {i.variant ? ` (${i.variant})` : ""}
                    <br />
                    <small>
                      {i.qty} × {taka(i.unitPrice)}
                    </small>
                  </td>
                  <td className="right">{taka(i.qty * i.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr />
          <table>
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td className="right">{taka(o.subtotal)}</td>
              </tr>
              {o.discount > 0 && (
                <tr>
                  <td>Discount</td>
                  <td className="right">−{taka(o.discount)}</td>
                </tr>
              )}
              <tr className="total">
                <td>Total</td>
                <td className="right">{taka(o.total)}</td>
              </tr>
              {(o.payments ?? []).map((p: { method: string; amount: number }, n: number) => (
                <tr key={n}>
                  <td>{p.method}</td>
                  <td className="right">{taka(p.amount)}</td>
                </tr>
              ))}
              {tendered > paid && (
                <tr>
                  <td>Change</td>
                  <td className="right">{taka(tendered - paid)}</td>
                </tr>
              )}
            </tbody>
          </table>
          <hr />
          <p className="center">Thank you for shopping with us!</p>
        </main>
      );
    }
    return (
      <main className="invoices">
        <PrintToolbar auto={query.auto === "1"} label={`Print ${orders.length} invoice${orders.length > 1 ? "s" : ""}`} />
        {orders.map((o) => {
          const paid = o.paidAmount ?? (o.paymentStatus === "paid" ? o.total : 0);
          return (
            <section className="invoice" key={String(o._id)}>
              <header>
                <div>
                  <h1>{store.name}</h1>
                  <p>{store.address}</p>
                  <p>
                    {store.phone} · {store.email}
                  </p>
                </div>
                <div className="right">
                  <h2>INVOICE</h2>
                  <strong>{o.orderNo}</strong>
                  <p>{dhaka(o.createdAt)}</p>
                </div>
              </header>
              <div className="parties">
                <div>
                  <h3>Deliver to</h3>
                  <p>
                    <strong>{o.customer.name}</strong>
                    <br />
                    {o.customer.phone}
                    <br />
                    {o.customer.address}, {o.customer.city}
                  </p>
                </div>
                <div className="right">
                  <h3>Payment</h3>
                  <p>
                    {o.paymentMethod === "cash-on-delivery" ? "Cash on delivery" : o.paymentMethod}
                    <br />
                    Status: {o.paymentStatus}
                    {o.shipment?.trackingNumber && (
                      <>
                        <br />
                        {o.shipment.courier}: {o.shipment.trackingNumber}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <table className="lines">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="right">Qty</th>
                    <th className="right">Price</th>
                    <th className="right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {o.items.map((i: { name: string; variant: string; sku?: string; qty: number; unitPrice: number }, n: number) => (
                    <tr key={n}>
                      <td>
                        {i.name}
                        {(i.variant || i.sku) && (
                          <small>
                            {[i.variant, i.sku].filter(Boolean).join(" · ")}
                          </small>
                        )}
                      </td>
                      <td className="right">{i.qty}</td>
                      <td className="right">{taka(i.unitPrice)}</td>
                      <td className="right">{taka(i.qty * i.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="totals">
                <tbody>
                  <tr>
                    <td>Subtotal</td>
                    <td>{taka(o.subtotal)}</td>
                  </tr>
                  <tr>
                    <td>Discount</td>
                    <td>−{taka(o.discount)}</td>
                  </tr>
                  <tr>
                    <td>Delivery</td>
                    <td>{taka(o.shipping)}</td>
                  </tr>
                  <tr className="total">
                    <td>Total</td>
                    <td>{taka(o.total)}</td>
                  </tr>
                  <tr>
                    <td>Paid</td>
                    <td>{taka(paid)}</td>
                  </tr>
                  <tr className="due">
                    <td>Amount to collect</td>
                    <td>{taka(Math.max(0, o.total - paid))}</td>
                  </tr>
                </tbody>
              </table>
              {o.note && <p className="note">Note: {o.note}</p>}
              <footer>Thank you for your order. Keep this invoice for warranty and returns.</footer>
            </section>
          );
        })}
      </main>
    );
  }

  if (kind === "barcodes") {
    if (!canAny(staff, ["products", "inventory", "pos"])) notFound();
    const products = await database
      .collection("products")
      .find({ _id: { $in: ids(query.ids) } }, { projection: { name: 1, code: 1, barcode: 1, price: 1, trackVariants: 1, variantStock: 1 } })
      .toArray();
    const copies = Math.min(100, Math.max(1, Number(query.copies) || 1));
    const labels = products.flatMap((p) => {
      const rows = p.trackVariants && p.variantStock?.length
        ? p.variantStock.map((v: { key: string; barcode: string; sku: string; price: number | null }) => ({ name: `${p.name} (${v.key})`, code: v.barcode || v.sku || p.barcode || p.code, price: v.price || p.price }))
        : [{ name: p.name, code: p.barcode || p.code, price: p.price }];
      return rows.flatMap((r: { name: string; code: string; price: number }) => Array.from({ length: copies }, () => r));
    });
    return <BarcodeSheet store={store.name} labels={labels} />;
  }
  notFound();
}

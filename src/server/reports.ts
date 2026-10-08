import type { Document } from "mongodb";
import { z } from "zod";
import { db } from "./db";

const TZ = "Asia/Dhaka";
export const REPORT_TYPES = ["sales", "profit", "stock", "stock-alert", "purchase", "expense"] as const;

const period = (field: string, group: "day" | "month") => ({ $dateToString: { format: group === "day" ? "%Y-%m-%d" : "%Y-%m", date: field, timezone: TZ } });

/** Dates from the query (YYYY-MM-DD in Dhaka time); defaults to the last 30 days. */
function range(params: URLSearchParams) {
  const day = (v: string | null, end = false) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T${end ? "23:59:59.999" : "00:00:00.000"}+06:00`) : null);
  const to = day(params.get("to"), true) ?? new Date();
  const from = day(params.get("from")) ?? new Date(to.getTime() - 29 * 86400_000);
  return { from, to };
}

export async function report(params: URLSearchParams) {
  const type = z.enum(REPORT_TYPES).parse(params.get("type") ?? "sales");
  const group = params.get("group") === "month" ? "month" : "day";
  const { from, to } = range(params);
  const database = await db();
  const orders = database.collection("orders");
  const base = { type, group, from, to };

  if (type === "sales") {
    const match = { createdAt: { $gte: from, $lte: to }, status: { $ne: "cancelled" } };
    const [series, byChannel, byPayment, byStatus, products, cancelled] = await Promise.all([
      orders
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: period("$createdAt", group),
              orders: { $sum: 1 },
              units: { $sum: { $sum: "$items.qty" } },
              gross: { $sum: "$subtotal" },
              discount: { $sum: "$discount" },
              shipping: { $sum: "$shipping" },
              total: { $sum: "$total" },
              collected: { $sum: { $ifNull: ["$paidAmount", { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$total", 0] }] } },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      orders.aggregate([{ $match: match }, { $group: { _id: { $ifNull: ["$channel", "web"] }, orders: { $sum: 1 }, total: { $sum: "$total" } } }, { $sort: { total: -1 } }]).toArray(),
      orders.aggregate([{ $match: match }, { $group: { _id: "$paymentMethod", orders: { $sum: 1 }, total: { $sum: "$total" } } }, { $sort: { total: -1 } }]).toArray(),
      orders.aggregate([{ $match: { createdAt: { $gte: from, $lte: to } } }, { $group: { _id: "$status", orders: { $sum: 1 }, total: { $sum: "$total" } } }]).toArray(),
      orders
        .aggregate([
          { $match: match },
          { $unwind: "$items" },
          { $group: { _id: "$items.slug", name: { $first: "$items.name" }, qty: { $sum: "$items.qty" }, revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.qty"] } } } },
          { $sort: { revenue: -1 } },
          { $limit: 25 },
        ])
        .toArray(),
      orders.countDocuments({ createdAt: { $gte: from, $lte: to }, status: "cancelled" }),
    ]);
    const sum = (k: string) => series.reduce((s, r) => s + (r[k] ?? 0), 0);
    return {
      ...base,
      summary: { orders: sum("orders"), units: sum("units"), gross: sum("gross"), discount: sum("discount"), shipping: sum("shipping"), total: sum("total"), collected: sum("collected"), cancelled, average: sum("orders") ? Math.round(sum("total") / sum("orders")) : 0 },
      series,
      tables: { byChannel, byPayment, byStatus, products },
    };
  }

  if (type === "profit") {
    // Profit uses delivered orders by delivery date (cash actually earned) and item cost at sale time.
    const [rows, expenses] = await Promise.all([
      orders
        .aggregate([
          { $match: { status: "delivered", updatedAt: { $gte: from, $lte: to } } },
          { $unwind: "$items" },
          { $lookup: { from: "products", localField: "items.slug", foreignField: "slug", pipeline: [{ $project: { _id: 0, costPrice: 1 } }], as: "product" } },
          {
            $project: {
              orderId: "$_id",
              period: period("$updatedAt", group),
              line: { $multiply: ["$items.unitPrice", "$items.qty"] },
              qty: "$items.qty",
              unitCost: { $ifNull: ["$items.cost", { $first: "$product.costPrice" }] },
              discount: 1,
              shipping: 1,
              refund: { $ifNull: ["$refund.amount", 0] },
            },
          },
          {
            $group: {
              _id: "$orderId",
              period: { $first: "$period" },
              sales: { $sum: "$line" },
              cogs: { $sum: { $multiply: ["$qty", { $ifNull: ["$unitCost", 0] }] } },
              unknownCostUnits: { $sum: { $cond: [{ $eq: [{ $ifNull: ["$unitCost", null] }, null] }, "$qty", 0] } },
              discount: { $first: "$discount" },
              shipping: { $first: "$shipping" },
              refund: { $first: "$refund" },
            },
          },
          {
            $group: {
              _id: "$period",
              orders: { $sum: 1 },
              sales: { $sum: "$sales" },
              discount: { $sum: "$discount" },
              shipping: { $sum: "$shipping" },
              refunds: { $sum: "$refund" },
              cogs: { $sum: "$cogs" },
              unknownCostUnits: { $sum: "$unknownCostUnits" },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      database
        .collection("expenses")
        .aggregate([{ $match: { date: { $gte: from, $lte: to } } }, { $group: { _id: period("$date", group), amount: { $sum: "$amount" } } }])
        .toArray(),
    ]);
    const expenseBy = new Map(expenses.map((e) => [e._id, e.amount]));
    const periods = [...new Set([...rows.map((r) => r._id), ...expenses.map((e) => e._id)])].sort();
    const series = periods.map((p) => {
      const r = rows.find((x) => x._id === p) ?? ({ orders: 0, sales: 0, discount: 0, shipping: 0, refunds: 0, cogs: 0, unknownCostUnits: 0 } as Document);
      const netSales = r.sales - r.discount - r.refunds;
      const grossProfit = netSales - r.cogs;
      const expense = expenseBy.get(p) ?? 0;
      return { _id: p, orders: r.orders, netSales, shipping: r.shipping, cogs: r.cogs, grossProfit, expenses: expense, netProfit: grossProfit + r.shipping - expense, unknownCostUnits: r.unknownCostUnits };
    });
    const sum = (k: keyof (typeof series)[number]) => series.reduce((s, r) => s + Number(r[k] ?? 0), 0);
    const netSales = sum("netSales");
    return {
      ...base,
      summary: {
        orders: sum("orders"),
        netSales,
        shipping: sum("shipping"),
        cogs: sum("cogs"),
        grossProfit: sum("grossProfit"),
        expenses: sum("expenses"),
        netProfit: sum("netProfit"),
        margin: netSales ? Math.round((sum("grossProfit") / netSales) * 1000) / 10 : 0,
        unknownCostUnits: sum("unknownCostUnits"),
      },
      series,
      tables: {},
    };
  }

  if (type === "stock" || type === "stock-alert") {
    const threshold = (await database.collection("settings").findOne({ key: "store" }))?.lowStockThreshold ?? 5;
    const filter: Document =
      type === "stock"
        ? { active: { $ne: false } }
        : { active: { $ne: false }, $expr: { $lte: ["$stock", { $ifNull: ["$lowStockThreshold", threshold] }] } };
    const products = await database
      .collection("products")
      .find(filter, { projection: { name: 1, code: 1, slug: 1, stock: 1, price: 1, costPrice: 1, categorySlugs: 1, lowStockThreshold: 1, image: 1 } })
      .sort(type === "stock" ? { stock: -1 } : { stock: 1 })
      .limit(type === "stock" ? 5000 : 500)
      .toArray();
    const rows = products.map((p) => ({
      _id: p._id,
      name: p.name,
      code: p.code,
      slug: p.slug,
      image: p.image,
      category: p.categorySlugs?.[0] ?? "",
      stock: p.stock ?? 0,
      alertAt: p.lowStockThreshold ?? threshold,
      cost: p.costPrice ?? null,
      price: p.price,
      costValue: (p.stock ?? 0) * (p.costPrice ?? 0),
      retailValue: (p.stock ?? 0) * (p.price ?? 0),
    }));
    const byCategory = Object.values(
      rows.reduce<Record<string, { _id: string; products: number; units: number; costValue: number; retailValue: number }>>((acc, r) => {
        const c = (acc[r.category || "uncategorized"] ??= { _id: r.category || "uncategorized", products: 0, units: 0, costValue: 0, retailValue: 0 });
        c.products++;
        c.units += r.stock;
        c.costValue += r.costValue;
        c.retailValue += r.retailValue;
        return acc;
      }, {}),
    ).sort((a, b) => b.retailValue - a.retailValue);
    return {
      ...base,
      summary: {
        products: rows.length,
        units: rows.reduce((s, r) => s + r.stock, 0),
        costValue: rows.reduce((s, r) => s + r.costValue, 0),
        retailValue: rows.reduce((s, r) => s + r.retailValue, 0),
        outOfStock: rows.filter((r) => r.stock <= 0).length,
        noCost: rows.filter((r) => r.cost === null).length,
      },
      series: [],
      tables: { products: type === "stock" ? rows.slice(0, 500) : rows, byCategory },
    };
  }

  if (type === "purchase") {
    const purchases = database.collection("purchases");
    const match = { date: { $gte: from, $lte: to } };
    const [series, bySupplier, items] = await Promise.all([
      purchases.aggregate([{ $match: match }, { $group: { _id: period("$date", group), purchases: { $sum: 1 }, total: { $sum: "$total" }, paid: { $sum: "$paid" }, due: { $sum: "$due" } } }, { $sort: { _id: 1 } }]).toArray(),
      purchases
        .aggregate([
          { $match: match },
          { $group: { _id: "$supplierId", purchases: { $sum: 1 }, total: { $sum: "$total" }, due: { $sum: "$due" } } },
          { $lookup: { from: "suppliers", let: { id: "$_id" }, pipeline: [{ $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$id"] } } }, { $project: { name: 1 } }], as: "supplier" } },
          { $set: { name: { $ifNull: [{ $first: "$supplier.name" }, "No supplier"] } } },
          { $unset: "supplier" },
          { $sort: { total: -1 } },
        ])
        .toArray(),
      purchases
        .aggregate([
          { $match: match },
          { $unwind: "$items" },
          { $group: { _id: "$items.slug", name: { $first: "$items.name" }, qty: { $sum: "$items.qty" }, cost: { $sum: { $multiply: ["$items.qty", "$items.unitCost"] } } } },
          { $sort: { cost: -1 } },
          { $limit: 25 },
        ])
        .toArray(),
    ]);
    const sum = (k: string) => series.reduce((s, r) => s + (r[k] ?? 0), 0);
    return { ...base, summary: { purchases: sum("purchases"), total: sum("total"), paid: sum("paid"), due: sum("due") }, series, tables: { bySupplier, items } };
  }

  // expense
  const expenses = database.collection("expenses");
  const match = { date: { $gte: from, $lte: to } };
  const [series, byCategory] = await Promise.all([
    expenses.aggregate([{ $match: match }, { $group: { _id: period("$date", group), amount: { $sum: "$amount" }, entries: { $sum: 1 } } }, { $sort: { _id: 1 } }]).toArray(),
    expenses.aggregate([{ $match: match }, { $group: { _id: "$category", amount: { $sum: "$amount" }, entries: { $sum: 1 } } }, { $sort: { amount: -1 } }]).toArray(),
  ]);
  return { ...base, summary: { amount: series.reduce((s, r) => s + r.amount, 0), entries: series.reduce((s, r) => s + r.entries, 0) }, series, tables: { byCategory } };
}


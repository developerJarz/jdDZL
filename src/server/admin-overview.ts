import type { Db } from "mongodb";

const DAY = 86400_000;
const net = { $subtract: ["$total", { $ifNull: ["$refund.amount", 0] }] };
const dhakaDay = (field: string) => ({
  $dateToString: { format: "%Y-%m-%d", date: field, timezone: "Asia/Dhaka" },
});

/**
 * Dashboard analytics. Revenue is cash collected (delivered orders, net of refunds) by
 * delivery date; order counts use the creation date. Each figure is paired with the
 * equivalent previous period so the dashboard can show trends.
 */
export async function overview(database: Db, requestedDays: number) {
  const days = Math.min(365, Math.max(1, Math.floor(requestedDays) || 30));
  const now = Date.now();
  const since = new Date(now - days * DAY);
  const before = new Date(now - 2 * days * DAY);
  const orders = database.collection("orders");
  const products = database.collection("products");
  const users = database.collection("users");
  const threshold =
    (await database.collection("settings").findOne({ key: "store" }))
      ?.lowStockThreshold ?? 5;
  const delivered = (from: Date, to?: Date) => ({
    status: "delivered",
    updatedAt: to ? { $gte: from, $lt: to } : { $gte: from },
  });
  const revenueBetween = (from: Date, to?: Date) =>
    orders
      .aggregate([
        { $match: delivered(from, to) },
        { $group: { _id: null, total: { $sum: net }, count: { $sum: 1 } } },
      ])
      .toArray();

  const [
    revenueNow,
    revenuePrev,
    ordersNow,
    ordersPrev,
    customers,
    newCustomers,
    newCustomersPrev,
    activeProducts,
    lowStock,
    recentOrders,
    series,
    orderSeries,
    statuses,
    topProducts,
    categoryRevenue,
    recentActivity,
    health,
    inbox,
  ] = await Promise.all([
    revenueBetween(since),
    revenueBetween(before, since),
    orders.countDocuments({ createdAt: { $gte: since } }),
    orders.countDocuments({ createdAt: { $gte: before, $lt: since } }),
    users.countDocuments({ role: "customer" }),
    users.countDocuments({ role: "customer", createdAt: { $gte: since } }),
    users.countDocuments({
      role: "customer",
      createdAt: { $gte: before, $lt: since },
    }),
    products.countDocuments({ active: { $ne: false } }),
    products
      .find(
        { active: { $ne: false }, $expr: { $lte: ["$stock", { $ifNull: ["$lowStockThreshold", threshold] }] } },
        { projection: { name: 1, code: 1, slug: 1, stock: 1, image: 1 } },
      )
      .sort({ stock: 1, updatedAt: -1 })
      .limit(6)
      .toArray(),
    orders.find().sort({ createdAt: -1 }).limit(7).toArray(),
    orders
      .aggregate([
        { $match: delivered(since) },
        {
          $group: {
            _id: dhakaDay("$updatedAt"),
            revenue: { $sum: net },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    orders
      .aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: dhakaDay("$createdAt"),
            orders: { $sum: 1 },
            value: { $sum: "$total" },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    orders.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
    orders
      .aggregate([
        { $match: delivered(since) },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.slug",
            name: { $first: "$items.name" },
            qty: { $sum: "$items.qty" },
            revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.qty"] } },
          },
        },
        { $sort: { qty: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "slug",
            pipeline: [{ $project: { _id: 0, image: 1 } }],
            as: "product",
          },
        },
        { $set: { image: { $first: "$product.image" } } },
        { $unset: "product" },
      ])
      .toArray(),
    orders
      .aggregate([
        { $match: delivered(since) },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.slug",
            foreignField: "slug",
            pipeline: [{ $project: { _id: 0, categorySlugs: 1 } }],
            as: "product",
          },
        },
        {
          $group: {
            _id: {
              $ifNull: [
                { $first: { $first: "$product.categorySlugs" } },
                "uncategorized",
              ],
            },
            revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.qty"] } },
            qty: { $sum: "$items.qty" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 6 },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "slug",
            pipeline: [{ $project: { _id: 0, name: 1 } }],
            as: "category",
          },
        },
        { $set: { name: { $ifNull: [{ $first: "$category.name" }, "Uncategorized"] } } },
        { $unset: "category" },
      ])
      .toArray(),
    database.collection("audit").find().sort({ createdAt: -1 }).limit(6).toArray(),
    products
      .aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            archived: { $sum: { $cond: [{ $eq: ["$active", false] }, 1, 0] } },
            outOfStock: {
              $sum: {
                $cond: [{ $and: [{ $ne: ["$active", false] }, { $lte: ["$stock", 0] }] }, 1, 0],
              },
            },
            lowStock: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$active", false] },
                      { $gt: ["$stock", 0] },
                      { $lte: ["$stock", threshold] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            noImage: { $sum: { $cond: [{ $eq: [{ $ifNull: ["$image", null] }, null] }, 1, 0] } },
            noCategory: {
              $sum: { $cond: [{ $eq: [{ $size: { $ifNull: ["$categorySlugs", []] } }, 0] }, 1, 0] },
            },
            noPrice: {
              $sum: {
                $cond: [{ $and: [{ $lte: ["$price", 0] }, { $ne: ["$isTba", true] }] }, 1, 0],
              },
            },
            units: { $sum: { $max: ["$stock", 0] } },
            stockValue: { $sum: { $multiply: [{ $max: ["$stock", 0] }, "$price"] } },
            stockCost: {
              $sum: { $multiply: [{ $max: ["$stock", 0] }, { $ifNull: ["$costPrice", 0] }] },
            },
          },
        },
      ])
      .toArray(),
    Promise.all([
      database.collection("messages").countDocuments({ status: "new" }),
      database.collection("tickets").countDocuments({ status: { $in: ["open", "in-progress"] } }),
      database.collection("reviews").countDocuments({ status: "pending" }),
    ]),
  ]);

  const revenue = revenueNow[0]?.total || 0;
  const deliveredCount = revenueNow[0]?.count || 0;
  const prevRevenue = revenuePrev[0]?.total || 0;
  const prevDelivered = revenuePrev[0]?.count || 0;
  return {
    days,
    revenue,
    orders: ordersNow,
    customers,
    products: activeProducts,
    newCustomers,
    averageOrderValue: deliveredCount ? Math.round(revenue / deliveredCount) : 0,
    previous: {
      revenue: prevRevenue,
      orders: ordersPrev,
      newCustomers: newCustomersPrev,
      averageOrderValue: prevDelivered ? Math.round(prevRevenue / prevDelivered) : 0,
    },
    pendingOrders: statuses.find((s) => s._id === "pending")?.count || 0,
    lowStock,
    recentOrders,
    series,
    orderSeries,
    statuses,
    topProducts,
    categoryRevenue,
    recentActivity,
    health: health[0] ?? null,
    inbox: { messages: inbox[0], tickets: inbox[1], reviews: inbox[2] },
  };
}

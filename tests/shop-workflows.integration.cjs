const assert = require("node:assert/strict");
const { randomUUID, createHash } = require("node:crypto");
const { MongoClient, ObjectId } = require("mongodb");
require("@next/env").loadEnvConfig(process.cwd());
const origin = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const prefix = `workflow-test-${Date.now()}`;
const email = `${prefix}@example.com`,
  otherEmail = `${prefix}-other@example.com`,
  slug = `${prefix}-phone`;
const cookies = { admin: "", customer: "", other: "" };
let checks = 0;
function check(v, message) {
  assert.ok(v, message);
  console.log("PASS", message);
  checks++;
}
async function req(path, actor = "customer", data, method = "POST") {
  const response = await fetch(`${origin}/api/commerce/${path}`, {
    method: data === undefined ? "GET" : method,
    headers: {
      origin,
      "content-type": "application/json",
      cookie: cookies[actor] || "",
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const cookie = response.headers.get("set-cookie");
  if (cookie) cookies[actor] = cookie.split(";")[0];
  return { status: response.status, data: await response.json() };
}
async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
  });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "dazzle_store");
  const ids = [];
  try {
    check(
      (
        await req("auth/login", "admin", {
          username: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD,
        })
      ).status === 200,
      "Admin login",
    );
    const phone = "018" + String(Date.now()).slice(-8);
    check(
      (
        await req("auth/register", "customer", {
          name: "Workflow Customer",
          email,
          phone,
          password: "Test-pass-123!",
        })
      ).status === 201,
      "Customer signup",
    );
    check(
      (
        await req("auth/register", "other", {
          name: "Other Customer",
          email: otherEmail,
          phone: "019" + phone.slice(-8),
          password: "Test-pass-123!",
        })
      ).status === 201,
      "Second customer signup",
    );
    const product = {
      name: prefix,
      slug,
      code: prefix,
      price: 1000,
      regularPrice: 1200,
      stock: 6,
      brandName: "Apple",
      brandSlug: "apple",
      categorySlugs: ["smartphone"],
      imageSrc: "",
      active: true,
      badge: "",
    };
    const created = await req("admin/products", "admin", product);
    check(created.status === 201, "Test product created");
    ids.push(created.data.id);
    const address = {
      id: randomUUID(),
      label: "Home",
      name: "Workflow Customer",
      phone: "+88" + phone,
      city: "Chattogram",
      address: "House 12, Road 4, Chattogram",
      default: true,
    };
    check(
      (await req("account/addresses", "customer", { addresses: [address] }))
        .status === 200,
      "Address saved with normalized Bangladesh phone",
    );
    const dashboard = (await req("account/dashboard")).data;
    check(
      dashboard.profile.addresses[0].phone === phone,
      "Address book persisted",
    );
    check(
      (
        await req("account/addresses", "customer", {
          addresses: [address, { ...address, id: randomUUID() }],
        })
      ).status === 400,
      "Multiple default addresses rejected",
    );
    check(
      (
        await req("account/profile", "customer", {
          name: "Updated Customer",
          phone,
        })
      ).status === 200,
      "Profile updated",
    );
    check(
      (await req("account/wishlist", "customer", { slug, saved: true }))
        .status === 200 &&
        (await req("account/wishlist")).data.items.some((p) => p.slug === slug),
      "Wishlist persists in MongoDB",
    );
    check(
      !(await req("account/wishlist", "other")).data.items.some(
        (p) => p.slug === slug,
      ),
      "Wishlist is private",
    );
    const me = (await req("auth/me")).data.user;
    check(
      (
        await req(`admin/operations/customers/${me._id}`, "admin", {
          notes: "Private CRM note",
          tags: ["VIP"],
        })
      ).status === 200,
      "Admin CRM notes saved",
    );
    check(
      !(await req("auth/me")).data.user.notes,
      "Internal notes excluded from customer session payload",
    );
    check(
      (await req(`admin/operations/customers/${me._id}`, "customer")).status ===
        403,
      "Customer cannot access CRM",
    );
    const items = [{ slug, qty: 1 }];
    const options = (await req("checkout/options")).data;
    const quote = await req("checkout/quote", "customer", {
      items,
      coupon: "",
      city: "Chattogram",
      delivery: "delivery",
    });
    check(
      quote.status === 200 && quote.data.shipping === options.outsideDhakaFee,
      "Outside Dhaka delivery price calculated on server",
    );
    const checkout = {
      customer: {
        name: "Workflow Customer",
        email,
        phone,
        city: "Chattogram",
        address: address.address,
      },
      items,
      coupon: "",
      note: "Call before arrival",
      delivery: "delivery",
      idempotencyKey: randomUUID(),
    };
    let placed = await req("orders", "customer", checkout);
    check(
      placed.status === 201,
      "Checkout with saved address and delivery note",
    );
    const cancelledOrder = placed.data.order;
    ids.push(cancelledOrder._id);
    check(
      (
        await req("account/cancel", "other", {
          orderNo: cancelledOrder.orderNo,
        })
      ).status === 404,
      "Another customer cannot cancel this order",
    );
    check(
      (
        await req("account/cancel", "customer", {
          orderNo: cancelledOrder.orderNo,
        })
      ).status === 200,
      "Customer cancellation succeeds before processing",
    );
    check(
      (
        await req("account/cancel", "customer", {
          orderNo: cancelledOrder.orderNo,
        })
      ).status === 409,
      "Repeated cancellation cannot restore stock twice",
    );
    check(
      (await db.collection("products").findOne({ slug })).stock === 6,
      "Cancellation restored stock exactly once",
    );
    placed = await req("orders", "customer", {
      ...checkout,
      idempotencyKey: randomUUID(),
    });
    const order = placed.data.order;
    ids.push(order._id);
    check(
      (
        await req(`admin/operations/shipment/${order._id}`, "admin", {
          courier: "Test courier",
          trackingNumber: "REF123",
          trackingUrl: "javascript:alert(1)",
          note: "",
        })
      ).status === 400,
      "Unsafe tracking URL rejected",
    );
    check(
      (
        await req(`admin/operations/shipment/${order._id}`, "admin", {
          courier: "Test courier",
          trackingNumber: "REF123",
          trackingUrl: "https://example.com/track/REF123",
          note: "Call before delivery",
        })
      ).status === 200,
      "Shipment tracking saved",
    );
    for (const status of ["confirmed", "processing", "shipped", "delivered"]) {
      check(
        (await req(`admin/orders/${order._id}`, "admin", { status }, "PATCH"))
          .status === 200,
        `Order ${status}`,
      );
      if (status === "processing")
        check(
          (await req("account/cancel", "customer", { orderNo: order.orderNo }))
            .status === 409,
          "Customer cancellation blocked after processing begins",
        );
    }
    const invoice = await fetch(`${origin}/account/invoice/${order.orderNo}`, {
      headers: { cookie: cookies.customer },
    });
    check(
      invoice.status === 200 && (await invoice.text()).includes(order.orderNo),
      "Customer printable invoice renders",
    );
    const privateInvoice = await fetch(
      `${origin}/account/invoice/${order.orderNo}`,
      { headers: { cookie: cookies.other } },
    );
    check(privateInvoice.status === 404, "Invoice ownership enforced");
    check(
      (
        await req("account/reviews", "other", {
          slug,
          rating: 5,
          comment: "Not my purchase",
        })
      ).status === 403,
      "Only verified buyers may review",
    );
    check(
      (
        await req("account/reviews", "customer", {
          slug,
          rating: 5,
          comment: "Everything arrived as described.",
        })
      ).status === 200,
      "Verified review submitted",
    );
    check(
      !(await req(`reviews/${slug}`)).data.items.length,
      "Pending review stays unpublished",
    );
    const review = await db.collection("reviews").findOne({ slug });
    ids.push(review._id.toString());
    check(
      (
        await req(`admin/operations/reviews/${review._id}`, "admin", {
          status: "approved",
        })
      ).status === 200 &&
        (await req(`reviews/${slug}`)).data.items.length === 1,
      "Admin moderation publishes review",
    );
    let ticket = await req("account/tickets", "customer", {
      kind: "return",
      orderNo: order.orderNo,
      subject: "Return request",
      message: "Please review this return request.",
    });
    check(ticket.status === 201, "Delivered order return request created");
    const ticketId = ticket.data.id;
    ids.push(ticketId);
    check(
      (
        await req(`account/tickets/${ticketId}`, "other", {
          message: "Accessing another account",
        })
      ).status === 404,
      "Support conversation ownership enforced",
    );
    check(
      (
        await req(`account/tickets/${ticketId}`, "customer", {
          status: "approved",
        })
      ).status === 403,
      "Customer cannot approve own return",
    );
    for (const status of ["in-progress", "approved", "received"])
      check(
        (
          await req(`admin/operations/tickets/${ticketId}`, "admin", {
            status,
            message: `Return is now ${status}`,
          })
        ).status === 200,
        `Return ${status}`,
      );
    check(
      (
        await req(`admin/operations/tickets/${ticketId}`, "admin", {
          status: "resolved",
          refundAmount: order.total + 1,
          refundReference: "TEST-REFUND",
          message: "Refund completed",
        })
      ).status === 400,
      "Over-refund rejected",
    );
    check(
      (
        await req(`admin/operations/tickets/${ticketId}`, "admin", {
          status: "resolved",
          refundAmount: order.total,
          refundReference: "TEST-REFUND",
          message: "Refund completed externally",
        })
      ).status === 200,
      "Received return resolved with recorded refund",
    );
    check(
      (await db.collection("orders").findOne({ _id: new ObjectId(order._id) }))
        .paymentStatus === "refunded",
      "Refund reflected on customer order",
    );
    check(
      (
        await req(`admin/operations/tickets/${ticketId}`, "admin", {
          status: "resolved",
          refundAmount: order.total,
          refundReference: "SECOND",
          message: "Repeated refund",
        })
      ).status === 409,
      "Duplicate refund blocked",
    );
    check(
      (
        await req("admin/operations/stock", "admin", {
          slug,
          delta: 1,
          reason: "Inspected returned unit",
        })
      ).status === 200,
      "Inspected return restocked with ledger entry",
    );
    check(
      (
        await req("admin/operations/stock", "admin", {
          slug,
          delta: -100,
          reason: "Invalid reduction",
        })
      ).status === 409,
      "Negative inventory prevented",
    );
    check(
      (
        await req(
          `admin/products/${created.data.id}`,
          "admin",
          { ...product, expectedStock: 0 },
          "PATCH",
        )
      ).status === 409,
      "Stale inventory edit rejected",
    );
    check(
      (await db.collection("stockMovements").countDocuments({ slug })) >= 4,
      "Order, cancellation and stock adjustments audited",
    );
    check(
      (await req("auth/forget-password", "other", { username: email }))
        .status === 200,
      "Account recovery request accepted",
    );
    const recovery = await db
      .collection("messages")
      .findOne({ kind: "account-recovery", "data.email": email });
    ids.push(recovery._id.toString());
    check(
      (
        await req(`admin/operations/recovery/${recovery._id}`, "admin", {
          identityVerified: false,
        })
      ).status === 400,
      "Recovery requires staff identity verification",
    );
    const issued = await req(
      `admin/operations/recovery/${recovery._id}`,
      "admin",
      { identityVerified: true },
    );
    check(
      issued.status === 200,
      "Secure reset link generated for verified account owner",
    );
    const token = issued.data.path.split("token=")[1];
    const stored = await db
      .collection("passwordResets")
      .findOne({ userId: me._id });
    check(
      stored.tokenHash === createHash("sha256").update(token).digest("hex") &&
        !stored.token,
      "Reset token stored only as hash",
    );
    check(
      (
        await req("auth/reset-password", "customer", {
          token,
          password: "Changed-pass-456!",
        })
      ).status === 200,
      "Password recovery completes",
    );
    check(
      (await req("account/dashboard")).status === 401,
      "Password reset revokes existing sessions",
    );
    check(
      (
        await req("auth/reset-password", "customer", {
          token,
          password: "Changed-again-789!",
        })
      ).status === 400,
      "Recovery link cannot be reused",
    );
    check(
      (
        await req("auth/login", "customer", {
          username: email,
          password: "Changed-pass-456!",
        })
      ).status === 200,
      "Customer can sign in with recovered password",
    );
    console.log(`Completed ${checks} connected shop workflow checks.`);
  } finally {
    const users = await db
      .collection("users")
      .find({ email: { $in: [email, otherEmail] } })
      .toArray();
    const userIds = users.map((u) => u._id.toString());
    const tickets = await db
      .collection("tickets")
      .find({ userId: { $in: userIds } })
      .toArray();
    ids.push(...tickets.map((t) => t._id.toString()), ...userIds);
    for (const collection of [
      "sessions",
      "passwordResets",
      "tickets",
      "reviews",
      "orders",
    ])
      await db.collection(collection).deleteMany({ userId: { $in: userIds } });
    await db
      .collection("users")
      .deleteMany({ email: { $in: [email, otherEmail] } });
    await db.collection("products").deleteMany({ slug });
    await db.collection("stockMovements").deleteMany({ slug });
    await db.collection("messages").deleteMany({ "data.email": email });
    await db
      .collection("audit")
      .deleteMany({
        $or: [{ entityId: { $in: ids } }, { actorId: { $in: userIds } }],
      });
    await client.close();
  }
}
main().catch((err) => {
  console.error("Workflow check failed:", err.message);
  process.exitCode = 1;
});

"use client";
import { AdminShortcut } from "./AdminShortcut";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Heart, LayoutDashboard, LifeBuoy, MapPin, Package, RefreshCw, ShieldCheck } from "lucide-react";
import { Img } from "@/components/ui/Img";
import { api, date, money, type Order } from "@/components/admin/types";
import type { AccountData, Address, Ticket } from "./account-types";
import "./account.css";
const tabs = [
  "Overview",
  "Orders",
  "Addresses",
  "Wishlist",
  "Support & returns",
  "Profile & security",
];
const tabIds = ["overview", "orders", "addresses", "wishlist", "support", "profile"];
const tabIcons = [LayoutDashboard, Package, MapPin, Heart, LifeBuoy, ShieldCheck];
export function Account() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = tabs[Math.max(0, tabIds.indexOf(params.get("tab") || "overview"))];
  const setTab = (label: string) => router.push(`/account?tab=${tabIds[tabs.indexOf(label)] || "overview"}`, { scroll: false });
  const [data, setData] = useState<AccountData | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [address, setAddress] = useState<Address | null>(null),
    [selectedState, setSelected] = useState<Ticket | null>(null),
    [requestOrder, setRequestOrder] = useState("");
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { const dashboard = await api<AccountData>("account/dashboard"); setData(dashboard); setError(""); }
    catch (err) { setError((err as Error).message); }
    finally { setRefreshing(false); }
  }, []);
  useEffect(() => {
    let alive = true;
    api<{ user: unknown }>("auth/me")
      .then(async (result) => {
        if (!result.user) {
          router.replace("/auth/login?redirect=%2Faccount");
          return;
        }
        const dashboard = await api<AccountData>("account/dashboard");
        if (alive) setData(dashboard);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [router]);
  useEffect(() => {
    const onFocus = () => { if (!document.hidden) void refresh(); };
    const timer = setInterval(onFocus, 30_000);
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [refresh]);
  async function act(path: string, input: unknown, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(path, { method: "POST", body: JSON.stringify(input) });
      const result = await api<AccountData>("account/dashboard");
      setData(result);
      setNotice(message);
      return result;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  const openSupport = (orderNo: string) => {
    setRequestOrder(orderNo);
    setTab("Support & returns");
    setSelected(null);
  };
  if (!data)
    return (
      <div className="account-workspace">
        <p role={error ? "alert" : "status"}>
          {error || "Loading your account…"}
        </p>
        {error && <button className="account-button" onClick={() => void refresh()}>Retry loading account</button>}
      </div>
    );
  const active = data.orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status),
  );
  const selected = selectedState && (data.tickets.find(ticket => ticket._id === selectedState._id) || selectedState);
  const filteredOrders = data.orders.filter(order =>
    (orderStatus === "all" || order.status === orderStatus) && `${order.orderNo} ${order.items.map(item => item.name).join(" ")}`.toLowerCase().includes(filter.toLowerCase()));
  const total = data.orders
    .filter((o) => o.status === "delivered")
    .reduce((s, o) => s + o.total - (o.refund?.amount || 0), 0);
  const orderCard = (o: Order) => (
    <article className="account-card" key={o._id}>
      <div className="account-row">
        <div>
          <strong>{o.orderNo}</strong>
          <p className="account-muted">
            {date(o.createdAt)} · {["cod", "cash-on-delivery"].includes(o.paymentMethod || "") ? "Cash on delivery" : o.paymentMethod || "Payment pending"}
          </p>
        </div>
        <span className={`account-badge ${o.status}`}>{o.status}</span>
        <strong>{money(o.total)}</strong>
      </div>
      <div className="account-order-items">
        {o.items.map((item, i) => (
          <div key={i} className="account-row">
            <Link href={`/product/${item.slug}`}>
              {item.name}
              {item.variant && <small> · {item.variant}</small>}
            </Link>
            <span>× {item.qty}</span>
          </div>
        ))}
      </div>
      <details>
        <summary>Delivery, payment & timeline</summary>
        <p>
          {o.customer.name} · {o.customer.phone}
        </p>
        <p>
          {o.customer.address}, {o.customer.city} ·{" "}
          {o.delivery === "pickup" ? "Store pickup" : "Home delivery"}
        </p>
        <p>
          Payment: {o.paymentStatus} · Delivery charge: {money(o.shipping)}
        </p>
        {o.note && <p>Order note: {o.note}</p>}
        {o.shipment && (
          <div className="account-callout">
            <strong>
              {o.shipment.courier} · {o.shipment.trackingNumber}
            </strong>
            {o.shipment.trackingUrl && (
              <a
                href={o.shipment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Track parcel ↗
              </a>
            )}
            <p>{o.shipment.note}</p>
          </div>
        )}
        {o.refund && (
          <p>
            Refund recorded: {money(o.refund.amount)} · {o.refund.reference}
          </p>
        )}
        <ol className="account-timeline">
          {o.timeline.map((t, i) => (
            <li key={i}>
              <strong>{t.status}</strong>
              <span>
                {new Date(t.at).toLocaleString("en-GB", {
                  timeZone: "Asia/Dhaka",
                })}
              </span>
            </li>
          ))}
        </ol>
      </details>
      <div className="account-actions">
        <Link
          className="account-button"
          href={`/account/invoice/${o.orderNo}`}
          target="_blank"
        >
          View invoice
        </Link>
        <button onClick={() => openSupport(o.orderNo)}>
          Get help / return
        </button>
        {["pending", "confirmed"].includes(o.status) && (
          <button
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  `Cancel ${o.orderNo}? Reserved stock will be released.`,
                )
              )
                void act(
                  "account/cancel",
                  { orderNo: o.orderNo },
                  "Order cancelled.",
                );
            }}
          >
            Cancel order
          </button>
        )}
      </div>
      {o.status === "delivered" && (
        <details>
          <summary>Review a purchased product</summary>
          <form
            className="account-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await act(
                "account/reviews",
                {
                  slug: f.get("slug"),
                  rating: Number(f.get("rating")),
                  comment: f.get("comment"),
                },
                "Your verified purchase review is awaiting moderation.",
              );
            }}
          >
            <label>
              Product
              <select name="slug">
                {o.items.map((item, i) => (
                  <option key={i} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Rating
              <select name="rating">
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
            </label>
            <label>
              Your review
              <textarea
                name="comment"
                minLength={10}
                maxLength={2000}
                required
              />
            </label>
            <button disabled={busy}>Submit review</button>
          </form>
        </details>
      )}
    </article>
  );
  return (
    <div className="account-workspace">
      <header className="account-heading">
        <div>
          <span className="account-eyebrow">YOUR DAZZLE.BD ACCOUNT</span>
          <h1>Hello, {data.profile.name.split(" ")[0]}.</h1>
          <p>Your tech, your orders, your peace of mind.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <AdminShortcut />
          <Link className="account-button" href="/">
            Continue shopping ↗
          </Link>
          <button className="account-button" disabled={refreshing || busy} onClick={() => void refresh()} aria-label="Refresh account"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} aria-hidden="true" /> {refreshing ? "Refreshing…" : "Refresh"}</button>
        </div>
      </header>
      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-identity">
            <span>{data.profile.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{data.profile.name}</strong>
              <small>{data.profile.email}</small>
            </div>
          </div>
          <nav aria-label="My account">
            {tabs.map((t, i) => { const Icon = tabIcons[i]; return (
              <button
                key={t}
                aria-current={tab === t ? "page" : undefined}
                onClick={() => {
                  setTab(t);
                  setError("");
                  setNotice("");
                }}
              >
                <Icon size={18} aria-hidden="true" />
                {t}
              </button>
            ); })}
          </nav>
          <button
            className="account-signout"
            disabled={busy}
            onClick={async () => {
              try {
                await api("auth/logout", { method: "POST" });
                window.dispatchEvent(new Event("dazzle:auth-changed"));
                router.push("/auth/login");
                router.refresh();
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            Sign out
          </button>
        </aside>
        <main className="account-main">
          <div className="account-row">
            <h2>{tab}</h2>
            <span className="account-muted">Single store · Bangladesh</span>
          </div>
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="account-notice" role="status">
              {notice}
            </p>
          )}
          {tab === "Overview" && (
            <>
              <div className="account-metrics">
                <div>
                  <span>Total orders</span>
                  <strong>{data.orders.length}</strong>
                </div>
                <div>
                  <span>On the way</span>
                  <strong>{active.length}</strong>
                </div>
                <div>
                  <span>Total purchases</span>
                  <strong>{money(total)}</strong>
                </div>
                <div><span>Saved products</span><strong>{data.wishlist.length}</strong></div>
              </div>
              <div className="account-callout">
                <div>
                  <h3>Everything you need after checkout.</h3>
                  <p>
                    Track deliveries, save addresses, and talk directly with the
                    store.
                  </p>
                </div>
                <button onClick={() => setTab("Support & returns")}>
                  Contact support
                </button>
              </div>
              <h3>Recent orders</h3>
              {data.orders.length ? (
                data.orders.slice(0, 3).map(orderCard)
              ) : (
                <div className="account-empty">
                  Your first order starts here.{" "}
                  <Link href="/">Explore the shop →</Link>
                </div>
              )}
            </>
          )}
          {tab === "Orders" && (
            <>
              <label className="account-search">Order status<select aria-label="Order status" value={orderStatus} onChange={event => setOrderStatus(event.target.value)}><option value="all">All orders</option>{["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map(status => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></label>
              <label className="account-search">
                Find an order
                <input
                  placeholder="Order number or product name"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </label>
              {filteredOrders.map(orderCard)}
              {!filteredOrders.length && (
                <p className="account-empty">{data.orders.length ? "No orders match your search or status filter." : "No orders yet."}</p>
              )}
            </>
          )}
          {tab === "Addresses" && (
            <>
              <div className="account-row">
                <p>Save up to 10 delivery addresses for faster checkout.</p>
                <button
                  disabled={data.profile.addresses.length >= 10}
                  onClick={() =>
                    setAddress({
                      id: crypto.randomUUID(),
                      label: "Home",
                      name: data.profile.name,
                      phone: data.profile.phone,
                      city: "Dhaka",
                      address: "",
                      default: !data.profile.addresses.length,
                    })
                  }
                >
                  Add address
                </button>
              </div>
              <div className="account-two-columns">
                {data.profile.addresses.map((a) => (
                  <article className="account-card" key={a.id}>
                    <strong>
                      {a.label}{" "}
                      {a.default && (
                        <span className="account-badge">Default</span>
                      )}
                    </strong>
                    <p>
                      {a.name} · {a.phone}
                    </p>
                    <p>
                      {a.address}, {a.city}
                    </p>
                    <div className="account-actions">
                      <button onClick={() => setAddress(a)}>Edit</button>
                      {!a.default && <button disabled={busy} onClick={() => void act("account/addresses", { addresses: data.profile.addresses.map(saved => ({ ...saved, default: saved.id === a.id })) }, "Default address updated.")}>Set as default</button>}
                      <button
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm("Remove this saved address?"))
                            void act(
                              "account/addresses",
                              {
                                addresses: data.profile.addresses.filter(
                                  (x) => x.id !== a.id,
                                ),
                              },
                              "Address removed.",
                            );
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {address && (
                <form
                  className="account-card account-form"
                  key={address.id}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const saved = {
                      ...address,
                      ...Object.fromEntries(f),
                      default: f.get("default") === "on",
                    };
                    const addresses = [
                      ...data.profile.addresses
                        .filter((a) => a.id !== saved.id)
                        .map((a) =>
                          saved.default ? { ...a, default: false } : a,
                        ),
                      saved,
                    ];
                    if (
                      await act(
                        "account/addresses",
                        { addresses },
                        "Address saved.",
                      )
                    )
                      setAddress(null);
                  }}
                >
                  <h3>Delivery address</h3>
                  <div className="account-two-columns">
                    {(["label", "name", "phone", "city"] as const).map((k) => (
                      <label key={k}>
                        {k === "city" ? "District / city" : k}
                        <input
                          name={k}
                          defaultValue={address[k]}
                          required
                          maxLength={k === "label" ? 40 : 80}
                        />
                      </label>
                    ))}
                  </div>
                  <label>
                    Full address
                    <textarea
                      name="address"
                      defaultValue={address.address}
                      minLength={10}
                      maxLength={800}
                      required
                    />
                  </label>
                  <label className="account-check">
                    <input
                      name="default"
                      type="checkbox"
                      defaultChecked={address.default}
                    />
                    Use as default delivery address
                  </label>
                  <div className="account-actions">
                    <button disabled={busy}>Save address</button>
                    <button type="button" onClick={() => setAddress(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
          {tab === "Wishlist" && (
            <>
              <p className="account-muted">
                Your saved products are available across devices when signed in.
              </p>
              {data.wishlist.length ? (
                data.wishlist.map((p) => (
                  <article className="account-card account-row" key={p.slug}>
                    <span className="account-product-thumb"><Img asset={p.image} alt={p.name} width={72} height={72} className="object-contain" /></span>
                    <div>
                      <Link href={`/product/${p.slug}`}>
                        <strong>{p.name}</strong>
                      </Link>
                      <p>
                        {money(p.price)} ·{" "}
                        {p.inStock ? "In stock" : "Out of stock"}
                      </p>
                    </div>
                    <button
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await act(
                            "account/wishlist",
                            { slug: p.slug, saved: false },
                            "Removed from wishlist.",
                          )
                        )
                          window.dispatchEvent(
                            new Event("dazzle:auth-changed"),
                          );
                      }}
                    >
                      Remove
                    </button>
                  </article>
                ))
              ) : (
                <p className="account-empty">
                  Save products using the heart on any product page.
                </p>
              )}
            </>
          )}
          {tab === "Support & returns" && (
            <div className="account-two-columns">
              <section>
                <h3>Your requests</h3>
                {data.tickets.map((t) => (
                  <button
                    className="account-ticket"
                    key={t._id}
                    onClick={() => setSelected(t)}
                  >
                    <strong>{t.subject}</strong>
                    <span>
                      {t.kind} · {t.status}
                    </span>
                    <small>
                      {t.orderNo || "General enquiry"} · {date(t.createdAt)}
                    </small>
                  </button>
                ))}
                {!data.tickets.length && (
                  <p className="account-empty">No support requests yet.</p>
                )}
              </section>
              <section>
                {selected ? (
                  <div className="account-card">
                    <div className="account-row">
                      <h3>{selected.subject}</h3>
                      <button onClick={() => setSelected(null)}>
                        New request
                      </button>
                    </div>
                    <p>
                      {selected.kind} · {selected.status}
                    </p>
                    <div className="account-conversation">
                      {selected.messages.map((m, i) => (
                        <div
                          key={i}
                          className={m.author === "store" ? "from-store" : ""}
                        >
                          <strong>
                            {m.author === "store" ? "dazzle.bd support" : "You"}
                          </strong>
                          <p>{m.text}</p>
                          <small>{date(m.at)}</small>
                        </div>
                      ))}
                    </div>
                    {!["resolved", "rejected"].includes(selected.status) && (
                      <form
                        className="account-form"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const result = await act(
                            `account/tickets/${selected._id}`,
                            { message: new FormData(form).get("message") },
                            "Reply sent.",
                          );
                          if (result) {
                            setSelected(
                              result.tickets.find(
                                (t) => t._id === selected._id,
                              ) || null,
                            );
                            form.reset();
                          }
                        }}
                      >
                        <label>
                          Your reply
                          <textarea name="message" required maxLength={4000} />
                        </label>
                        <button disabled={busy}>Send reply</button>
                      </form>
                    )}
                  </div>
                ) : (
                  <form
                    className="account-card account-form"
                    key={requestOrder}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      if (
                        await act(
                          "account/tickets",
                          Object.fromEntries(new FormData(form)),
                          "Request received. Follow the conversation here.",
                        )
                      )
                        form.reset();
                    }}
                  >
                    <h3>How can we help?</h3>
                    <label>
                      Request type
                      <select name="kind">
                        <option value="support">Order / general support</option>
                        <option value="return">Return a delivered order</option>
                        <option value="warranty">
                          Warranty / repair assistance
                        </option>
                      </select>
                    </label>
                    <label>
                      Related order
                      <select name="orderNo" defaultValue={requestOrder}>
                        <option value="">General enquiry</option>
                        {data.orders.map((o) => (
                          <option value={o.orderNo} key={o._id}>
                            {o.orderNo} · {o.status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Subject
                      <input
                        name="subject"
                        minLength={4}
                        maxLength={180}
                        required
                      />
                    </label>
                    <label>
                      What happened?
                      <textarea
                        name="message"
                        minLength={10}
                        maxLength={4000}
                        required
                      />
                    </label>
                    <p className="account-muted">
                      Return and warranty eligibility is reviewed against the
                      store policies.
                    </p>
                    <button disabled={busy}>Submit request</button>
                  </form>
                )}
              </section>
            </div>
          )}
          {tab === "Profile & security" && (
            <div className="account-two-columns">
              <form
                className="account-card account-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await act(
                    "account/profile",
                    Object.fromEntries(new FormData(e.currentTarget)),
                    "Profile updated.",
                  );
                }}
              >
                <h3>Personal information</h3>
                <label>
                  Full name
                  <input
                    name="name"
                    defaultValue={data.profile.name}
                    minLength={2}
                    maxLength={180}
                    required
                  />
                </label>
                <label>
                  Mobile number
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={data.profile.phone}
                    required
                  />
                </label>
                <label>
                  Email address
                  <input value={data.profile.email} readOnly />
                </label>
                <button disabled={busy}>Save profile</button>
              </form>
              <form
                className="account-card account-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const f = new FormData(form);
                  if (f.get("password") !== f.get("confirm")) {
                    setError("New passwords do not match.");
                    return;
                  }
                  if (
                    await act(
                      "auth/password",
                      {
                        currentPassword: f.get("currentPassword"),
                        password: f.get("password"),
                      },
                      "Password changed. Other sessions are now signed out.",
                    )
                  )
                    form.reset();
                }}
              >
                <h3>Account security</h3>
                {["currentPassword", "password", "confirm"].map((k, i) => (
                  <label key={k}>
                    {
                      [
                        "Current password",
                        "New password",
                        "Confirm new password",
                      ][i]
                    }
                    <input
                      name={k}
                      type="password"
                      minLength={i ? 8 : 1}
                      maxLength={72}
                      autoComplete={i ? "new-password" : "current-password"}
                      required
                    />
                  </label>
                ))}
                <button disabled={busy}>Update password</button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

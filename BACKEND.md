# Dazzle commerce backend

This project now includes a MongoDB-backed store API and an administrator dashboard at `/admin`. The storefront is under `src/app/(store)`; route groups preserve its original URLs. The admin interface has its own layout.

## Run locally

Use Node.js 24 and install dependencies with `npm install` (or `npm ci` on another machine). MongoDB credentials are stored in the ignored `.env.local` file. `.env.example` contains placeholders only.

```sh
npm run db:setup
npm run dev
```

Open `http://localhost:3000/admin`. The initial account uses the email and password in `.admin-credentials.txt`, which is ignored by Git. Change the password in Dashboard → Settings after signing in. `ADMIN_EMAIL` and `ADMIN_PASSWORD` are bootstrap values, not a second login mechanism; rerunning setup does not reset an existing user's password.

Setup creates indexes and imports the 992 copied products into the `dazzle_store` database. It uses insert-only upserts, preserving existing edits and orders. Imported stock defaults to **zero**. Set actual stock levels through Inventory before taking orders. Importing copied availability badges does not establish physical inventory.

## Administrator features

The dashboard is built with shadcn/ui (Radix primitives + Tailwind v4), recharts, cmdk, and dnd-kit, in the storefront's brown/gold palette with a light/dark toggle. Press Ctrl/⌘ + K anywhere to search pages, products, and orders.

| Page            | Behavior                                                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview        | Revenue, orders, average order value, and new customers vs the previous period; revenue/orders trend; order pipeline; sales by category; best sellers; inventory watch; catalog health |
| Products        | Status tabs, category/brand filters, sorting, table or grid view, bulk publish/archive/delete/category/brand, duplicate, CSV export                                                 |
| Product editor  | Full page at `/admin/products/new` and `/admin/products/<id>`: drag-and-drop multi-image gallery, pricing with cost/margin, stock, variants, specifications, protection plans, SEO, live card preview |
| Categories      | Drag-to-reorder menu order, images, visibility, trade-in, featured brands, sub-categories, bulk-add products                                                                       |
| Brands          | Logos, featured/visible toggles; renames update every product of the brand                                                                                                        |
| Homepage        | Drag-and-drop section order, show/hide, heading overrides, hero slides, offer banners, announcement ticker, categories, brands, flash-sale countdown and tabs, curated product lists |
| Inventory       | Low/out-of-stock tabs and inline stock adjustments recorded in Stock movements                                                                                                     |
| Orders          | Status tabs with counts, side panel with fulfillment stepper, one-click transitions, courier details, history, invoice                                                            |
| Customers       | Lifetime value, order history, addresses, notes/tags, enable/disable access                                                                                                       |
| Coupons         | Percentage/fixed discounts, minimum order, expiry, activation, delete                                                                                                             |
| Inbox / Support / Reviews / Subscribers | Enquiry workflow and account recovery, threaded ticket replies and refunds, review moderation, newsletter list with CSV export                             |
| Media library   | Uploaded images with dimensions; images still in use cannot be deleted                                                                                                            |
| Activity log    | Administrator edits and order status changes                                                                                                                                      |
| Settings        | Store contact details, delivery charges, free-delivery threshold, pickup, stock alert threshold, password change                                                                 |

In the product editor, the Category, Sub-category, and Brand dropdowns can create a new entry inline: type a name that doesn't exist and choose “Create…”.

Record pages support search, pagination, refresh, and exporting all matching records as CSV. Exports escape spreadsheet formula prefixes. Image uploads accept PNG, JPEG, and WebP up to 5 MB. Images are stored as MongoDB binary documents and served by a public image endpoint, so they do not depend on a writable deployment filesystem. Existing storefront imagery stays in `public/images`.

Product editors also control coming-soon / price-to-be-announced and discontinued status. These flags block checkout even when a quantity is entered. Clear the coming-soon flag and enter a valid price and stock quantity when an imported upcoming product becomes available. Cost price is stored for margin reporting and is never sent to the storefront.

Categories, brands, and homepage content live in the `categories`, `brands`, and `content` collections. `npm run db:setup` imports them from the snapshot once (insert-only, so dashboard edits survive reruns). Catalog edits affect the menu, product pages, listings, search, compare widgets, and the homepage on the next request. Renaming a category or brand slug updates the products and homepage lists that reference it; deleting one that is in use requires detaching it from those products. Blog posts, branch information, and listing filter attributes still come from the copied snapshot. Plain-text descriptions and specifications are HTML-escaped before rendering.

## Operations features

| Area | Behavior |
| --- | --- |
| Staff & roles | Owner (`admin`) accounts have full access. Staff accounts get per-area permissions (orders, POS, products, inventory, purchases, expenses, reports, storefront, marketing, engagement, settings, staff) with role presets. Every `/api/commerce/admin/*` call is checked on the server; the sidebar only shows permitted areas. Signing in on the storefront login page shows a **Go to admin dashboard** button to staff. |
| Orders | Create orders by phone (`New order`), edit unshipped orders (stock is adjusted by the difference), record partial payments, assign to staff, bulk status change, bulk invoice printing, courier booking and status sync, SMS the customer, block the customer. |
| Incomplete orders | Checkout and landing-page forms save the customer's details once a phone number is typed; staff can call, convert to an order, or mark lost. |
| Fraud & blocking | Delivery success rate per phone from this store's order history; phone/IP blocklist enforced at checkout and on landing pages (IP blocking needs `TRUST_PROXY=true`). |
| POS | Barcode/SKU scanning, product grid, variants, discounts, split tenders with change, 80 mm receipts. Sales are recorded as delivered, paid orders. |
| Variants | Colors & sizes library; per-combination stock, price, cost, SKU and barcode. Checkout, POS, purchases and order edits reserve stock per variant. |
| Catalog | Category → sub-category → child category (`/categories/a/b/c`), barcodes and printable labels, per-product low-stock alert level, free-delivery products. |
| Purchasing | Suppliers with balances; purchases received into stock update a moving weighted-average cost; supplier payments; expenses. |
| Reports | Sales, profit & loss (cost of goods from order-time cost, minus expenses), stock valuation, stock alerts, purchases, and expenses, by day or month, with CSV export. |
| Delivery & coupons | Delivery areas with fees, free-delivery threshold, free-delivery products and coupons, coupon usage limits. |
| Payments | bKash (tokenized), Nagad, and SurjoPay for full payment or a cash-on-delivery advance (shipping charge, fixed amount, or percent). Payments are verified with the gateway's own API before an order is marked paid. |
| Content | Unlimited landing pages (`/lp/<slug>`) with an order form, CMS pages served at `/<slug>` (a policy slug replaces the built-in policy page), blog posts, social links, WhatsApp chat button. Page text is Markdown rendered with an escaping renderer. |
| Tracking | Google Tag Manager container and Meta pixel load from Settings → Tracking; GA4-style dataLayer and pixel events for view item, add to cart, begin checkout and purchase. Meta Conversions API sends Purchase server-side, de-duplicated by order number. |
| SMS | BulkSMSBD, sms.net.bd (Alpha SMS), or any https GET gateway; automatic order-status messages with templates; campaigns to customers or buyers; delivery log; low-stock SMS alerts. |
| Couriers | Steadfast and Pathao consignment booking (single or bulk) with the amount still due as cash to collect, and status sync. |

### Credentials you need to add

Everything above works without third-party accounts except the integrations below. Add their credentials in **Settings** (they are stored in the `settings` collection under `integrations`; secrets are masked in the dashboard). Test bKash, Nagad, SurjoPay, and Pathao in sandbox mode first — these integrations follow the providers' published APIs but have not been run against live accounts from this workspace.

- **Payments:** bKash app key/secret + username/password; Nagad merchant ID, merchant number, Nagad public key and your private key; SurjoPay username/password/prefix. Gateways send customers back to `/api/payments/<gateway>/callback`, so set `APP_ORIGIN` to your public https address.
- **Couriers:** Steadfast API key + secret key; Pathao client ID/secret, merchant email/password, and store ID.
- **SMS:** gateway API key and sender ID (or a custom URL).
- **Meta Conversions API:** pixel ID plus an access token from Events Manager.

## Storefront flows

- Email/phone + password login and customer registration use the local commerce API.
- `/checkout` requires an account, collects delivery details, validates coupons, calculates authoritative totals, and places a **cash-on-delivery** order.
- `/account` shows the signed-in customer's orders and timeline. Tracking is restricted to the account that owns the order.
- Contact/feedback/corporate/pre-order forms save submissions to the administrator inbox.
- Newsletter signup saves subscriptions. The API supports account-based unsubscribe; administrator unsubscribe is available in Subscribers.
- Guest cart and wishlist remain in browser local storage. The server validates product prices, quantities, and care-plan prices when quoting/ordering; client-supplied prices are ignored.

## Order integrity

Order placement uses a MongoDB transaction to reserve stock and insert the order together. A unique `(userId, idempotencyKey)` index prevents duplicate orders on retry. Simultaneous checkouts cannot reduce stock below zero.

Allowed fulfillment transitions:

```text
pending → confirmed → processing → shipped → delivered
    └────────┴──────────┴─────────→ cancelled
```

Cancellation before shipment restores stock in a transaction. Cancelled and delivered orders are terminal. Marking an order delivered confirms cash collection and includes its total in collected revenue. Returns/refunds and online payments require a separate workflow and payment provider.

## Security and deployment

Passwords are hashed with bcrypt. Random opaque session tokens are stored only as SHA-256 digests in MongoDB; cookies are HTTP-only, SameSite=Lax, and Secure in production. Session and rate-limit documents have TTL indexes. Disabling a customer blocks existing sessions; password changes invalidate all previous sessions. Every administrator API independently checks the role.

Mutations reject cross-site origins. Zod validates fields and unknown checkout price fields are stripped. Authentication, registration, submissions, checkout, and uploads have database-backed rate limits. Error responses do not include connection credentials or internal stack traces.

Set `APP_ORIGIN` to the real HTTPS site origin for deployment behind a proxy. Set `TRUST_PROXY=true` only when that proxy replaces the forwarded address header; otherwise rate limits share a conservative direct-request bucket. Configure MongoDB Atlas network access for your server's outbound address, keep credentials server-only, and use HTTPS in production. This implementation follows the driver's [connection-pool guidance](https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/) and [transaction guidance](https://www.mongodb.com/docs/drivers/node/v6.x/crud/transactions/).

```sh
npm run build
npm start
```

Email delivery, SMS OTP login, Google OAuth, and automated password-recovery delivery are not implemented. Payments, couriers, SMS, and the Conversions API need the credentials listed above; until they are added, those features report that they are not configured instead of sending fake messages or accepting pretend payments. Historical orders/customers cannot be recovered from an HTTrack website copy.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run check-links
```

With a running local server, execute `npm run test:integration` and `node tests/operations.integration.cjs` (staff permissions, variants, purchases, POS, backend orders, payments, fraud/blocking, incomplete orders, coupons, delivery areas, landing pages, CMS pages, reports, and secret masking). It defaults to `http://localhost:3001`; set `TEST_BASE_URL` to change this. The test authenticates against the configured admin account, creates clearly identified temporary records, verifies stock transactions and access controls, and cleans up only its own test records. Run it on a development database.

The project uses Next.js 16.4's worker-thread options because this workspace restricts child-process creation. On a normal development machine the standard `next dev` command remains the recommended entry point.

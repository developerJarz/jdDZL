# Dazzle storefront and MongoDB administration

The storefront now has a working commerce backend and an administrator dashboard at `/admin`.
See [BACKEND.md](BACKEND.md) for setup, initial administrator access, inventory import, API behavior, deployment, and tests.

A clean Next.js rebuild of the **dazzle.com.bd** storefront UI, reconstructed from the
HTTrack snapshot in `C:\My Web Sites\dazzle`.

> **Not affiliated with Dazzle.** This is a development / reference project. Product data,
> imagery, logos and copy belong to their respective owners and are kept as local reference
> material only (see [Brand & third-party assets](#brand--third-party-assets)). Search-engine
> indexing is disabled by default (`robots`, `noindex`).

## Stack

- Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · MongoDB
- Tailwind CSS v4 — the reference was built with Tailwind v4 too, so its utility classes,
  theme tokens (`background`, `primary`, `primary_color`, `light_bg`) and class-based dark
  mode carry over 1:1
- Urbanist variable font (the same woff2 the reference shipped), served via `next/font/local`
- No UI dependencies: the Swiper sliders are replaced by a small scroll-snap `Carousel`

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
npm run typecheck
npm run extract      # regenerate src/data/generated + public/images from the snapshot
```

`npm run extract` reads `../dazzle` by default; set `SNAPSHOT_DIR` to point elsewhere.

## How it was built

The snapshot is a mirror of a Next.js site. Every page embeds its React Server Component
payload (`self.__next_f.push(...)`), which contains the real props of the original client
components — products, categories, brand lists, banners, stores, campaigns, settings.
`scripts/extract/` parses those payloads (`flight.cjs`), plus a little server-rendered
markup (blog cards, homepage banners, the news ticker), and writes:

| Output | Contents |
| --- | --- |
| `src/data/generated/products.json` | 992 products merged from home sections, listings, brand pages, showcases and 37 full product pages |
| `product-details.json` | descriptions, short specs, points, booking amount, SEO meta, colour variants for the 37 mirrored product pages |
| `categories.json`, `brands.json`, `listings.json` | mega-menu tree, 132 brands, per-category / sub-category / brand listing metadata (filters, price ranges, CMS descriptions) |
| `home.json`, `showcases.json`, `offers.json` | homepage sections, "see all" showcases, campaigns |
| `stores.json`, `blogs.json`, `posts.json` | 15 stores, 43 blog posts (12 with full articles), careers & announcements |
| `site.json`, `page-meta.json`, `policies.json` | site settings, `<title>`/description per page, CMS policy endpoints |
| `public/images/<bucket>/…` | ~1,490 images copied from the mirror (best `_next/image` variant ≤ display size; huge originals downscaled) |

The visual layer was rebuilt from the reference markup (Tailwind classes copied from the
SSR HTML) and checked against screenshots of the live site at 1440 px and 390 px.

## Project structure

```
src/
  app/                    routes (see inventory below), api/search, api/products, sitemap, robots
  components/
    layout/               Header (top bar, main row, CategoryNav mega menu + Explore All,
                          HeaderSearch), MobileHeader, MobileBottomNav, Footer, Newsletter, Marquee
    home/                 HeroCarousel, CategoryGrid, TabbedProducts, ClipToCart, ShopByBrand,
                          OfferBanners, FeatureStrip, SeoCards
    product/              ProductCard, ProductCarousel/Grid, ProductGallery, ProductDetailView
                          (variants, Dazzle Care, EMI/exchange, sticky buy bar), QuickView, CompareView
    listing/              ListingView (chips, filters, slots, infinite scroll), FilterSidebar,
                          PriceRange, BrandDirectory, ShowcaseGrid
    blog/ stores/ offers/ forms/ auth/ cart/ ui/   (Carousel, Breadcrumb, Dialog, Pagination, Img…)
    icons.tsx             inline SVG icons copied from the reference
  context/                theme (dark mode) and store (cart + wishlist, localStorage)
  data/                   catalog.ts (server-only loader), navigation.ts, content/*, generated/*
  lib/                    format, listing filters, seo, maps
  services/               the only layer pages talk to — swap mock data for API calls here
  types/                  domain types
scripts/extract/          snapshot → JSON + images
```

## Route inventory

| Route | Source in snapshot | Notes |
| --- | --- | --- |
| `/` | `index.html` RSC + markup | all sections; Trending Now / Clip to Cart were client-loaded → mock lists |
| `/categories`, `/categories/[slug]`, `/categories/[slug]/[sub]` | category pages (10) + 13 sub-category pages | brand chips, budget/stock/attribute filters, sort, Top Selling / Trending rows, infinite scroll, CMS description |
| `/brands`, `/brands/[slug]` | `brands.html` + 57 brand pages | A–Z filter + search; brand listing with category chips |
| `/product/[slug]` | 37 full product pages; listing data for the rest | gallery + zoom, colour variants, Dazzle Care, EMI / exchange dialogs, payment option, sticky buy bar, related products, Product JSON-LD |
| `/product-compare/[slug]` | compare pages (client-rendered) | add up to 6 products |
| `/search?q=` | route used by the original header search | dynamic (Suspense); header dropdown uses `/api/search` |
| `/new-arrivals`, `/hot-deal`, `/most-popular`, `/trending-now`, `/feature-product` | showcase pages | |
| `/offer`, `/offer/[slug]` | offer list + campaign page; `/offer/limited-time-offer` flash sale | countdowns |
| `/online-exclusive` | page captured with no products | kept empty, as in the snapshot |
| `/pre-order`, `/support`, `/feedback`, `/corporate` | client-rendered forms (layout from live site) | validate locally; submission needs the API |
| `/trade-in`, `/order-tracking`, `/newsletter-unsubscribe` | client-rendered | login-required / tracking / invalid-link states |
| `/cart` | `cart.html` | full cart: qty, remove, add-ons, promo/voucher fields, summary |
| `/auth/login`, `/auth/registration`, `/auth/forget-password` | live site (snapshot showed a spinner) | phone-OTP dialog; no auth backend |
| `/blogs`, `/blogs/[slug]` | blog list pages + 12 articles | category chips, pagination |
| `/career`, `/career/[slug]`, `/announcement`, `/announcement/[slug]`, `/press-coverage` | list pages | detail bodies weren't mirrored → notice |
| `/shop-location`, `/shop-location/[slug]` | store list + 15 store pages | district tabs, search, map links |
| `/about-us` | static page | |
| `/[policy]` (privacy, refund, warranty, faq, emi-policy, terms-conditions, …) | CMS endpoint names only | text not in snapshot → explicit notice |

## Backend boundary (what is mocked)

`src/services/*` is the single integration surface; pages never import the JSON directly.
`services/config.ts` switches on `NEXT_PUBLIC_API_BASE_URL` (empty = mock mode). Endpoints
observed in the reference bundle are noted in each service (`/products?categorySlug=`,
`/product/search?keyword=`, `/showcase-items?showcaseSlug=`, `/get-default-variant/:id`,
`/stores?district_id=`, `newsletter-subscribe`, `/api/tokenized/v1/wishlist-*`, …).

Behaviour without a backend — deliberately explicit rather than faked:

- **Works locally:** browsing, search, filters, sorting, cart & wishlist (localStorage),
  theme toggle, compare, galleries, countdowns.
- **Reports "API not configured":** login / registration / OTP, newsletter, contact /
  feedback / corporate / pre-order submission, order tracking, promo codes, checkout
  (redirects to login, as the original does), live price/profit tools.
- **Heuristics in the mock data** (marked in code):
  - categories for products seen only in generic lists are inferred from titles / brand
    (`categoryInferred: true`);
  - colour swatches come from gallery file names (`…-white.jpg`);
  - attribute filters (colour, RAM & storage) match product titles and image names;
  - Top Selling / Trending rows and "Trending Now" tabs use merchandising badges;
  - Dazzle Care plan prices are a percentage of the product price.
- **Not in the snapshot:** policy texts, product specification tables, clip-to-cart videos,
  main-category hero banners, online-exclusive banners, career / announcement bodies.

## Brand & third-party assets

- Product photos, brand logos, banners and the Dazzle wordmark live under `public/images/`
  in buckets (`products/`, `brands/`, `banners/`, `categories/`, `site/`, …) so they can be
  replaced wholesale; components only reference them through the generated data.
- The Google Play badge is redrawn in markup (`GooglePlayBadge.tsx`); swap in official
  artwork if licensed.
- Analytics and ads present in the mirror (Google Tag Manager / Analytics, Meta pixel,
  TikTok pixel, Microsoft Clarity) are **not** included.
- External article images inside CMS content (CNET, MacRumors, b2c-contenthub) are served
  from local copies where HTTrack mirrored them; the few it missed keep their original URL
  (listed in `src/data/generated/_missing-images.txt`).

## Known differences from the reference

- The header wordmark is the white PNG from the snapshot (the live SVG with ™ wasn't mirrored).
- Sections the original filled from its API after hydration use mock selections from the
  same catalogue, so their products differ from what the live site shows today.
- Prices are those of the snapshot date (30 Sep 2026).

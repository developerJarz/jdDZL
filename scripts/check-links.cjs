#!/usr/bin/env node
// Verifies that every internal link embedded in src/data/generated (CMS html, banners,
// marquee…) points at a route this app serves. Run after `npm run extract`.
const fs = require('fs');
const path = require('path');
const G = path.join(__dirname, '../src/data/generated');
const load = (f) => JSON.parse(fs.readFileSync(path.join(G, f), 'utf8'));

const products = load('products.json');
const brands = load('brands.json');
const { categories } = load('categories.json');
const listings = load('listings.json');
const blogs = load('blogs.json');
const stores = load('stores.json');
const offers = load('offers.json');
const posts = load('posts.json');
const policies = load('policies.json');

const routes = new Set([
  '/', '/categories', '/brands', '/offer', '/pre-order', '/online-exclusive', '/new-arrivals', '/hot-deal', '/most-popular',
  '/trending-now', '/feature-product', '/blogs', '/shop-location', '/about-us', '/career', '/announcement', '/press-coverage',
  '/support', '/feedback', '/corporate', '/trade-in', '/order-tracking', '/newsletter-unsubscribe', '/cart', '/search',
  '/auth/login', '/auth/registration', '/auth/forget-password', '/emi-policy', '/terms-conditions', '/sitemap.xml',
  '/offer/limited-time-offer', '/offer/latest-apple-release-pre-order-campaign',
]);
products.forEach((p) => { routes.add(`/product/${p.slug}`); routes.add(`/product-compare/${p.slug}`); });
brands.forEach((b) => routes.add(`/brands/${b.slug}`));
categories.forEach((c) => { routes.add(`/categories/${c.slug}`); c.subCategories.forEach((s) => routes.add(`/categories/${c.slug}/${s.slug}`)); });
Object.keys(listings.subCategories).forEach((k) => routes.add(`/categories/${k}`));
blogs.posts.forEach((b) => routes.add(`/blogs/${b.slug}`));
stores.items.forEach((s) => routes.add(`/shop-location/${s.slug}`));
offers.campaigns.forEach((c) => routes.add(`/offer/${c.slug}`));
posts.careers.forEach((p) => routes.add(`/career/${p.slug}`));
posts.announcements.forEach((p) => routes.add(`/announcement/${p.slug}`));
Object.keys(policies).forEach((p) => routes.add(`/${p}`));

const bad = new Map();
for (const f of fs.readdirSync(G).filter((f) => f.endsWith('.json'))) {
  const text = fs.readFileSync(path.join(G, f), 'utf8');
  const re = /(?:href=\\"|"href":\s*")(\/[^"\\?#]*)/g;
  let m;
  while ((m = re.exec(text))) {
    const r = m[1].replace(/\/$/, '') || '/';
    if (r.startsWith('/images/')) continue;
    if (!routes.has(r)) bad.set(r, (bad.get(r) || new Set()).add(f));
  }
}
if (!bad.size) console.log('All internal links in generated data resolve.');
for (const [r, files] of bad) console.log(`MISSING ${r}  (in ${[...files].join(', ')})`);
process.exitCode = bad.size ? 1 : 0;

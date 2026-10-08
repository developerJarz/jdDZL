#!/usr/bin/env node
// Extracts structured mock data + local image assets from the HTTrack snapshot of dazzle.com.bd.
//
//   node scripts/extract/extract.cjs            (snapshot defaults to ../dazzle)
//   SNAPSHOT_DIR="C:/My Web Sites/dazzle" node scripts/extract/extract.cjs
//
// Sources: the React Server Component payloads (self.__next_f) embedded in every page, plus a
// little server-rendered markup (blogs, homepage banners, marquee). Output:
//   src/data/generated/*.json   (consumed by src/services/*)
//   public/images/<bucket>/*    (local copies of every referenced image)
const fs = require('fs');
const path = require('path');
const { parse, walk } = require('./flight.cjs');
const { createImageResolver, normalizeUrl } = require('./images.cjs');

const ROOT = path.resolve(__dirname, '../..');
const SNAPSHOT = path.resolve(process.env.SNAPSHOT_DIR || path.join(ROOT, '..', 'dazzle'));
const SITE = path.join(SNAPSHOT, 'dazzle.com.bd');
const OUT = path.join(ROOT, 'src/data/generated');
const PUBLIC = path.join(ROOT, 'public');

if (!fs.existsSync(SITE)) {
  console.error(`Snapshot not found at ${SITE}. Set SNAPSHOT_DIR.`);
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------------------------
// Page discovery. HTTrack also saved a number of 404 bodies for JS-string "links"
// (e.html, t.html, v(e).html ...) — those are excluded.
const JUNK = /^(e|t|e-2|e,t|q\(t|v\(e|v\(t|e,window\.location\.href|window\.location\.href)\.html$/;
const htmlFiles = [];
(function rec(dir) {
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('~hts') || ['_next', 'ROOT', 'static', 'Version', '$&', 'cdn-cgi', 'signals', 'schema.org'].includes(f)) continue;
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) rec(p);
    else if (f.endsWith('.html') && !(dir === SITE && JUNK.test(f))) htmlFiles.push(p);
  }
})(SITE);
const rel = f => path.relative(SITE, f).replace(/\\/g, '/');
const route = f => '/' + rel(f).replace(/\.html$/, '').replace(/(^|\/)index$/, '');

const images = createImageResolver({ snapshotDir: SNAPSHOT, siteDir: SITE, htmlFiles, publicDir: PUBLIC });
const img = (u, bucket) => images.resolve(u, bucket);

// module ids of the original client components (stable within one build)
const M = {
  megaMenu: 97902, heroSlides: 76324, homeCategories: 85320, countdown: 49721, tabs: 28038,
  flashList: 32852, newArrivalList: 31757, shopByBrand: 32523, mostPopular: 17702, hotDeal: 4509,
  featured: 23910, seoCards: 45386, categoryPage: 50419, subCategoryPage: 9211, brandPage: 76868,
  brandsList: 90905, categoriesList: 84635, showcase: 60983, newArrivals: 93779, offerCard: 69373,
  campaignPage: 59414, storeList: 18528, storeDetail: 35198, productDetail: 73199, policy: 47086,
  queryState: 65768,
};

/** props of client components by module id for a page */
const pageCache = new Map();
function pageProps(file) {
  if (pageCache.has(file)) return pageCache.get(file);
  const byModule = {};
  try {
    const { root } = parse(file);
    walk(root, (t, props) => {
      if (t && t.$module) (byModule[t.$module[0]] = byModule[t.$module[0]] || []).push(props);
    });
  } catch (e) { console.warn('parse failed', rel(file), e.message); }
  pageCache.set(file, byModule);
  return byModule;
}
const P = (relPath) => pageProps(path.join(SITE, relPath));

// ---------------------------------------------------------------------------------------------
// HTML helpers
const decodeEntities = s => s == null ? s : s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
const stripTags = s => decodeEntities((s || '').replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

/** Turn an HTTrack-relative or absolute dazzle.com.bd href into an app route. */
function toRoute(href, baseDir = '') {
  if (!href) return '#';
  href = decodeEntities(href.trim());
  if (href === '#' || /^(mailto|tel|javascript):/.test(href)) return href;
  href = href.replace(/^https?:\/\/(www\.)?dazzle\.com\.bd/, '');
  if (/^https?:\/\//.test(href)) return href;
  // HTTrack rewrote links relative to the page that contained them
  if (!href.startsWith('/')) href = path.posix.normalize('/' + (baseDir ? baseDir + '/' : '') + href).replace(/^(\/\.\.)+/, '');
  href = href.replace(/^\//, '');
  let [p, q] = href.split('?');
  p = p.replace(/\.html$/, '').replace(/(^|\/)index$/, '');
  // paginated HTTrack aliases like blogs2679 -> blogs
  p = p.replace(/^blogs[0-9a-f]{4}$/, 'blogs');
  return '/' + p + (q ? '?' + q : '');
}

/** Rewrite CMS html: internal links -> routes, images -> local copies. */
function rewriteHtml(html, bucket = 'content', baseDir = '') {
  if (!html) return '';
  return html
    .replace(/\s(srcset|srcSet|sizes)="[^"]*"/g, '')
    .replace(/(<a\b[^>]*\shref=")([^"]*)(")/g, (m, a, h, b) => a + toRoute(h, baseDir) + b)
    .replace(/(<img\b[^>]*\ssrc=")([^"]*)(")/g, (m, a, s, b) => {
      let u = decodeEntities(s);
      const q = u.match(/[?&]url=([^&]+)/);
      if (q) u = decodeURIComponent(q[1]);
      const r = img(u, bucket);
      return a + (r ? r.src : u) + b;
    });
}

/** CMS rich text -> plain text with inline links only (how the reference renders SEO cards). */
function inlineLinksOnly(html) {
  const links = [];
  let s = (html || '').replace(/<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/, ''); // drop the leading heading (= title)
  s = s.replace(/<a\b[^>]*\shref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (m, href, inner) => {
    links.push(`<a href="${toRoute(href)}">${stripTags(inner)}</a>`);
    return ` \u0000${links.length - 1}\u0000 `;
  });
  s = stripTags(s.replace(/<\/(p|h\d|li|div)>/g, ' '));
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => links[+i]).replace(/\s+([,.])/g, '$1').trim();
}

// ---------------------------------------------------------------------------------------------
// Products
const products = new Map(); // slug -> product
const round2 = n => Math.round(n * 100) / 100;

function upsertProduct(raw, ctx = {}) {
  if (!raw) return null;
  const slug = raw.slug || raw.productSlug;
  if (!slug) return null;
  const prev = products.get(slug) || {
    id: raw.uuid || raw.productUuid, slug, code: '', name: '', badge: '', recognitionBadge: '',
    price: 0, regularPrice: 0, discount: 0, inStock: null, isTba: false, endOfLife: false,
    allowPreOrder: false, isBestDeal: false, image: null, images: [], brandSlug: null, brandName: null,
    categorySlugs: [], subCategorySlugs: [], hasDetail: false,
  };
  const p = prev;
  if ('title' in raw) { // card shape
    p.name = p.name || raw.title;
    p.price = raw.price; p.regularPrice = raw.originalPrice || raw.price;
    p.discount = p.discount || raw.discount;
    p.badge = raw.badge || p.badge; p.isBestDeal = !!raw.isBestDeal;
    if (typeof raw.inStock === 'boolean') p.inStock = raw.inStock;
    if (!p.image && raw.image) p.image = img(raw.image, 'products');
  } else { // listing / detail shape
    p.name = raw.productName || p.name;
    p.code = raw.productCode || p.code;
    p.badge = raw.productBadge || p.badge;
    p.regularPrice = raw.regularPrice; p.price = raw.discountedPrice || raw.regularPrice;
    p.discount = raw.disRate != null ? round2(raw.disRate) : p.discount;
    const thumbs = Array.isArray(raw.thumbnails) ? raw.thumbnails : raw.thumbnails ? [raw.thumbnails] : [];
    if (!p.image && thumbs[0]) p.image = img(thumbs[0].mediaFileUrl, 'products');
    if (Array.isArray(raw.thumbnails) && raw.thumbnails.length > 1) {
      p.images = raw.thumbnails.map(t => img(t.mediaFileUrl, 'products')).filter(Boolean);
    }
    if (raw.brandSlug) { p.brandSlug = raw.brandSlug; p.brandName = raw.brandName; }
    if (raw.subCategorySlug && !p.subCategorySlugs.includes(raw.subCategorySlug)) p.subCategorySlugs.push(raw.subCategorySlug);
  }
  for (const k of ['isTba', 'endOfLife', 'allowPreOrder']) if (k in raw) p[k] = !!raw[k];
  if (raw.recognitionBadge) p.recognitionBadge = raw.recognitionBadge;
  if (ctx.category && !p.categorySlugs.includes(ctx.category)) p.categorySlugs.push(ctx.category);
  if (ctx.subCategory && !p.subCategorySlugs.includes(ctx.subCategory)) p.subCategorySlugs.push(ctx.subCategory);
  if (ctx.brand && !p.brandSlug) p.brandSlug = ctx.brand;
  products.set(slug, p);
  return slug;
}
const upsertAll = (list, ctx) => (list || []).map(r => upsertProduct(r, ctx)).filter(Boolean);

// ---------------------------------------------------------------------------------------------
// Site settings, navigation, categories, brands
const home = P('index.html');
let settings = null;
for (const props of home[M.queryState] || []) {
  const q = props.state && props.state.queries && props.state.queries.find(q => q.queryKey[0] === 'siteSettings');
  if (q) settings = q.state.data;
}
const mega = (home[M.megaMenu] || [])[0];

const brandIndex = new Map();
function addBrand(b, extra = {}) {
  const slug = b.slug || b.brand_slug;
  if (!slug) return;
  const prev = brandIndex.get(slug) || {};
  brandIndex.set(slug, {
    id: b.id || b.uuid || prev.id,
    slug,
    name: b.label || b.brand_name || prev.name,
    logo: prev.logo || img(b.logo || b.thumbnail_img, 'brands'),
    featured: !!(b.is_featured || prev.featured),
    ...extra,
  });
}
for (const b of (P('brands.html')[M.brandsList] || [{ brands: [] }])[0].brands) addBrand(b);

const categories = mega.categories.map(c => ({
  id: c.uuid,
  slug: c.category_slug,
  name: c.category_name,
  image: img(c.thumbnail_img, 'categories'),
  tradeIn: !!c.is_trade_in,
  subCategories: (c.child || []).map(s => ({
    id: s.uuid, slug: s.sub_category_slug, name: s.sub_category_name, image: img(s.thumbnail_img, 'categories'),
  })),
  brands: [],
}));
const exploreAll = mega.explorAllData.map(c => {
  const brands = (c.child || []).map(b => { addBrand(b); return b.brand_slug; });
  const cat = categories.find(x => x.slug === c.category_slug);
  if (cat) cat.brands = brands;
  return { slug: c.category_slug, name: c.category_name, image: img(c.thumbnail_img, 'categories'), brands };
});

// marquee (server-rendered)
function parseMarquee(file) {
  const html = fs.readFileSync(file, 'utf8');
  const i = html.indexOf('marquee-track');
  if (i < 0) return [];
  const chunk = html.slice(i, html.indexOf('</div>', i));
  const items = [];
  const re = /<a[^>]*href="([^"]*)"[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/g; let m;
  while ((m = re.exec(chunk))) items.push({ label: stripTags(m[2]), href: toRoute(m[1], path.posix.dirname(rel(file)).replace(/^.$/, '')) });
  const half = items.length / 2;
  const unique = items.slice(0, half).every((it, i) => it.label === items[i + half].label) ? items.slice(0, half) : items;
  return unique;
}

/** SEO description <article> rendered under category / brand listings. */
function listingArticle(file) {
  const html = fs.readFileSync(file, 'utf8');
  const i = html.indexOf('<article class="text-sm leading-relaxed');
  if (i < 0) return '';
  const body = html.slice(html.indexOf('>', i) + 1, html.indexOf('</article>', i));
  const baseDir = path.posix.dirname(rel(file)).replace(/^\.$/, '');
  return rewriteHtml(body.replace(/<!--\/?\$-->/g, ''), 'content', baseDir).trim();
}

// ---------------------------------------------------------------------------------------------
// Listing pages: categories / sub-categories / brands
const categoryListings = {};
const subCategoryListings = {};
const brandListings = {};
const mapAttributes = attrs => (attrs || []).map(a => ({ name: a.attributeName, values: (a.items || []).map(i => i.attributeVariation) }));
const mapPrice = pd => pd ? { min: pd.discountedPrice.minPrice, max: Math.max(pd.discountedPrice.maxPrice, pd.regularPrice.maxPrice) } : null;
const mapBanners = (list, bucket = 'banners') => (list || []).map(b => ({
  image: img(b.imageURL || b.imageUrl, bucket), href: toRoute(b.mediaInfo || b.content || '#'), newTab: !!b.openNewTab,
})).filter(b => b.image);

for (const file of htmlFiles) {
  const r = rel(file);
  if (r.startsWith('categories/')) {
    const props = pageProps(file);
    const cat = (props[M.categoryPage] || [])[0];
    const sub = (props[M.subCategoryPage] || [])[0];
    if (cat) {
      (cat.brands || []).forEach(b => addBrand(b));
      categoryListings[cat.categorySlug] = {
        descriptionHtml: listingArticle(file),
        productSlugs: upsertAll(cat.products, { category: cat.categorySlug }),
        totalCount: cat.totalCount, totalPages: cat.totalPages,
        brandSlugs: (cat.brands || []).map(b => b.brand_slug),
        attributes: mapAttributes(cat.attributes), price: mapPrice(cat.priceData),
      };
    }
    if (sub) {
      (sub.brands || []).forEach(b => addBrand(b));
      subCategoryListings[`${sub.categorySlug}/${sub.subCategorySlug}`] = {
        descriptionHtml: listingArticle(file),
        categorySlug: sub.categorySlug, subCategorySlug: sub.subCategorySlug,
        title: stripTags((fs.readFileSync(file, 'utf8').match(/<title>([^<]*)<\/title>/) || [])[1] || ''),
        banners: mapBanners(sub.banners),
        productSlugs: upsertAll(sub.products, { category: sub.categorySlug, subCategory: sub.subCategorySlug }),
        totalCount: sub.totalCount, totalPages: sub.totalPages,
        brandSlugs: (sub.brands || []).map(b => b.brand_slug),
        attributes: mapAttributes(sub.attributes), price: mapPrice(sub.priceData),
      };
    }
  }
  if (r.startsWith('brands/')) {
    const b = (pageProps(file)[M.brandPage] || [])[0];
    if (b) {
      brandListings[b.brandSlug] = {
        descriptionHtml: listingArticle(file),
        productSlugs: upsertAll(b.initialProducts, { brand: b.brandSlug }),
        totalCount: b.initialTotalCount, totalPages: b.initialTotalPages,
        categories: (b.categories || []).map(c => ({ slug: c.category_slug, name: c.category_name, image: img(c.thumbnail_img, 'categories') })),
        attributes: mapAttributes(b.attributes), price: mapPrice(b.priceData),
      };
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Product details
const productDetails = {};
const colorWords = new Set();
for (const l of [...Object.values(categoryListings), ...Object.values(subCategoryListings), ...Object.values(brandListings)]) {
  for (const a of l.attributes) if (/colou?r/i.test(a.name)) a.values.forEach(v => colorWords.add(v));
}
const colorList = [...colorWords].filter(c => c.length > 2).sort((a, b) => b.length - a.length);

function variantsFromImages(thumbs) {
  // Product colour options aren't in the snapshot (they load client-side). The gallery file
  // names usually carry the colour though ("...-white.jpg"), so derive swatches from them.
  const seen = new Map();
  thumbs.forEach((t, index) => {
    const name = decodeURIComponent(path.basename(t.mediaFileUrl)).replace(/[-_()]+/g, ' ').toLowerCase();
    const color = colorList.find(c => new RegExp(`\\b${c.toLowerCase()}\\b`).test(name));
    if (color && !seen.has(color)) seen.set(color, index);
  });
  return seen.size > 1 ? [{ name: 'Color', options: [...seen].map(([value, imageIndex]) => ({ value, imageIndex })) }] : [];
}

for (const file of htmlFiles) {
  if (!rel(file).startsWith('product/')) continue;
  const d = ((pageProps(file)[M.productDetail] || [])[0] || {}).product;
  if (!d) continue;
  const slug = upsertProduct(d, {});
  const p = products.get(slug);
  p.hasDetail = true;
  const thumbs = d.thumbnails || [];
  p.images = thumbs.map(t => img(t.mediaFileUrl, 'products')).filter(Boolean);
  if (p.images[0]) p.image = p.images[0];
  const meta = d.metaTags || {};
  productDetails[slug] = {
    slug,
    shortDescriptionHtml: rewriteHtml(d.shortDesc, 'content', 'product'),
    descriptionHtml: rewriteHtml(d.description, 'content', 'product'),
    minBookingPrice: d.minBookingPrice || 0,
    purchasePoints: d.purchasePoints || 0,
    isFreeShipping: !!d.isFreeShipping,
    profitRatio: d.profitRatio || 0,
    soldCount: meta.soldCount || 0,
    totalReviews: meta.totalReview || 0,
    reviewPoints: meta.reviewPoints || 0,
    seo: { title: (meta.title || d.productName || '').trim(), description: meta.description || '', keywords: meta.keywords || '' },
    variants: variantsFromImages(thumbs),
  };
}

// ---------------------------------------------------------------------------------------------
// Homepage
const homeFile = path.join(SITE, 'index.html');
const homeHtml = fs.readFileSync(homeFile, 'utf8');
const offerBannerImgs = [];
{
  const re = /<img alt="Offer banner"[^>]*?\ssrc="([^"]+)"/g; let m;
  while ((m = re.exec(homeHtml))) {
    let u = decodeEntities(m[1]);
    const q = u.match(/[?&]url=([^&]+)/);
    if (q) u = decodeURIComponent(q[1]);
    offerBannerImgs.push({ image: img(u, 'banners'), href: '#' });
  }
}
const tabsOf = (id) => (home[M.tabs] || []).find(t => t.tabs && t.tabs[0] && t.tabs[0].content && t.tabs[0].content[1] && t.tabs[0].content[1].$module && t.tabs[0].content[1].$module[0] === id);
const tabProducts = (id) => {
  const t = tabsOf(id);
  return t ? t.tabs.map(tab => ({ label: tab.label, productSlugs: upsertAll(tab.content[3].products) })) : [];
};
const countdown = (home[M.countdown] || [])[0] || {};
const mp = (home[M.mostPopular] || [])[0] || {};

// blog cards (server-rendered markup)
function parseBlogCards(file) {
  const html = fs.readFileSync(file, 'utf8');
  const cards = [];
  const re = /<a class="overflow-hidden relative w-full h-75" href="([^"]+)">\s*<img alt="([^"]*)"[^>]*?\ssrc="([^"]+)"[\s\S]*?<span class="bg-\[#d4a97a\][^"]*">([^<]*)<\/span>[\s\S]*?<\/svg>([^<]*)<\/span>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(html))) {
    let u = decodeEntities(m[3]);
    const q = u.match(/[?&]url=([^&]+)/);
    if (q) u = decodeURIComponent(q[1]);
    cards.push({
      slug: toRoute(m[1]).replace('/blogs/', ''),
      title: stripTags(m[6]), category: stripTags(m[4]), date: stripTags(m[5]),
      excerpt: stripTags(m[7]), image: img(u, 'blogs'),
    });
  }
  return cards;
}

const homeData = {
  marquee: parseMarquee(homeFile),
  heroSlides: ((home[M.heroSlides] || [])[0] || { slides: [] }).slides.map(s => ({
    image: img(s.imageUrl, 'banners'), href: toRoute(s.content), newTab: !!s.openNewTab,
  })),
  categorySlugs: ((home[M.homeCategories] || [])[0] || { categories: [] }).categories.map(c => c.category_slug),
  flashSale: { title: countdown.title || 'Flash Sale', endsAt: countdown.targetDate || null, href: toRoute(countdown.pagesLink || '/offer/limited-time-offer'), tabs: tabProducts(M.flashList) },
  offerBanners: {
    afterFlashSale: offerBannerImgs.slice(0, 2),
    afterClipToCart: offerBannerImgs.slice(2, 4),
    afterNewArrivals: offerBannerImgs.slice(4, 6),
    mostPopular: mapBanners(mp.banners),
    afterFeatured: offerBannerImgs.slice(9, 11),
  },
  shopByBrandSlugs: ((home[M.shopByBrand] || [])[0] || { brands: [] }).brands.map(b => { addBrand(b); return b.slug; }),
  newArrivals: { tabs: tabProducts(M.newArrivalList) },
  mostPopularSlugs: upsertAll(mp.products),
  hotDealSlugs: upsertAll(((home[M.hotDeal] || [])[0] || {}).products),
  featuredSlugs: upsertAll(((home[M.featured] || [])[0] || {}).products),
  latestBlogs: parseBlogCards(homeFile).map(b => b.slug),
  seoCards: (((home[M.seoCards] || [])[0] || { cards: [] }).cards).map(c => ({ title: c.label, html: inlineLinksOnly(c.html) })),
};

// ---------------------------------------------------------------------------------------------
// Showcases (see-all pages)
const showcases = {};
for (const slug of ['hot-deal', 'most-popular', 'trending-now', 'feature-product', 'offer/limited-time-offer']) {
  const props = P(`${slug}.html`);
  const s = (props[M.showcase] || [])[0];
  if (!s) continue;
  const cd = (props[M.countdown] || [])[0];
  showcases[slug] = { slug, cols: s.cols || 5, productSlugs: upsertAll(s.initialProducts), endsAt: cd ? cd.targetDate : null };
}
{
  const n = (P('new-arrivals.html')[M.newArrivals] || [])[0];
  if (n) showcases['new-arrivals'] = { slug: 'new-arrivals', cols: 5, productSlugs: upsertAll(n.initialProducts), totalCount: n.initialTotalCount, endsAt: null };
}

// ---------------------------------------------------------------------------------------------
// Offers / campaigns
const offers = { campaigns: [], details: {} };
for (const c of (P('offer.html')[M.offerCard] || []).map(x => x.campaign)) {
  offers.campaigns.push({
    id: c.campaign_uuid, slug: c.slug, name: c.campaign_name, description: c.description,
    image: img(c.image_url, 'offers'), startsAt: c.started_at, endsAt: c.ended_at, active: !!c.is_active,
  });
}
for (const file of htmlFiles) {
  if (!rel(file).startsWith('offer/')) continue;
  const c = (pageProps(file)[M.campaignPage] || [])[0];
  if (!c) continue;
  offers.details[c.slug] = {
    slug: c.slug, name: c.campaignName, description: c.campaignDescription || '',
    image: img(c.campaignImage, 'offers'), endsAt: c.endedAt || null,
    productSlugs: upsertAll((c.initialData && c.initialData.data) || []),
  };
}

// ---------------------------------------------------------------------------------------------
// Stores
const storeList = (P('shop-location.html')[M.storeList] || [])[0] || { tabs: [], initialAllStores: [] };
const stores = {
  districts: storeList.tabs.map(t => ({ label: t.label, districtId: t.districtId, storeSlugs: (t.stores || []).map(s => s.slug) })),
  items: storeList.initialAllStores.map(s => ({
    id: s.uuid, slug: s.slug, name: s.branchName, address: s.address,
    lat: +s.latitude || null, lng: +s.longitude || null, dayOff: s.dayOff || '', openHours: s.openDay || '',
    phone: s.contactNo || '', email: s.email || '', storePickup: !!s.allowStorePickup, abroad: !!s.abroadBranch,
    image: img(s.thumbnailImg, 'stores'), descriptionHtml: rewriteHtml(s.description || ''), gallery: [],
  })),
};
for (const file of htmlFiles) {
  if (!rel(file).startsWith('shop-location/')) continue;
  const s = ((pageProps(file)[M.storeDetail] || [])[0] || {}).store;
  if (!s) continue;
  let item = stores.items.find(x => x.slug === s.slug);
  if (!item) { item = { id: s.uuid, slug: s.slug }; stores.items.push(item); }
  Object.assign(item, {
    name: item.name || s.branch_name, detailName: s.branch_name, address: s.address,
    lat: +s.latitude || item.lat || null, lng: +s.longitude || item.lng || null,
    dayOff: s.dayoff || item.dayOff || '', openHours: s.openday || item.openHours || '',
    phone: s.contactno || item.phone || '', email: s.email || item.email || '',
    descriptionHtml: rewriteHtml(s.description || '', 'content', 'shop-location') || item.descriptionHtml || '',
    image: item.image || img(s.thumbnail_img, 'stores'),
    gallery: (s.thumbnail || []).map(t => img(t.mediaFileURL, 'stores')).filter(Boolean),
  });
}

// ---------------------------------------------------------------------------------------------
// Blogs
const blogIndex = new Map();
for (const file of htmlFiles) {
  if (/^blogs[0-9a-f]{0,4}\.html$/.test(rel(file)) || rel(file) === 'index.html') {
    for (const b of parseBlogCards(file)) if (!blogIndex.has(b.slug)) blogIndex.set(b.slug, b);
  }
}
const blogTotal = +((fs.readFileSync(path.join(SITE, 'blogs.html'), 'utf8').match(/>\s*(\d+)\s*<!-- -->\s*posts/) || [])[1] || 0);
for (const file of htmlFiles) {
  if (!rel(file).startsWith('blogs/')) continue;
  const html = fs.readFileSync(file, 'utf8');
  const slug = path.basename(file, '.html');
  const b = blogIndex.get(slug) || { slug };
  const hero = html.match(/<div class="overflow-hidden relative w-full max-\[450px\]:h-\[310px\][^"]*">\s*<img alt="([^"]*)"[^>]*?\ssrc="([^"]+)"/);
  const info = html.match(/<h1 class="font-semibold text-\[20px\][^"]*">([\s\S]*?)<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/);
  const cat = html.match(/<span class="bg-yellow-400[^"]*">([^<]*)<\/span>\s*<span[^>]*>\s*<svg[\s\S]*?<\/svg>([^<]*)<\/span>/);
  const aStart = html.indexOf('<article');
  const aEnd = html.indexOf('</article>', aStart);
  let heroUrl = hero ? decodeEntities(hero[2]) : null;
  const q = heroUrl && heroUrl.match(/[?&]url=([^&]+)/);
  if (q) heroUrl = decodeURIComponent(q[1]);
  blogIndex.set(slug, {
    ...b,
    slug,
    title: info ? stripTags(info[1]) : b.title,
    excerpt: info ? stripTags(info[2]) : b.excerpt || '',
    category: cat ? stripTags(cat[1]) : b.category || 'Technology',
    date: cat ? stripTags(cat[2]) : b.date || '',
    image: b.image || (heroUrl ? img(heroUrl, 'blogs') : null),
    contentHtml: aStart > 0 ? rewriteHtml(html.slice(html.indexOf('>', aStart) + 1, aEnd).replace(/<!--\/?\$-->/g, ''), 'content', 'blogs') : '',
    seoTitle: stripTags((html.match(/<title>([^<]*)<\/title>/) || [])[1] || ''),
  });
}
const blogs = { total: blogTotal, categories: ['Technology'], posts: [...blogIndex.values()] };

/** Card grids on /career and /announcement (image block + category/date + title + button). */
function parsePostCards(file, bucket) {
  const html = fs.readFileSync(file, 'utf8');
  const out = [];
  const re = /<div class="overflow-hidden relative w-full h-75 group">\s*<img alt="([^"]*)"[^>]*?\ssrc="([^"]+)"[\s\S]*?<span class="bg-\[#d4a97a\][^"]*">([^<]*)<\/span>[\s\S]*?<\/svg>([^<]*)<\/span>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<a[^>]*href="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    let u = decodeEntities(m[2]);
    const q = u.match(/[?&]url=([^&]+)/);
    if (q) u = decodeURIComponent(q[1]);
    out.push({
      slug: path.basename(toRoute(m[7])),
      title: stripTags(m[5]), category: stripTags(m[3]), date: stripTags(m[4]),
      excerpt: stripTags(m[6]), image: img(u, bucket),
    });
  }
  return out;
}
const posts = {
  careers: parsePostCards(path.join(SITE, 'career.html'), 'posts'),
  announcements: parsePostCards(path.join(SITE, 'announcement.html'), 'posts'),
};

// ---------------------------------------------------------------------------------------------
// Brand / category inference for products the snapshot only shows in generic lists.
const brandAliases = [
  ['apple', /\b(iphone|ipad|macbook|imac|mac studio|mac mini|airpods|apple)\b/i],
  ['samsung', /\b(samsung|galaxy)\b/i], ['xiaomi', /\b(xiaomi|redmi|poco|mi)\b/i],
  ['google', /\b(google|pixel)\b/i], ['oneplus', /\boneplus\b/i], ['iqoo', /\biqoo\b/i],
];
const brandsByLength = [...brandIndex.values()].filter(b => b.name).sort((a, b) => b.name.length - a.name.length);
const categoryRules = [
  ['smart-tv', /\b(tv|television)\b/i], ['monitor', /\bmonitor\b/i],
  ['home-appliance', /\b(air fryer|vacuum|purifier|fridge|refrigerator|washing|blender|kettle|oven|humidifier|fan)\b/i],
  ['sounds', /\b(earpods|homepod|beolab|beoplay|beosound|beosystem|soundcore|subwoofer|loudspeakers?)\b/i],
  ['accessories', /\b(case|cover|glass|protector|guard|screen|charger|adapter|cable|power ?bank|stand|holder|strap|band strap|sleeve|pouch|hub|dock|keyboard|mouse|pencil|stylus|magsafe|wallet|diary|gan|\d+w)\b/i],
  ['laptop', /\b(macbook|laptop|ideapad|thinkpad|vivobook|zenbook|victus|pavilion|imac|mac studio|mac mini|notebook|rog|tuf)\b/i],
  ['tablet', /\b(ipad|tab|pad|tablet|matepad)\b/i],
  ['smart-watch', /\b(watch|smartwatch|band|fit|colorfit|noisefit)\b/i],
  ['sounds', /\b(beats|devialet|pods|airwave|ear clip|amplifier)\b/i],
  ['gadget', /\b(gopro|volta)\b/i],
  ['home-appliance', /\b(dyson|light)\b/i],
  ['accessories', /\bcare\+/i],
  ['sounds', /\b(earbuds?|buds|airpods|headphones?|earphones?|speaker|soundbar|neckband|anc)\b/i],
  ['gadget', /\b(gimbal|drone|camera|osmo|trimmer|tracker|airtag|projector|console|controller)\b/i],
  ['phones', /\b(iphone|galaxy [asmfz]\d|redmi|poco|pixel|oneplus|iqoo|vivo|oppo|realme|honor|infinix|tecno|nothing phone|motorola|moto|nokia|zte|meizu|huawei|5g|4g|phone)\b/i],
];
for (const p of products.values()) {
  if (!p.brandSlug) {
    const hit = brandsByLength.find(b => new RegExp(`^${b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(p.name))
      || brandsByLength.find(b => b.name.length > 2 && new RegExp(`\\b${b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(p.name));
    if (hit) p.brandSlug = hit.slug;
    else { const a = brandAliases.find(([, re]) => re.test(p.name)); if (a) p.brandSlug = a[0]; }
  }
  if (p.brandSlug && !p.brandName) p.brandName = (brandIndex.get(p.brandSlug) || {}).name || null;
}
// most common category of the products we *do* know per brand
const brandCategoryGuess = {};
{
  const counts = {};
  for (const p of products.values()) {
    if (!p.brandSlug || !p.categorySlugs.length) continue;
    const c = (counts[p.brandSlug] = counts[p.brandSlug] || {});
    c[p.categorySlugs[0]] = (c[p.categorySlugs[0]] || 0) + 1;
  }
  for (const [b, c] of Object.entries(counts)) brandCategoryGuess[b] = Object.entries(c).sort((x, y) => y[1] - x[1])[0][0];
}
for (const p of products.values()) {
  if (!p.categorySlugs.length) {
    const rule = categoryRules.find(([, re]) => re.test(p.name));
    if (rule) p.categorySlugs.push(rule[0]);
    else if (p.brandSlug) {
      // brand sold in exactly one top-level category (per the "Explore all" menu) -> that one
      const owners = categories.filter(c => c.brands.includes(p.brandSlug));
      if (owners.length === 1) p.categorySlugs.push(owners[0].slug);
      else if (brandCategoryGuess[p.brandSlug]) p.categorySlugs.push(brandCategoryGuess[p.brandSlug]);
    }
    p.categoryInferred = true;
  }
  if (p.inStock == null) p.inStock = !p.isTba && !p.endOfLife && p.price > 0;
  if (!p.images.length && p.image) p.images = [p.image];
}

// ---------------------------------------------------------------------------------------------
// Site + page metadata
const site = {
  name: settings ? settings.siteTitle : 'Dazzle',
  phone: settings ? settings.contactPhone : '',
  email: settings ? settings.contactEmail : '',
  address: settings ? settings.contactAddress : '',
  branchesText: settings ? settings.footerText : '',
  copyright: settings ? settings.copyrightText : '',
  social: settings ? {
    facebook: settings.facebookUrl, instagram: settings.instagramUrl, linkedin: settings.linkedinUrl, youtube: settings.youtubeUrl,
  } : {},
  marquee: { home: homeData.marquee, product: parseMarquee(path.join(SITE, 'product/haylou-w1-earbuds.html')) },
  assets: {
    logo: img('/_next/static/media/logo.png', 'site'),
    headerBg: img('/_next/static/media/header-bg.webp', 'site'),
    footerShadow: img('/_next/static/media/footer_shaw.png', 'site'),
    noImage: img('/_next/static/media/no_images.png', 'site'),
    productPlaceholder: img('/_next/static/media/product.png', 'site'),
    deliveryIcon: img('/_next/static/media/bk.png', 'site'),
    pointsIcon: img('/_next/static/media/st.png', 'site'),
    bookingIcon: img('/_next/static/media/lk.png', 'site'),
    about: ['about_1.0si_-ug~4sxzk.png', 'about_2.030.q4.pfzv~0.png', 'card-02.0mwrq.n.n37av.jpeg', 'card-03.0xr1jn~2ksmg3.jpeg']
      .map((f) => img(`/_next/static/media/${f}`, 'about')),
  },
};

const pageMeta = {};
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  const title = stripTags((head.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
  const description = decodeEntities((head.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  const keywords = decodeEntities((head.match(/<meta name="keywords" content="([^"]*)"/) || [])[1] || '');
  pageMeta[route(file)] = { title, description, keywords };
}
const policies = {};
for (const file of htmlFiles) {
  const p = (pageProps(file)[M.policy] || [])[0];
  if (p) policies[route(file).slice(1)] = { endpoint: p.endpoint, title: p.fallbackTitle };
}

// ---------------------------------------------------------------------------------------------
// Link repair. HTTrack encoded query strings as 4-hex filename suffixes ("adapters2c7e.html")
// and CMS copy links to slugs that weren't mirrored ("phones/samsung-1"). Map every internal
// link inside generated HTML to the closest route this app actually serves.
const knownRoutes = new Set(['/', '/categories', '/brands', '/offer', '/blogs', '/shop-location', '/new-arrivals', '/hot-deal',
  '/most-popular', '/trending-now', '/feature-product', '/pre-order', '/online-exclusive', '/about-us', '/career', '/announcement',
  '/press-coverage', '/support', '/feedback', '/corporate', '/trade-in', '/order-tracking', '/cart', '/emi-policy', '/terms-conditions']);
for (const p of products.values()) knownRoutes.add(`/product/${p.slug}`);
for (const b of brandIndex.keys()) knownRoutes.add(`/brands/${b}`);
for (const c of categories) { knownRoutes.add(`/categories/${c.slug}`); c.subCategories.forEach((s) => knownRoutes.add(`/categories/${c.slug}/${s.slug}`)); }
for (const k of Object.keys(subCategoryListings)) knownRoutes.add(`/categories/${k}`);
for (const b of blogIndex.keys()) knownRoutes.add(`/blogs/${b}`);
for (const s of stores.items) knownRoutes.add(`/shop-location/${s.slug}`);
for (const c of offers.campaigns) knownRoutes.add(`/offer/${c.slug}`);
for (const k of Object.keys(policies)) knownRoutes.add(`/${k}`);

function repairRoute(r) {
  const [p0, q] = r.split('?');
  // legacy "/products/x" urls and HTTrack's "index<hash>" alias of the home page
  const p = p0.replace(/^\/products\//, '/product/').replace(/^\/index[0-9a-f]{4}$/, '/');
  const clean = p.replace(/\/$/, '') || '/';
  if (knownRoutes.has(clean)) return clean + (q ? `?${q}` : "");
  const candidates = [clean.replace(/[0-9a-f]{4}$/, ''), clean.replace(/-\d+$/, ''), clean.replace(/[0-9a-f]{4}$/, '').replace(/-\d+$/, '')];
  for (const c of candidates) if (knownRoutes.has(c)) return c + (q ? `?${q}` : '');
  const seg = clean.split('/');
  if (seg[1] === 'categories' && seg.length === 4) {
    const leaf = candidates[2].split('/').pop();
    if (knownRoutes.has(`/brands/${leaf}`)) return `/brands/${leaf}`;
    return `/categories/${seg[2]}`;
  }
  if (seg[1] === 'brands') return '/brands';
  if (seg[1] === 'product') return `/search?q=${encodeURIComponent(seg[2].replace(/-price-in-bangladesh$/, '').replace(/-/g, ' '))}`;
  return r;
}
const repairHtml = (html) => (html || '').replace(/(<a\b[^>]*\shref=")(\/[^"]*)(")/g, (m, a, h, b) => a + repairRoute(h) + b);
for (const l of [...Object.values(categoryListings), ...Object.values(subCategoryListings), ...Object.values(brandListings)]) l.descriptionHtml = repairHtml(l.descriptionHtml);
for (const d of Object.values(productDetails)) { d.descriptionHtml = repairHtml(d.descriptionHtml); d.shortDescriptionHtml = repairHtml(d.shortDescriptionHtml); }
for (const b of blogIndex.values()) if (b.contentHtml) b.contentHtml = repairHtml(b.contentHtml);
for (const s of stores.items) s.descriptionHtml = repairHtml(s.descriptionHtml);
homeData.seoCards.forEach((c) => (c.html = repairHtml(c.html)));
homeData.marquee.forEach((m) => (m.href = repairRoute(m.href)));

// ---------------------------------------------------------------------------------------------
(async () => {
const shrunk = await images.shrinkOversized();
const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 1));
const productList = [...products.values()].sort((a, b) => a.slug.localeCompare(b.slug));
write('site.json', site);
write('categories.json', { categories, exploreAll });
write('brands.json', [...brandIndex.values()]);
write('products.json', productList);
write('product-details.json', productDetails);
write('home.json', homeData);
write('listings.json', { categories: categoryListings, subCategories: subCategoryListings, brands: brandListings });
write('showcases.json', showcases);
write('offers.json', offers);
write('stores.json', stores);
write('blogs.json', blogs);
write('posts.json', posts);
write('page-meta.json', pageMeta);
write('policies.json', policies);

const s = images.stats();
console.log(`pages: ${htmlFiles.length}  products: ${productList.length} (with detail: ${Object.keys(productDetails).length})`);
console.log(`brands: ${brandIndex.size}  categories: ${categories.length}  blogs: ${blogs.posts.length}  stores: ${stores.items.length}`);
console.log(`images copied: ${s.copied}  downscaled: ${shrunk}  missing: ${images.missing.size}`);
if (images.missing.size) fs.writeFileSync(path.join(OUT, '_missing-images.txt'), [...images.missing].join('\n'));
})();

// Rebuild the public content set after extracting catalogue facts. No network access.
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const guides = require("./brand-guides.cjs");
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "src/data/generated");
const read = name => JSON.parse(fs.readFileSync(path.join(dataDir, name + ".json"), "utf8"));
const write = (name, data) => fs.writeFileSync(path.join(dataDir, name + ".json"), JSON.stringify(data, null, 1) + "\n");
const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const products = read("products").filter(p => p.brandSlug !== "dazzle");
const details = read("product-details");
const site = read("site");
const home = read("home");
const taxonomy = read("categories");
const brands = read("brands").filter(b => b.slug !== "dazzle");
const listings = read("listings");
delete listings.brands.dazzle;
const offers = read("offers");
const meta = read("page-meta");

// Fingerprints identify untouched imported content during the optional database migration.
// They preserve ownership edits without storing the old article bodies or credentials.
const manifestPath = path.join(root, "src/data/content/import-manifest.json");
if (!fs.existsSync(manifestPath)) {
  const manifest = {
    site: { name: site.name, phone: site.phone, email: site.email, address: site.address, social: site.social },
    home: Object.fromEntries(Object.entries(home).map(([key, value]) => [key, hash(value)])),
    posts: read("blogs").posts.map(p => ({ slug: p.slug, title: hash(p.title), excerpt: hash(p.excerpt), contentHtml: p.contentHtml ? hash(p.contentHtml) : null, image: hash(p.image) })),
    products: products.map(p => ({ slug: p.slug, name: p.name, badge: p.badge, recognitionBadge: p.recognitionBadge,
      description: details[p.slug] ? hash(details[p.slug].descriptionHtml) : null,
      shortDescription: details[p.slug] ? hash(details[p.slug].shortDescriptionHtml) : null,
      seo: details[p.slug] ? hash(details[p.slug].seo) : null })),
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

const assetsDir = path.join(root, "public/images/brand");
fs.mkdirSync(assetsDir, { recursive: true });
const svg = (file, content) => fs.writeFileSync(path.join(assetsDir, file + ".svg"), content + "\n");
svg("wordmark", '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="48" viewBox="0 0 240 48"><title>dazzle.bd</title><text x="2" y="36" fill="white" font-family="Arial,sans-serif" font-weight="800" font-size="38" letter-spacing="-1.8">dazzle<tspan fill="#e9b865">.bd</tspan></text></svg>');
const illustration = '<g stroke="#e9b865" stroke-width="5" fill="none"><rect x="590" y="100" width="170" height="320" rx="28" transform="rotate(12 675 260)"/><path d="M640 125h60M642 390h55"/><rect x="660" y="275" width="280" height="170" rx="14"/><path d="M635 460h330l-22 20H660z"/><circle cx="860" cy="180" r="48"/><path d="M826 180v30M894 180v30"/></g>';
svg("tech", `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="600" viewBox="0 0 1000 600"><rect width="1000" height="600" fill="#171d21"/><circle cx="900" cy="150" r="290" fill="#26342f"/><circle cx="745" cy="550" r="240" fill="#332b23"/>${illustration}</svg>`);
svg("guide", `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="600" viewBox="0 0 1000 600"><rect width="1000" height="600" fill="#f6eddf"/><g stroke="#6d3f0e" stroke-width="6" fill="none"><rect x="160" y="125" width="410" height="260" rx="20"/><path d="M110 410h510l-35 35H145z"/><rect x="625" y="100" width="150" height="285" rx="22"/><path d="M665 128h70M677 355h45"/><circle cx="820" cy="450" r="62"/></g></svg>`);
svg("placeholder", '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#f6eddf"/><rect x="220" y="145" width="160" height="290" rx="28" fill="none" stroke="#6d3f0e" stroke-width="8"/><path d="M267 170h66M278 403h44" stroke="#6d3f0e" stroke-width="6"/><text x="300" y="510" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" fill="#6d3f0e">dazzle.bd</text></svg>');
const art = { src: "/images/brand/tech.svg", width: 1000, height: 600 };
const guideArt = { src: "/images/brand/guide.svg", width: 1000, height: 600 };
const banner = (headline, text, href, eyebrow = "dazzle.bd") => ({ image: art, headline, text, eyebrow, href, newTab: false });
const marquee = [
  { label: "dazzle.bd — tech that fits your day", href: "/about-us" },
  { label: "Build a shortlist. Compare your next device.", href: "/categories" },
  { label: "Practical buying guides for your everyday setup", href: "/blogs" },
  { label: "Questions about a model? Start with Support.", href: "/support" },
];
Object.assign(site, {
  name: "dazzle.bd", phone: "", email: "", address: "", branchesText: "",
  copyright: "© dazzle.bd. All rights reserved.", social: {}, marquee: { home: marquee, product: marquee },
});
site.assets.logo = { src: "/images/brand/wordmark.svg", width: 240, height: 48 };
site.assets.noImage = site.assets.productPlaceholder = { src: "/images/brand/placeholder.svg", width: 600, height: 600 };
site.assets.about = [guideArt];
write("site", site);
home.marquee = marquee;
home.heroSlides = [
  banner("Tech that fits your day.", "Phones, laptops and everyday gadgets. Start with what you need; compare the details that matter.", "/categories", "Meet dazzle.bd"),
  banner("Your next phone, on your terms.", "Shortlist by budget, check the selected variant and find a model for your daily routine.", "/categories/phones", "Make your next move"),
  banner("Make room for better work.", "Explore laptops, tablets and accessories for the desk, the classroom and the commute.", "/categories/laptop", "Build your everyday setup"),
];
home.flashSale.title = "Explore the price drops";
home.flashSale.endsAt = null;
home.flashSale.tabs.forEach((tab, index) => { tab.label = index ? "More to compare" : "Start here"; });
home.newArrivals.tabs.forEach((tab, index) => { tab.label = index ? "Browse more" : "In the catalogue"; });
home.offerBanners = {
  afterFlashSale: [banner("A phone for your routine", "Explore smartphones by brand and budget.", "/categories/phones"), banner("Your desk, your way", "Find laptops and the accessories to go with them.", "/categories/laptop")],
  afterClipToCart: [banner("Turn up your downtime", "Compare earbuds, headphones and speakers.", "/categories/sounds"), banner("Small additions. Useful changes.", "Explore cases, cables and everyday accessories.", "/categories/accessories")],
  afterNewArrivals: [banner("A screen for the task", "Browse tablets for work and entertainment.", "/categories/tablet"), banner("Keep your day in view", "Find a wearable to match your phone and routine.", "/categories/smart-watch")],
  mostPopular: [banner("Focus on your workspace", "Compare monitors for your setup.", "/categories/monitor"), banner("Find your next gadget", "Explore useful additions to your tech collection.", "/categories/gadget"), banner("Questions before checkout?", "Find practical advice in our buying guides.", "/blogs")],
  afterFeatured: [banner("Buy with a clearer shortlist", "Read the questions worth asking before your next tech purchase.", "/blogs"), banner("Need a particular model?", "Send a product enquiry with the configuration you have in mind.", "/pre-order")],
};
home.latestBlogs = guides.slice(0, 3).map(g => g.slug);
home.seoCards = [
  { title: "Compare smartphone prices in Bangladesh", html: 'Your next phone should suit your day as well as your budget. Browse <a href="/categories/phones">smartphones</a> by brand and price, then review the exact storage, colour and availability. Keep a shortlist of a few models so you can compare the details without losing track of the overall purchase.' },
  { title: "Choose a laptop for the work you do", html: 'Start with the applications you need, where you will work and the equipment you already own. Explore <a href="/categories/laptop">laptops</a> and check the listed configuration, ports and dimensions. Factor in any accessories before deciding what fits your budget.' },
  { title: "Find a tablet for reading, notes or entertainment", html: 'A tablet can play different roles in your setup. Compare the selected variant and any required keyboard or pen, rather than judging the device by its starting price alone. Browse <a href="/categories/tablet">tablets and iPads</a> with your main task in mind.' },
  { title: "Build an everyday audio setup", html: 'Where you listen matters. Explore <a href="/categories/sounds">headphones, earbuds and speakers</a> for your work area, commute or downtime. Check device compatibility, included accessories and the controls you expect to use before placing an order.' },
  { title: "Check the accessories that connect your devices", html: 'A charger, cable or case is useful only when it suits the exact device. Browse <a href="/categories/accessories">tech accessories</a>, review the model and required connections, and include them in the full cost of your setup.' },
  { title: "A clearer way to shop at dazzle.bd", html: 'Use search, price filters and product comparisons to narrow your options. Our <a href="/blogs">buying guides</a> explain useful questions to ask before checkout. If a listing leaves a detail unclear, <a href="/support">send a support enquiry</a> with the model you are considering.' },
];
write("home", home);

const categoryAdvice = {
  phones: ["Smartphones", "Start with your everyday apps, screen preferences and budget. Compare the exact storage and colour offered, then check dimensions and the features that matter to your routine."],
  tablet: ["Tablets", "Choose around the task: reading, handwritten notes, entertainment or work. Check application support and whether a compatible keyboard or pen is included in your budget."],
  laptop: ["Laptops", "List the software you need before comparing configurations. Review memory, storage, display, ports and physical dimensions against your work and travel routine."],
  "smart-watch": ["Smart watches", "Check compatibility with your phone and the features supported by that combination. Compare fit, strap options and the charging arrangement for everyday use."],
  gadget: ["Gadgets", "Start with the problem you want an accessory or device to solve. Check compatibility, included parts and the space or connections needed for your setup."],
  accessories: ["Accessories", "Identify your exact device before choosing a case, charger or cable. Review connector types, dimensions and the supported features for the job you need it to do."],
  sounds: ["Audio", "Think about where you listen and how often you take calls. Compare fit, controls, connections and included accessories alongside the selected model's listed features."],
  "smart-tv": ["Smart TVs", "Measure the available space and decide what you want to connect. Check dimensions, inputs, installation requirements and the services supported by the exact model."],
  "home-appliance": ["Home appliances", "Check the available space, required connections and the task the appliance will handle. Review installation and service arrangements for the selected item before ordering."],
  monitor: ["Monitors", "Measure your desk and identify your computer's display connections. Compare dimensions, the stand and the display features required by your usual work."],
};
for (const c of taxonomy.categories) c.name = categoryAdvice[c.slug]?.[0] || c.name;
for (const c of taxonomy.exploreAll) c.name = categoryAdvice[c.slug]?.[0] || c.name;
for (const c of [...taxonomy.categories, ...taxonomy.exploreAll]) c.brands = c.brands.filter(slug => slug !== "dazzle");
write("categories", taxonomy);
write("brands", brands);
const categoriesBySlug = new Map(taxonomy.categories.map(c => [c.slug, c]));
const brandsBySlug = new Map(brands.map(b => [b.slug, b]));
const listingCopy = (label, advice, link) => `<h2>${escape(label)} at dazzle.bd</h2><p>${escape(advice)}</p><p>Compare listed prices in Bangladesh and check the selected variant, current stock and product-specific warranty details before ordering. Delivery charges and any accepted coupon appear in your checkout summary.</p><p>Not sure which option fits? Read our <a href="/blogs">buying guides</a> or <a href="/support">ask about a model</a>. You can also <a href="${link}">browse related products</a> to build your shortlist.</p>`;
for (const [slug, item] of Object.entries(listings.categories)) {
  const [label, advice] = categoryAdvice[slug] || [categoriesBySlug.get(slug)?.name || slug, "Compare the available models according to your needs and budget."];
  item.descriptionHtml = listingCopy(label, advice, "/categories");
}
for (const item of Object.values(listings.subCategories)) {
  const parent = categoryAdvice[item.categorySlug];
  const label = categoriesBySlug.get(item.categorySlug)?.subCategories.find(s => s.slug === item.subCategorySlug)?.name || item.title;
  item.title = label;
  item.descriptionHtml = listingCopy(label, `${label} options deserve a comparison of the exact models and configurations. ${parent?.[1] || "Start with your budget and required features."}`, `/categories/${item.categorySlug}`);
  item.banners = [];
}
for (const [slug, item] of Object.entries(listings.brands)) {
  const label = brandsBySlug.get(slug)?.name || slug;
  item.descriptionHtml = listingCopy(label, `Explore the ${label} products in this catalogue. A brand name is a starting point: compare the exact model, configuration and compatibility with the devices you already use.`, "/brands");
}
write("listings", listings);

const plain = html => String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
const freshDetails = {};
for (const p of products) {
  const old = details[p.slug];
  const [category, advice] = categoryAdvice[p.categorySlugs[0]] || ["Technology", "Review the exact model and its compatibility with your setup."];
  const facts = [...(old?.shortDescriptionHtml || "").matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m => plain(m[1])).filter(t => t.includes(":") && t.length < 220 && !/dazzle|warranty|genuine|authentic|shipping|delivery|emi|discount|offer|points/i.test(t)).slice(0, 8);
  const summary = `Explore ${p.name} at dazzle.bd. Compare the listed price in Bangladesh, selected options and availability before you decide.`;
  freshDetails[p.slug] = {
    slug: p.slug,
    shortDescriptionHtml: facts.length ? `<ul>${facts.map(f => `<li>${escape(f)}</li>`).join("")}</ul>` : `<p>${escape(summary)}</p>`,
    descriptionHtml: `<h2>${escape(p.name)}: make it part of your shortlist</h2><p>${escape(summary)}</p><h3>What to check for your setup</h3><p>${escape(advice)}</p><h3>Review the selected option</h3><p>Confirm the configuration and included accessories for ${escape(p.name)}. Ask about details that affect your purchase, including coverage for this exact item. Check the current checkout total before placing an order.</p><p><a href="/categories/${p.categorySlugs[0] || "accessories"}">Compare other ${escape(category.toLowerCase())}</a> or <a href="/support">send a product question</a> with the model name.</p>`,
    minBookingPrice: 0, purchasePoints: 0, isFreeShipping: false, profitRatio: 0,
    soldCount: 0, totalReviews: 0, reviewPoints: 0,
    seo: { title: `${p.name} Price in Bangladesh | dazzle.bd`, description: summary, keywords: `${p.name}, ${p.brandName || category}, price in Bangladesh, dazzle.bd` },
    variants: old?.variants || [],
  };
  p.badge = "";
  if (/few left|offer running|best|selling|choice|dazzle|warranty|replacement/i.test(p.recognitionBadge)) p.recognitionBadge = "";
  // Names, manufacturer brands, IDs, variants and catalogue prices remain product facts.
}
write("products", products);
write("product-details", freshDetails);

const posts = guides.map(g => ({ slug: g.slug, title: g.title, category: g.category, date: "2026-10-09", excerpt: g.excerpt, image: guideArt,
  seoTitle: `${g.title} | dazzle.bd`, contentHtml: `<p>${escape(g.excerpt)}</p>${g.sections.map(([heading, body]) => `<h2>${escape(heading)}</h2><p>${escape(body)}</p>`).join("")}<p><a href="${g.href}">Explore the catalogue</a> or <a href="/support">ask a product question</a>.</p>` }));
write("blogs", { total: posts.length, categories: [...new Set(posts.map(p => p.category))], posts });
write("posts", { careers: [], announcements: [{ slug: "meet-dazzle-bd", title: "Meet dazzle.bd: tech that fits your day", category: "Store updates", date: "2026-10-09", excerpt: "Explore a catalogue built around your next practical tech choice.", image: guideArt, contentHtml: '<p>Welcome to dazzle.bd. Browse phones, laptops, tablets and accessories, compare your options and keep your shopping focused on the way you use technology.</p><h2>Start with a useful shortlist</h2><p>Use the category menu and price filters to narrow the catalogue. Our buying guides explain the details worth checking before checkout. If a particular model leaves you with a question, send it through Support.</p><p><a href="/categories">Explore products</a> or <a href="/blogs">read a buying guide</a>.</p>' }] });
write("stores", { districts: [{ label: "All", districtId: null, storeSlugs: [] }], items: [] });
for (const [index, c] of offers.campaigns.entries()) {
  const campaignLabels = ["Explore current price reductions", "Build your Apple shortlist", "Compare online picks"];
  c.name = campaignLabels[index % campaignLabels.length];
  c.description = "Compare the listed products and current prices. Review the selected option, availability and final checkout amount before ordering.";
  c.image = guideArt;
  // No invented closing dates or percentage-off promises.
  c.startsAt = "";
  c.endsAt = "";
  const detail = offers.details[c.slug];
  if (detail) Object.assign(detail, { name: c.name, description: c.description, image: guideArt, endsAt: null });
}
for (const [slug, d] of Object.entries(offers.details)) {
  d.name = slug === "limited-time-offer" ? "Explore current price reductions" : d.name.replace(/Dazzle/gi, "dazzle.bd").replace(/up.?to\s*\d+%\s*off/gi, "catalogue picks");
  d.description = "Explore the products in this collection, compare current prices and review the details before placing your order.";
  d.image = guideArt;
  d.endsAt = null;
}
write("offers", offers);
const showcases = read("showcases");
for (const showcase of Object.values(showcases)) showcase.endsAt = null;
write("showcases", showcases);

const routeLabels = {
  "/": "Phones, Laptops & Everyday Tech in Bangladesh", "/about-us": "Meet dazzle.bd", "/blogs": "Practical Tech Buying Guides",
  "/categories": "Explore Tech by Category", "/brands": "Browse Tech Brands", "/offer": "Explore Current Offers",
  "/new-arrivals": "Explore the Latest Catalogue Additions", "/trending-now": "Discover Your Next Device", "/most-popular": "Explore Your Options",
  "/feature-product": "Ideas for Your Everyday Setup", "/hot-deal": "Compare Current Price Reductions", "/online-exclusive": "Browse Online Picks",
  "/pre-order": "Ask About a Particular Device", "/support": "Product & Order Support", "/feedback": "Share Your Shopping Feedback",
  "/corporate": "Tech Enquiries for Your Business", "/career": "Working with dazzle.bd", "/announcement": "dazzle.bd Updates",
  "/press-coverage": "Media Enquiries", "/shop-location": "Contact & Collection Information", "/trade-in": "Ask About Trading in a Device",
};
const newMeta = {};
for (const route of Object.keys(meta)) {
  if (/^\/(blogs|shop-location|career|announcement)\//.test(route)) continue;
  const parts = route.split("/").filter(Boolean);
  const p = products.find(p => `/product/${p.slug}` === route);
  if (parts[0] === "product" && !p) continue;
  if (p) { newMeta[route] = freshDetails[p.slug].seo; continue; }
  const category = parts[0] === "categories" ? categoriesBySlug.get(parts[1]) : null;
  const brand = parts[0] === "brands" ? brandsBySlug.get(parts[1]) : null;
  if (parts[0] === "brands" && parts[1] === "dazzle") continue;
  const sub = category?.subCategories.find(s => s.slug === parts[2]);
  const label = routeLabels[route] || sub?.name || category?.name || brand?.name || parts.at(-1)?.replaceAll("-", " ").replace(/\b\w/g, c => c.toUpperCase()) || "Explore the Catalogue";
  newMeta[route] = { title: `${label} | dazzle.bd`, description: category || brand ? `Explore ${label} at dazzle.bd. Compare listed prices in Bangladesh, review available models and check the details for your next tech purchase.` : `Visit dazzle.bd for ${label.toLowerCase()}. Find clear shopping information, practical device choices and help with your next tech purchase.`, keywords: `${label}, Bangladesh, dazzle.bd` };
}
newMeta["/"] = { title: "Phones, Laptops & Everyday Tech in Bangladesh | dazzle.bd", description: "Find phones, laptops, tablets and everyday tech at dazzle.bd. Compare prices in Bangladesh, explore specifications and choose what fits your day.", keywords: "smartphone price in Bangladesh, laptop price in Bangladesh, tablets, gadgets, accessories, dazzle.bd" };
for (const post of posts) newMeta[`/blogs/${post.slug}`] = { title: post.seoTitle, description: post.excerpt, keywords: `${post.category}, buying guide, Bangladesh, dazzle.bd` };
write("page-meta", newMeta);
console.log(`Created dazzle.bd content: ${products.length} product summaries, ${Object.keys(listings.categories).length + Object.keys(listings.subCategories).length + Object.keys(listings.brands).length} listing descriptions and ${posts.length} original guides.`);
require("./product-image-policy.cjs").applyImagePolicy();

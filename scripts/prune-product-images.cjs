// Dry run by default. --apply removes only the reviewed imported product image files.
const fs = require('node:fs');
const path = require('node:path');
const { MongoClient } = require('mongodb');
const { root, manifestPath, applyImagePolicy } = require('./product-image-policy.cjs');
const dataDir = path.join(root, 'src/data/generated');
const imageDir = fs.realpathSync(path.join(root, 'public/images/products'));
const expectedImageDir = path.join(fs.realpathSync(root), 'public/images/products');
if (imageDir.toLowerCase() !== expectedImageDir.toLowerCase())
  throw new Error('Product image folder resolves outside its intended location. No files removed.');
const read = name => JSON.parse(fs.readFileSync(path.join(dataDir, name + '.json'), 'utf8'));

function assets(value, result = new Set()) {
  if (!value || typeof value !== 'object') return result;
  if (typeof value.src === 'string') result.add(value.src);
  for (const child of Object.values(value)) assets(child, result);
  return result;
}

function homeProducts(home, products, slugs) {
  for (const tab of [...(home.flashSale?.tabs || []), ...(home.newArrivals?.tabs || [])])
    tab.productSlugs.forEach(slug => slugs.add(slug));
  for (const field of ['hotDealSlugs', 'featuredSlugs', 'mostPopularSlugs'])
    (home[field] || []).forEach(slug => slugs.add(slug));
  for (const brand of home.shopByBrandSlugs || [])
    products.filter(p => p.brandSlug === brand && p.price > 0 && p.active !== false)
      .slice(0, 10).forEach(p => slugs.add(p.slug));
}

async function liveCatalogue() {
  try { process.loadEnvFile(path.join(root, '.env.local')); } catch { /* Optional local configuration. */ }
  if (!process.env.MONGODB_URI) return { products: [], home: null, categories: [], brands: [] };
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'dazzle_store');
    const [products, home, categories, brands] = await Promise.all([
      db.collection('products').find({}, { projection: { _id: 0, slug: 1, image: 1, images: 1, categorySlugs: 1, brandSlug: 1, price: 1, active: 1 } }).toArray(),
      db.collection('content').findOne({ key: 'home' }, { projection: { _id: 0 } }),
      db.collection('categories').find({}, { projection: { _id: 0, slug: 1, image: 1, subCategories: 1 } }).toArray(),
      db.collection('brands').find({}, { projection: { _id: 0, slug: 1, logo: 1 } }).toArray(),
    ]);
    return { products, home, categories, brands };
  } catch {
    throw new Error('Cannot verify the live homepage. No images were removed; restore database access and retry.');
  } finally { await client.close(); }
}

async function main() {
  if (fs.existsSync(manifestPath)) {
    const policy = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const targets = policy.removedImages.map(src => {
      if (!/^\/images\/products\/[^/\\]+$/.test(src)) throw new Error('Invalid retired image path. No files removed.');
      const target = path.resolve(imageDir, path.basename(src));
      if (path.dirname(target).toLowerCase() !== imageDir.toLowerCase()) throw new Error('Image path escaped its folder. No files removed.');
      if (!fs.existsSync(target)) return null;
      if (fs.lstatSync(target).isSymbolicLink() || !fs.statSync(target).isFile()) throw new Error('Unexpected link or directory. No files removed.');
      return target;
    }).filter(Boolean);
    console.log(`Keeping the reviewed selection: ${policy.retainedImages.length} retained photos; ${targets.length} retired files still on disk.`);
    if (process.argv.includes('--apply')) {
      applyImagePolicy();
      targets.forEach(target => fs.unlinkSync(target));
    }
    return;
  }
  const seed = read('products'), home = read('home'), categories = read('categories').categories;
  const live = await liveCatalogue();
  const homeSlugs = new Set();
  for (const catalogue of [seed, live.products]) {
    homeProducts(home, catalogue, homeSlugs);
    if (live.home) homeProducts(live.home, catalogue, homeSlugs);
  }
  for (const slug of ['trending-now', 'most-popular'])
    (read('showcases')[slug]?.productSlugs || []).forEach(p => homeSlugs.add(p));
  const selected = new Set(homeSlugs);
  const summary = [];
  for (const category of categories) {
    const pool = seed.filter(p => p.categorySlugs.includes(category.slug) && p.image);
    const leading = read('listings').categories[category.slug]?.productSlugs || [];
    const preferred = [...leading.map(slug => pool.find(p => p.slug === slug)).filter(Boolean), ...pool];
    const examples = new Set([...new Set(preferred.map(p => p.slug))].slice(0, 10));
    examples.forEach(slug => selected.add(slug));
    summary.push({ category: category.slug, sampleProducts: [...examples], homepageProducts: pool.filter(p => homeSlugs.has(p.slug)).length });
  }
  const keep = new Set();
  for (const product of [...seed, ...live.products])
    if (selected.has(product.slug)) assets(product, keep);
  // Protect every non-product asset, including logos, category tiles and authored homepage banners.
  for (const name of fs.readdirSync(dataDir).filter(name => name.endsWith('.json') && name !== 'products.json'))
    assets(JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8')), keep);
  assets(live.home, keep); assets(live.categories, keep); assets(live.brands, keep);
  const files = fs.readdirSync(imageDir, { withFileTypes: true });
  if (files.some(file => !file.isFile() || file.isSymbolicLink())) throw new Error('Unexpected directory or link in the product image folder. No files removed.');
  const removed = files.filter(file => !keep.has('/images/products/' + file.name));
  const bytes = removed.reduce((sum, file) => sum + fs.statSync(path.join(imageDir, file.name)).size, 0);
  const manifest = {
    version: 1, categorySampleSize: 10, homepageProductSlugs: [...homeSlugs].sort(),
    retainedProductSlugs: [...selected].sort(), categories: summary,
    retainedImages: files.filter(file => keep.has('/images/products/' + file.name)).map(file => '/images/products/' + file.name).sort(),
    removedImages: removed.map(file => '/images/products/' + file.name).sort(),
    removedBytes: bytes,
  };
  console.log(JSON.stringify({ homepageProducts: homeSlugs.size, retainedProductImages: manifest.retainedImages.length, removeProductImages: removed.length, reclaimMiB: +(bytes / 1024 / 1024).toFixed(2), categories: summary.map(c => ({ category: c.category, sampleProducts: c.sampleProducts.length, homepageProducts: c.homepageProducts })) }, null, 2));
  if (!process.argv.includes('--apply')) return;
  // Resolve and validate all paths before making any changes. Never follow a directory link.
  const targets = removed.map(file => fs.realpathSync(path.join(imageDir, file.name)));
  if (targets.some(target => path.dirname(target).toLowerCase() !== imageDir.toLowerCase())) throw new Error('Deletion target escaped the product image folder. No files removed.');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  applyImagePolicy();
  for (const target of targets) fs.unlinkSync(target);
  console.log(`Removed ${targets.length} extra product photos. All other image folders are unchanged.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });

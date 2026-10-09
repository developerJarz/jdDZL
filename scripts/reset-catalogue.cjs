// Preview by default. --apply --stock=10 applies the owner's photo cleanup and initial stock reset.
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { MongoClient, BSON } = require('mongodb');
const { root, manifestPath, applyImagePolicy } = require('./product-image-policy.cjs');

function isRemovedPhotoProduct(product, policy) {
  if (policy.homepageProductSlugs.includes(product.slug)) return false;
  const removed = new Set(policy.removedImages);
  const pictures = [product.image, ...(product.images || [])].filter(Boolean);
  const source = asset => asset.src.split(/[?#]/, 1)[0];
  return pictures.some(asset => removed.has(source(asset))) && !pictures.some(asset =>
    !removed.has(source(asset)) && !/\/(?:placeholder|product-unavailable)\.svg$/.test(source(asset)));
}

function stockFields(product, stock) {
  const fields = { stock, inStock: stock > 0 && !product.isTba && !product.endOfLife };
  if (product.trackVariants && product.variantStock?.length) {
    const count = product.variantStock.length;
    fields.variantStock = product.variantStock.map((variant, index) => ({
      ...variant, stock: Math.floor(stock / count) + Number(index < stock % count),
    }));
  }
  return fields;
}

async function plan(database, policy, session) {
  const products = await database.collection('products').find({}, { session }).toArray();
  const candidates = products.filter(product => isRemovedPhotoProduct(product, policy));
  const slugs = candidates.map(product => product.slug);
  const ordered = await database.collection('orders').distinct('items.slug', { 'items.slug': { $in: slugs } }, { session });
  const purchased = await database.collection('purchases').distinct('items.slug', { 'items.slug': { $in: slugs } }, { session });
  const protectedSlugs = new Set([...ordered, ...purchased]);
  return {
    products, candidates,
    deletable: candidates.filter(product => !protectedSlugs.has(product.slug)),
    archived: candidates.filter(product => protectedSlugs.has(product.slug)),
    remaining: products.filter(product => !slugs.includes(product.slug)),
  };
}

async function main() {
  process.loadEnvFile(path.join(root, '.env.local'));
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured.');
  const stockArgument = process.argv.find(argument => argument.startsWith('--stock='));
  if (!stockArgument) throw new Error('Specify the starting stock, for example --stock=10.');
  const stock = Number(stockArgument.slice(8));
  if (!Number.isSafeInteger(stock) || stock < 0 || stock > 1_000_000) throw new Error('Stock must be a nonnegative integer at most 1,000,000.');
  const policy = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    const database = client.db(process.env.MONGODB_DB || 'dazzle_store');
    const preview = await plan(database, policy);
    console.log(JSON.stringify({ productsBefore: preview.products.length, deleteProducts: preview.deletable.length, archiveOrderedProducts: preview.archived.length, remainingProducts: preview.remaining.length, stockPerProduct: stock }, null, 2));
    if (!process.argv.includes('--apply')) return;
    const runId = randomUUID();
    const backupDir = path.join(root, '.backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `catalogue-reset-${runId}.ejson`);
    const seedBackup = Object.fromEntries(['products', 'product-details', 'page-meta', 'listings', 'showcases', 'home'].map(name => [name, fs.readFileSync(path.join(root, 'src/data/generated', name + '.json'), 'utf8')]));
    let applied;
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const current = await plan(database, policy, session);
        // This backup includes the complete products and previous stock, but no connection credentials.
        fs.writeFileSync(backupPath, BSON.EJSON.stringify({ runId, createdAt: new Date(), products: current.products, policy, seeds: seedBackup, importInitialStock: process.env.IMPORT_INITIAL_STOCK ?? null }, { relaxed: false }), { mode: 0o600 });
        if (BSON.EJSON.parse(fs.readFileSync(backupPath, 'utf8')).products.length !== current.products.length)
          throw new Error('The product backup could not be verified. No database changes made.');
        const now = new Date();
        const operations = current.remaining.map(product => ({ updateOne: {
          filter: { _id: product._id }, update: { $set: { ...stockFields(product, stock), updatedAt: now } },
        } }));
        if (operations.length) await database.collection('products').bulkWrite(operations, { session });
        if (current.deletable.length) await database.collection('products').deleteMany({ _id: { $in: current.deletable.map(product => product._id) } }, { session });
        if (current.archived.length) await database.collection('products').updateMany({ _id: { $in: current.archived.map(product => product._id) } }, { $set: { active: false, inStock: false, updatedAt: now } }, { session });
        const movements = current.remaining.filter(product => (product.stock || 0) !== stock).map(product => ({
          slug: product.slug, delta: stock - (product.stock || 0), balance: stock,
          reason: 'Initial stock reset after product photo cleanup', actorId: 'catalogue-maintenance', runId, createdAt: now,
        }));
        if (movements.length) await database.collection('stockMovements').insertMany(movements, { session });
        await database.collection('audit').insertOne({
          action: 'products.photo-cleanup-stock-reset', entityId: runId, actorId: 'catalogue-maintenance',
          detail: `${current.deletable.length} products deleted, ${current.archived.length} archived; ${current.remaining.length} products set to ${stock} units`, createdAt: now,
        }, { session });
        applied = current;
      });
    } finally { await session.endSession(); }
    const nextPolicy = { ...policy, removedProductSlugs: [...new Set([...(policy.removedProductSlugs || []), ...applied.candidates.map(product => product.slug)])].sort(), initialStock: stock };
    fs.writeFileSync(manifestPath, JSON.stringify(nextPolicy, null, 2) + '\n');
    applyImagePolicy();
    const envPath = path.join(root, '.env.local');
    const env = fs.readFileSync(envPath, 'utf8');
    fs.writeFileSync(envPath, /^IMPORT_INITIAL_STOCK=.*$/m.test(env)
      ? env.replace(/^IMPORT_INITIAL_STOCK=.*$/m, `IMPORT_INITIAL_STOCK=${stock}`)
      : env.trimEnd() + `\nIMPORT_INITIAL_STOCK=${stock}\n`);
    console.log(JSON.stringify({ deleted: applied.deletable.length, archived: applied.archived.length, stockUpdated: applied.remaining.length, stockPerProduct: stock, backup: path.relative(root, backupPath) }, null, 2));
  } finally { await client.close(); }
}

module.exports = { isRemovedPhotoProduct, stockFields };
if (require.main === module) main().catch(error => { console.error(error.name, String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[redacted]')); process.exitCode = 1; });

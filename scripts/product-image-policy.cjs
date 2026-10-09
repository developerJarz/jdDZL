const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'src/data/content/product-image-policy.json');
const placeholder = { src: '/images/brand/product-unavailable.svg', width: 600, height: 600 };

function removedImages() {
  return new Set(fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')).removedImages : []);
}

function sanitizeProduct(product, removed) {
  const image = product.image && !removed.has(product.image.src) ? product.image : null;
  const gallery = product.images || [];
  // Preserve variant image indexes when a gallery contains retained photos.
  const images = gallery.some(asset => !removed.has(asset.src))
    ? gallery.map(asset => removed.has(asset.src) ? placeholder : asset) : [];
  return { ...product, image, images };
}

function applyImagePolicy() {
  const removed = removedImages();
  if (!removed.size) return;
  const policy = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const retiredProducts = new Set(policy.removedProductSlugs || []);
  const file = path.join(root, 'src/data/generated/products.json');
  const before = fs.readFileSync(file, 'utf8');
  const products = JSON.parse(before).filter(product => !retiredProducts.has(product.slug)).map(product => {
    const clean = sanitizeProduct(product, removed);
    return policy.initialStock === undefined ? clean : {
      ...clean, stock: policy.initialStock,
      inStock: policy.initialStock > 0 && !clean.isTba && !clean.endOfLife,
    };
  });
  const after = JSON.stringify(products, null, 1) + '\n';
  if (before !== after) fs.writeFileSync(file, after);
  if (!retiredProducts.size) return;
  // Remove stale seed references so setup, extraction and sitemap generation cannot restore deleted products.
  for (const name of ['product-details', 'page-meta', 'listings', 'showcases', 'home']) {
    const target = path.join(root, 'src/data/generated', name + '.json');
    const previous = fs.readFileSync(target, 'utf8');
    const data = JSON.parse(previous);
    if (name === 'product-details') for (const slug of retiredProducts) delete data[slug];
    if (name === 'page-meta') for (const slug of retiredProducts) {
      delete data['/product/' + slug]; delete data['/product-compare/' + slug];
    }
    function cleanLists(value) {
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        if (['productSlugs', 'mostPopularSlugs', 'hotDealSlugs', 'featuredSlugs'].includes(key) && Array.isArray(child))
          value[key] = child.filter(slug => !retiredProducts.has(slug));
        else cleanLists(child);
      }
    }
    cleanLists(data);
    const next = JSON.stringify(data, null, 1) + '\n';
    if (previous !== next) fs.writeFileSync(target, next);
  }
}

module.exports = { root, manifestPath, placeholder, removedImages, sanitizeProduct, applyImagePolicy };

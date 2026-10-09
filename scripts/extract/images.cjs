// Image resolution for the HTTrack snapshot.
//
// The snapshot stores remote images in two ways:
//   1. Originals mirrored under <snapshot>/<host>/<path> (e.g. the CDN folder).
//   2. Next.js `/_next/image` resizes, saved as `_next/<name><hash>.<ext>` and referenced
//      from <img srcset> entries as `_next/<file>?url=<encoded original>&w=<width>`.
//
// `createImageResolver` indexes both, then `resolve(url, bucket)` copies the best local
// file into `public/images/<bucket>/` and returns its public path + intrinsic size.
const fs = require('fs');
const path = require('path');
const { removedImages, placeholder } = require('../product-image-policy.cjs');

const MAX_WIDTH = { banners: 1920, offers: 1920, blogs: 1920, site: 3840, default: 1200 };

function sniffExt(buf) {
  if (buf.slice(1, 4).toString() === 'PNG') return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (buf.slice(0, 3).toString() === 'GIF') return 'gif';
  if (buf.slice(4, 12).toString().includes('ftypavif')) return 'avif';
  const head = buf.slice(0, 200).toString().trim();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'svg';
  return null;
}

function imageSize(buf, ext) {
  try {
    if (ext === 'png') return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (ext === 'gif') return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    if (ext === 'webp') {
      const chunk = buf.slice(12, 16).toString();
      if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      if (chunk === 'VP8L') {
        const b = buf.readUInt32LE(21);
        return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
      }
      if (chunk === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    }
    if (ext === 'jpg') {
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
        i += 2 + len;
      }
    }
  } catch {}
  return null;
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('~hts')) continue;
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkFiles(p, out); else out.push(p);
  }
  return out;
}

function normalizeUrl(u) {
  if (!u) return null;
  u = u.replace(/&amp;/g, '&').trim();
  // HTTrack rewrites absolute CDN urls to relative "../../dazzle.sgp1..." paths
  u = u.replace(/^(\.\.\/)+/, '');
  if (/^[a-z0-9.-]+\.(com|net|bd)\//i.test(u)) u = 'https://' + u;
  if (u.startsWith('//')) u = 'https:' + u;
  return u;
}

function slugifyName(s) {
  return s.toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'image';
}

function createImageResolver({ snapshotDir, siteDir, htmlFiles, publicDir }) {
  const retired = removedImages();
  /** original url -> [{file, w}] */
  const variants = new Map();
  const srcsetRe = /(?:^|[\s"',])((?:\.\.\/)*_next\/[^\s"'?]+)\?url=([^&"'\s]+)&(?:amp;)?w=(\d+)/g;
  for (const html of htmlFiles) {
    const text = fs.readFileSync(html, 'utf8');
    const dir = path.dirname(html);
    let m;
    while ((m = srcsetRe.exec(text))) {
      let filePart = m[1];
      try { filePart = decodeURIComponent(filePart); } catch {}
      const file = path.resolve(dir, filePart);
      let original = decodeURIComponent(m[2]);
      if (original.startsWith('/_next/static/media/')) original = 'static:' + path.basename(original);
      const list = variants.get(original) || [];
      if (!list.some(v => v.file === file)) list.push({ file, w: +m[3] });
      variants.set(original, list);
    }
  }

  /** direct mirrored originals: https://host/path -> file (plus a stem index for hashed names) */
  const direct = new Map();
  const stems = new Map();
  for (const host of fs.readdirSync(snapshotDir)) {
    const hostDir = path.join(snapshotDir, host);
    if (!fs.statSync(hostDir).isDirectory() || host === 'hts-cache' || host === 'dazzle.com.bd') continue;
    for (const file of walkFiles(hostDir)) {
      const rel = path.relative(hostDir, file).replace(/\\/g, '/');
      direct.set(`https://${host}/${rel}`, file);
      // HTTrack appends a 4-hex hash before the extension when the url had a query string
      const stem = `https://${host}/${rel}`.replace(/[0-9a-f]{4}(\.[a-z0-9]+)$/i, '$1');
      stems.set(stem, file);
    }
  }
  const staticMedia = new Map();
  for (const file of walkFiles(path.join(siteDir, '_next/static/media'))) {
    const base = path.basename(file);
    staticMedia.set(base.split('.')[0], file);
  }

  const cache = new Map(); // original url -> result
  const usedNames = new Map(); // dest rel path -> original url
  const missing = new Set();
  const oversized = [];

  function pickFile(url, maxWidth) {
    if (url.startsWith('static:') || url.includes('/_next/static/media/')) {
      const base = path.basename(url.replace('static:', '')).split('.')[0];
      if (staticMedia.has(base)) return staticMedia.get(base);
    }
    const plain = url.split('?')[0];
    // Prefer an already-resized variant close to the display size; mirrored originals can be
    // several thousand pixels wide.
    const staticKey = plain.includes('/_next/static/media/') ? 'static:' + path.basename(plain) : null;
    const list = variants.get(url) || variants.get(plain) || (staticKey && variants.get(staticKey));
    if (list && list.length) {
      let existing = list.filter(v => fs.existsSync(v.file) && fs.statSync(v.file).size > 200);
      // a JPEG re-encode of a transparent PNG turns the background black — keep alpha formats
      if (/\.(png|webp|gif|svg)$/i.test(plain)) {
        const alpha = existing.filter(v => !/\.jpe?g$/i.test(v.file));
        if (alpha.length) existing = alpha;
      }
      const under = existing.filter(v => v.w <= maxWidth).sort((a, b) => b.w - a.w);
      if (under.length && under[0].w >= Math.min(640, maxWidth)) return under[0].file;
      const direct0 = directFile(url, plain);
      if (direct0) return direct0;
      if (existing.length) return (under[0] || existing.sort((a, b) => a.w - b.w)[0]).file;
    }
    return directFile(url, plain);
  }

  function directFile(url, plain) {
    for (const key of [url, plain, encodeURI(plain)]) {
      const f = direct.get(key);
      if (f && fs.statSync(f).size > 200) return f;
    }
    return stems.get(plain) || null;
  }

  function resolve(rawUrl, bucket) {
    const url = normalizeUrl(rawUrl);
    if (!url || url === '#') return null;
    if (url.startsWith('data:')) return { src: url, width: null, height: null };
    if (cache.has(url)) return cache.get(url);
    const file = pickFile(url, MAX_WIDTH[bucket] || MAX_WIDTH.default);
    if (!file) { missing.add(url); cache.set(url, null); return null; }
    const buf = fs.readFileSync(file);
    const ext = sniffExt(buf) || path.extname(file).slice(1).toLowerCase() || 'bin';
    const size = imageSize(buf, ext);
    const baseName = slugifyName(decodeURIComponent(path.basename(url.replace('static:', '').split('?')[0])));
    let rel, n = 1;
    do {
      rel = `${bucket}/${baseName}${n > 1 ? '-' + n : ''}.${ext}`;
      n++;
    } while (usedNames.has(rel) && usedNames.get(rel) !== url);
    usedNames.set(rel, url);
    if (retired.has(`/images/${rel}`)) {
      cache.set(url, placeholder);
      return placeholder;
    }
    const dest = path.join(publicDir, 'images', rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(dest)) fs.copyFileSync(file, dest);
    const result = { src: `/images/${rel}`, width: size ? size.width : null, height: size ? size.height : null };
    cache.set(url, result);
    if (result.width > 2400) oversized.push({ dest, result });
    return result;
  }

  /** Downscale huge mirrored originals (some banners are 7000px wide). */
  async function shrinkOversized(maxWidth = 1920) {
    let sharp;
    try { sharp = require('sharp'); } catch { return 0; }
    for (const { dest, result } of oversized) {
      const buf = await sharp(fs.readFileSync(dest)).resize({ width: maxWidth }).toBuffer({ resolveWithObject: true });
      fs.writeFileSync(dest, buf.data);
      result.width = buf.info.width; result.height = buf.info.height;
    }
    return oversized.length;
  }

  return { resolve, missing, shrinkOversized, stats: () => ({ indexedVariants: variants.size, direct: direct.size, copied: usedNames.size }) };
}

module.exports = { createImageResolver, normalizeUrl };

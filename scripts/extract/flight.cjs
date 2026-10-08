// RSC flight payload parser for HTTrack'd Next.js pages.
// parse(htmlFile) -> { rows: Map(id -> value), root, clientProps: [{module, props}] }
const fs = require('fs');

function rawPayload(file) {
  const html = fs.readFileSync(file, 'utf8');
  const re = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
  let m, out = '';
  while ((m = re.exec(html))) out += JSON.parse(m[1]);
  return Buffer.from(out, 'utf8');
}

function parseRows(buf) {
  const rows = new Map();
  let i = 0;
  while (i < buf.length) {
    if (buf[i] === 10) { i++; continue; }
    const colon = buf.indexOf(58, i); // ':'
    if (colon < 0) break;
    const id = buf.slice(i, colon).toString();
    let j = colon + 1;
    const c = String.fromCharCode(buf[j]);
    if (c === 'T') {
      const comma = buf.indexOf(44, j);
      const len = parseInt(buf.slice(j + 1, comma).toString(), 16);
      // HTTrack rewrote URLs inside payloads, so declared lengths drift. Find the real
      // boundary: the next "<hexid>:<row-start>" closest to the declared end.
      const start = comma + 1, declared = start + len;
      const lo = Math.max(start, declared - 4000), hi = Math.min(buf.length, declared + 4000);
      const win = buf.slice(lo, hi).toString('latin1');
      const re = /\n?([0-9a-f]{1,4}):(\[|\{|T[0-9a-f]+,|I\[|HL\[|"|null)/g;
      let mm, best = -1;
      while ((mm = re.exec(win))) {
        const pos = lo + mm.index;
        if (best < 0 || Math.abs(pos - declared) < Math.abs(best - declared)) best = pos;
      }
      if (declared >= buf.length) best = buf.length;
      if (best < 0) best = Math.min(declared, buf.length);
      rows.set(id, { kind: 'T', value: buf.slice(start, best).toString('utf8') });
      i = best;
      continue;
    }
    const nl = buf.indexOf(10, j);
    const end = nl < 0 ? buf.length : nl;
    let text = buf.slice(j, end).toString('utf8');
    let kind = 'J';
    if (/^(I|HL|H|E|D)\[/.test(text) || /^(I|HL|H|E|D)\{/.test(text)) { kind = text.match(/^[A-Z]+/)[0]; text = text.slice(kind.length); }
    let value;
    try { value = JSON.parse(text); } catch { value = text; kind = 'raw'; }
    rows.set(id, { kind, value });
    i = end + 1;
  }
  return rows;
}

function makeResolver(rows) {
  const cache = new Map();
  function getRow(id) {
    const r = rows.get(id);
    if (!r) return undefined;
    if (r.kind === 'T') return r.value;
    if (r.kind === 'I') return { $module: r.value };
    if (cache.has(id)) return cache.get(id);
    cache.set(id, null); // cycle guard
    const v = resolve(r.value);
    cache.set(id, v);
    return v;
  }
  function resolve(v) {
    if (typeof v === 'string') {
      if (v[0] !== '$') return v;
      if (v === '$undefined') return undefined;
      if (v.startsWith('$$')) return v.slice(1);
      let m = v.match(/^\$[LF@]?([0-9a-f]+)((?::[^:]+)*)$/);
      if (m) {
        let target = getRow(m[1]);
        if (m[2]) for (const k of m[2].slice(1).split(':')) target = target == null ? target : target[k];
        return target;
      }
      return v;
    }
    if (Array.isArray(v)) return v.map(resolve);
    if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = resolve(v[k]); return o; }
    return v;
  }
  return { getRow, resolve };
}

function parse(file) {
  const rows = parseRows(rawPayload(file));
  const R = makeResolver(rows);
  const root = [...rows.keys()].map(k => R.getRow(k));
  return { rows, root, R };
}

// walk React element tree; call fn(typeName, props, path)
function walk(node, fn, seen = new Set()) {
  if (node == null || typeof node !== 'object') return;
  if (seen.has(node)) return; seen.add(node);
  if (Array.isArray(node)) {
    if (node[0] === '$' && node.length >= 4) {
      const t = node[1];
      const props = node[3] || {};
      fn(t, props);
      walk(props, fn, seen);
      return;
    }
    node.forEach(n => walk(n, fn, seen));
    return;
  }
  for (const k in node) walk(node[k], fn, seen);
}

module.exports = { parse, walk, rawPayload, parseRows };

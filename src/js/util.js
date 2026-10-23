export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

export function hashString(s) {
  const str = String(s);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function normalizeStem(s) {
  return String(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

export function stableStringify(v) {
  if (v === null || typeof v !== 'object') {
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) {
    return '[' + v.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(v).sort();
  const pairs = keys.map(k => JSON.stringify(k) + ':' + stableStringify(v[k]));
  return '{' + pairs.join(',') + '}';
}

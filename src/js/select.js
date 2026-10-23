import { SECTIONS } from './sections.js';
import { shuffle, normalizeStem } from './util.js';

export function allocateBySection(total, sections = SECTIONS) {
  const result = {};
  for (const s of sections) {
    result[s.id] = 0;
  }
  if (!total || total <= 0) return result;

  const totalWeight = sections.reduce((acc, s) => acc + s.weight, 0);
  const items = [];
  let flooredSum = 0;

  for (const s of sections) {
    const exact = (s.weight / totalWeight) * total;
    const floored = Math.floor(exact);
    flooredSum += floored;
    items.push({
      id: s.id,
      floored,
      rem: exact - floored,
    });
  }

  let leftover = total - flooredSum;
  // Sort by remainder descending, ties broken by lower id
  items.sort((a, b) => {
    if (Math.abs(b.rem - a.rem) > 1e-9) {
      return b.rem - a.rem;
    }
    return a.id - b.id;
  });

  for (let i = 0; i < leftover; i++) {
    items[i].floored += 1;
  }

  for (const item of items) {
    result[item.id] = item.floored;
  }
  return result;
}

export function shuffleOptions(q, rand = Math.random) {
  return {
    ...q,
    options: shuffle(q.options, rand),
  };
}

export function correctIndices(q) {
  const indices = [];
  if (Array.isArray(q.options)) {
    q.options.forEach((opt, idx) => {
      if (opt.correct) indices.push(idx);
    });
  }
  return indices;
}

export function mergePool(bank = [], generated = []) {
  const combined = [...bank, ...generated];
  const seenIds = new Set();
  const seenStems = new Set();
  const merged = [];

  for (const q of combined) {
    if (!q || !q.id || !q.stem) continue;
    const normStem = normalizeStem(q.stem);
    if (seenIds.has(q.id) || seenStems.has(normStem)) {
      continue;
    }
    seenIds.add(q.id);
    seenStems.add(normStem);
    merged.push(q);
  }
  return merged;
}

function freshnessSort(a, b, seen) {
  const aSeen = seen[a.id] != null;
  const bSeen = seen[b.id] != null;
  if (!aSeen && bSeen) return -1;
  if (aSeen && !bSeen) return 1;
  if (aSeen && bSeen) {
    if (seen[a.id] !== seen[b.id]) {
      return seen[a.id] - seen[b.id];
    }
  }
  const aIsAi = a.source === 'ai';
  const bIsAi = b.source === 'ai';
  if (aIsAi && !bIsAi) return -1;
  if (!aIsAi && bIsAi) return 1;
  return 0;
}

export function pickQuestions(pool, { count, section = null, seen = {}, reported = {}, rand = Math.random, sections = SECTIONS }) {
  let candidates = pool.filter(q => !reported[q.id]);

  if (section !== null) {
    candidates = candidates.filter(q => q.section === section);
    let ranked = shuffle(candidates, rand);
    ranked.sort((a, b) => freshnessSort(a, b, seen));
    const picked = ranked.slice(0, count);
    return shuffle(picked, rand).map(q => shuffleOptions(q, rand));
  }

  let ranked = shuffle(candidates, rand);
  ranked.sort((a, b) => freshnessSort(a, b, seen));

  const quotas = allocateBySection(count, sections);
  const bySection = {};
  for (const s of sections) {
    bySection[s.id] = [];
  }
  for (const q of ranked) {
    if (bySection[q.section]) {
      bySection[q.section].push(q);
    }
  }

  const picked = [];
  const pickedIds = new Set();

  for (const s of sections) {
    const quota = quotas[s.id] || 0;
    const available = bySection[s.id] || [];
    const take = available.slice(0, quota);
    for (const q of take) {
      picked.push(q);
      pickedIds.add(q.id);
    }
  }

  if (picked.length < count) {
    const leftovers = ranked.filter(q => !pickedIds.has(q.id));
    leftovers.sort((a, b) => freshnessSort(a, b, seen));
    const needed = count - picked.length;
    for (const q of leftovers.slice(0, needed)) {
      picked.push(q);
    }
  }

  return shuffle(picked, rand).map(q => shuffleOptions(q, rand));
}

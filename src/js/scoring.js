import { SECTIONS } from './sections.js';

export function isCorrect(q, selected = []) {
  if (!q || !Array.isArray(q.options)) return false;
  const correct = [];
  q.options.forEach((opt, idx) => {
    if (opt.correct) correct.push(idx);
  });
  if (correct.length !== selected.length) return false;
  const sortedSelected = selected.slice().sort((a, b) => a - b);
  const sortedCorrect = correct.slice().sort((a, b) => a - b);
  return sortedSelected.every((val, i) => val === sortedCorrect[i]);
}

export function scoreItems(items = [], sections = SECTIONS) {
  let correct = 0;
  const total = items.length;
  const perSection = {};
  for (const s of sections) {
    perSection[s.id] = { correct: 0, total: 0 };
  }

  const perSub = {};
  const wrongIds = [];

  for (const item of items) {
    const q = item.q;
    const ok = isCorrect(q, item.selected);
    if (!perSection[q.section]) {
      perSection[q.section] = { correct: 0, total: 0 };
    }
    perSection[q.section].total++;

    if (!perSub[q.sub]) {
      perSub[q.sub] = { correct: 0, total: 0, topics: {} };
    }
    perSub[q.sub].total++;

    if (ok) {
      correct++;
      perSection[q.section].correct++;
      perSub[q.sub].correct++;
    } else {
      wrongIds.push(q.id);
      const top = q.topic || 'General';
      perSub[q.sub].topics[top] = (perSub[q.sub].topics[top] || 0) + 1;
    }
  }

  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
  return {
    correct,
    total,
    pct,
    perSection,
    perSub,
    wrongIds,
  };
}

export function weakestSubs(perSub = {}, n = 3) {
  const candidates = [];
  for (const [code, info] of Object.entries(perSub)) {
    const wrong = info.total - info.correct;
    if (wrong > 0) {
      const topicEntries = Object.entries(info.topics || {});
      topicEntries.sort((a, b) => b[1] - a[1]);
      candidates.push({
        code,
        correct: info.correct,
        total: info.total,
        pct: Math.round((info.correct / info.total) * 100),
        topics: topicEntries.map(e => e[0]),
      });
    }
  }

  candidates.sort((a, b) => {
    const accA = a.correct / a.total;
    const accB = b.correct / b.total;
    if (Math.abs(accA - accB) > 1e-9) {
      return accA - accB;
    }
    if (a.total !== b.total) {
      return b.total - a.total;
    }
    return a.code.localeCompare(b.code);
  });

  return candidates.slice(0, n);
}

export function aggregateHistory(history = [], lastN = 10, sections = SECTIONS) {
  const attempts = history.length;
  const recent = history.slice(-lastN);
  const recentCount = recent.length;
  const avgPct = recentCount === 0 ? null : Math.round(recent.reduce((sum, h) => sum + (h.pct || 0), 0) / recentCount);

  const perSection = {};
  for (const s of sections) {
    let c = 0;
    let n = 0;
    for (const h of recent) {
      if (h.perSection && h.perSection[s.id]) {
        c += h.perSection[s.id].c || 0;
        n += h.perSection[s.id].n || 0;
      }
    }
    const pct = n === 0 ? null : Math.round((c / n) * 100);
    perSection[s.id] = { id: s.id, title: s.title, short: s.short, c, n, pct };
  }

  const weakestSections = sections
    .map(s => perSection[s.id])
    .filter(s => s.n > 0)
    .sort((a, b) => {
      if (a.pct !== b.pct) {
        return a.pct - b.pct;
      }
      return a.id - b.id;
    })
    .map(s => s.id);

  return {
    attempts,
    recentCount,
    avgPct,
    perSection,
    weakestSections,
  };
}

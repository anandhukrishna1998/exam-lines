import { isCorrect } from '../js/scoring.js';

export function navigatorCells(session) {
  if (!session || !Array.isArray(session.items)) return [];
  const isExamUnfinished = session.mode === 'exam' && !session.finishedAt;

  return session.items.map((item, i) => {
    let state = 'empty';
    const hasSelection = item.selected && item.selected.length > 0;
    if (hasSelection) {
      if (item.checked && !isExamUnfinished) {
        state = isCorrect(item.q, item.selected) ? 'correct' : 'wrong';
      } else {
        state = 'answered';
      }
    }
    return {
      i,
      n: i + 1,
      state,
      section: item.q ? item.q.section : 1,
      current: i === session.index,
      flagged: !!item.flagged,
      reported: !!item.reported,
    };
  });
}

export function sectionBars(perSection = {}, sections = []) {
  return sections.map(s => {
    const data = perSection[s.id] || { correct: 0, total: 0 };
    const correct = data.correct || 0;
    const total = data.total || 0;
    const pct = total === 0 ? null : Math.round((correct / total) * 100);
    return {
      id: s.id,
      title: s.title,
      weight: s.weight,
      correct,
      total,
      pct,
    };
  });
}

export function lineChartPoints(values = [], { width = 640, height = 220, padX = 32, padY = 16 } = {}) {
  if (!values || values.length === 0) return [];
  const n = values.length;
  const usableW = width - 2 * padX;
  const usableH = height - 2 * padY;

  return values.map((val, i) => {
    const clamped = Math.max(0, Math.min(100, val));
    const x = n === 1 ? width / 2 : padX + (i / (n - 1)) * usableW;
    const y = (height - padY) - (clamped / 100) * usableH;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, val: clamped };
  });
}

export function subLabel(code, subs = {}) {
  const sub = subs[code];
  if (sub && sub.title) {
    return `${code} ${sub.title}`;
  }
  return String(code);
}

export function runtimeRefresh(kind, view) {
  if (kind === 'storage' && (view === 'home' || view === 'history')) {
    return 'full';
  }
  if (view === 'home') {
    return 'pool-panel';
  }
  return 'chips';
}

export function mapLayout(exam) {
  const width = 760;
  const top = 44;
  const rowGap = 82;
  const x0 = 60;
  const terminusX = width - 118;

  const sections = exam.sections || [];
  const firstY = top;
  const lastY = top + Math.max(0, sections.length - 1) * rowGap;

  const lines = sections.map((s, i) => {
    const y = top + i * rowGap;
    const codes = Object.keys(exam.subobjectives || {}).filter(k => exam.subobjectives[k].section === s.id);
    const start = x0 + 74 + i * 26;
    const spacing = Math.min(128, (terminusX - 70 - start) / Math.max(1, codes.length - 1 || 1));

    const stations = codes.map((code, k) => {
      const x = Math.round(start + k * spacing);
      const info = exam.subobjectives[code] || {};
      return {
        code,
        short: info.short || code,
        title: info.title || '',
        x,
        y,
      };
    });

    return {
      id: s.id,
      title: s.title,
      weight: s.weight,
      y,
      x0,
      stations,
    };
  });

  return {
    width,
    height: lastY + 64,
    lines,
    terminus: { x: terminusX, y1: firstY, y2: lastY },
  };
}

export function masteryBySub(history = [], examId = 'pmle', lastN = 10) {
  const filtered = history.filter(h => (h.exam || 'pmle') === examId);
  const recent = filtered.slice(-lastN);

  const stats = {};
  for (const h of recent) {
    if (h.perSub) {
      for (const [code, info] of Object.entries(h.perSub)) {
        if (!stats[code]) {
          stats[code] = { c: 0, n: 0 };
        }
        stats[code].c += info.c || 0;
        stats[code].n += info.n || 0;
      }
    }
  }

  const result = {};
  for (const [code, data] of Object.entries(stats)) {
    result[code] = {
      c: data.c,
      n: data.n,
      pct: data.n === 0 ? null : Math.round((data.c / data.n) * 100),
    };
  }
  return result;
}

import { SECTIONS } from './sections.js';
import { scoreItems, isCorrect } from './scoring.js';

export const EXAM_SECONDS = 7200;

export function createSession({ mode, questions = [], section = null, now = Date.now(), exam = 'pmle', durationSec = EXAM_SECONDS }) {
  return {
    exam,
    mode,
    section,
    startedAt: now,
    durationSec: mode === 'exam' ? durationSec : null,
    index: 0,
    finishedAt: null,
    items: questions.map(q => ({
      q,
      selected: [],
      flagged: false,
      checked: false,
      reported: false,
      scored: false,
    })),
  };
}

export function requiredSelections(q) {
  return q && q.type === 'multi' ? 2 : 1;
}

export function currentItem(s) {
  if (!s || !Array.isArray(s.items)) return null;
  return s.items[s.index] || null;
}

export function selectOption(s, i) {
  const item = currentItem(s);
  if (!item || item.checked || item.reported || s.finishedAt !== null) return;
  if (!item.q || !Array.isArray(item.q.options) || i < 0 || i >= item.q.options.length) return;

  const req = requiredSelections(item.q);
  if (req === 1) {
    item.selected = [i];
  } else {
    const idxInSel = item.selected.indexOf(i);
    if (idxInSel >= 0) {
      item.selected.splice(idxInSel, 1);
    } else {
      if (item.selected.length < req) {
        item.selected.push(i);
      }
    }
  }

  if (s.mode !== 'exam' && item.selected.length === req) {
    item.checked = true;
  }
}

export function toggleFlag(s) {
  const item = currentItem(s);
  if (item) {
    item.flagged = !item.flagged;
  }
}

export function moveTo(s, i) {
  if (!s || !Array.isArray(s.items) || s.items.length === 0) return;
  s.index = Math.max(0, Math.min(s.items.length - 1, i));
}

export function moveNext(s) {
  moveTo(s, s.index + 1);
}

export function movePrev(s) {
  moveTo(s, s.index - 1);
}

export function remainingSec(s, now = Date.now()) {
  if (!s || s.durationSec === null || s.durationSec === undefined) return null;
  const elapsed = Math.floor((now - s.startedAt) / 1000);
  return Math.max(0, s.durationSec - elapsed);
}

export function isExpired(s, now = Date.now()) {
  const rem = remainingSec(s, now);
  return rem !== null && rem <= 0;
}

export function answeredCount(s) {
  if (!s || !Array.isArray(s.items)) return 0;
  return s.items.filter(it => it.selected.length > 0).length;
}

export function flaggedCount(s) {
  if (!s || !Array.isArray(s.items)) return 0;
  return s.items.filter(it => it.flagged).length;
}

export function finalizeSession(s, now = Date.now(), sections = SECTIONS) {
  s.finishedAt = now;
  for (const item of s.items) {
    item.checked = true;
    item.scored = !item.reported && (s.mode === 'exam' || item.selected.length > 0);
  }

  const scoredItems = s.items.filter(it => it.scored);
  const scoredResult = scoreItems(scoredItems, sections);

  const skipped = s.items.filter(it => !it.reported && !it.scored).length;
  const reportedCount = s.items.filter(it => it.reported).length;
  const wrongQuestions = scoredItems
    .filter(it => !isCorrect(it.q, it.selected))
    .map(it => it.q);

  const durationSec = Math.max(0, Math.floor((now - s.startedAt) / 1000));

  return {
    ...scoredResult,
    skipped,
    reportedCount,
    wrongQuestions,
    durationSec,
  };
}

export function summarizeAttempt(s, result) {
  const perSection = {};
  if (result.perSection) {
    for (const [id, info] of Object.entries(result.perSection)) {
      if (info.total > 0) {
        perSection[id] = { c: info.correct, n: info.total };
      }
    }
  }

  const perSub = {};
  if (result.perSub) {
    for (const [code, info] of Object.entries(result.perSub)) {
      if (info.total > 0) {
        perSub[code] = { c: info.correct, n: info.total };
      }
    }
  }

  return {
    t: s.startedAt,
    exam: s.exam,
    mode: s.mode,
    section: s.section,
    total: result.total,
    correct: result.correct,
    pct: result.pct,
    durationSec: result.durationSec,
    perSection,
    perSub,
  };
}

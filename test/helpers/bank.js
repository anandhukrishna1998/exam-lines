import assert from 'node:assert/strict';
import { validateQuestion, DIFFICULTIES } from '../../src/js/validate.js';
import { normalizeStem } from '../../src/js/util.js';
import { PMLE } from '../../src/js/exams.js';

export function checkSectionBank(bank, section, { count, multi, subs, exam = PMLE, idPrefix = 'b' }) {
  assert.equal(bank.length, count, `Bank for section ${section} must have ${count} items, got ${bank.length}`);

  let multiCount = 0;
  const subCounts = {};
  const seenIds = new Set();
  const seenStems = new Set();
  const diffCounts = { easy: 0, medium: 0, hard: 0 };
  let singleCount = 0;
  let correctStrictlyLongestCount = 0;

  for (const q of bank) {
    assert.equal(q.section, section, `Question ${q.id} section must be ${section}`);
    assert.ok(q.id.startsWith(`${idPrefix}${section}-`), `Question id ${q.id} must start with ${idPrefix}${section}-`);
    assert.ok(!seenIds.has(q.id), `Duplicate question id ${q.id}`);
    seenIds.add(q.id);

    const normStem = normalizeStem(q.stem);
    assert.ok(!seenStems.has(normStem), `Duplicate question stem in ${q.id}`);
    seenStems.add(normStem);

    const v = validateQuestion(q, exam);
    assert.ok(v.ok, `Question ${q.id} failed validation: ${v.errors.join('; ')}`);

    diffCounts[q.difficulty] = (diffCounts[q.difficulty] || 0) + 1;
    subCounts[q.sub] = (subCounts[q.sub] || 0) + 1;

    if (q.type === 'multi') {
      multiCount++;
    } else {
      singleCount++;
      const correctOpt = q.options.find(o => o.correct);
      const otherLengths = q.options.filter(o => !o.correct).map(o => o.text.length);
      const maxOther = Math.max(...otherLengths);
      if (correctOpt.text.length > maxOther) {
        correctStrictlyLongestCount++;
      }
    }

    const lengths = q.options.map(o => o.text.length);
    const minLen = Math.min(...lengths);
    const maxLen = Math.max(...lengths);
    assert.ok(maxLen <= 3 * minLen, `Question ${q.id} options length ratio exceeds 3: max=${maxLen}, min=${minLen}`);
  }

  assert.equal(multiCount, multi, `Section ${section} expected ${multi} multi questions, got ${multiCount}`);

  if (subs) {
    for (const [code, expectedN] of Object.entries(subs)) {
      assert.equal(subCounts[code] || 0, expectedN, `Section ${section} sub ${code} expected ${expectedN} questions, got ${subCounts[code] || 0}`);
    }
  }

  for (const d of DIFFICULTIES) {
    assert.ok(diffCounts[d] > 0, `Section ${section} missing difficulty "${d}"`);
  }

  if (singleCount > 0) {
    const ratio = correctStrictlyLongestCount / singleCount;
    assert.ok(ratio <= 0.601, `Section ${section} correct option is strictly longest in ${(ratio * 100).toFixed(1)}% of single questions (limit 60%)`);
  }
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCorrect, scoreItems, weakestSubs, aggregateHistory } from '../src/js/scoring.js';
import { SECTIONS } from '../src/js/sections.js';
import { makeValidQuestion } from './helpers/fixtures.js';

test('isCorrect handles single and multi options with exact-set comparison', () => {
  const qSingle = makeValidQuestion({
    options: [
      { text: 'A', correct: true, why: 'valid explanation here' },
      { text: 'B', correct: false, why: 'valid explanation here' },
      { text: 'C', correct: false, why: 'valid explanation here' },
      { text: 'D', correct: false, why: 'valid explanation here' },
    ]
  });
  assert.equal(isCorrect(qSingle, [0]), true);
  assert.equal(isCorrect(qSingle, [1]), false);
  assert.equal(isCorrect(qSingle, [0, 1]), false);
  assert.equal(isCorrect(qSingle, []), false);

  const qMulti = makeValidQuestion({
    type: 'multi',
    options: [
      { text: 'A', correct: true, why: 'valid explanation here' },
      { text: 'B', correct: false, why: 'valid explanation here' },
      { text: 'C', correct: true, why: 'valid explanation here' },
      { text: 'D', correct: false, why: 'valid explanation here' },
    ]
  });
  assert.equal(isCorrect(qMulti, [0, 2]), true);
  assert.equal(isCorrect(qMulti, [2, 0]), true); // order independent
  assert.equal(isCorrect(qMulti, [0]), false);
  assert.equal(isCorrect(qMulti, [0, 1]), false);
});

test('scoreItems returns full section and sub breakdowns', () => {
  const q1 = makeValidQuestion({ id: 'b1-01', section: 1, sub: '1.1', topic: 'Topic A' });
  const q2 = makeValidQuestion({ id: 'b1-02', section: 1, sub: '1.1', topic: 'Topic B' });
  const q3 = makeValidQuestion({ id: 'b2-01', section: 2, sub: '2.1', topic: 'Topic C' });

  const items = [
    { q: q1, selected: [0] }, // correct
    { q: q2, selected: [1] }, // wrong
    { q: q3, selected: [0] }, // correct
  ];

  const res = scoreItems(items, SECTIONS);
  assert.equal(res.total, 3);
  assert.equal(res.correct, 2);
  assert.equal(res.pct, 67);
  assert.deepEqual(res.wrongIds, ['b1-02']);

  // Every section 1..6 must be present in perSection
  for (let s = 1; s <= 6; s++) {
    assert.ok(res.perSection[s] !== undefined);
  }
  assert.equal(res.perSection[1].total, 2);
  assert.equal(res.perSection[1].correct, 1);
  assert.equal(res.perSection[2].total, 1);
  assert.equal(res.perSection[2].correct, 1);
  assert.equal(res.perSection[3].total, 0);

  // Sub 1.1 has wrong topic B
  assert.equal(res.perSub['1.1'].total, 2);
  assert.equal(res.perSub['1.1'].correct, 1);
  assert.equal(res.perSub['1.1'].topics['Topic B'], 1);
});

test('weakestSubs orders by accuracy asc, total desc, then code', () => {
  const perSub = {
    '1.1': { correct: 0, total: 1, topics: { 'Topic A': 1 } }, // 0%
    '1.2': { correct: 0, total: 2, topics: { 'Topic B': 2 } }, // 0%, total 2 -> ahead of 1.1
    '2.1': { correct: 1, total: 2, topics: { 'Topic C': 1 } }, // 50%
    '2.2': { correct: 2, total: 2, topics: {} }, // 100% (no wrongs -> omitted)
  };

  const weak = weakestSubs(perSub, 3);
  assert.equal(weak.length, 3);
  assert.equal(weak[0].code, '1.2'); // 0%, total 2
  assert.equal(weak[1].code, '1.1'); // 0%, total 1
  assert.equal(weak[2].code, '2.1'); // 50%
  assert.deepEqual(weak[0].topics, ['Topic B']);
});

test('aggregateHistory computes averages and weakest sections', () => {
  const history = [
    {
      t: 1000,
      pct: 60,
      perSection: {
        1: { c: 6, n: 10 }, // 60%
        2: { c: 2, n: 10 }, // 20%
      }
    },
    {
      t: 2000,
      pct: 80,
      perSection: {
        1: { c: 8, n: 10 }, // 80%
        2: { c: 4, n: 10 }, // 40%
      }
    }
  ];

  const agg = aggregateHistory(history, 10, SECTIONS);
  assert.equal(agg.attempts, 2);
  assert.equal(agg.recentCount, 2);
  assert.equal(agg.avgPct, 70); // (60 + 80) / 2
  assert.equal(agg.perSection[1].pct, 70); // 14 / 20
  assert.equal(agg.perSection[2].pct, 30); // 6 / 20
  assert.deepEqual(agg.weakestSections, [2, 1]);
});

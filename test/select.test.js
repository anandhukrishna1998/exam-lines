import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocateBySection, shuffleOptions, correctIndices, mergePool, pickQuestions } from '../src/js/select.js';
import { SECTIONS } from '../src/js/sections.js';
import { SAA } from '../src/js/exams.js';
import { mulberry32 } from './helpers/rand.js';
import { makeValidQuestion } from './helpers/fixtures.js';

test('allocateBySection exact cases and sum conservation for 0..100', () => {
  assert.deepEqual(allocateBySection(50, SECTIONS), { 1: 7, 2: 8, 3: 10, 4: 10, 5: 9, 6: 6 });
  assert.deepEqual(allocateBySection(24, SECTIONS), { 1: 3, 2: 4, 3: 5, 4: 5, 5: 4, 6: 3 });
  assert.deepEqual(allocateBySection(10, SECTIONS), { 1: 1, 2: 2, 3: 2, 4: 2, 5: 2, 6: 1 });
  assert.deepEqual(allocateBySection(65, SAA.sections), { 1: 19, 2: 17, 3: 16, 4: 13 });

  for (let n = 0; n <= 100; n++) {
    const alloc = allocateBySection(n, SECTIONS);
    const sum = Object.values(alloc).reduce((a, b) => a + b, 0);
    assert.equal(sum, n, `Sum of allocations for ${n} must equal ${n}`);
  }
});

test('shuffleOptions keeps correct flags', () => {
  const q = makeValidQuestion();
  const rand = mulberry32(101);
  const shuffled = shuffleOptions(q, rand);

  const origCorrect = q.options.filter(o => o.correct).map(o => o.text);
  const shuffledCorrect = shuffled.options.filter(o => o.correct).map(o => o.text);
  assert.deepEqual(origCorrect.sort(), shuffledCorrect.sort());
});

test('correctIndices returns indices of correct options', () => {
  const q = makeValidQuestion();
  assert.deepEqual(correctIndices(q), [0]);
});

test('mergePool dedupes by id and stem with bank first', () => {
  const bankQ = makeValidQuestion({ id: 'b1-01', stem: 'Question stem text one here for testing?' });
  const aiSameId = makeValidQuestion({ id: 'b1-01', stem: 'Different stem text here for testing?', source: 'ai' });
  const aiSameStem = makeValidQuestion({ id: 'g-02', stem: 'Question stem text one here for testing?', source: 'ai' });
  const aiUnique = makeValidQuestion({ id: 'g-03', stem: 'Completely unique stem text here for testing?', source: 'ai' });

  const merged = mergePool([bankQ], [aiSameId, aiSameStem, aiUnique]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'b1-01');
  assert.equal(merged[0].source, 'bank');
  assert.equal(merged[1].id, 'g-03');
});

test('pickQuestions uses quotas and excludes reported questions', () => {
  const pool = [];
  for (let s = 1; s <= 6; s++) {
    for (let i = 1; i <= 15; i++) {
      pool.push(makeValidQuestion({
        id: `b${s}-${i}`,
        section: s,
        stem: `Question stem for section ${s} number ${i} testing selection quotas?`
      }));
    }
  }

  const reported = { 'b1-01': true, 'b1-02': true };
  const rand = mulberry32(7);
  const picked = pickQuestions(pool, { count: 20, reported, rand, sections: SECTIONS });

  assert.equal(picked.length, 20);
  assert.ok(!picked.some(q => q.id === 'b1-01' || q.id === 'b1-02'));
});

test('pickQuestions fills section shortfall from other sections', () => {
  const pool = [
    // Section 1 has only 1 question
    makeValidQuestion({ id: 'b1-01', section: 1, stem: 'Section 1 question lone candidate in the test pool?' }),
  ];
  // Section 2 has 20 questions
  for (let i = 1; i <= 20; i++) {
    pool.push(makeValidQuestion({ id: `b2-${i}`, section: 2, stem: `Section 2 question candidate number ${i} in pool?` }));
  }

  const rand = mulberry32(42);
  const picked = pickQuestions(pool, { count: 10, rand, sections: SECTIONS });
  assert.equal(picked.length, 10);
});

test('drill on a fully reported section returns empty array', () => {
  const pool = [
    makeValidQuestion({ id: 'b1-01', section: 1, stem: 'Section 1 question one for drill test?' }),
    makeValidQuestion({ id: 'b1-02', section: 1, stem: 'Section 1 question two for drill test?' }),
  ];
  const reported = { 'b1-01': true, 'b1-02': true };
  const picked = pickQuestions(pool, { count: 5, section: 1, reported });
  assert.deepEqual(picked, []);
});

test('freshness ordering: unseen before seen, older seen before newer seen, AI before bank', () => {
  const qUnseenBank = makeValidQuestion({ id: 'q-unseen-bank', source: 'bank', stem: 'Stem for unseen bank question in test?' });
  const qUnseenAi = makeValidQuestion({ id: 'q-unseen-ai', source: 'ai', stem: 'Stem for unseen AI question in test?' });
  const qSeenOld = makeValidQuestion({ id: 'q-seen-old', source: 'bank', stem: 'Stem for seen old question in test?' });
  const qSeenNew = makeValidQuestion({ id: 'q-seen-new', source: 'bank', stem: 'Stem for seen new question in test?' });

  const pool = [qSeenNew, qSeenOld, qUnseenBank, qUnseenAi];
  const seen = {
    'q-seen-old': 1000,
    'q-seen-new': 2000,
  };

  // Picking 2 from pool of 4: both must be unseen
  const picked2 = pickQuestions(pool, { count: 2, section: 3, seen });
  const picked2Ids = new Set(picked2.map(q => q.id));
  assert.equal(picked2Ids.has('q-unseen-ai'), true);
  assert.equal(picked2Ids.has('q-unseen-bank'), true);

  // Picking 1 from [qUnseenBank, qUnseenAi]: AI comes first
  const pickedAi = pickQuestions([qUnseenBank, qUnseenAi], { count: 1, section: 3, seen });
  assert.equal(pickedAi[0].id, 'q-unseen-ai');

  // Picking 1 from [qSeenNew, qSeenOld]: older seen comes first
  const pickedOld = pickQuestions([qSeenNew, qSeenOld], { count: 1, section: 3, seen });
  assert.equal(pickedOld[0].id, 'q-seen-old');
});

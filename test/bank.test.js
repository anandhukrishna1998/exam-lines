import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BANK } from '../src/bank/index.js';
import { PMLE } from '../src/js/exams.js';
import { pickQuestions } from '../src/js/select.js';
import { mulberry32 } from './helpers/rand.js';

test('combined PMLE bank has 150 questions and supports 50-question exam allocation', () => {
  assert.equal(BANK.length, 150);

  const rand = mulberry32(3);
  const picked = pickQuestions(BANK, {
    count: 50,
    rand,
    sections: PMLE.sections,
  });

  assert.equal(picked.length, 50);

  const sectionCounts = {};
  for (const q of picked) {
    sectionCounts[q.section] = (sectionCounts[q.section] || 0) + 1;
  }

  assert.deepEqual(sectionCounts, { 1: 7, 2: 8, 3: 10, 4: 10, 5: 9, 6: 6 });
});

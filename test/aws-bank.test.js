import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSectionBank } from './helpers/bank.js';
import { AWS_BANK } from '../src/bank/aws/index.js';
import { AWS_D1 } from '../src/bank/aws/domain1.js';
import { AWS_D2 } from '../src/bank/aws/domain2.js';
import { AWS_D3 } from '../src/bank/aws/domain3.js';
import { AWS_D4 } from '../src/bank/aws/domain4.js';
import { SAA } from '../src/js/exams.js';
import { pickQuestions } from '../src/js/select.js';
import { mulberry32 } from './helpers/rand.js';

test('AWS Domain 1 satisfies all requirements', () => {
  checkSectionBank(AWS_D1, 1, {
    count: 45,
    multi: 7,
    subs: { '1.1': 16, '1.2': 16, '1.3': 13 },
    exam: SAA,
    idPrefix: 'a',
  });
});

test('AWS Domain 2 satisfies all requirements', () => {
  checkSectionBank(AWS_D2, 2, {
    count: 39,
    multi: 6,
    subs: { '2.1': 20, '2.2': 19 },
    exam: SAA,
    idPrefix: 'a',
  });
});

test('AWS Domain 3 satisfies all requirements', () => {
  checkSectionBank(AWS_D3, 3, {
    count: 36,
    multi: 6,
    subs: { '3.1': 8, '3.2': 7, '3.3': 8, '3.4': 7, '3.5': 6 },
    exam: SAA,
    idPrefix: 'a',
  });
});

test('AWS Domain 4 satisfies all requirements', () => {
  checkSectionBank(AWS_D4, 4, {
    count: 30,
    multi: 6,
    subs: { '4.1': 8, '4.2': 8, '4.3': 7, '4.4': 7 },
    exam: SAA,
    idPrefix: 'a',
  });
});

test('combined AWS bank has 150 questions and supports 65-question exam allocation', () => {
  assert.equal(AWS_BANK.length, 150);

  // Every multi-choice question has exactly 5 options
  for (const q of AWS_BANK) {
    if (q.type === 'multi') {
      assert.equal(q.options.length, 5, `Question ${q.id} multi must have 5 options, got ${q.options.length}`);
    }
  }

  const rand = mulberry32(5);
  const picked = pickQuestions(AWS_BANK, {
    count: 65,
    rand,
    sections: SAA.sections,
  });

  assert.equal(picked.length, 65);

  const sectionCounts = {};
  for (const q of picked) {
    sectionCounts[q.section] = (sectionCounts[q.section] || 0) + 1;
  }

  assert.deepEqual(sectionCounts, { 1: 19, 2: 17, 3: 16, 4: 13 });
});

import { test } from 'node:test';
import { checkSectionBank } from './helpers/bank.js';
import { BANK_S1 } from '../src/bank/section1.js';
import { PMLE } from '../src/js/exams.js';

test('PMLE Section 1 question bank satisfies all requirements', () => {
  checkSectionBank(BANK_S1, 1, {
    count: 19,
    multi: 4,
    subs: { '1.1': 10, '1.2': 9 },
    exam: PMLE,
    idPrefix: 'b',
  });
});

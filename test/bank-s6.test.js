import { test } from 'node:test';
import { checkSectionBank } from './helpers/bank.js';
import { BANK_S6 } from '../src/bank/section6.js';
import { PMLE } from '../src/js/exams.js';

test('PMLE Section 6 question bank satisfies all requirements', () => {
  checkSectionBank(BANK_S6, 6, {
    count: 19,
    multi: 3,
    subs: { '6.1': 10, '6.2': 9 },
    exam: PMLE,
    idPrefix: 'b',
  });
});

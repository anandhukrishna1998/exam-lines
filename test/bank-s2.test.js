import { test } from 'node:test';
import { checkSectionBank } from './helpers/bank.js';
import { BANK_S2 } from '../src/bank/section2.js';
import { PMLE } from '../src/js/exams.js';

test('PMLE Section 2 question bank satisfies all requirements', () => {
  checkSectionBank(BANK_S2, 2, {
    count: 24,
    multi: 3,
    subs: { '2.1': 9, '2.2': 7, '2.3': 8 },
    exam: PMLE,
    idPrefix: 'b',
  });
});

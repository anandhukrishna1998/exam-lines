import { test } from 'node:test';
import { checkSectionBank } from './helpers/bank.js';
import { BANK_S4 } from '../src/bank/section4.js';
import { PMLE } from '../src/js/exams.js';

test('PMLE Section 4 question bank satisfies all requirements', () => {
  checkSectionBank(BANK_S4, 4, {
    count: 30,
    multi: 5,
    subs: { '4.1': 15, '4.2': 15 },
    exam: PMLE,
    idPrefix: 'b',
  });
});

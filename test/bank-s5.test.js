import { test } from 'node:test';
import { checkSectionBank } from './helpers/bank.js';
import { BANK_S5 } from '../src/bank/section5.js';
import { PMLE } from '../src/js/exams.js';

test('PMLE Section 5 question bank satisfies all requirements', () => {
  checkSectionBank(BANK_S5, 5, {
    count: 27,
    multi: 4,
    subs: { '5.1': 16, '5.2': 11 },
    exam: PMLE,
    idPrefix: 'b',
  });
});

import { test } from 'node:test';
import { checkSectionBank } from './helpers/bank.js';
import { BANK_S3 } from '../src/bank/section3.js';
import { PMLE } from '../src/js/exams.js';

test('PMLE Section 3 question bank satisfies all requirements', () => {
  checkSectionBank(BANK_S3, 3, {
    count: 31,
    multi: 4,
    subs: { '3.1': 9, '3.2': 15, '3.3': 7 },
    exam: PMLE,
    idPrefix: 'b',
  });
});

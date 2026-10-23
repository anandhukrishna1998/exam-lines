import { BANK_S1 } from './section1.js';
import { BANK_S2 } from './section2.js';
import { BANK_S3 } from './section3.js';
import { BANK_S4 } from './section4.js';
import { BANK_S5 } from './section5.js';
import { BANK_S6 } from './section6.js';

export const BANK = [
  ...BANK_S1,
  ...BANK_S2,
  ...BANK_S3,
  ...BANK_S4,
  ...BANK_S5,
  ...BANK_S6,
].map(q => ({ ...q, source: 'bank' }));

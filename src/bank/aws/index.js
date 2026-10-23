import { AWS_D1 } from './domain1.js';
import { AWS_D2 } from './domain2.js';
import { AWS_D3 } from './domain3.js';
import { AWS_D4 } from './domain4.js';

export const AWS_BANK = [
  ...AWS_D1,
  ...AWS_D2,
  ...AWS_D3,
  ...AWS_D4,
].map(q => ({ ...q, source: 'bank' }));

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SECTIONS, SUBOBJECTIVES, GUIDE_DATE } from '../src/js/sections.js';

test('sections weights sum to 101 and match specification', () => {
  const weights = SECTIONS.map(s => s.weight);
  assert.deepEqual(weights, [13, 16, 21, 20, 18, 13]);
  const sum = weights.reduce((a, b) => a + b, 0);
  assert.equal(sum, 101);
});

test('14 PMLE subs in order and match section first digit', () => {
  const expectedCodes = [
    '1.1', '1.2',
    '2.1', '2.2', '2.3',
    '3.1', '3.2', '3.3',
    '4.1', '4.2',
    '5.1', '5.2',
    '6.1', '6.2'
  ];
  const keys = Object.keys(SUBOBJECTIVES);
  assert.deepEqual(keys, expectedCodes);
  assert.equal(keys.length, 14);

  for (const code of keys) {
    const sub = SUBOBJECTIVES[code];
    const expectedSection = Number(code.split('.')[0]);
    assert.equal(sub.section, expectedSection, `Sub ${code} must belong to section ${expectedSection}`);
    assert.ok(sub.short && sub.short.length > 0);
    assert.ok(sub.title && sub.title.length > 0);
    assert.ok(Array.isArray(sub.topics) && sub.topics.length > 0);
  }
});

test('GUIDE_DATE is June 1, 2026', () => {
  assert.equal(GUIDE_DATE, 'June 1, 2026');
});

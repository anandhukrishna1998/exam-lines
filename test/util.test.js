import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shuffle, hashString, normalizeStem, stableStringify } from '../src/js/util.js';
import { mulberry32 } from './helpers/rand.js';

test('mulberry32 determinism', () => {
  const r1 = mulberry32(12345);
  const r2 = mulberry32(12345);
  for (let i = 0; i < 10; i++) {
    assert.equal(r1(), r2());
  }
});

test('shuffle is a permutation and does not mutate the input', () => {
  const original = [1, 2, 3, 4, 5, 6, 7, 8];
  const copy = original.slice();
  const rand = mulberry32(42);
  const shuffled = shuffle(original, rand);

  assert.deepEqual(original, copy, 'original array must not be mutated');
  assert.equal(shuffled.length, original.length);
  assert.deepEqual(shuffled.slice().sort((a, b) => a - b), original);
  // With seed 42, should be permuted
  assert.notDeepEqual(shuffled, original);
});

test('hashString stability', () => {
  assert.equal(hashString('hello world'), hashString('hello world'));
  assert.notEqual(hashString('hello world'), hashString('hello world!'));
  assert.equal(typeof hashString('test'), 'string');
});

test('normalizeStem', () => {
  assert.equal(normalizeStem('  Hello   WORLD \n\t'), 'hello world');
});

test('stableStringify ignores key order', () => {
  const a = { b: 1, a: 2, c: { y: 'hi', x: 42 } };
  const b = { c: { x: 42, y: 'hi' }, a: 2, b: 1 };
  assert.equal(stableStringify(a), stableStringify(b));

  // Arrays keep their order
  assert.notEqual(stableStringify([1, 2]), stableStringify([2, 1]));
});

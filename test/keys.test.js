import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyAction } from '../src/ui/keys.js';

test('keyAction returns null on modifier keys', () => {
  const ctx = { view: 'quiz', overlay: null };
  assert.equal(keyAction({ key: '1', ctrlKey: true }, ctx), null);
  assert.equal(keyAction({ key: '1', metaKey: true }, ctx), null);
  assert.equal(keyAction({ key: '1', altKey: true }, ctx), null);
});

test('keyAction handles overlays: only Escape closes', () => {
  const ctx = { view: 'quiz', overlay: { type: 'report' } };
  assert.deepEqual(keyAction({ key: 'Escape' }, ctx), { type: 'close' });
  assert.equal(keyAction({ key: '1' }, ctx), null);
  assert.equal(keyAction({ key: 'n' }, ctx), null);
});

test('keyAction returns null when typing into form elements or contentEditable', () => {
  const ctx = { view: 'quiz', overlay: null };
  assert.equal(keyAction({ key: '1', targetTag: 'INPUT' }, ctx), null);
  assert.equal(keyAction({ key: 'n', targetTag: 'TEXTAREA' }, ctx), null);
  assert.equal(keyAction({ key: 'p', targetTag: 'SELECT' }, ctx), null);
  assert.equal(keyAction({ key: 'f', targetEditable: true }, ctx), null);
});

test('keyAction in quiz view handles numbers 1..5, next, prev, and flag', () => {
  const ctx = { view: 'quiz', overlay: null };

  assert.deepEqual(keyAction({ key: '1' }, ctx), { type: 'choose', index: 0 });
  assert.deepEqual(keyAction({ key: '5' }, ctx), { type: 'choose', index: 4 });

  assert.deepEqual(keyAction({ key: 'n' }, ctx), { type: 'next' });
  assert.deepEqual(keyAction({ key: 'N' }, ctx), { type: 'next' });
  assert.deepEqual(keyAction({ key: 'ArrowRight' }, ctx), { type: 'next' });

  assert.deepEqual(keyAction({ key: 'p' }, ctx), { type: 'prev' });
  assert.deepEqual(keyAction({ key: 'P' }, ctx), { type: 'prev' });
  assert.deepEqual(keyAction({ key: 'ArrowLeft' }, ctx), { type: 'prev' });

  assert.deepEqual(keyAction({ key: 'f' }, ctx), { type: 'flag' });
  assert.deepEqual(keyAction({ key: 'F' }, ctx), { type: 'flag' });

  assert.equal(keyAction({ key: 'x' }, ctx), null);
});

test('keyAction returns null when not in quiz view', () => {
  assert.equal(keyAction({ key: '1' }, { view: 'home', overlay: null }), null);
  assert.equal(keyAction({ key: 'n' }, { view: 'results', overlay: null }), null);
});

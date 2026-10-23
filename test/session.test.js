import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSession,
  selectOption,
  toggleFlag,
  moveTo,
  moveNext,
  movePrev,
  currentItem,
  remainingSec,
  isExpired,
  answeredCount,
  flaggedCount,
  finalizeSession,
  summarizeAttempt,
} from '../src/js/session.js';
import { makeValidQuestion } from './helpers/fixtures.js';
import { SECTIONS } from '../src/js/sections.js';

test('practice mode locks answer immediately upon selection', () => {
  const q = makeValidQuestion();
  const s = createSession({ mode: 'practice', questions: [q] });

  assert.equal(s.items[0].checked, false);
  selectOption(s, 0);
  assert.equal(s.items[0].checked, true);
  assert.deepEqual(s.items[0].selected, [0]);

  // Attempt to change selection after check is ignored
  selectOption(s, 1);
  assert.deepEqual(s.items[0].selected, [0]);
});

test('exam mode allows changing answers and never checks automatically', () => {
  const q = makeValidQuestion();
  const s = createSession({ mode: 'exam', questions: [q] });

  selectOption(s, 0);
  assert.equal(s.items[0].checked, false);
  assert.deepEqual(s.items[0].selected, [0]);

  selectOption(s, 1);
  assert.equal(s.items[0].checked, false);
  assert.deepEqual(s.items[0].selected, [1]);
});

test('multi question toggles selection and ignores third pick', () => {
  const qMulti = makeValidQuestion({
    type: 'multi',
    options: [
      { text: 'A', correct: true, why: 'valid explanation why A is right' },
      { text: 'B', correct: false, why: 'valid explanation why B is right' },
      { text: 'C', correct: true, why: 'valid explanation why C is right' },
      { text: 'D', correct: false, why: 'valid explanation why D is right' },
    ]
  });

  const s = createSession({ mode: 'exam', questions: [qMulti] });
  selectOption(s, 0);
  assert.deepEqual(s.items[0].selected, [0]);

  selectOption(s, 1);
  assert.deepEqual(s.items[0].selected, [0, 1]);

  // Third pick ignored
  selectOption(s, 2);
  assert.deepEqual(s.items[0].selected, [0, 1]);

  // Toggle off option 1
  selectOption(s, 1);
  assert.deepEqual(s.items[0].selected, [0]);

  // Now option 2 can be selected
  selectOption(s, 2);
  assert.deepEqual(s.items[0].selected, [0, 2]);
});

test('clamped navigation', () => {
  const questions = [
    makeValidQuestion({ id: 'q1' }),
    makeValidQuestion({ id: 'q2' }),
  ];
  const s = createSession({ mode: 'practice', questions });

  assert.equal(s.index, 0);
  movePrev(s);
  assert.equal(s.index, 0);
  moveNext(s);
  assert.equal(s.index, 1);
  moveNext(s);
  assert.equal(s.index, 1);
  moveTo(s, 100);
  assert.equal(s.index, 1);
  moveTo(s, -5);
  assert.equal(s.index, 0);
});

test('wall-clock timer calculations', () => {
  const now = 1000000;
  const s = createSession({ mode: 'exam', durationSec: 7200, now });

  assert.equal(remainingSec(s, now), 7200);
  assert.equal(remainingSec(s, now + 100000), 7100);
  assert.equal(remainingSec(s, now + 7200000), 0);
  assert.equal(remainingSec(s, now + 8000000), 0); // clamped to 0
  assert.equal(isExpired(s, now + 7200000), true);

  // Non-exam mode has no timer
  const sPractice = createSession({ mode: 'practice', now });
  assert.equal(remainingSec(sPractice, now), null);
  assert.equal(isExpired(sPractice, now), false);
});

test('exam finalize counts unanswered as wrong and excludes reported', () => {
  const q1 = makeValidQuestion({ id: 'q1' });
  const q2 = makeValidQuestion({ id: 'q2' });
  const q3 = makeValidQuestion({ id: 'q3' });

  const s = createSession({ mode: 'exam', questions: [q1, q2, q3], now: 1000 });
  // q1 answered correctly
  selectOption(s, 0);
  // q2 reported
  s.items[1].reported = true;
  // q3 unanswered

  const res = finalizeSession(s, 2000, SECTIONS);
  assert.equal(res.reportedCount, 1);
  assert.equal(res.total, 2); // q1 and q3 (unanswered is scored)
  assert.equal(res.correct, 1); // q1
  assert.equal(res.pct, 50);
  assert.equal(res.wrongQuestions.length, 1);
  assert.equal(res.wrongQuestions[0].id, 'q3');
});

test('practice finalize skips unanswered questions', () => {
  const q1 = makeValidQuestion({ id: 'q1' });
  const q2 = makeValidQuestion({ id: 'q2' });

  const s = createSession({ mode: 'practice', questions: [q1, q2], now: 1000 });
  selectOption(s, 0); // answers q1
  // q2 unanswered

  const res = finalizeSession(s, 2000, SECTIONS);
  assert.equal(res.total, 1);
  assert.equal(res.correct, 1);
  assert.equal(res.skipped, 1);
});

test('summarizeAttempt exact row shape', () => {
  const q = makeValidQuestion({ id: 'b1-01', section: 1, sub: '1.1' });
  const s = createSession({ mode: 'practice', questions: [q], now: 5000 });
  selectOption(s, 0);
  const res = finalizeSession(s, 65000, SECTIONS);

  const summary = summarizeAttempt(s, res);
  assert.deepEqual(summary, {
    t: 5000,
    exam: 'pmle',
    mode: 'practice',
    section: null,
    total: 1,
    correct: 1,
    pct: 100,
    durationSec: 60,
    perSection: { 1: { c: 1, n: 1 } },
    perSub: { '1.1': { c: 1, n: 1 } },
  });
});

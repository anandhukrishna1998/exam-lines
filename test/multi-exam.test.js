import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, finalizeSession, selectOption } from '../src/js/session.js';
import { SAA } from '../src/js/exams.js';
import { makeValidQuestion } from './helpers/fixtures.js';

test('SAA session uses 7800 s and evaluates 4 sections properly', () => {
  const qAws = makeValidQuestion({
    id: 'a1-01',
    section: 1,
    sub: '1.1',
    type: 'single',
    stem: 'An enterprise architecture team is designing secure AWS access across multiple accounts. What should you do?',
    options: [
      { text: 'Option A is the correct answer.', correct: true, why: 'Valid explanation why option A is right.' },
      { text: 'Option B is an incorrect distractor.', correct: false, why: 'Valid explanation why option B is wrong.' },
      { text: 'Option C is an incorrect distractor.', correct: false, why: 'Valid explanation why option C is wrong.' },
      { text: 'Option D is an incorrect distractor.', correct: false, why: 'Valid explanation why option D is wrong.' },
    ],
    explanation: 'Valid explanation about AWS secure architecture principles and IAM roles.',
  }, SAA);

  const session = createSession({
    mode: 'exam',
    questions: [qAws],
    exam: SAA.id,
    durationSec: SAA.examSeconds,
    now: 1000,
  });

  assert.equal(session.exam, 'saa');
  assert.equal(session.durationSec, 7800);

  selectOption(session, 0);
  const result = finalizeSession(session, 1100, SAA.sections);

  assert.equal(result.total, 1);
  assert.equal(result.correct, 1);
  assert.equal(result.pct, 100);

  // Per section has all 4 domains (1..4)
  for (let d = 1; d <= 4; d++) {
    assert.ok(result.perSection[d] !== undefined);
  }
  assert.equal(result.perSection[1].total, 1);
  assert.equal(result.perSection[1].correct, 1);
  assert.equal(result.perSection[2].total, 0);
});

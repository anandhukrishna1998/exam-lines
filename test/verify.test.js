import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVerifyPrompt,
  judgeVerification,
  verifyBatch,
} from '../src/js/generate.js';
import { PMLE } from '../src/js/exams.js';
import { makeValidQuestion } from './helpers/fixtures.js';

test('buildVerifyPrompt hides correct answers, why, and explanations', () => {
  const q = makeValidQuestion({
    stem: 'A company needs to choose the right strategy for batch scoring? What should you do?',
    explanation: 'Secret explanation that must be hidden from the verifier.',
    options: [
      { text: 'Option A is the marked right answer.', correct: true, why: 'Secret why text that must be hidden.' },
      { text: 'Option B is wrong.', correct: false, why: 'Secret why B text.' },
      { text: 'Option C is wrong.', correct: false, why: 'Secret why C text.' },
      { text: 'Option D is wrong.', correct: false, why: 'Secret why D text.' },
    ]
  });

  const prompt = buildVerifyPrompt([q], PMLE);

  assert.ok(prompt.includes('Question 1 (one answer)'));
  assert.ok(prompt.includes('A. Option A is the marked right answer.'));
  assert.ok(!prompt.includes('Secret explanation'));
  assert.ok(!prompt.includes('Secret why text'));
  assert.ok(!prompt.includes('correct: true'));
});

test('judgeVerification keeps only identical, confident, issue-free verdicts', () => {
  const q1 = makeValidQuestion({ id: 'q1' }); // Option A is correct
  const q2 = makeValidQuestion({ id: 'q2' }); // Option A is correct
  const q3 = makeValidQuestion({ id: 'q3' }); // Option A is correct
  const q4 = makeValidQuestion({ id: 'q4' }); // Option A is correct
  const q5 = makeValidQuestion({ id: 'q5' }); // Option A is correct

  const verdicts = [
    { n: 1, answer: ['A'], confident: true, issue: null }, // match!
    { n: 2, answer: ['B'], confident: true, issue: null }, // wrong answer
    { n: 3, answer: ['A'], confident: false, issue: null }, // not confident
    { n: 4, answer: ['A'], confident: true, issue: 'The product was deprecated in 2026.' }, // issue raised
    // q5 has no verdict
  ];

  const { kept, dropped } = judgeVerification([q1, q2, q3, q4, q5], verdicts);

  assert.equal(kept.length, 1);
  assert.equal(kept[0].id, 'q1');
  assert.equal(kept[0].verified, true);

  assert.equal(dropped.length, 4);
  assert.equal(dropped[0].reason, 'verifier chose a different answer');
  assert.equal(dropped[1].reason, 'verifier was not confident');
  assert.equal(dropped[2].reason, 'The product was deprecated in 2026.');
  assert.equal(dropped[3].reason, 'no verdict returned');
});

test('verifyBatch makes one uncached sample.json call', async () => {
  const q = makeValidQuestion({ id: 'q1' });
  let callOpts = null;

  const mockSample = () => {};
  mockSample.json = async (prompt, opts) => {
    callOpts = opts;
    return [{ n: 1, answer: ['A'], confident: true, issue: null }];
  };

  const { kept } = await verifyBatch(mockSample, [q], PMLE);
  assert.equal(kept.length, 1);
  assert.equal(callOpts.cache, false);
  assert.equal(callOpts.modelTier, 'default');
});

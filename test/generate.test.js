import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGenerationPrompt,
  createLineParser,
  coerceGenerated,
  generateBatch,
} from '../src/js/generate.js';
import { PMLE, SAA } from '../src/js/exams.js';
import { makeValidQuestion } from './helpers/fixtures.js';

test('buildGenerationPrompt includes outline, naming rules, distribution, and format', () => {
  const prompt = buildGenerationPrompt({
    counts: { 1: 3, 2: 2 },
    avoid: ['Recent topic 1', 'Recent topic 2'],
    nonce: 'abc12345',
    exam: PMLE,
  });

  assert.ok(prompt.includes('Write exactly 5 questions with this distribution:'));
  assert.ok(prompt.includes('- Section 1 (Architecting low-code AI solutions): 3 question(s)'));
  assert.ok(prompt.includes('- Section 2 (Collaborating within and across teams to manage data and models): 2 question(s)'));
  assert.ok(prompt.includes('Exam outline for these sections'));
  assert.ok(prompt.includes('Product naming (mandatory):'));
  assert.ok(prompt.includes('Agent Platform'));
  assert.ok(prompt.includes('- Recent topic 1'));
  assert.ok(prompt.includes('Batch id: abc12345'));
});

test('AWS generation prompt uses domains, 5 options multi, and AWS naming', () => {
  const prompt = buildGenerationPrompt({
    counts: { 1: 5 },
    avoid: [],
    nonce: 'aws9876',
    exam: SAA,
  });

  assert.ok(prompt.includes('Domain 1 (Design Secure Architectures): 5 question(s)'));
  assert.ok(prompt.includes('type "multi" has exactly 5 options with exactly 2 correct'));
  assert.ok(prompt.includes('AWS IAM Identity Center'));
  assert.ok(prompt.includes('Amazon OpenSearch Service'));
});

test('createLineParser handles split chunks, code fences, brackets, and malformed lines', () => {
  const received = [];
  const parser = createLineParser((item) => received.push(item));

  parser.push('```json\n'); // fence
  parser.push('[{"stem": "Question one in stream?"},\n'); // bracket & trailing comma
  parser.push('{"stem": "Question two '); // split across push
  parser.push('in stream?"}\n');
  parser.push('garbage line that is not json\n');
  parser.push(']\n```\n'); // closing bracket & fence
  parser.end();

  assert.equal(received.length, 3);
  assert.equal(received[0].stem, 'Question one in stream?');
  assert.equal(received[1].stem, 'Question two in stream?');
  assert.equal(received[2], null); // malformed line emitted as null
});

test('coerceGenerated creates deterministic ids from stem and sanitizes fields', () => {
  const raw = {
    section: 3,
    sub: '§ 3.2',
    topic: 'Hyperparameter Tuning With Custom Frameworks In Agent Platform Containers',
    difficulty: 'HARD',
    type: 'SINGLE',
    stem: '  A machine learning engineering team is evaluating custom containers... ?  ',
    options: [
      { text: ' Option A ', correct: true, why: ' Why option A is right ' },
      { text: ' Option B ', correct: false, why: ' Why option B is wrong ' },
    ],
    explanation: ' Explanation text here ',
  };

  const pmleQ = coerceGenerated(raw, PMLE);
  assert.ok(pmleQ.id.startsWith('g-'));
  assert.equal(pmleQ.sub, '3.2');
  assert.equal(pmleQ.difficulty, 'hard');
  assert.equal(pmleQ.type, 'single');
  assert.equal(pmleQ.source, 'ai');
  assert.equal(pmleQ.options[0].text, 'Option A');
  assert.equal(pmleQ.options[0].correct, true);

  const saaQ = coerceGenerated(raw, SAA);
  assert.ok(saaQ.id.startsWith('g-saa-'));
});

test('generateBatch accepts valid in-scope lines and keeps questions before failure', async () => {
  const validQ = makeValidQuestion({ id: 'temp-id', section: 1, sub: '1.1' });
  const line = JSON.stringify(validQ);

  let streamAborted = false;
  const mockSample = async (prompt, { onText, signal }) => {
    // Stream first valid question
    onText({ delta: line + '\n' });
    // Simulate error after first question
    streamAborted = true;
    throw new Error('Stream connection dropped');
  };

  const acceptedList = [];
  await assert.rejects(
    generateBatch(mockSample, {
      sections: [1],
      counts: { 1: 5 },
      onQuestion: (q) => acceptedList.push(q),
      exam: PMLE,
    }),
    /Stream connection dropped/
  );

  assert.equal(streamAborted, true);
  assert.equal(acceptedList.length, 1, 'Question streamed before failure must be preserved');
  assert.equal(acceptedList[0].section, 1);
});

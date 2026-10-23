import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXAMS, PMLE, SAA, examById, examOfQuestionId } from '../src/js/exams.js';
import { allocateBySection } from '../src/js/select.js';

test('exam registry has pmle and saa', () => {
  assert.deepEqual(Object.keys(EXAMS).sort(), ['pmle', 'saa']);
  assert.equal(EXAMS.pmle, PMLE);
  assert.equal(EXAMS.saa, SAA);
});

test('SAA exam shape and configuration', () => {
  assert.equal(SAA.id, 'saa');
  assert.equal(SAA.code, 'SAA-C03');
  assert.equal(SAA.vendor, 'AWS');
  assert.equal(SAA.name, 'AWS Certified Solutions Architect – Associate');
  assert.equal(SAA.examQuestions, 65);
  assert.equal(SAA.examSeconds, 7800);
  assert.equal(SAA.multiOptions, 5);

  const weights = SAA.sections.map(s => s.weight);
  assert.deepEqual(weights, [30, 26, 24, 20]);

  const expectedSubKeys = [
    '1.1', '1.2', '1.3',
    '2.1', '2.2',
    '3.1', '3.2', '3.3', '3.4', '3.5',
    '4.1', '4.2', '4.3', '4.4'
  ];
  assert.deepEqual(Object.keys(SAA.subobjectives), expectedSubKeys);
  assert.equal(Object.keys(SAA.subobjectives).length, 14);
});

test('examById with fallback', () => {
  assert.equal(examById('pmle'), PMLE);
  assert.equal(examById('saa'), SAA);
  assert.equal(examById('nope'), PMLE);
  assert.equal(examById(null), PMLE);
});

test('allocateBySection on SAA for 65 questions', () => {
  const alloc = allocateBySection(65, SAA.sections);
  assert.deepEqual(alloc, { 1: 19, 2: 17, 3: 16, 4: 13 });
});

test('examOfQuestionId detects saa and pmle IDs', () => {
  assert.equal(examOfQuestionId('a3-17'), 'saa');
  assert.equal(examOfQuestionId('g-saa-1x2y'), 'saa');
  assert.equal(examOfQuestionId('b3-01'), 'pmle');
  assert.equal(examOfQuestionId('g-1x2y'), 'pmle');
  assert.equal(examOfQuestionId('other-123'), 'pmle');
});

test('every section short label is 1-20 characters', () => {
  for (const exam of [PMLE, SAA]) {
    for (const section of exam.sections) {
      assert.ok(typeof section.short === 'string');
      assert.ok(section.short.length >= 1 && section.short.length <= 20, `${exam.id} section ${section.id} short label "${section.short}" length invalid`);
    }
  }
});

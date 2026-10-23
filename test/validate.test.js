import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQuestion } from '../src/js/validate.js';
import { PMLE, SAA } from '../src/js/exams.js';
import { makeValidQuestion } from './helpers/fixtures.js';

test('a valid question passes validation', () => {
  const q = makeValidQuestion();
  const res = validateQuestion(q, PMLE);
  assert.equal(res.ok, true, `Validation failed: ${res.errors.join(', ')}`);
  assert.equal(res.errors.length, 0);
});

test('non-objects and missing fields fail', () => {
  assert.equal(validateQuestion(null).ok, false);
  assert.equal(validateQuestion('string').ok, false);
  assert.equal(validateQuestion([]).ok, false);

  const missingId = makeValidQuestion({ id: '' });
  assert.equal(validateQuestion(missingId).ok, false);

  const invalidSection = makeValidQuestion({ section: 99 });
  assert.equal(validateQuestion(invalidSection).ok, false);

  const invalidDifficulty = makeValidQuestion({ difficulty: 'impossible' });
  assert.equal(validateQuestion(invalidDifficulty).ok, false);

  const shortTopic = makeValidQuestion({ topic: 'ab' });
  assert.equal(validateQuestion(shortTopic).ok, false);

  const shortExplanation = makeValidQuestion({ explanation: 'Too short.' });
  assert.equal(validateQuestion(shortExplanation).ok, false);
});

test('stem must be >= 60 chars and contain question mark', () => {
  const shortStem = makeValidQuestion({ stem: 'Short stem with a question?' });
  assert.equal(validateQuestion(shortStem).ok, false);

  const noQuestionMark = makeValidQuestion({
    stem: 'This stem is long enough to meet the sixty character requirement but has no mark at all'
  });
  assert.equal(validateQuestion(noQuestionMark).ok, false);
});

test('sub must belong to section', () => {
  const mismatchedSub = makeValidQuestion({ section: 2, sub: '3.1' });
  const res = validateQuestion(mismatchedSub, PMLE);
  assert.equal(res.ok, false);
  assert.ok(res.errors.some(e => e.includes('does not belong to section 2')));
});

test('answer key rules and option count', () => {
  // Single with 2 correct answers
  const singleTwoCorrect = makeValidQuestion({
    type: 'single',
    options: [
      { text: 'Option A is correct here.', correct: true, why: 'Valid explanation why option A is correct.' },
      { text: 'Option B is also correct.', correct: true, why: 'Valid explanation why option B is correct.' },
      { text: 'Option C is not correct.', correct: false, why: 'Valid explanation why option C is wrong.' },
      { text: 'Option D is not correct.', correct: false, why: 'Valid explanation why option D is wrong.' },
    ]
  });
  assert.equal(validateQuestion(singleTwoCorrect, PMLE).ok, false);

  // Multi without "choose two"
  const multiNoChooseTwo = makeValidQuestion({
    type: 'multi',
    stem: 'A company needs multiple options for high availability across regions. What should they do for the design?',
    options: [
      { text: 'Option A is correct here.', correct: true, why: 'Valid explanation why option A is correct.' },
      { text: 'Option B is also correct.', correct: true, why: 'Valid explanation why option B is correct.' },
      { text: 'Option C is not correct.', correct: false, why: 'Valid explanation why option C is wrong.' },
      { text: 'Option D is not correct.', correct: false, why: 'Valid explanation why option D is wrong.' },
    ]
  });
  assert.equal(validateQuestion(multiNoChooseTwo, PMLE).ok, false);

  // Multi with "Choose two."
  const validMulti = makeValidQuestion({
    type: 'multi',
    stem: 'A company needs to choose two options for high availability across regions. Which two actions should you take? Choose two.',
    options: [
      { text: 'Option A is correct here.', correct: true, why: 'Valid explanation why option A is correct.' },
      { text: 'Option B is also correct.', correct: true, why: 'Valid explanation why option B is correct.' },
      { text: 'Option C is not correct.', correct: false, why: 'Valid explanation why option C is wrong.' },
      { text: 'Option D is not correct.', correct: false, why: 'Valid explanation why option D is wrong.' },
    ]
  });
  assert.equal(validateQuestion(validMulti, PMLE).ok, true);
});

test('duplicate option texts are rejected', () => {
  const dupOptions = makeValidQuestion({
    options: [
      { text: 'Option duplicated text.', correct: true, why: 'Valid explanation why this is right.' },
      { text: 'Option duplicated text.', correct: false, why: 'Valid explanation why this is wrong.' },
      { text: 'Option C is not correct.', correct: false, why: 'Valid explanation why option C is wrong.' },
      { text: 'Option D is not correct.', correct: false, why: 'Valid explanation why option D is wrong.' },
    ]
  });
  assert.equal(validateQuestion(dupOptions, PMLE).ok, false);
});

test('stale product naming is rejected, but "formerly Dataproc" is allowed', () => {
  const vertexAiQ = makeValidQuestion({
    stem: 'A team is training models on Vertex AI and wants to streamline deployment with minimal latency? What should you do?'
  });
  assert.equal(validateQuestion(vertexAiQ, PMLE).ok, false);

  const explainableAiQ = makeValidQuestion({
    explanation: 'Explainable AI was used to calculate Shapley values for model feature attributions over time.'
  });
  assert.equal(validateQuestion(explainableAiQ, PMLE).ok, false);

  const formerlyDataprocQ = makeValidQuestion({
    options: [
      { text: 'Use Managed Service for Apache Spark (formerly Dataproc) to execute distributed feature aggregation.', correct: true, why: 'Managed Service for Apache Spark provides serverless data processing.' },
      { text: 'Deploy an unmanaged Spark cluster manually on Compute Engine virtual machines.', correct: false, why: 'Virtual machines require excessive infrastructure maintenance.' },
      { text: 'Write a custom single-threaded Python script running in Cloud Shell.', correct: false, why: 'Cloud Shell is not intended for production distributed training.' },
      { text: 'Export all tables to local disk drives for offline model processing.', correct: false, why: 'Manual exports do not scale to large training datasets.' },
    ]
  });
  assert.equal(validateQuestion(formerlyDataprocQ, PMLE).ok, true);
});

test('AWS 5-option multi and AWS naming', () => {
  const awsMultiValid = {
    id: 'a1-99',
    section: 1,
    sub: '1.1',
    topic: 'IAM least privilege',
    difficulty: 'medium',
    type: 'multi',
    stem: 'A financial institution needs to grant temporary cross-account access while enforcing strict security. Which two actions should you take? Choose two.',
    options: [
      { text: 'Configure an IAM role in the target account with an external ID and assume it via AWS STS.', correct: true, why: 'Roles and external IDs prevent confused deputy attacks during cross-account access.' },
      { text: 'Enable MFA requirement on the trust policy of the cross-account role.', correct: true, why: 'MFA adds an extra layer of authentication for sensitive privileges.' },
      { text: 'Share long-term access keys for the root account securely via an encrypted message.', correct: false, why: 'Root account access keys should never be created, used, or shared.' },
      { text: 'Create IAM user credentials with full administrator access in every target account.', correct: false, why: 'Individual administrative credentials violate least-privilege principles.' },
      { text: 'Use an S3 bucket policy to grant direct access to IAM users from any unverified AWS account.', correct: false, why: 'Unverified cross-account access creates severe data exposure risks.' },
    ],
    explanation: 'Cross-account access should always be designed using IAM roles assumed through AWS Security Token Service (STS) with external IDs and enforced multi-factor authentication (MFA).',
  };
  const res = validateQuestion(awsMultiValid, SAA);
  assert.equal(res.ok, true, `AWS multi validation failed: ${res.errors.join(', ')}`);

  // AWS stale term test (e.g. AWS SSO)
  const staleAws = {
    ...awsMultiValid,
    stem: 'A company wants to manage corporate identities using AWS SSO across several accounts. Which two actions should you take? Choose two.'
  };
  assert.equal(validateQuestion(staleAws, SAA).ok, false);
});

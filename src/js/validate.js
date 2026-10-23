import { PMLE } from './exams.js';
import { normalizeStem } from './util.js';

export const DIFFICULTIES = ['easy', 'medium', 'hard'];

export function findStaleTerms(text, exam = PMLE) {
  if (typeof text !== 'string') return [];
  const found = [];
  const terms = exam.staleTerms || [];
  for (const { re, use } of terms) {
    if (re.test(text)) {
      found.push(`${re.source} → ${use}`);
    }
  }
  return found;
}

export function validateQuestion(q, exam = PMLE) {
  const errors = [];
  if (!q || typeof q !== 'object' || Array.isArray(q)) {
    return { ok: false, errors: ['not an object'] };
  }

  if (typeof q.id !== 'string' || !q.id.trim()) {
    errors.push('id must be a non-empty string');
  }

  const sectionIds = (exam.sections || []).map(s => s.id);
  if (typeof q.section !== 'number' || !Number.isInteger(q.section) || !sectionIds.includes(q.section)) {
    errors.push(`section must be one of: ${sectionIds.join(', ')}`);
  }

  if (typeof q.sub !== 'string' || !exam.subobjectives || !exam.subobjectives[q.sub]) {
    errors.push(`sub "${q.sub}" is not in exam subobjectives`);
  } else if (exam.subobjectives[q.sub].section !== q.section) {
    errors.push(`sub "${q.sub}" does not belong to section ${q.section}`);
  }

  if (!DIFFICULTIES.includes(q.difficulty)) {
    errors.push(`difficulty must be one of: ${DIFFICULTIES.join(', ')}`);
  }

  if (q.type !== 'single' && q.type !== 'multi') {
    errors.push('type must be "single" or "multi"');
  }

  const topic = typeof q.topic === 'string' ? q.topic.trim() : '';
  if (topic.length < 3) {
    errors.push('topic must be at least 3 characters');
  }

  const stem = typeof q.stem === 'string' ? q.stem : '';
  if (stem.length < 60 || !stem.includes('?')) {
    errors.push('stem must be at least 60 characters and contain a question mark');
  }

  if (q.type === 'multi' && !/choose two/i.test(stem)) {
    errors.push('multi question stem must match /choose two/i');
  }

  const explanation = typeof q.explanation === 'string' ? q.explanation : '';
  if (explanation.length < 40) {
    errors.push('explanation must be at least 40 characters');
  }

  const expectedOptions = q.type === 'multi' ? (exam.multiOptions || 4) : 4;
  const expectedCorrect = q.type === 'multi' ? 2 : 1;

  if (!Array.isArray(q.options) || q.options.length !== expectedOptions) {
    errors.push(`options count must be ${expectedOptions}, got ${Array.isArray(q.options) ? q.options.length : 0}`);
  } else {
    let correctCount = 0;
    const seenOptionTexts = new Set();
    q.options.forEach((opt, idx) => {
      if (!opt || typeof opt !== 'object') {
        errors.push(`option ${idx} is not an object`);
        return;
      }
      if (typeof opt.text !== 'string' || !opt.text.trim()) {
        errors.push(`option ${idx} text must be a non-empty string`);
      } else {
        const norm = normalizeStem(opt.text);
        if (seenOptionTexts.has(norm)) {
          errors.push(`duplicate option text: "${opt.text}"`);
        }
        seenOptionTexts.add(norm);
      }
      if (typeof opt.correct !== 'boolean') {
        errors.push(`option ${idx} correct must be a boolean`);
      } else if (opt.correct) {
        correctCount++;
      }
      if (typeof opt.why !== 'string' || opt.why.length < 15) {
        errors.push(`option ${idx} why must be at least 15 characters`);
      }
    });

    if (correctCount !== expectedCorrect) {
      errors.push(`answer key invalid: ${correctCount} correct options, expected ${expectedCorrect}`);
    }
  }

  // Check for stale terms across all text fields
  const textsToCheck = [stem, explanation, topic];
  if (Array.isArray(q.options)) {
    for (const opt of q.options) {
      if (opt && typeof opt === 'object') {
        if (typeof opt.text === 'string') textsToCheck.push(opt.text);
        if (typeof opt.why === 'string') textsToCheck.push(opt.why);
      }
    }
  }

  const allStale = [];
  for (const text of textsToCheck) {
    const stale = findStaleTerms(text, exam);
    for (const st of stale) {
      if (!allStale.includes(st)) {
        allStale.push(st);
      }
    }
  }
  for (const st of allStale) {
    errors.push(`stale product naming: ${st}`);
  }

  return { ok: errors.length === 0, errors };
}

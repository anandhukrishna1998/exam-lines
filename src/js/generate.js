import { PMLE } from './exams.js';
import { hashString, normalizeStem } from './util.js';
import { validateQuestion } from './validate.js';
import { LETTERS } from '../ui/dom.js';

export const LOAD_COUNT = 24;
export const MORE_COUNT = 12;

export function buildGenerationPrompt({ counts = {}, avoid = [], nonce = '', exam = PMLE }) {
  const word = exam.sectionWord || 'Section';
  const activeSections = (exam.sections || []).filter(s => (counts[s.id] || 0) > 0);
  const total = activeSections.reduce((sum, s) => sum + (counts[s.id] || 0), 0);

  const distLines = activeSections.map(s => `- ${word} ${s.id} (${s.title}): ${counts[s.id]} question(s)`);

  const outlineLines = [];
  for (const s of activeSections) {
    outlineLines.push(`${word} ${s.id}: ${s.title} (~${s.weight}% of the exam)`);
    for (const [code, sub] of Object.entries(exam.subobjectives || {})) {
      if (sub.section === s.id) {
        outlineLines.push(`  ${code} ${sub.title}: ${sub.topics.join('; ')}`);
      }
    }
  }

  const namingLines = (exam.namingRules || []).map(r => `- ${r}`);

  const avoidSlice = (avoid || []).slice(-40);
  const avoidLines = avoidSlice.length > 0
    ? avoidSlice.map(t => `- ${String(t).slice(0, 80)}`).join('\n')
    : '- (none)';

  const firstSec = activeSections[0] ? activeSections[0].id : 1;
  const firstSub = Object.keys(exam.subobjectives || {}).find(k => exam.subobjectives[k].section === firstSec) || `${firstSec}.1`;

  return [
    `You write ORIGINAL practice questions for the ${exam.name} (${exam.code}) certification, based on the ${exam.guide}. Never reproduce real, leaked or "dump" exam questions.`,
    '',
    `Write exactly ${total} questions with this distribution:`,
    ...distLines,
    '',
    `Exam outline for these ${word.toLowerCase()}s (sub-objective code, title, topics):`,
    ...outlineLines,
    '',
    'Product naming (mandatory):',
    ...namingLines,
    '',
    'Quality rules:',
    '1. Scenario-based: a specific company situation with concrete constraints (cost, latency, scale, compliance or minimal operational effort), ending with a direct question such as "What should you do?"',
    `2. About one question in five is type "multi"; type "multi" has exactly ${exam.multiOptions} options with exactly 2 correct, and its stem ends with "Choose two." Type "single" has exactly 4 options with exactly 1 correct.`,
    `3. Every wrong option is a real ${exam.vendor} service or practice used in the wrong way or at the wrong time. No joke options. Keep options similar in length and do not make the correct one the longest by habit.`,
    `4. Exactly one defensible answer (two for multi). Check every answer against current ${exam.vendor} best practice. If you are not sure a fact is current, pick another topic.`,
    '5. "explanation": 2-4 sentences on why the correct option(s) are right. Each option has "why": one sentence; for wrong options say why it is wrong in this scenario.',
    '6. Mix difficulty: about 25% easy, 50% medium, 25% hard. Vary industries (retail, healthcare, finance, manufacturing, media, public sector, gaming, logistics).',
    '7. "topic" is a 3-8 word label for the specific skill tested. Avoid these recently used topics:',
    avoidLines,
    '',
    'Output format: JSON Lines. Print one complete JSON object per line and nothing else: no array brackets, no code fences, no commentary. Each object has exactly these fields (a single-answer example):',
    `{"section":${firstSec},"sub":"${firstSub}","topic":"...","difficulty":"easy|medium|hard","type":"single|multi","stem":"...","options":[{"text":"...","correct":true,"why":"..."},{"text":"...","correct":false,"why":"..."},{"text":"...","correct":false,"why":"..."},{"text":"...","correct":false,"why":"..."}],"explanation":"..."}`,
    '"correct" must be the JSON boolean true or false. "sub" must be one of the codes listed above for its section.',
    `Batch id: ${nonce}`
  ].join('\n');
}

export function createLineParser(onItem) {
  let buffer = '';

  function processLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('```')) return;
    const cleaned = trimmed
      .replace(/^\[\s*/, '')
      .replace(/,\s*$/, '')
      .replace(/\]\s*$/, '');
    if (!cleaned) return;
    try {
      const parsed = JSON.parse(cleaned);
      onItem(parsed);
    } catch {
      onItem(null);
    }
  }

  return {
    push(delta) {
      buffer += delta;
      const parts = buffer.split(/\r?\n/);
      buffer = parts.pop() || '';
      for (const line of parts) {
        processLine(line);
      }
    },
    end() {
      if (buffer.trim()) {
        processLine(buffer);
        buffer = '';
      }
    },
  };
}

export function coerceGenerated(raw, exam = PMLE) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const stem = typeof raw.stem === 'string' ? raw.stem.trim() : '';
  if (!stem) return null;

  const sub = typeof raw.sub === 'string' ? raw.sub.replace(/^§\s*/, '').trim() : '';
  let section = raw.section;
  if (typeof section !== 'number' || !Number.isInteger(section)) {
    section = Number(sub.split('.')[0]) || 1;
  }

  const topic = (typeof raw.topic === 'string' ? raw.topic.trim() : '').slice(0, 80);
  const difficulty = (typeof raw.difficulty === 'string' ? raw.difficulty.trim().toLowerCase() : 'medium');
  const type = (typeof raw.type === 'string' ? raw.type.trim().toLowerCase() : 'single');
  const explanation = typeof raw.explanation === 'string' ? raw.explanation.trim() : '';

  const options = Array.isArray(raw.options)
    ? raw.options.map(opt => ({
        text: opt && typeof opt.text === 'string' ? opt.text.trim() : '',
        correct: opt && typeof opt.correct === 'boolean' ? opt.correct : null,
        why: opt && typeof opt.why === 'string' ? opt.why.trim() : '',
      }))
    : [];

  const normStem = normalizeStem(stem);
  const hash = hashString(normStem);
  const id = exam.id === 'pmle' ? `g-${hash}` : `g-${exam.id}-${hash}`;

  return {
    id,
    section,
    sub,
    topic,
    difficulty,
    type,
    stem,
    options,
    explanation,
    source: 'ai',
  };
}

export async function generateBatch(sample, { sections = [], counts = {}, avoid = [], signal, onQuestion, exam = PMLE }) {
  const nonce = Math.random().toString(36).slice(2, 10);
  const batchCounts = {};
  for (const s of sections) {
    batchCounts[s] = counts[s] || 0;
  }
  const prompt = buildGenerationPrompt({ counts: batchCounts, avoid, nonce, exam });

  let accepted = 0;
  let rejected = 0;
  const target = Object.values(batchCounts).reduce((a, b) => a + b, 0);
  const seenBatchIds = new Set();

  const parser = createLineParser((obj) => {
    if (!obj) {
      rejected++;
      return;
    }
    const coerced = coerceGenerated(obj, exam);
    if (!coerced) {
      rejected++;
      return;
    }
    if (!sections.includes(coerced.section)) {
      rejected++;
      return;
    }
    if (seenBatchIds.has(coerced.id)) {
      rejected++;
      return;
    }
    const v = validateQuestion(coerced, exam);
    if (!v.ok) {
      rejected++;
      return;
    }
    seenBatchIds.add(coerced.id);
    accepted++;
    if (typeof onQuestion === 'function') {
      onQuestion(coerced);
    }
  });

  try {
    await sample(prompt, {
      signal,
      cache: false,
      modelTier: 'default',
      onText: ({ delta }) => parser.push(delta),
    });
  } finally {
    parser.end();
  }

  return { accepted, rejected, target };
}

export function buildVerifyPrompt(questions = [], exam = PMLE) {
  const blocks = questions.map((q, idx) => {
    const isMulti = q.type === 'multi';
    const optLines = (q.options || []).map((o, optIdx) => `${LETTERS[optIdx]}. ${o.text}`);
    return [
      `Question ${idx + 1} (${isMulti ? 'choose two' : 'one answer'})`,
      q.stem,
      ...optLines
    ].join('\n');
  });

  return [
    `You are an independent ${exam.vendor} expert checking practice questions for the ${exam.name} (${exam.code}) certification. The answer key is hidden from you.`,
    'For each question: work out the correct option letter(s) yourself, using current official documentation as your standard. Then check whether any statement in the question or its options is factually wrong or outdated today, and whether more options than asked could be defended.',
    'Reply with only a JSON array, one object per question, in order:',
    '[{"n":1,"answer":["B"],"confident":true,"issue":null}]',
    '"answer" has exactly one letter for one-answer questions and exactly two for choose-two questions. "confident" is false if you are unsure. "issue" is null, or one sentence naming the factual error, the outdated fact or the second defensible answer.',
    '',
    blocks.join('\n\n')
  ].join('\n');
}

export function judgeVerification(questions = [], verdicts = []) {
  const verdictMap = new Map();
  if (Array.isArray(verdicts)) {
    for (const v of verdicts) {
      if (v && v.n != null) {
        verdictMap.set(Number(v.n), v);
      }
    }
  }

  const kept = [];
  const dropped = [];

  questions.forEach((q, idx) => {
    const n = idx + 1;
    const v = verdictMap.get(n);
    if (!v) {
      dropped.push({ q, reason: 'no verdict returned' });
      return;
    }

    const keyLetters = [];
    (q.options || []).forEach((opt, optIdx) => {
      if (opt.correct) keyLetters.push(LETTERS[optIdx]);
    });
    keyLetters.sort();

    const ansLetters = (Array.isArray(v.answer) ? v.answer : [v.answer])
      .map(l => String(l || '').trim().toUpperCase())
      .filter(Boolean)
      .sort();

    const lettersMatch = ansLetters.length === keyLetters.length &&
      ansLetters.every((l, i) => l === keyLetters[i]);

    if (!lettersMatch) {
      dropped.push({ q, reason: 'verifier chose a different answer' });
    } else if (v.confident !== true) {
      dropped.push({ q, reason: 'verifier was not confident' });
    } else if (v.issue && String(v.issue).trim()) {
      dropped.push({ q, reason: String(v.issue).trim() });
    } else {
      kept.push({ ...q, verified: true });
    }
  });

  return { kept, dropped };
}

export async function verifyBatch(sample, questions = [], exam = PMLE, signal) {
  if (!questions || questions.length === 0) {
    return { kept: [], dropped: [] };
  }
  const prompt = buildVerifyPrompt(questions, exam);
  const verdicts = await sample.json(prompt, { signal, cache: false, modelTier: 'default' });
  return judgeVerification(questions, verdicts);
}

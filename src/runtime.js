import { mergePool, allocateBySection } from './js/select.js';
import { normalizeStem } from './js/util.js';
import { examById } from './js/exams.js';
import { providerLabel, createAiSample } from './js/providers.js';
import { dbBackend, multiBackend, createPersister, mergeStates, emptyState, statesEqual } from './js/store.js';
import { sanitizeLibrary, addToLibrary, dbLibraryStore } from './js/library.js';
import { generateBatch, verifyBatch, LOAD_COUNT } from './js/generate.js';

export const HIDE_CODES = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];

export function makeSlot(bank = []) {
  return {
    bank,
    library: [],
    generated: [],
    pool: mergePool(bank, []),
    gen: {
      status: 'offline',
      phase: null,
      ready: 0,
      target: 0,
      rejected: 0,
      dropped: 0,
      note: '',
    },
    genCtl: null,
  };
}

export function writerName(app) {
  if (!app.builtInClaude && app.aiConfig && app.aiConfig.key) {
    return providerLabel(app.aiConfig);
  }
  return 'Claude';
}

export function capabilityGetter(claudeObj) {
  return async function(name) {
    if (!claudeObj || typeof claudeObj.use !== 'function') return null;
    try {
      return await claudeObj.use(name);
    } catch {
      return null;
    }
  };
}

export function topicsFor(state, examId) {
  if (!state || !Array.isArray(state.genTopics)) return [];
  const result = [];
  for (const t of state.genTopics) {
    if (typeof t !== 'string') continue;
    if (t.includes('|')) {
      const [ex, topic] = t.split('|');
      if (ex === examId && topic) {
        result.push(topic);
      }
    } else {
      if (examId === 'pmle') {
        result.push(t);
      }
    }
  }
  return result;
}

export async function connectStorage(app, { use, localB, onChange } = {}) {
  let user = null;
  let db = null;
  if (use) {
    user = await use('user');
    db = await use('db');
  }

  let uid = null;
  if (user && typeof user.id === 'function') {
    try {
      uid = await user.id();
    } catch {
      uid = null;
    }
  }

  if (!db || !uid) {
    app.storage = 'local';
    if (onChange) onChange('storage');
    return;
  }

  app.libraryStore = dbLibraryStore(db, uid);
  const dbB = dbBackend(db, uid);

  let remote = null;
  try {
    remote = await dbB.load();
  } catch {
    app.storage = 'local';
    if (onChange) onChange('storage');
    return;
  }

  const merged = mergeStates(remote || emptyState(), app.state);
  app.state = merged;
  app.storage = 'db';

  const multiB = multiBackend([dbB, localB]);
  app.persister = createPersister(multiB, {
    onError: () => {
      app.storage = 'local-fallback';
      if (onChange) onChange('storage');
    }
  });

  if (!statesEqual(merged, remote)) {
    app.persister.save(merged);
  }

  if (onChange) onChange('storage');
}

export function addGenerated(app, examId, q, onChange) {
  const slot = app.slots && app.slots[examId];
  if (!slot || !q) return;

  const qNorm = normalizeStem(q.stem || '');
  const isDup = slot.pool.some(p => p.id === q.id || normalizeStem(p.stem || '') === qNorm);
  if (isDup) return;

  slot.generated.push(q);
  slot.gen.ready++;

  const topicSlice = String(q.topic || '').slice(0, 80);
  if (app.state && Array.isArray(app.state.genTopics)) {
    app.state.genTopics.push(`${examId}|${topicSlice}`);
  }

  if (q.verified) {
    slot.library = addToLibrary(slot.library, [q]);
  }

  slot.pool = mergePool(slot.bank, [...slot.library, ...slot.generated]);
  if (onChange) onChange('pool', examId);
}

const savingFlags = new Map();

export async function saveLibrary(app, examId) {
  if (!app.libraryStore) return;
  const slot = app.slots && app.slots[examId];
  if (!slot) return;

  if (savingFlags.get(examId)) {
    savingFlags.set(`${examId}_again`, true);
    return;
  }

  savingFlags.set(examId, true);
  try {
    do {
      savingFlags.set(`${examId}_again`, false);
      try {
        await app.libraryStore.save(examId, slot.library);
      } catch {}
    } while (savingFlags.get(`${examId}_again`));
  } finally {
    savingFlags.delete(examId);
    savingFlags.delete(`${examId}_again`);
  }
}

export async function loadLibraries(app, onChange) {
  if (!app.libraryStore) return;
  for (const examId of ['pmle', 'saa']) {
    const slot = app.slots && app.slots[examId];
    if (slot) {
      try {
        const raw = await app.libraryStore.load(examId);
        const exam = examById(examId);
        slot.library = sanitizeLibrary(raw, exam);
        slot.pool = mergePool(slot.bank, [...slot.library, ...slot.generated]);
        if (onChange) onChange('pool', examId);
      } catch {}
    }
  }
}

export async function runGeneration(app, { examId, total, onChange } = {}) {
  const slot = app.slots && app.slots[examId];
  if (!app.sample || !slot || slot.gen.status === 'running') return;

  const exam = examById(examId);
  const counts = allocateBySection(total, exam.sections);
  const batches = total >= 18 ? exam.genBatches : [exam.sections.map(s => s.id)];

  const ctl = new AbortController();
  slot.genCtl = ctl;
  slot.gen.status = 'running';
  slot.gen.phase = null;
  slot.gen.target = slot.gen.ready + total;
  slot.gen.note = '';
  if (onChange) onChange('gen', examId);

  const avoid = topicsFor(app.state, examId).slice(-40);

  const batchResults = await Promise.allSettled(
    batches.map(async (batchSections) => {
      const staging = [];
      await generateBatch(app.sample, {
        sections: batchSections,
        counts,
        avoid,
        signal: ctl.signal,
        exam,
        onQuestion: (q) => { staging.push(q); },
      });

      slot.gen.phase = 'checking';
      if (onChange) onChange('gen', examId);

      const verified = await verifyBatch(app.sample, staging, exam, ctl.signal);
      slot.gen.dropped += verified.dropped.length;

      for (const keptQ of verified.kept) {
        addGenerated(app, examId, keptQ, onChange);
      }
    })
  );

  slot.gen.phase = null;
  slot.genCtl = null;

  if (slot.gen.ready > 0) {
    saveLibrary(app, examId);
  }

  const failures = batchResults
    .filter(r => r.status === 'rejected')
    .map(r => r.reason);

  const who = writerName(app);

  let status = 'done';
  let note = '';

  const hasCode = (code) => failures.some(f => f && (f.code === code || f.message?.includes(code)));
  const anyBadKey = hasCode('bad_key');
  const anyHideCode = failures.some(f => f && HIDE_CODES.includes(f.code));
  const anyRateLimited = hasCode('rate_limited');
  const allCancelled = failures.length > 0 && failures.every(f => f && f.code === 'cancelled');

  if (anyBadKey) {
    status = 'error';
    note = `${who} rejected the API key. Check it in AI Settings. Sessions use the built-in bank.`;
  } else if (anyHideCode) {
    status = 'unavailable';
    note = 'Fresh questions are turned off for this view, so sessions use the built-in bank.';
  } else if (anyRateLimited) {
    status = 'error';
    note = `${who} is rate-limited right now. Sessions use the built-in bank; try "Try again" later.`;
  } else if (allCancelled) {
    status = 'done';
    note = 'Stopped. Fresh questions written so far stay in the pool.';
  } else if (failures.length > 0 && slot.gen.ready === 0) {
    status = 'error';
    note = `Could not reach ${who} for fresh questions. Sessions use the built-in bank.`;
  } else if (failures.length === 0 && slot.gen.ready === 0) {
    status = 'error';
    note = 'None of the new questions passed both the format checks and the independent double-check, so none were added. Sessions use the checked bank.';
  } else {
    status = 'done';
  }

  slot.gen.status = status;
  slot.gen.note = note;
  if (onChange) onChange('gen', examId);
}

export function ensureGeneration(app, examId, onChange) {
  const slot = app.slots && app.slots[examId];
  if (slot && slot.gen.status === 'idle') {
    runGeneration(app, { examId, total: LOAD_COUNT, onChange });
  }
}

export async function connectRuntime(app, { claudeObj, localB, onChange, aiConfig } = {}) {
  if (!claudeObj) {
    if (aiConfig && aiConfig.key) {
      app.sample = createAiSample(aiConfig);
      for (const slot of Object.values(app.slots)) {
        slot.gen.status = 'idle';
      }
      app.storage = 'local';
      if (onChange) onChange('storage');
      ensureGeneration(app, app.examId, onChange);
    } else {
      for (const slot of Object.values(app.slots)) {
        slot.gen.status = 'offline';
      }
      if (onChange) onChange('gen', app.examId);
    }
    return;
  }

  const use = capabilityGetter(claudeObj);
  const storagePromise = connectStorage(app, { use, localB, onChange }).then(() => loadLibraries(app, onChange));

  const sample = await use('sample');
  if (!sample) {
    for (const slot of Object.values(app.slots)) {
      slot.gen.status = 'unavailable';
      slot.gen.note = 'Fresh questions need the Claude viewer, so sessions use the built-in bank.';
    }
    if (onChange) onChange('gen', app.examId);
  } else {
    app.sample = sample;
    for (const slot of Object.values(app.slots)) {
      slot.gen.status = 'idle';
    }
    ensureGeneration(app, app.examId, onChange);
  }

  await storagePromise;
}

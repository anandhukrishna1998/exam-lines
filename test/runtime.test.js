import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeSlot,
  writerName,
  capabilityGetter,
  topicsFor,
  connectStorage,
  addGenerated,
  runGeneration,
  saveLibrary,
  loadLibraries,
  ensureGeneration,
  connectRuntime,
} from '../src/runtime.js';
import { emptyState } from '../src/js/store.js';
import { PMLE, SAA } from '../src/js/exams.js';
import { makeValidQuestion, makeGeneratedFor } from './helpers/fixtures.js';
import { localLibraryStore } from '../src/js/library.js';

function createMockSample() {
  const sample = async (prompt, { onText, signal } = {}) => {
    // Reads sections from prompt
    const matches = [...prompt.matchAll(/- (?:Section|Domain) (\d) \(/g)];
    const sections = matches.map(m => Number(m[1]));
    const isAws = prompt.includes('Domain');

    for (const sec of sections) {
      for (let i = 1; i <= 2; i++) {
        const q = makeGeneratedFor(sec, i, isAws ? SAA : PMLE);
        onText({ delta: JSON.stringify(q) + '\n' });
      }
    }
    return { text: '', truncated: false };
  };

  sample.json = async (prompt, opts) => {
    // Count questions in verify prompt
    const qMatches = [...prompt.matchAll(/Question (\d+) \(/g)];
    return qMatches.map(m => ({
      n: Number(m[1]),
      answer: ['A'],
      confident: true,
      issue: null,
    }));
  };

  return sample;
}

test('capabilityGetter swallows errors and returns methods', async () => {
  const claudeObj = {
    use(name) {
      if (name === 'fail') throw new Error('bang');
      return { ok: true, name };
    }
  };
  const get = capabilityGetter(claudeObj);
  assert.deepEqual(await get('sample'), { ok: true, name: 'sample' });
  assert.equal(await get('fail'), null);

  const getNull = capabilityGetter(null);
  assert.equal(await getNull('sample'), null);
});

test('topicsFor extracts exam topics and treats legacy unprefixed as PMLE', () => {
  const state = {
    genTopics: [
      'legacy topic 1',
      'pmle|vertex replacement',
      'saa|vpc endpoints',
      'legacy topic 2',
    ]
  };

  const pmleTopics = topicsFor(state, 'pmle');
  assert.deepEqual(pmleTopics, ['legacy topic 1', 'vertex replacement', 'legacy topic 2']);

  const saaTopics = topicsFor(state, 'saa');
  assert.deepEqual(saaTopics, ['vpc endpoints']);
});

test('no runtime and no aiConfig sets every slot to offline', async () => {
  const app = {
    slots: { pmle: makeSlot(), saa: makeSlot() },
    examId: 'pmle',
    state: emptyState(),
  };

  await connectRuntime(app, {});
  assert.equal(app.slots.pmle.gen.status, 'offline');
  assert.equal(app.slots.saa.gen.status, 'offline');
});

test('sample unavailable sets every slot to unavailable with note mentioning built-in bank', async () => {
  const app = {
    slots: { pmle: makeSlot(), saa: makeSlot() },
    examId: 'pmle',
    state: emptyState(),
  };

  const claudeObj = {
    use(name) {
      if (name === 'sample') return null;
      return null;
    }
  };

  await connectRuntime(app, { claudeObj });
  assert.equal(app.slots.pmle.gen.status, 'unavailable');
  assert.ok(app.slots.pmle.gen.note.includes('built-in bank'));
});

test('load-time generation only runs for viewed exam and generates verified questions', async () => {
  const mockStorage = { getItem: () => null, setItem: () => {} };
  const app = {
    slots: { pmle: makeSlot(), saa: makeSlot() },
    examId: 'pmle',
    state: emptyState(),
    libraryStore: localLibraryStore(mockStorage),
  };

  const sample = createMockSample();
  const claudeObj = {
    use(name) {
      if (name === 'sample') return sample;
      return null;
    }
  };

  await connectRuntime(app, { claudeObj, localB: { save: async () => {}, load: async () => null } });

  assert.equal(app.slots.pmle.gen.status, 'done');
  assert.equal(app.slots.pmle.gen.ready, 12); // 6 sections * 2 questions
  assert.equal(app.slots.pmle.library.length, 12);
  assert.equal(app.slots.saa.gen.status, 'idle'); // Not viewed yet!
});

test('switching exam to SAA generates once with g-saa- ids and saa| topics', async () => {
  const mockStorage = { getItem: () => null, setItem: () => {} };
  const app = {
    slots: { pmle: makeSlot(), saa: makeSlot() },
    examId: 'saa',
    state: emptyState(),
    sample: createMockSample(),
    libraryStore: localLibraryStore(mockStorage),
  };

  app.slots.saa.gen.status = 'idle';
  await runGeneration(app, { examId: 'saa', total: 8 });

  assert.equal(app.slots.saa.gen.status, 'done');
  assert.equal(app.slots.saa.gen.ready, 8); // 4 domains * 2 questions
  assert.ok(app.slots.saa.generated[0].id.startsWith('g-saa-'));
  assert.ok(app.state.genTopics.some(t => t.startsWith('saa|')));
});

test('aiConfig without claudeObj connects with BYOK', async () => {
  const app = {
    slots: { pmle: makeSlot(), saa: makeSlot() },
    examId: 'pmle',
    state: emptyState(),
  };

  const aiConfig = { provider: 'gemini', key: 'test-key' };
  await connectRuntime(app, { aiConfig });

  assert.ok(app.sample !== null);
  // PMLE is triggered by ensureGeneration, while other slots remain idle
  assert.equal(app.slots.pmle.gen.status, 'running');
  assert.equal(app.slots.saa.gen.status, 'idle');
});

test('rejected API key names provider and mentions AI Settings', async () => {
  const app = {
    slots: { pmle: makeSlot(), saa: makeSlot() },
    examId: 'pmle',
    state: emptyState(),
    aiConfig: { provider: 'anthropic', key: 'bad-key' },
    sample: async () => {
      const err = new Error('Unauthorized');
      err.code = 'bad_key';
      throw err;
    }
  };

  await runGeneration(app, { examId: 'pmle', total: 6 });
  assert.equal(app.slots.pmle.gen.status, 'error');
  assert.ok(app.slots.pmle.gen.note.includes('Claude'));
  assert.ok(app.slots.pmle.gen.note.includes('AI Settings'));
});

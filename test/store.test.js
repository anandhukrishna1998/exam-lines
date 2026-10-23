import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyState,
  sanitizeState,
  pruneState,
  markSeen,
  reportQuestion,
  restoreQuestion,
  addAttempt,
  forgetSeen,
  mergeStates,
  statesEqual,
  localBackend,
  dbBackend,
  multiBackend,
  createPersister,
  MAX_SEEN,
  MAX_REPORTED,
  MAX_HISTORY,
  MAX_TOPICS,
  SEEN_TTL_MS,
} from '../src/js/store.js';

test('emptyState and sanitizeState handle junk gracefully', () => {
  const empty = emptyState();
  assert.equal(empty.v, 1);
  assert.deepEqual(empty.seen, {});
  assert.deepEqual(empty.reported, {});
  assert.deepEqual(empty.history, []);
  assert.deepEqual(empty.genTopics, []);

  assert.deepEqual(sanitizeState(null), empty);
  assert.deepEqual(sanitizeState('garbage'), empty);
  assert.deepEqual(sanitizeState([1, 2, 3]), empty);

  const junk = {
    v: 99,
    seen: { q1: 12345, q2: 'not a number', q3: NaN, q4: Infinity },
    reported: {
      r1: { t: 5000, reason: 'incorrect', stem: 'Valid stem', sub: '1.1' },
      r2: { t: '5000', reason: 'unknown_reason', stem: 'x'.repeat(200), sub: '2.1' },
      r3: 'not an object',
    },
    history: [
      { t: 1000, total: 10, correct: 8, pct: 80 },
      { t: 'invalid', total: 10 },
      'not an object',
    ],
    genTopics: ['Topic 1', 123, 'x'.repeat(100)],
  };

  const clean = sanitizeState(junk);
  assert.equal(clean.v, 1);
  assert.deepEqual(clean.seen, { q1: 12345 });
  assert.equal(clean.reported.r1.reason, 'incorrect');
  assert.equal(clean.reported.r2.reason, 'other'); // sanitized to 'other'
  assert.equal(clean.reported.r2.stem.length, 160);
  assert.equal(clean.reported.r3, undefined);
  assert.equal(clean.history.length, 1);
  assert.equal(clean.genTopics.length, 2);
  assert.equal(clean.genTopics[1].length, 80);
});

test('pruning expires old seen entries and enforces caps', () => {
  const now = 100000000;
  const state = emptyState();

  // Add seen entries, some expired
  state.seen['old'] = now - SEEN_TTL_MS - 1000;
  state.seen['fresh'] = now - 1000;

  // Add more than MAX_SEEN
  for (let i = 0; i < MAX_SEEN + 50; i++) {
    state.seen[`q-${i}`] = now - 500 - i;
  }

  // Add more than MAX_REPORTED
  for (let i = 0; i < MAX_REPORTED + 20; i++) {
    state.reported[`rep-${i}`] = { t: now - i, reason: 'incorrect', stem: 'stem', sub: '1.1' };
  }

  // Add more than MAX_HISTORY
  for (let i = 0; i < MAX_HISTORY + 30; i++) {
    state.history.push({ t: now + i, total: 10, correct: 5, pct: 50 });
  }

  // Add more than MAX_TOPICS
  for (let i = 0; i < MAX_TOPICS + 20; i++) {
    state.genTopics.push(`topic-${i}`);
  }

  pruneState(state, now);

  assert.equal(state.seen['old'], undefined, 'Expired seen entry must be pruned');
  assert.equal(Object.keys(state.seen).length, MAX_SEEN);
  assert.equal(Object.keys(state.reported).length, MAX_REPORTED);
  assert.equal(state.history.length, MAX_HISTORY);
  assert.equal(state.genTopics.length, MAX_TOPICS);
});

test('a full state is well under 256 KiB', () => {
  const state = emptyState();
  for (let i = 0; i < MAX_SEEN; i++) {
    state.seen[`b3-${i.toString().padStart(4, '0')}`] = Date.now();
  }
  for (let i = 0; i < MAX_REPORTED; i++) {
    state.reported[`b1-${i.toString().padStart(4, '0')}`] = {
      t: Date.now(),
      reason: 'ambiguous',
      stem: 'Stem text for testing capacity of reported questions state storage limit'.repeat(2).slice(0, 160),
      sub: '3.2',
    };
  }
  for (let i = 0; i < MAX_HISTORY; i++) {
    state.history.push({
      t: Date.now(),
      exam: 'pmle',
      mode: 'practice',
      section: null,
      total: 50,
      correct: 42,
      pct: 84,
      durationSec: 3600,
      perSection: { 1: { c: 6, n: 7 }, 2: { c: 7, n: 8 }, 3: { c: 8, n: 10 }, 4: { c: 9, n: 10 }, 5: { c: 7, n: 9 }, 6: { c: 5, n: 6 } },
      perSub: { '1.1': { c: 3, n: 4 }, '3.2': { c: 5, n: 6 } },
    });
  }
  for (let i = 0; i < MAX_TOPICS; i++) {
    state.genTopics.push(`Topic description for test number ${i} testing size requirements`.slice(0, 80));
  }

  const json = JSON.stringify(state);
  const sizeKiB = Buffer.byteLength(json, 'utf8') / 1024;
  assert.ok(sizeKiB < 256, `Full state size ${sizeKiB.toFixed(1)} KiB must be under 256 KiB`);
});

test('state mutators: markSeen, reportQuestion, restoreQuestion, addAttempt, forgetSeen', () => {
  const state = emptyState();
  markSeen(state, 'q1', 5000);
  assert.equal(state.seen['q1'], 5000);

  reportQuestion(state, { id: 'q1', stem: 'Test stem?', sub: '1.1' }, 'incorrect', 6000);
  assert.equal(state.reported['q1'].reason, 'incorrect');
  assert.equal(state.reported['q1'].sub, '1.1');

  restoreQuestion(state, 'q1');
  assert.equal(state.reported['q1'], undefined);

  addAttempt(state, { t: 7000, total: 10, correct: 8 });
  addAttempt(state, { t: 8000, total: 0 }); // total 0 ignored
  assert.equal(state.history.length, 1);

  markSeen(state, 'q2', 6000);
  forgetSeen(state, id => id === 'q1');
  assert.equal(state.seen['q1'], undefined);
  assert.equal(state.seen['q2'], 6000);

  forgetSeen(state);
  assert.deepEqual(state.seen, {});
});

test('mergeStates combines seen max, overrides reported, and dedupes history', () => {
  const a = emptyState();
  a.seen = { q1: 1000, q2: 3000 };
  a.reported = { q1: { t: 1000, reason: 'incorrect', stem: 'A', sub: '1.1' } };
  a.history = [{ t: 1000, mode: 'practice', total: 10, correct: 8 }];
  a.genTopics = ['T1'];

  const b = emptyState();
  b.seen = { q1: 2000, q3: 4000 };
  b.reported = {
    q1: { t: 500, reason: 'other', stem: 'B', sub: '1.1' },
    q2: { t: 1500, reason: 'outdated', stem: 'B2', sub: '2.1' },
  };
  b.history = [
    { t: 1000, mode: 'practice', total: 10, correct: 8 }, // duplicate
    { t: 2000, mode: 'exam', total: 50, correct: 40 },
  ];
  b.genTopics = ['T2'];

  const merged = mergeStates(a, b);
  assert.equal(merged.seen.q1, 2000); // max
  assert.equal(merged.seen.q2, 3000);
  assert.equal(merged.seen.q3, 4000);

  // 'a' overrides 'b'
  assert.equal(merged.reported.q1.reason, 'incorrect');
  assert.equal(merged.reported.q2.reason, 'outdated');

  assert.equal(merged.history.length, 2);
  assert.deepEqual(merged.genTopics, ['T2', 'T1']);
});

test('localBackend survives missing or throwing storage', async () => {
  const throwingStorage = {
    getItem() { throw new Error('storage disabled'); },
    setItem() { throw new Error('storage disabled'); },
  };
  const b = localBackend(throwingStorage);
  const loaded = await b.load();
  assert.equal(loaded, null);
  await assert.doesNotReject(b.save({ test: 123 }));

  const nullBackend = localBackend(null);
  assert.equal(await nullBackend.load(), null);
  await assert.doesNotReject(nullBackend.save({ test: 123 }));
});

test('dbBackend uses path data/users/<uid>/pmle and retries once on unavailable', async () => {
  let attempts = 0;
  const mockDb = {
    doc(path) {
      assert.equal(path, 'data/users/user123/pmle');
      return {
        async get() {
          return { exists: true, data: () => ({ v: 1, mock: true }) };
        },
        async set(data) {
          attempts++;
          if (attempts === 1) {
            const err = new Error('Service Unavailable');
            err.code = 'unavailable';
            throw err;
          }
          return;
        }
      };
    }
  };

  const waitCalled = [];
  const backend = dbBackend(mockDb, 'user123', {
    wait: (ms) => { waitCalled.push(ms); return Promise.resolve(); }
  });

  const loaded = await backend.load();
  assert.equal(loaded.mock, true);

  await backend.save({ v: 1 });
  assert.equal(attempts, 2, 'Should retry once on unavailable');
  assert.equal(waitCalled.length, 1);
  assert.ok(waitCalled[0] >= 400 && waitCalled[0] <= 1200);
});

test('persister never overlaps writes and saves latest state', async () => {
  const writes = [];
  let inFlight = false;

  const slowBackend = {
    async save(state) {
      assert.equal(inFlight, false, 'No overlapping saves permitted');
      inFlight = true;
      writes.push(state.seq);
      await new Promise(r => setTimeout(r, 20));
      inFlight = false;
    }
  };

  const persister = createPersister(slowBackend);
  persister.save({ seq: 1 });
  persister.save({ seq: 2 });
  persister.save({ seq: 3 });

  await persister.idle();
  assert.deepEqual(writes, [1, 3], 'Intermediate state 2 should be skipped for latest state 3');
});

test('multiBackend propagates error to persister onError', async () => {
  let errorCaught = null;
  const bGood = { async save() {} };
  const bBad = { async save() { throw new Error('MultiBackend failed'); } };

  const mb = multiBackend([bGood, bBad]);
  const persister = createPersister(mb, {
    onError: (err) => { errorCaught = err; }
  });

  persister.save({ test: 1 });
  await persister.idle();
  assert.ok(errorCaught);
  assert.equal(errorCaught.message, 'MultiBackend failed');
});

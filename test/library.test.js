import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chunkList,
  addToLibrary,
  sanitizeLibrary,
  localLibraryStore,
  dbLibraryStore,
  LIB_CHUNK,
  LIB_MAX,
} from '../src/js/library.js';
import { PMLE } from '../src/js/exams.js';
import { makeValidQuestion } from './helpers/fixtures.js';

test('chunkList splits arrays into specified chunk size', () => {
  const arr = [1, 2, 3, 4, 5, 6, 7];
  assert.deepEqual(chunkList(arr, 3), [[1, 2, 3], [4, 5, 6], [7]]);
  assert.deepEqual(chunkList([], 5), []);
});

test('addToLibrary dedupes by id, filters unverified, and caps at 180', () => {
  const lib = [];
  for (let i = 0; i < 170; i++) {
    lib.push({ id: `q-${i}`, verified: true });
  }

  const newQuestions = [
    { id: 'q-0', verified: true }, // duplicate
    { id: 'q-unverified', verified: false }, // not verified
    { id: 'q-170', verified: true },
    { id: 'q-171', verified: true },
    { id: 'q-172', verified: true },
    { id: 'q-173', verified: true },
    { id: 'q-174', verified: true },
    { id: 'q-175', verified: true },
    { id: 'q-176', verified: true },
    { id: 'q-177', verified: true },
    { id: 'q-178', verified: true },
    { id: 'q-179', verified: true },
    { id: 'q-180', verified: true },
    { id: 'q-181', verified: true },
    { id: 'q-182', verified: true },
  ];

  const updated = addToLibrary(lib, newQuestions);
  assert.equal(updated.length, LIB_MAX);
  assert.ok(!updated.some(q => q.id === 'q-unverified'));
  assert.ok(updated.some(q => q.id === 'q-182'));
});

test('sanitizeLibrary keeps only valid verified questions up to 180', () => {
  const validQ = makeValidQuestion({ id: 'g-valid', verified: true });
  const unverifiedQ = makeValidQuestion({ id: 'g-unverified', verified: false });
  const invalidQ = { id: 'g-bad', verified: true, stem: 'too short?' };

  const res = sanitizeLibrary([validQ, unverifiedQ, invalidQ, 'junk'], PMLE);
  assert.equal(res.length, 1);
  assert.ok(res[0].id.startsWith('g-'));
  assert.equal(res[0].verified, true);
});

test('localLibraryStore round-trips questions and handles storage errors', async () => {
  const mem = {};
  const mockStorage = {
    getItem(k) { return mem[k] || null; },
    setItem(k, v) { mem[k] = v; },
  };

  const store = localLibraryStore(mockStorage);
  const questions = [{ id: 'q1', verified: true }];

  await store.save('pmle', questions);
  const loaded = await store.load('pmle');
  assert.deepEqual(loaded, questions);

  const errorStore = localLibraryStore({
    getItem() { throw new Error('fail'); },
    setItem() { throw new Error('fail'); },
  });
  assert.deepEqual(await errorStore.load('pmle'), []);
  await assert.doesNotReject(errorStore.save('pmle', []));
});

test('dbLibraryStore writes fixed chunk docs under 256 KiB', async () => {
  const docs = new Map();
  const mockDb = {
    doc(path) {
      return {
        async get() {
          const data = docs.get(path);
          return { exists: data !== undefined, data: () => data };
        },
        async set(data) {
          docs.set(path, data);
        }
      };
    }
  };

  const store = dbLibraryStore(mockDb, 'user1');
  const questions = [];
  for (let i = 0; i < 150; i++) {
    questions.push(makeValidQuestion({ id: `g-lib-${i}`, verified: true }));
  }

  await store.save('pmle', questions);
  assert.equal(docs.has('data/users/user1/lib-pmle-0'), true);
  assert.equal(docs.has('data/users/user1/lib-pmle-1'), true);

  const chunk0 = docs.get('data/users/user1/lib-pmle-0');
  assert.equal(chunk0.items.length, LIB_CHUNK);
  const size0KiB = Buffer.byteLength(JSON.stringify(chunk0), 'utf8') / 1024;
  assert.ok(size0KiB < 256, `Chunk 0 size ${size0KiB} KiB must be under 256 KiB`);

  const chunk1 = docs.get('data/users/user1/lib-pmle-1');
  assert.equal(chunk1.items.length, 150 - LIB_CHUNK);

  const loaded = await store.load('pmle');
  assert.equal(loaded.length, 150);
});

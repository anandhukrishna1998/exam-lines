import { validateQuestion } from './validate.js';
import { coerceGenerated } from './generate.js';

export const LIB_CHUNK = 90;
export const LIB_MAX = 180;

export function chunkList(list, size) {
  const chunks = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
}

export function addToLibrary(library = [], questions = []) {
  const existingIds = new Set(library.map(q => q.id));
  const next = library.slice();

  for (const q of questions) {
    if (q && q.verified && !existingIds.has(q.id)) {
      next.push(q);
      existingIds.add(q.id);
    }
  }

  return next.slice(-LIB_MAX);
}

export function sanitizeLibrary(raw, exam) {
  if (!Array.isArray(raw)) return [];
  const clean = [];
  const seenIds = new Set();

  for (const item of raw) {
    if (!item || item.verified !== true) continue;
    const coerced = coerceGenerated(item, exam);
    if (!coerced) continue;
    const v = validateQuestion(coerced, exam);
    if (v.ok && !seenIds.has(coerced.id)) {
      seenIds.add(coerced.id);
      clean.push({ ...coerced, verified: true });
    }
  }

  return clean.slice(-LIB_MAX);
}

export function localLibraryStore(storage) {
  return {
    async load(examId) {
      try {
        if (!storage) return [];
        const raw = storage.getItem(`pmle.library.${examId}.v1`);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    },
    async save(examId, questions) {
      try {
        if (!storage) return;
        storage.setItem(`pmle.library.${examId}.v1`, JSON.stringify(questions || []));
      } catch {}
    },
  };
}

export function dbLibraryStore(db, uid) {
  return {
    async load(examId) {
      try {
        const results = [];
        for (let i = 0; i < 2; i++) {
          const path = `data/users/${uid}/lib-${examId}-${i}`;
          const snap = await db.doc(path).get();
          if (snap && snap.exists) {
            const data = snap.data();
            if (data && Array.isArray(data.items)) {
              results.push(...data.items);
            }
          }
        }
        return results;
      } catch {
        return [];
      }
    },
    async save(examId, questions) {
      const list = (questions || []).slice(0, LIB_MAX);
      const chunks = chunkList(list, LIB_CHUNK);
      for (let i = 0; i < 2; i++) {
        const path = `data/users/${uid}/lib-${examId}-${i}`;
        const items = chunks[i] || [];
        await db.doc(path).set({ v: 1, items });
      }
    },
  };
}

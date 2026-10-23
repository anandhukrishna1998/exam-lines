import { stableStringify } from './util.js';

export const MAX_SEEN = 800;
export const MAX_HISTORY = 150;
export const MAX_REPORTED = 200;
export const MAX_TOPICS = 60;
export const SEEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const REPORT_REASONS = [
  { id: 'incorrect', label: 'The marked answer is wrong' },
  { id: 'ambiguous', label: 'More than one answer is defensible' },
  { id: 'outdated', label: 'Outdated product name or feature' },
  { id: 'other', label: 'Something else' },
];

const VALID_REASON_IDS = new Set(REPORT_REASONS.map(r => r.id));

export function emptyState() {
  return {
    v: 1,
    seen: {},
    reported: {},
    history: [],
    genTopics: [],
  };
}

export function sanitizeState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyState();
  }

  const seen = {};
  if (raw.seen && typeof raw.seen === 'object') {
    for (const [k, v] of Object.entries(raw.seen)) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        seen[k] = v;
      }
    }
  }

  const reported = {};
  if (raw.reported && typeof raw.reported === 'object') {
    for (const [k, v] of Object.entries(raw.reported)) {
      if (v && typeof v === 'object') {
        const reason = VALID_REASON_IDS.has(v.reason) ? v.reason : 'other';
        reported[k] = {
          t: typeof v.t === 'number' && Number.isFinite(v.t) ? v.t : 0,
          reason,
          stem: String(v.stem || '').slice(0, 160),
          sub: String(v.sub || ''),
        };
      }
    }
  }

  const history = [];
  if (Array.isArray(raw.history)) {
    for (const h of raw.history) {
      if (h && typeof h === 'object' && typeof h.t === 'number' && typeof h.total === 'number' && typeof h.correct === 'number') {
        history.push(h);
      }
    }
  }

  const genTopics = [];
  if (Array.isArray(raw.genTopics)) {
    for (const t of raw.genTopics) {
      if (typeof t === 'string' && t.trim()) {
        genTopics.push(t.trim().slice(0, 80));
      }
    }
  }

  return {
    v: 1,
    seen,
    reported,
    history: history.slice(-MAX_HISTORY),
    genTopics: genTopics.slice(-MAX_TOPICS),
  };
}

export function pruneState(state, now = Date.now()) {
  // Expire seen entries older than 30 days
  const validSeen = {};
  for (const [id, t] of Object.entries(state.seen)) {
    if (now - t <= SEEN_TTL_MS) {
      validSeen[id] = t;
    }
  }

  // Cap seen
  const seenEntries = Object.entries(validSeen);
  if (seenEntries.length > MAX_SEEN) {
    seenEntries.sort((a, b) => b[1] - a[1]);
    state.seen = Object.fromEntries(seenEntries.slice(0, MAX_SEEN));
  } else {
    state.seen = validSeen;
  }

  // Cap reported (keep newest by t)
  const repEntries = Object.entries(state.reported);
  if (repEntries.length > MAX_REPORTED) {
    repEntries.sort((a, b) => (b[1].t || 0) - (a[1].t || 0));
    state.reported = Object.fromEntries(repEntries.slice(0, MAX_REPORTED));
  }

  // Cap history
  if (state.history.length > MAX_HISTORY) {
    state.history = state.history.slice(-MAX_HISTORY);
  }

  // Cap genTopics
  if (state.genTopics.length > MAX_TOPICS) {
    state.genTopics = state.genTopics.slice(-MAX_TOPICS);
  }

  return state;
}

export function markSeen(state, id, now = Date.now()) {
  state.seen[id] = now;
}

export function reportQuestion(state, q, reason, now = Date.now()) {
  const r = VALID_REASON_IDS.has(reason) ? reason : 'other';
  state.reported[q.id] = {
    t: now,
    reason: r,
    stem: String(q.stem || '').slice(0, 160),
    sub: String(q.sub || ''),
  };
}

export function restoreQuestion(state, id) {
  delete state.reported[id];
}

export function addAttempt(state, attempt) {
  if (!attempt || !attempt.total || attempt.total <= 0) return;
  state.history.push(attempt);
}

export function forgetSeen(state, predicate) {
  if (typeof predicate === 'function') {
    for (const id of Object.keys(state.seen)) {
      if (predicate(id)) {
        delete state.seen[id];
      }
    }
  } else {
    state.seen = {};
  }
}

export function mergeStates(a, b) {
  const seen = {};
  const allSeenKeys = new Set([...Object.keys(a.seen || {}), ...Object.keys(b.seen || {})]);
  for (const k of allSeenKeys) {
    seen[k] = Math.max(a.seen?.[k] || 0, b.seen?.[k] || 0);
  }

  const reported = { ...(b.reported || {}), ...(a.reported || {}) };

  const historyMap = new Map();
  const allHistory = [...(b.history || []), ...(a.history || [])];
  for (const h of allHistory) {
    const key = `${h.t}|${h.mode}|${h.total}|${h.correct}`;
    historyMap.set(key, h);
  }
  const history = Array.from(historyMap.values());
  history.sort((x, y) => x.t - y.t);

  const topicSet = new Set([...(b.genTopics || []), ...(a.genTopics || [])]);
  const genTopics = Array.from(topicSet).slice(-MAX_TOPICS);

  return {
    v: 1,
    seen,
    reported,
    history: history.slice(-MAX_HISTORY),
    genTopics,
  };
}

export function statesEqual(a, b) {
  return stableStringify(a) === stableStringify(b);
}

export function localBackend(storage, key = 'pmle.state.v1') {
  return {
    kind: 'local',
    async load() {
      try {
        if (!storage) return null;
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    async save(state) {
      try {
        if (!storage) return;
        storage.setItem(key, JSON.stringify(state));
      } catch {}
    },
  };
}

export function dbBackend(db, uid, { wait = (ms) => new Promise(r => setTimeout(r, ms)) } = {}) {
  const path = `data/users/${uid}/pmle`;
  return {
    kind: 'db',
    async load() {
      const snap = await db.doc(path).get();
      return snap && snap.exists ? snap.data() : null;
    },
    async save(data) {
      try {
        await db.doc(path).set(data);
      } catch (err) {
        if (err && err.code === 'unavailable') {
          await wait(400 + Math.random() * 800);
          await db.doc(path).set(data);
        } else {
          throw err;
        }
      }
    },
  };
}

export function multiBackend(backends = []) {
  return {
    kind: 'multi',
    async load() {
      if (backends.length > 0 && typeof backends[0].load === 'function') {
        return backends[0].load();
      }
      return null;
    },
    async save(data) {
      await Promise.all(backends.map(b => b.save(data)));
    },
  };
}

export function createPersister(backend, { onError } = {}) {
  let inFlight = null;
  let nextState = null;
  let idlePromise = Promise.resolve();
  let idleResolve = null;

  async function flush() {
    while (nextState !== null) {
      const toSave = nextState;
      nextState = null;
      try {
        inFlight = backend.save(toSave);
        await inFlight;
      } catch (err) {
        if (typeof onError === 'function') {
          onError(err);
        }
      } finally {
        inFlight = null;
      }
    }
    if (idleResolve) {
      const res = idleResolve;
      idleResolve = null;
      res();
    }
  }

  return {
    save(state) {
      nextState = JSON.parse(JSON.stringify(state));
      if (!inFlight) {
        if (!idleResolve) {
          idlePromise = new Promise(resolve => { idleResolve = resolve; });
        }
        flush();
      }
    },
    idle() {
      if (!inFlight && nextState === null) {
        return Promise.resolve();
      }
      return idlePromise;
    },
  };
}

import { EXAMS, examById, examOfQuestionId } from './js/exams.js';
import { validateQuestion } from './js/validate.js';
import { pickQuestions, shuffleOptions } from './js/select.js';
import {
  createSession,
  selectOption,
  toggleFlag,
  moveTo,
  moveNext,
  movePrev,
  remainingSec,
  answeredCount,
  flaggedCount,
  finalizeSession,
  summarizeAttempt,
} from './js/session.js';
import {
  emptyState,
  sanitizeState,
  pruneState,
  markSeen,
  reportQuestion,
  restoreQuestion,
  addAttempt,
  forgetSeen,
  localBackend,
  createPersister,
} from './js/store.js';
import { localLibraryStore } from './js/library.js';
import { createAiSample, PROVIDERS } from './js/providers.js';
import {
  makeSlot,
  connectRuntime,
  runGeneration,
  ensureGeneration,
  loadLibraries,
} from './runtime.js';
import { BANK } from './bank/index.js';
import { AWS_BANK } from './bank/aws/index.js';
import { fmtClock } from './ui/dom.js';
import { keyAction } from './ui/keys.js';
import { runtimeRefresh } from './ui/viewmodels.js';
import { refreshChips } from './ui/chrome.js';
import { sourcePanel, renderHome } from './ui/home.js';
import { renderQuiz } from './ui/quiz.js';
import { renderResults } from './ui/results.js';
import { renderHistory } from './ui/history.js';
import { overlayLayer } from './ui/overlay.js';

export function safeLocalStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.getItem('__test__');
      return window.localStorage;
    }
  } catch {}
  return null;
}

export function verifiedBank(bank = [], exam) {
  const verified = [];
  for (const q of bank) {
    const v = validateQuestion(q, exam);
    if (v.ok) {
      verified.push(q);
    } else {
      console.warn(`Skipping invalid question in bank: ${q.id}`, v.errors);
    }
  }
  return verified;
}

const PREF_DEFAULTS = {
  exam: 'pmle',
  practiceCount: 20,
  drillSection: 3,
  drillCount: 10,
};

function loadPrefs(ls) {
  if (!ls) return { ...PREF_DEFAULTS };
  try {
    const raw = ls.getItem('pmle.prefs.v1');
    if (!raw) return { ...PREF_DEFAULTS };
    const saved = JSON.parse(raw);
    return {
      exam: ['pmle', 'saa'].includes(saved.exam) ? saved.exam : PREF_DEFAULTS.exam,
      practiceCount: [10, 20, 30].includes(saved.practiceCount) ? saved.practiceCount : PREF_DEFAULTS.practiceCount,
      drillSection: Number.isInteger(saved.drillSection) && saved.drillSection >= 1 && saved.drillSection <= 6 ? saved.drillSection : PREF_DEFAULTS.drillSection,
      drillCount: [5, 10, 15].includes(saved.drillCount) ? saved.drillCount : PREF_DEFAULTS.drillCount,
    };
  } catch {
    return { ...PREF_DEFAULTS };
  }
}

function loadAiConfig(ls) {
  if (!ls) return null;
  try {
    const raw = ls.getItem('pmle.ai.v1');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function createApp() {
  const ls = safeLocalStorage();
  const prefs = loadPrefs(ls);
  const aiConfig = loadAiConfig(ls);
  const localB = localBackend(ls, 'pmle.state.v1');

  const app = {
    view: 'home',
    examId: prefs.exam,
    slots: {
      pmle: makeSlot(verifiedBank(BANK, EXAMS.pmle)),
      saa: makeSlot(verifiedBank(AWS_BANK, EXAMS.saa)),
    },
    state: emptyState(),
    storage: 'local',
    persister: createPersister(localB),
    sample: null,
    session: null,
    result: null,
    reviewFilter: 'all',
    overlay: null,
    prefs,
    drawn: {},
    libraryStore: localLibraryStore(ls),
    aiConfig,
    builtInClaude: typeof window !== 'undefined' && !!window.claude,
  };

  let renderPending = false;
  let timerId = null;
  let lastQuizIndex = -1;

  const views = {
    home: renderHome,
    quiz: renderQuiz,
    results: renderResults,
    history: renderHistory,
  };

  function persist() {
    pruneState(app.state, Date.now());
    app.persister.save(app.state);
  }

  function render() {
    renderPending = false;
    const root = document.getElementById('app');
    if (!root) return;

    const renderer = views[app.view] || renderHome;
    renderer(root, app, actions);

    if (app.overlay) {
      const ovEl = overlayLayer(app, actions);
      if (ovEl) root.appendChild(ovEl);
      setTimeout(() => {
        const toFocus = root.querySelector('.overlay input:checked, .overlay button');
        if (toFocus) toFocus.focus();
      }, 0);
    } else if (app.view === 'quiz' && app.session && app.session.index !== lastQuizIndex) {
      lastQuizIndex = app.session.index;
      setTimeout(() => {
        const stem = document.getElementById('q-stem');
        if (stem) stem.focus({ preventScroll: true });
      }, 0);
    }
  }

  function scheduleRender() {
    if (renderPending) return;
    renderPending = true;
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(render);
    } else {
      setTimeout(render, 0);
    }
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function tick() {
    if (!app.session || app.session.mode !== 'exam') return;
    const rem = remainingSec(app.session, Date.now());
    const clockEl = document.getElementById('timer');
    if (clockEl) {
      clockEl.textContent = fmtClock(rem);
      if (rem !== null && rem <= 300) {
        clockEl.classList.add('low');
      } else {
        clockEl.classList.remove('low');
      }
    }
    if (rem !== null && rem <= 0) {
      endSession();
    }
  }

  function startSession(mode, questions, section) {
    if (!questions || questions.length === 0) {
      app.overlay = {
        title: 'No questions available',
        text: 'Every question for this choice has been reported. Restore some from History, or pick another line.',
      };
      scheduleRender();
      return;
    }

    const currentExam = examById(app.examId);
    app.session = createSession({
      mode,
      questions,
      section,
      exam: currentExam.id,
      durationSec: currentExam.examSeconds,
    });
    app.result = null;
    app.reviewFilter = 'all';
    app.overlay = null;
    app.view = 'quiz';
    lastQuizIndex = -1;

    stopTimer();
    if (mode === 'exam') {
      timerId = setInterval(tick, 1000);
    }

    scheduleRender();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function endSession() {
    stopTimer();
    if (!app.session) return;
    const currentExam = examById(app.session.exam);
    const result = finalizeSession(app.session, Date.now(), currentExam.sections);
    const summary = summarizeAttempt(app.session, result);
    addAttempt(app.state, summary);
    persist();

    app.result = result;
    app.view = 'results';
    scheduleRender();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function onRuntimeChange(kind, examId) {
    if (examId && examId !== app.examId && kind !== 'storage') return;
    const plan = runtimeRefresh(kind, app.view);
    if (plan === 'full') {
      scheduleRender();
    } else if (plan === 'pool-panel') {
      const panel = document.getElementById('source-panel');
      if (panel && panel.parentNode) {
        const next = sourcePanel(app);
        panel.parentNode.replaceChild(next, panel);
      }
      refreshChips(app, actions);
    } else {
      refreshChips(app, actions);
    }
  }

  const actions = {
    goHome() {
      if (app.view === 'quiz' && app.session && !app.session.finishedAt) {
        app.overlay = { type: 'confirm-leave' };
        scheduleRender();
        return;
      }
      app.view = 'home';
      scheduleRender();
      if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
    },

    showHistory() {
      if (app.view === 'quiz' && app.session && !app.session.finishedAt) {
        app.overlay = { type: 'confirm-leave' };
        scheduleRender();
        return;
      }
      app.view = 'history';
      scheduleRender();
      if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
    },

    leaveSession() {
      stopTimer();
      app.session = null;
      app.overlay = null;
      app.view = 'home';
      scheduleRender();
      if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
    },

    switchExam(id) {
      if (app.examId === id) return;
      actions.setPref('exam', id);
      app.examId = id;
      if (app.view === 'results') {
        app.view = 'home';
      }
      scheduleRender();
      ensureGeneration(app, id, onRuntimeChange);
    },

    startPractice() {
      const slot = app.slots[app.examId];
      const exam = examById(app.examId);
      const count = app.prefs.practiceCount || 20;
      const questions = pickQuestions(slot.pool, {
        count,
        seen: app.state.seen,
        reported: app.state.reported,
        sections: exam.sections,
      });
      startSession('practice', questions, null);
    },

    startExam() {
      const slot = app.slots[app.examId];
      const exam = examById(app.examId);
      const questions = pickQuestions(slot.pool, {
        count: exam.examQuestions,
        seen: app.state.seen,
        reported: app.state.reported,
        sections: exam.sections,
      });
      startSession('exam', questions, null);
    },

    startDrill(section) {
      actions.setPref('drillSection', section);
      const slot = app.slots[app.examId];
      const exam = examById(app.examId);
      const count = app.prefs.drillCount || 10;
      const questions = pickQuestions(slot.pool, {
        count,
        section,
        seen: app.state.seen,
        reported: app.state.reported,
        sections: exam.sections,
      });
      startSession('drill', questions, section);
    },

    retryWrong() {
      if (!app.result || !app.result.wrongQuestions || app.result.wrongQuestions.length === 0) return;
      const retryCandidates = app.result.wrongQuestions
        .filter(q => !app.state.reported[q.id])
        .map(q => shuffleOptions(q));
      startSession('retry', retryCandidates, null);
    },

    setPref(k, v) {
      app.prefs[k] = v;
      if (ls) {
        try { ls.setItem('pmle.prefs.v1', JSON.stringify(app.prefs)); } catch {}
      }
      scheduleRender();
    },

    choose(i) {
      if (!app.session) return;
      const cur = app.session.items[app.session.index];
      if (cur && cur.selected.length === 0) {
        markSeen(app.state, cur.q.id);
        persist();
      }
      selectOption(app.session, i);
      scheduleRender();
    },

    next() {
      if (app.session) {
        moveNext(app.session);
        scheduleRender();
      }
    },

    prev() {
      if (app.session) {
        movePrev(app.session);
        scheduleRender();
      }
    },

    goTo(i) {
      if (app.session) {
        moveTo(app.session, i);
        scheduleRender();
      }
    },

    flag() {
      if (app.session) {
        toggleFlag(app.session);
        scheduleRender();
      }
    },

    openReport(q) {
      app.overlay = { type: 'report', q, reason: 'incorrect' };
      scheduleRender();
    },

    submitReport(reason) {
      if (!app.overlay || !app.overlay.q) return;
      const q = app.overlay.q;
      reportQuestion(app.state, q, reason);
      if (app.session) {
        for (const item of app.session.items) {
          if (item.q.id === q.id) {
            item.reported = true;
          }
        }
      }
      persist();
      app.overlay = null;

      if (app.view === 'quiz' && app.session && app.session.index < app.session.items.length - 1) {
        moveNext(app.session);
      }
      scheduleRender();
    },

    closeOverlay() {
      app.overlay = null;
      scheduleRender();
    },

    requestFinish() {
      if (!app.session) return;
      if (app.session.mode === 'exam') {
        const u = app.session.items.length - answeredCount(app.session);
        const f = flaggedCount(app.session);
        app.overlay = { type: 'confirm-finish', unanswered: u, flagged: f };
        scheduleRender();
      } else {
        endSession();
      }
    },

    confirmFinish() {
      app.overlay = null;
      endSession();
    },

    setReviewFilter(f) {
      app.reviewFilter = f;
      scheduleRender();
    },

    restoreReported(id) {
      restoreQuestion(app.state, id);
      persist();
      scheduleRender();
    },

    clearSeenQuestions() {
      forgetSeen(app.state, id => examOfQuestionId(id) === app.examId);
      persist();
      scheduleRender();
    },

    generateMore() {
      runGeneration(app, {
        examId: app.examId,
        total: 12,
        onChange: onRuntimeChange,
      });
    },

    stopGeneration() {
      const slot = app.slots[app.examId];
      if (slot && slot.genCtl) {
        slot.genCtl.abort();
      }
    },

    openAiSettings() {
      app.overlay = { type: 'ai-settings' };
      scheduleRender();
    },

    saveAiSettings(cfg) {
      if (app.builtInClaude) return;
      for (const slot of Object.values(app.slots)) {
        if (slot.genCtl) slot.genCtl.abort();
      }

      if (cfg && cfg.key) {
        if (ls) {
          try { ls.setItem('pmle.ai.v1', JSON.stringify(cfg)); } catch {}
        }
        app.aiConfig = cfg;
        app.sample = createAiSample(cfg);
        for (const slot of Object.values(app.slots)) {
          slot.gen.status = 'idle';
          slot.gen.note = '';
        }
        app.overlay = null;
        scheduleRender();
        ensureGeneration(app, app.examId, onRuntimeChange);
      } else {
        if (ls) {
          try { ls.removeItem('pmle.ai.v1'); } catch {}
        }
        app.aiConfig = null;
        app.sample = null;
        for (const slot of Object.values(app.slots)) {
          slot.gen.status = 'offline';
          slot.gen.note = '';
        }
        app.overlay = null;
        scheduleRender();
      }
    },

    toggleTheme() {
      if (typeof document === 'undefined') return false;
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      let next = 'dark';
      if (current === 'dark') {
        next = 'light';
      } else if (current === 'light') {
        next = 'dark';
      } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        next = prefersDark ? 'light' : 'dark';
      }
      html.setAttribute('data-theme', next);
      if (ls) {
        try { ls.setItem('pmle.theme.v1', next); } catch {}
      }
      return next === 'dark';
    },
  };

  // Keyboard handler
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      const act = keyAction(e, { view: app.view, overlay: app.overlay });
      if (act) {
        e.preventDefault();
        if (act.type === 'close') actions.closeOverlay();
        else if (act.type === 'choose') actions.choose(act.index);
        else if (act.type === 'next') {
          if (app.session && app.session.index < app.session.items.length - 1) {
            actions.next();
          }
        } else if (act.type === 'prev') actions.prev();
        else if (act.type === 'flag') actions.flag();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && app.session && app.session.mode === 'exam') {
        tick();
      }
    });
  }

  function registerPwa() {
    if (app.builtInClaude || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return;

    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = 'manifest.json';
      document.head.appendChild(link);
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  async function boot() {
    registerPwa();

    // Theme initialization
    if (typeof document !== 'undefined' && ls) {
      try {
        const savedTheme = ls.getItem('pmle.theme.v1');
        if (savedTheme) {
          document.documentElement.setAttribute('data-theme', savedTheme);
        }
      } catch {}
    }

    render();

    // Load state
    const loadedState = await localB.load();
    if (loadedState) {
      app.state = sanitizeState(loadedState);
      if (app.view === 'home') render();
    }

    const claudeObj = typeof window !== 'undefined' ? window.claude : null;
    if (!claudeObj) {
      await loadLibraries(app, onRuntimeChange);
    } else {
      for (const slot of Object.values(app.slots)) {
        slot.gen.status = 'connecting';
      }
      refreshChips(app, actions);
    }

    await connectRuntime(app, {
      claudeObj,
      localB,
      onChange: onRuntimeChange,
      aiConfig: app.aiConfig,
    });
  }

  return { app, actions, render, scheduleRender, boot };
}

// Auto-boot in browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const { boot } = createApp();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}

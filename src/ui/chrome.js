import { h, svgEl } from './dom.js';
import { writerName } from '../runtime.js';

export const DISCLAIMER = 'Practice questions are original and aligned to the official exam guide; they are not actual exam questions.';

export const MODE_NAMES = {
  practice: 'Practice',
  exam: 'Exam simulation',
  drill: 'Line drill',
  retry: 'Retry wrong answers',
};

export const STORE_LABELS = {
  db: 'Progress synced to your account',
  local: 'Progress saved in this browser',
  'local-fallback': 'Sync failed, saved in this browser',
};

export function themeSwitch(actions) {
  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';

  const sun = svgEl('svg', { viewBox: '0 0 24 24', width: '16', height: '16', class: 'icon-sun' },
    svgEl('circle', { cx: '12', cy: '12', r: '4', fill: 'currentColor' }),
    svgEl('path', { d: 'M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5.6 5.6l1.4 1.4 M17 17l1.4 1.4 M5.6 18.4L7 17 M17 7l1.4-1.4', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' })
  );

  const moon = svgEl('svg', { viewBox: '0 0 24 24', width: '16', height: '16', class: 'icon-moon' },
    svgEl('path', { d: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z', fill: 'currentColor' })
  );

  const btn = h('button', {
    class: 'theme-switch',
    role: 'switch',
    'aria-checked': isDark ? 'true' : 'false',
    'aria-label': 'Dark mode',
    title: 'Switch to light/dark mode',
    onclick: (e) => {
      e.preventDefault();
      if (actions && typeof actions.toggleTheme === 'function') {
        const nowDark = actions.toggleTheme();
        btn.setAttribute('aria-checked', nowDark ? 'true' : 'false');
      }
    }
  },
    sun,
    h('span', { class: 'track' }, h('span', { class: 'knob' })),
    moon
  );

  return btn;
}

export function brandMark() {
  return svgEl('svg', { viewBox: '0 0 38 22', width: '38', height: '22', class: 'brand-mark' },
    svgEl('path', { d: 'M3 11 H35', stroke: 'var(--l1)', 'stroke-width': '6', 'stroke-linecap': 'round' }),
    svgEl('path', { d: 'M19 3 V19', stroke: 'var(--l2)', 'stroke-width': '6', 'stroke-linecap': 'round' }),
    svgEl('circle', { cx: '19', cy: '11', r: '6', fill: 'var(--panel)', stroke: 'var(--ink)', 'stroke-width': '3' })
  );
}

export function genChip(app, actions) {
  const slot = app.slots && app.slots[app.examId];
  const gen = slot ? slot.gen : { status: 'offline', ready: 0, target: 0, note: '' };
  const who = writerName(app);

  let dotClass = 'off';
  let label = 'Checked bank only';
  let button = null;

  if (gen.status === 'offline') {
    dotClass = 'off';
    label = 'Checked bank only';
    if (!app.builtInClaude) {
      button = h('button', { class: 'btn-chip', onclick: () => actions.openAiSettings() }, 'Connect AI');
    }
  } else if (gen.status === 'connecting') {
    dotClass = 'busy';
    label = 'Connecting to AI';
  } else if (gen.status === 'idle') {
    dotClass = 'busy';
    label = 'Preparing fresh questions';
  } else if (gen.status === 'running') {
    dotClass = 'busy';
    if (gen.phase === 'checking') {
      label = `Double-checking new questions: ${gen.ready} confirmed`;
    } else {
      label = `Writing new questions: ${gen.ready} of ${gen.target} confirmed`;
    }
    button = h('button', { class: 'btn-chip', onclick: () => actions.stopGeneration() }, 'Stop');
  } else if (gen.status === 'done') {
    dotClass = gen.ready > 0 ? 'live' : 'off';
    label = gen.ready > 0 ? `${gen.ready} double-checked questions this visit` : 'Checked bank only';
    button = h('button', { class: 'btn-chip', onclick: () => actions.generateMore() }, 'Write more');
  } else if (gen.status === 'unavailable') {
    dotClass = 'off';
    label = 'Checked bank only';
    if (!app.builtInClaude) {
      button = h('button', { class: 'btn-chip', onclick: () => actions.openAiSettings() }, 'AI Settings');
    }
  } else if (gen.status === 'error') {
    dotClass = gen.ready > 0 ? 'live' : 'off';
    label = gen.ready > 0 ? `${gen.ready} double-checked questions this visit` : 'Checked bank only';
    button = h('button', { class: 'btn-chip', onclick: () => actions.generateMore() }, 'Try again');
  }

  const dot = h('span', { class: `dot ${dotClass}` });
  const text = h('span', { class: 'chip-text' }, label);

  return h('span', { id: 'gen-chip', class: 'chip', role: 'status', title: gen.note || label },
    dot,
    text,
    button ? h('span', { class: 'chip-action' }, button) : null
  );
}

export function storeChip(app) {
  const st = app.storage || 'local';
  const label = STORE_LABELS[st] || STORE_LABELS.local;
  const isDb = st === 'db';
  const dot = h('span', { class: `dot ${isDb ? 'live' : 'off'}` });
  return h('span', { id: 'store-chip', class: 'chip', title: label },
    dot,
    h('span', { class: 'chip-text' }, label)
  );
}

export function refreshChips(app, actions) {
  const genEl = document.getElementById('gen-chip');
  if (genEl && genEl.parentNode) {
    const nextGen = genChip(app, actions);
    genEl.parentNode.replaceChild(nextGen, genEl);
  }

  const storeEl = document.getElementById('store-chip');
  if (storeEl && storeEl.parentNode) {
    const nextStore = storeChip(app);
    storeEl.parentNode.replaceChild(nextStore, storeEl);
  }
}

export function appHeader(app, actions) {
  const brand = h('button', { class: 'brand-btn', onclick: () => actions.goHome() },
    brandMark(),
    h('span', { class: 'brand-title' }, 'Exam Lines')
  );

  const isRide = app.view === 'quiz';
  const netSwitch = isRide ? null : h('div', { class: 'net-switch', role: 'group', 'aria-label': 'Choose an exam' },
    h('button', {
      class: `btn-net ${app.examId === 'pmle' ? 'active' : ''}`,
      'aria-pressed': app.examId === 'pmle' ? 'true' : 'false',
      onclick: () => actions.switchExam('pmle')
    },
      h('span', { class: 'net-vendor' }, 'Google Cloud'),
      h('span', { class: 'net-name' }, 'ML Engineer')
    ),
    h('button', {
      class: `btn-net ${app.examId === 'saa' ? 'active' : ''}`,
      'aria-pressed': app.examId === 'saa' ? 'true' : 'false',
      onclick: () => actions.switchExam('saa')
    },
      h('span', { class: 'net-vendor' }, 'AWS'),
      h('span', { class: 'net-name' }, 'Solutions Architect')
    )
  );

  const statusWrap = h('div', { class: 'status' },
    genChip(app, actions),
    storeChip(app)
  );

  const aiBtn = !app.builtInClaude
    ? h('button', { class: 'btn quiet', 'aria-label': 'AI question settings', onclick: () => actions.openAiSettings() }, 'AI Settings')
    : null;

  const historyBtn = h('button', {
    class: `btn quiet ${app.view === 'history' ? 'active' : ''}`,
    'aria-current': app.view === 'history' ? 'page' : 'false',
    onclick: () => actions.showHistory()
  }, 'History');

  const nav = h('nav', { class: 'topnav' },
    aiBtn,
    historyBtn,
    themeSwitch(actions)
  );

  return h('header', { class: 'topbar' },
    h('div', { class: 'topbar-left' }, brand, netSwitch),
    h('div', { class: 'topbar-right' }, statusWrap, nav)
  );
}

export function disclaimer() {
  return h('footer', { class: 'note' }, DISCLAIMER);
}

export function barList(bars = [], sectionWord = 'Section') {
  const items = bars.map(b => {
    const valText = b.pct !== null ? `${b.pct}%` : 'not ridden';
    const fillWidth = b.pct !== null ? `${b.pct}%` : '0%';
    const subText = b.total > 0 ? `${b.correct} of ${b.total} correct` : '0 questions';

    return h('div', { class: `bar l${b.id}` },
      h('div', { class: 'bar-header' },
        h('span', { class: 'num' }, String(b.id)),
        h('span', { class: 'label' }, `${sectionWord} ${b.id}: ${b.title}`),
        h('span', { class: 'val' }, valText)
      ),
      h('div', { class: 'track', role: 'img', 'aria-label': `${b.title}: ${valText}` },
        h('span', { class: 'fill', style: `width: ${fillWidth}` })
      ),
      h('div', { class: 'sub' }, subText)
    );
  });

  return h('div', { class: 'bars' }, items);
}

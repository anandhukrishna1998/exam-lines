import { h, mount } from './dom.js';
import { appHeader, disclaimer, barList, MODE_NAMES } from './chrome.js';
import { systemMap, mapLegend } from './map.js';
import { masteryBySub } from './viewmodels.js';
import { examById } from '../js/exams.js';
import { writerName } from '../runtime.js';
import { aggregateHistory } from '../js/scoring.js';

export function sourcePanel(app) {
  const slot = app.slots[app.examId];
  const exam = examById(app.examId);
  const who = writerName(app);
  const gen = slot ? slot.gen : { status: 'offline', ready: 0, target: 0, dropped: 0, note: '' };

  let introText = '';
  if (gen.status === 'running' && gen.phase === 'checking') {
    introText = `A second ${who} call is double-checking the new batch with the answers hidden: ${gen.ready} confirmed so far.`;
  } else if (gen.status === 'running') {
    introText = `${who} is writing a fresh batch for this visit right now: ${gen.ready} of ${gen.target} confirmed so far.`;
  } else if (gen.status === 'idle' || gen.status === 'connecting') {
    introText = `${who} is about to write a fresh batch for this visit.`;
  } else if (gen.ready > 0) {
    const droppedText = gen.dropped > 0 ? `, and set aside ${gen.dropped} that did not pass the check` : '';
    introText = `${who} wrote and double-checked ${gen.ready} new questions for this visit${droppedText}.`;
  } else if (gen.status === 'offline') {
    introText = 'Fresh questions need claude.ai or your own AI key in AI Settings, so this copy uses the checked bank only.';
  } else if (gen.note) {
    introText = gen.note;
  } else {
    introText = 'Fresh questions are not available right now, so sessions use the checked bank.';
  }

  const how = !app.builtInClaude
    ? 'with the API key you connected in AI Settings'
    : 'through its built-in Claude access, on your own account at the default model tier';

  const libCount = slot ? slot.library.length : 0;
  const bankCount = slot ? slot.bank.length : 0;
  const poolCount = slot ? slot.pool.length : 0;

  const now = Date.now();
  const seenCount = Object.keys(app.state.seen || {}).length;
  const reportedCount = Object.keys(app.state.reported || {}).length;

  const factsList = h('ol', { class: 'facts-list' },
    h('li', { class: 'fact-item l2' },
      h('strong', {}, `Written fresh by ${who}. `),
      `When you open an exam, the page asks ${who} for new scenario questions ${how}. Every request is new, never cached, and lists your recent topics so they are not repeated.`
    ),
    h('li', { class: 'fact-item l5' },
      h('strong', {}, 'Double-checked before use. '),
      `A second ${who} call answers each new question with the answer key hidden. A question joins the pool only if that answer matches and no factual doubt is raised; the rest are set aside.`
    ),
    h('li', { class: 'fact-item l6' },
      h('strong', {}, `${libCount} saved in your library. `),
      'Double-checked questions are kept for future visits, up to 180 per exam, so your pool keeps growing.'
    ),
    h('li', { class: 'fact-item l3' },
      h('strong', {}, `Backed by ${bankCount} checked questions. `),
      `A hand-written bank reviewed against the ${exam.guide} fills any gap and works offline.`
    ),
    h('li', { class: 'fact-item l4' },
      h('strong', {}, 'Shuffled every ride. '),
      'Unseen questions come first, then the ones you saw longest ago, and answer order changes each time.'
    )
  );

  const warnEl = gen.note && gen.ready > 0 ? h('p', { class: 'warn' }, gen.note) : null;

  return h('section', { id: 'source-panel', class: 'panel source-panel', 'aria-live': 'polite' },
    h('h2', {}, 'Where today’s questions come from'),
    h('p', { class: 'lead' }, introText),
    factsList,
    h('p', { class: 'pool-stats' },
      `${poolCount} questions in the pool, ${seenCount} seen in the last 30 days, ${reportedCount} reported and skipped.`
    ),
    warnEl
  );
}

export function renderHome(root, app, actions) {
  const exam = examById(app.examId);
  const word = exam.sectionWord || 'Section';
  const mins = Math.round(exam.examSeconds / 60);

  // Masthead
  const masthead = h('div', { class: 'masthead' },
    h('h1', {}, exam.name),
    h('p', { class: 'lead' },
      `Pick a line on the map to drill it, or buy a ticket below. Every line is one ${word} of the ${exam.code} exam, and every station is one of its objectives.`
    ),
    h('p', { class: 'facts' },
      h('strong', {}, `${exam.examQuestions}`), ' questions · ',
      h('strong', {}, `${mins}`), ' minutes · ',
      h('strong', {}, `${exam.sections.length}`), ` ${word.toLowerCase()}s weighted like the ${exam.guide}`
    )
  );

  // Map
  const mastery = masteryBySub(app.state.history, app.examId);
  const shouldDraw = !app.drawn[exam.id];
  app.drawn[exam.id] = true;

  const mapSection = h('section', { class: 'map-section' },
    systemMap(exam, {
      mastery,
      onLine: (id) => actions.startDrill(id),
      draw: shouldDraw,
      label: true,
    }),
    mapLegend()
  );

  // Tickets
  const practiceCount = app.prefs.practiceCount || 20;
  const drillSection = app.prefs.drillSection || 1;
  const drillCount = app.prefs.drillCount || 10;

  const ticketPractice = h('article', { class: 'ticket' },
    h('div', { class: 'ticket-body' },
      h('h3', {}, 'Practice'),
      h('p', {}, 'See the answer and the reasoning for every option as soon as you choose.'),
      h('div', { class: 'ticket-controls' },
        h('label', {},
          'Questions: ',
          h('select', {
            onchange: (e) => actions.setPref('practiceCount', Number(e.target.value))
          },
            [10, 20, 30].map(n => h('option', { value: String(n), selected: n === practiceCount }, String(n)))
          )
        ),
        h('button', { id: 'start-practice', class: 'btn go', onclick: () => actions.startPractice() }, 'Start practice')
      )
    ),
    h('div', { class: 'stub' },
      h('span', { class: 'stub-num' }, String(practiceCount)),
      h('span', { class: 'stub-label' }, 'stops')
    )
  );

  const ticketExam = h('article', { class: 'ticket' },
    h('div', { class: 'ticket-body' },
      h('h3', {}, 'Exam express'),
      h('p', {}, 'Timed and weighted like the real exam, with no feedback until you submit. Flag stops and jump along the route, then review everything.'),
      h('div', { class: 'ticket-controls' },
        h('button', { class: 'btn go', onclick: () => actions.startExam() }, 'Start exam')
      )
    ),
    h('div', { class: 'stub' },
      h('span', { class: 'stub-num' }, String(exam.examQuestions)),
      h('span', { class: 'stub-label' }, `stops, ${mins} min`)
    )
  );

  const ticketDrill = h('article', { class: 'ticket' },
    h('div', { class: 'ticket-body' },
      h('h3', {}, 'Line drill'),
      h('p', {}, 'Ride one line only, with instant feedback. You can also pick a line straight from the map.'),
      h('div', { class: 'ticket-controls' },
        h('label', {},
          'Line: ',
          h('select', {
            onchange: (e) => actions.setPref('drillSection', Number(e.target.value))
          },
            exam.sections.map(s => h('option', { value: String(s.id), selected: s.id === drillSection }, `Line ${s.id}: ${s.short}`))
          )
        ),
        h('label', {},
          'Count: ',
          h('select', {
            onchange: (e) => actions.setPref('drillCount', Number(e.target.value))
          },
            [5, 10, 15].map(n => h('option', { value: String(n), selected: n === drillCount }, String(n)))
          )
        ),
        h('button', { class: 'btn go', onclick: () => actions.startDrill(drillSection) }, 'Start drill')
      )
    ),
    h('div', { class: 'stub' },
      h('span', { class: 'stub-num' }, String(drillCount)),
      h('span', { class: 'stub-label' }, 'stops')
    )
  );

  const ticketsSection = h('section', { class: 'tickets' },
    ticketPractice,
    ticketExam,
    ticketDrill
  );

  // Progress panel
  const examHistory = (app.state.history || []).filter(h => (h.exam || 'pmle') === app.examId);
  let progressContent;

  if (examHistory.length === 0) {
    progressContent = h('p', { class: 'lead' },
      `No journeys on this network yet. Your scores and weakest lines appear here after your first session.`
    );
  } else {
    const agg = aggregateHistory(examHistory, 10, exam.sections);
    const lastAttempt = examHistory[examHistory.length - 1];
    const modeLabel = MODE_NAMES[lastAttempt.mode] || lastAttempt.mode;

    const weakBarData = agg.weakestSections.slice(0, 3).map(id => {
      const s = exam.sections.find(sec => sec.id === id);
      const data = agg.perSection[id] || {};
      return {
        id,
        title: s ? s.title : '',
        weight: s ? s.weight : 0,
        correct: data.c || 0,
        total: data.n || 0,
        pct: data.pct,
      };
    });

    progressContent = h('div', { class: 'progress-body' },
      h('p', { class: 'lead' },
        `Last ride: ${lastAttempt.pct}% on ${modeLabel}. Average ${agg.avgPct}% over your last ${agg.recentCount}.`
      ),
      weakBarData.length > 0 ? h('h3', {}, 'Lines to work on') : null,
      weakBarData.length > 0 ? barList(weakBarData, word) : null,
      h('div', { class: 'progress-action' },
        h('button', { class: 'btn', onclick: () => actions.showHistory() }, 'See all journeys')
      )
    );
  }

  const progressPanel = h('section', { class: 'panel progress-panel' },
    h('h2', {}, 'Your journeys'),
    progressContent
  );

  const pairSection = h('div', { class: 'pair' },
    sourcePanel(app),
    progressPanel
  );

  mount(root,
    appHeader(app, actions),
    h('main', { class: 'page-home' },
      masthead,
      mapSection,
      ticketsSection,
      pairSection
    ),
    disclaimer()
  );
}

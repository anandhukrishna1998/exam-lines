import { h, svgEl, mount, fmtClock } from './dom.js';
import { appHeader, disclaimer, barList, MODE_NAMES } from './chrome.js';
import { lineChartPoints } from './viewmodels.js';
import { aggregateHistory } from '../js/scoring.js';
import { examById, examOfQuestionId } from '../js/exams.js';
import { REPORT_REASONS } from '../js/store.js';

export function renderHistory(root, app, actions) {
  const exam = examById(app.examId);
  const word = exam.sectionWord || 'Section';
  const allHistory = app.state.history || [];
  const examHistory = allHistory.filter(h => (h.exam || 'pmle') === app.examId);

  // Masthead
  const n = examHistory.length;
  const k = Math.min(10, n);
  const mastheadText = n > 0
    ? `${n} journeys on the ${exam.code} network. Line scores cover your last ${k}.`
    : `No journeys on the ${exam.code} network yet. Switch networks at the top to see the other exam.`;

  const masthead = h('div', { class: 'masthead' },
    h('h1', {}, 'Your journeys'),
    h('p', { class: 'lead' }, mastheadText)
  );

  // Score over time chart
  let chartSection;
  if (n === 0) {
    chartSection = h('section', { class: 'panel chart-panel' },
      h('h2', {}, 'Score over time'),
      h('p', { class: 'lead' }, 'Your score line appears after your first journey on this network.')
    );
  } else {
    const recent30 = examHistory.slice(-30);
    const pcts = recent30.map(h => h.pct != null ? h.pct : 0);
    const W = 640;
    const H = 220;
    const padX = 40;
    const padY = 20;

    const pts = lineChartPoints(pcts, { width: W, height: H, padX, padY });

    const gridLines = [0, 25, 50, 75, 100].map(pct => {
      const y = (H - padY) - (pct / 100) * (H - 2 * padY);
      return [
        svgEl('line', { x1: padX, y1: y, x2: W - padX, y2: y, class: 'grid-line' }),
        svgEl('text', { x: padX - 8, y: y + 4, 'text-anchor': 'end', class: 'grid-label' }, `${pct}%`),
      ];
    }).flat();

    const polyPoints = pts.map(p => `${p.x},${p.y}`).join(' ');
    const lineEl = svgEl('polyline', { points: polyPoints, class: 'chart-line' });

    const dots = pts.map((p, idx) => {
      const isLast = idx === pts.length - 1;
      const r = isLast ? 6 : 3.5;
      const dotCls = `chart-dot${isLast ? ' last' : ''}`;
      return svgEl('circle', { cx: p.x, cy: p.y, r, class: dotCls },
        svgEl('title', {}, `Journey ${idx + 1} of ${pts.length}: ${p.val}%`)
      );
    });

    const axisLabels = [
      svgEl('text', { x: padX, y: H - 2, 'text-anchor': 'start', class: 'axis-label' }, 'oldest'),
      svgEl('text', { x: W - padX, y: H - 2, 'text-anchor': 'end', class: 'axis-label' }, 'latest'),
    ];

    const chartSvg = svgEl('svg', {
      viewBox: `0 0 ${W} ${H}`,
      class: 'score-chart',
      role: 'img',
      'aria-label': 'Score over time line chart',
    },
      ...gridLines,
      lineEl,
      ...dots,
      ...axisLabels
    );

    chartSection = h('section', { class: 'panel chart-panel' },
      h('h2', {}, 'Score over time'),
      chartSvg
    );
  }

  // Weakest lines (last 10 journeys)
  let weakestSection;
  if (n === 0) {
    weakestSection = null;
  } else {
    const agg = aggregateHistory(examHistory, 10, exam.sections);
    const weakBars = agg.weakestSections.map(id => {
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

    weakestSection = h('section', { class: 'panel' },
      h('h2', {}, `Weakest ${word.toLowerCase()}s, last 10 journeys`),
      barList(weakBars, word)
    );
  }

  // Reported questions
  const reasonsMap = Object.fromEntries(REPORT_REASONS.map(r => [r.id, r.label]));
  const reportedEntries = Object.entries(app.state.reported || {});
  let reportedListContent;

  if (reportedEntries.length === 0) {
    reportedListContent = h('p', { class: 'lead' }, 'Nothing reported. Use "Report this question" on anything that looks wrong.');
  } else {
    reportedListContent = h('ul', { class: 'reported-list' },
      reportedEntries.map(([id, info]) => {
        const stemSuffix = info.stem && info.stem.length >= 160 ? '…' : '';
        const stemText = `${info.stem}${stemSuffix}`;
        const reasonLabel = reasonsMap[info.reason] || info.reason;

        return h('li', { class: 'reported-item' },
          h('div', { class: 'rep-details' },
            h('strong', {}, `${info.sub || 'General'} · ${reasonLabel}`),
            h('p', {}, stemText)
          ),
          h('button', { class: 'btn', onclick: () => actions.restoreReported(id) }, 'Restore')
        );
      })
    );
  }

  // Count seen questions for current exam
  const seenIds = Object.keys(app.state.seen || {});
  const seenForExamCount = seenIds.filter(id => examOfQuestionId(id) === app.examId).length;

  const forgetSeenBtn = h('button', {
    class: 'btn stop',
    disabled: seenForExamCount === 0,
    onclick: () => actions.clearSeenQuestions(),
  }, `Forget seen questions (${seenForExamCount})`);

  const reportedSection = h('section', { class: 'panel reported-panel' },
    h('h2', {}, 'Reported questions'),
    reportedListContent,
    h('div', { class: 'reported-actions' }, forgetSeenBtn)
  );

  // Recent journeys table
  let tableSection;
  if (n === 0) {
    tableSection = null;
  } else {
    const rows = examHistory.slice().reverse().map(hRow => {
      const d = new Date(hRow.t);
      const dateStr = isNaN(d.getTime())
        ? '—'
        : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const modeStr = MODE_NAMES[hRow.mode] || hRow.mode;
      const lineStr = hRow.section ? `${word} ${hRow.section}` : 'Whole network';
      const scoreStr = hRow.pct != null ? `${hRow.pct}%` : '—';
      const corrStr = `${hRow.correct} / ${hRow.total}`;
      const timeStr = hRow.durationSec ? fmtClock(hRow.durationSec) : '—';

      return h('tr', {},
        h('td', {}, dateStr),
        h('td', {}, modeStr),
        h('td', {}, lineStr),
        h('td', { class: 'td-score' }, scoreStr),
        h('td', {}, corrStr),
        h('td', {}, timeStr)
      );
    });

    tableSection = h('section', { class: 'panel table-panel' },
      h('h2', {}, 'Recent journeys'),
      h('div', { class: 'table-wrap' },
        h('table', { class: 'journeys-table' },
          h('thead', {},
            h('tr', {},
              h('th', {}, 'Date'),
              h('th', {}, 'Ticket'),
              h('th', {}, 'Line'),
              h('th', {}, 'Score'),
              h('th', {}, 'Correct'),
              h('th', {}, 'Time')
            )
          ),
          h('tbody', {}, ...rows)
        )
      )
    );
  }

  mount(root,
    appHeader(app, actions),
    h('main', { class: 'page-history' },
      masthead,
      chartSection,
      weakestSection,
      reportedSection,
      tableSection
    ),
    disclaimer()
  );
}

import { h, mount, fmtClock, LETTERS } from './dom.js';
import { appHeader, disclaimer, barList, MODE_NAMES } from './chrome.js';
import { systemMap } from './map.js';
import { sectionBars, subLabel } from './viewmodels.js';
import { weakestSubs, isCorrect } from '../js/scoring.js';
import { examById } from '../js/exams.js';

export function renderResults(root, app, actions) {
  const s = app.session;
  const res = app.result;
  if (!s || !res) {
    actions.goHome();
    return;
  }

  const exam = examById(s.exam);
  const word = exam.sectionWord || 'Section';
  const modeName = MODE_NAMES[s.mode] || s.mode;
  const clock = fmtClock(res.durationSec);

  // Arrival section
  const skippedText = res.skipped > 0 ? h('p', { class: 'arrival-sub' }, `${res.skipped} skipped and not scored`) : null;
  const reportedText = res.reportedCount > 0 ? h('p', { class: 'arrival-sub' }, `${res.reportedCount} reported and not scored`) : null;

  const wrongCount = res.wrongQuestions ? res.wrongQuestions.length : 0;
  const retryBtn = h('button', {
    class: 'btn go',
    disabled: wrongCount === 0,
    onclick: () => actions.retryWrong(),
  }, `Retry wrong answers (${wrongCount})`);

  const homeBtn = h('button', { class: 'btn', onclick: () => actions.goHome() }, 'Back to the map');

  const arrival = h('section', { class: 'arrival' },
    h('div', { class: 'arrival-score' }, `${res.pct}%`),
    h('div', { class: 'arrival-details' },
      h('h2', {}, `Journey report: ${modeName}, ${exam.code}`),
      h('p', { class: 'arrival-stat' }, `${res.correct} of ${res.total} scored stops correct, in ${clock}`),
      skippedText,
      reportedText,
      h('div', { class: 'arrival-actions' }, retryBtn, homeBtn)
    )
  );

  // Map with session per-sub mastery
  const sessionMastery = {};
  if (res.perSub) {
    for (const [code, info] of Object.entries(res.perSub)) {
      sessionMastery[code] = {
        c: info.correct,
        n: info.total,
        pct: info.total === 0 ? null : Math.round((info.correct / info.total) * 100),
      };
    }
  }

  const mapSection = h('section', { class: 'results-map' },
    systemMap(exam, { mastery: sessionMastery, label: true, draw: false })
  );

  // Pair: section bars & weakest stations
  const barsData = sectionBars(res.perSection, exam.sections);
  const barsPanel = h('div', { class: 'panel bars-panel' },
    h('h3', {}, `Score by ${word}`),
    barList(barsData, word)
  );

  const weakStationsList = weakestSubs(res.perSub, 3);
  let weakContent;
  if (weakStationsList.length === 0) {
    weakContent = h('p', { class: 'lead' }, 'No weak stations on this journey.');
  } else {
    weakContent = h('ol', { class: 'weak-list' },
      weakStationsList.map(w => {
        const subInfo = exam.subobjectives[w.code] || {};
        const missedTopics = w.topics.length > 0 ? `Missed: ${w.topics.join('; ')}` : '';
        return h('li', { class: `weak-item l${subInfo.section || 1}` },
          h('span', { class: `roundel l${subInfo.section || 1}` }, String(subInfo.section || 1)),
          h('div', { class: 'weak-details' },
            h('strong', {}, subLabel(w.code, exam.subobjectives)),
            h('span', {}, ` · ${w.correct} of ${w.total} correct. ${missedTopics}`)
          )
        );
      })
    );
  }

  const weakPanel = h('div', { class: 'panel weak-panel' },
    h('h3', {}, 'Weakest stations'),
    weakContent
  );

  const pairSection = h('div', { class: 'pair' }, barsPanel, weakPanel);

  // Every stop review
  const filter = app.reviewFilter || 'all';

  const filterTabs = h('div', { class: 'review-tabs', role: 'group', 'aria-label': 'Filter review stops' },
    h('button', {
      class: `btn-tab ${filter === 'all' ? 'active' : ''}`,
      'aria-pressed': filter === 'all' ? 'true' : 'false',
      onclick: () => actions.setReviewFilter('all'),
    }, 'All stops'),
    h('button', {
      class: `btn-tab ${filter === 'missed' ? 'active' : ''}`,
      'aria-pressed': filter === 'missed' ? 'true' : 'false',
      onclick: () => actions.setReviewFilter('missed'),
    }, 'Missed'),
    h('button', {
      class: `btn-tab ${filter === 'flagged' ? 'active' : ''}`,
      'aria-pressed': filter === 'flagged' ? 'true' : 'false',
      onclick: () => actions.setReviewFilter('flagged'),
    }, 'Flagged')
  );

  const filteredItems = s.items.map((item, idx) => ({ item, idx })).filter(({ item }) => {
    if (filter === 'flagged') return item.flagged;
    if (filter === 'missed') {
      if (item.reported) return false;
      return !isCorrect(item.q, item.selected);
    }
    return true;
  });

  const reviewArticles = filteredItems.map(({ item, idx }) => {
    const q = item.q;
    let verdict = 'Unanswered';
    let verdictClass = 'verdict-unanswered';

    if (item.reported) {
      verdict = 'Reported';
      verdictClass = 'verdict-reported';
    } else if (!item.scored) {
      verdict = 'Skipped';
      verdictClass = 'verdict-skipped';
    } else if (isCorrect(q, item.selected)) {
      verdict = 'Correct';
      verdictClass = 'verdict-correct';
    } else if (item.selected.length === 0) {
      verdict = 'Unanswered';
      verdictClass = 'verdict-unanswered';
    } else {
      verdict = 'Missed';
      verdictClass = 'verdict-missed';
    }

    const flaggedTag = item.flagged ? h('span', { class: 'tag tag-flagged' }, 'Flagged') : null;
    const verdictTag = h('span', { class: `tag ${verdictClass}` }, verdict);
    const roundel = h('span', { class: `roundel l${q.section}` }, String(q.section));

    const optionsList = h('ol', { class: 'ropts' },
      (q.options || []).map((opt, optIdx) => {
        const isChosen = item.selected.includes(optIdx);
        const isOptCorrect = opt.correct;
        const optClasses = [
          isOptCorrect ? 'correct' : '',
          isChosen ? 'chosen' : '',
        ].filter(Boolean).join(' ');

        let annotation = '';
        if (isOptCorrect && isChosen) annotation = ' Correct answer & your choice.';
        else if (isOptCorrect) annotation = ' Correct answer.';
        else if (isChosen) annotation = ' Your answer.';

        return h('li', { class: optClasses },
          h('span', { class: 'ropt-key' }, LETTERS[optIdx]),
          h('span', { class: 'ropt-text' },
            opt.text,
            annotation ? h('em', {}, annotation) : null,
            opt.why ? h('span', { class: 'ropt-why' }, ` — ${opt.why}`) : null
          )
        );
      })
    );

    const reportButton = !item.reported
      ? h('button', { class: 'btn quiet', onclick: () => actions.openReport(q) }, 'Report this question')
      : h('span', { class: 'reported-label' }, 'Reported');

    return h('article', { class: `review-item l${q.section}` },
      h('div', { class: 'review-header' },
        h('div', { class: 'rev-title-left' },
          roundel,
          h('strong', {}, `Stop ${idx + 1}`),
          verdictTag,
          flaggedTag
        ),
        h('span', { class: 'rev-sub-topic' }, `${subLabel(q.sub, exam.subobjectives)}. ${q.topic}`)
      ),
      h('p', { class: 'review-stem' }, q.stem),
      optionsList,
      h('div', { class: 'review-explanation' },
        h('strong', {}, 'Explanation: '),
        q.explanation
      ),
      h('div', { class: 'review-action' }, reportButton)
    );
  });

  const reviewSection = h('section', { class: 'review-section' },
    h('div', { class: 'review-top' },
      h('h2', {}, 'Every stop'),
      filterTabs
    ),
    h('div', { class: 'review-list' }, ...reviewArticles)
  );

  mount(root,
    appHeader(app, actions),
    h('main', { class: 'page-results' },
      arrival,
      mapSection,
      pairSection,
      reviewSection
    ),
    disclaimer()
  );
}

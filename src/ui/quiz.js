import { h, mount, fmtClock, LETTERS } from './dom.js';
import { appHeader, disclaimer, MODE_NAMES } from './chrome.js';
import { navigatorCells } from './viewmodels.js';
import { examById } from '../js/exams.js';
import { isCorrect } from '../js/scoring.js';
import { remainingSec } from '../js/session.js';
import { writerName } from '../runtime.js';

export function renderQuiz(root, app, actions) {
  const s = app.session;
  if (!s || !s.items || s.items.length === 0) {
    actions.goHome();
    return;
  }

  const exam = examById(s.exam);
  const curItem = s.items[s.index];
  const q = curItem.q;
  const isMulti = q.type === 'multi';
  const req = isMulti ? 2 : 1;
  const cells = navigatorCells(s);

  // Route strip
  const stopsList = h('ol', { class: 'stops-list' },
    cells.map(c => {
      let labelState = c.state === 'empty' ? 'unanswered' : c.state;
      if (c.flagged) labelState += ', flagged';

      let inner = String(c.n);
      if (c.state === 'correct') inner = '✓';
      else if (c.state === 'wrong') inner = '✕';

      const btnClasses = [
        's',
        c.state,
        c.current ? 'current' : '',
        c.flagged ? 'flagged' : '',
        c.reported ? 'reported' : '',
      ].filter(Boolean).join(' ');

      return h('li', { class: `stop-item l${c.section}` },
        h('button', {
          id: `stop-${c.i}`,
          class: btnClasses,
          'aria-label': `Question ${c.n}, ${labelState}`,
          onclick: () => actions.goTo(c.i),
        }, inner)
      );
    })
  );

  const routeNav = h('nav', { class: 'route' }, stopsList);

  // Station info & nowat
  const subInfo = exam.subobjectives[q.sub] || { short: q.sub, title: '' };
  const roundel = h('span', { class: `roundel l${q.section}` }, String(q.section));
  const stationName = h('div', { class: 'station-info' },
    h('b', {}, `${q.sub} ${subInfo.short}`),
    h('span', { class: 'station-detail' }, `${subInfo.title}. ${q.topic}`)
  );

  const answered = s.items.filter(it => it.selected.length > 0).length;
  const modeLabel = MODE_NAMES[s.mode] || s.mode;
  const metaText = `${modeLabel}, stop ${s.index + 1} of ${s.items.length}, ${answered} answered`;

  let sourceLabel = 'Checked bank';
  let isAi = false;
  if (q.source === 'ai') {
    isAi = true;
    const who = writerName(app);
    sourceLabel = q.verified ? `Written by ${who}, double-checked` : `Written by ${who}`;
  }

  const sourceTag = h('span', { class: `tag ${isAi ? 'tag-ai' : ''}` }, sourceLabel);
  const diffTag = h('span', { class: `tag tag-${q.difficulty}` }, q.difficulty);

  let clockEl = null;
  if (s.mode === 'exam') {
    const rem = remainingSec(s, Date.now());
    const isLow = rem !== null && rem <= 300;
    clockEl = h('span', { id: 'timer', class: `clock ${isLow ? 'low' : ''}` }, fmtClock(rem));
  }

  const nowAt = h('div', { class: 'nowat' },
    h('div', { class: 'nowat-left' }, roundel, stationName),
    h('div', { class: 'nowat-right' },
      h('div', { class: 'meta' }, metaText),
      h('div', { class: 'tags' }, sourceTag, diffTag, clockEl)
    )
  );

  // Stem
  let multiHint = null;
  if (isMulti && !curItem.checked) {
    multiHint = h('p', { class: 'multi-hint' }, `Select two options. ${curItem.selected.length} of 2 selected.`);
  }

  const stemEl = h('p', { id: 'q-stem', class: 'stem', tabindex: '-1' }, q.stem);

  // Options
  const isRevealed = curItem.checked && s.mode !== 'exam';
  const isReported = curItem.reported;
  const correctSet = new Set(q.options.map((o, idx) => o.correct ? idx : -1).filter(idx => idx >= 0));

  const optButtons = (q.options || []).map((opt, idx) => {
    const isSelected = curItem.selected.includes(idx);
    let optClass = 'opt';
    if (isSelected) optClass += ' selected';

    let keyContent = LETTERS[idx];
    if (isRevealed) {
      if (opt.correct) {
        optClass += ' correct';
        keyContent = '✓';
      } else if (isSelected) {
        optClass += ' wrong';
        keyContent = '✕';
      }
    }

    const keySpan = h('span', { class: 'opt-key' }, keyContent);

    let bodyChildren = [h('span', { class: 'opt-text' }, opt.text)];
    if (isRevealed && opt.why) {
      const prefix = opt.correct ? 'Right. ' : (isSelected ? 'Your choice. ' : '');
      const whyEl = h('p', { class: 'opt-why' },
        prefix ? h('strong', {}, prefix) : null,
        opt.why
      );
      bodyChildren.push(whyEl);
    }

    const bodySpan = h('div', { class: 'opt-body' }, ...bodyChildren);

    return h('button', {
      class: optClass,
      'aria-pressed': isSelected ? 'true' : 'false',
      disabled: isRevealed || isReported,
      onclick: () => actions.choose(idx),
    }, keySpan, bodySpan);
  });

  const optionsGroup = h('div', {
    class: 'options-group',
    role: 'group',
    'aria-label': isMulti ? 'Choose two options' : 'Choose one option',
  }, ...optButtons);

  // Feedback (non-exam after check)
  let feedbackEl = null;
  if (isRevealed) {
    const ok = isCorrect(q, curItem.selected);
    feedbackEl = h('div', { class: `feedback ${ok ? 'good' : 'bad'}` },
      h('strong', {}, ok ? 'Correct' : 'Not quite'),
      h('p', {}, q.explanation)
    );
  }

  // Toolbar
  const prevBtn = h('button', {
    class: 'btn',
    disabled: s.index === 0,
    onclick: () => actions.prev(),
  }, 'Previous');

  const flagBtn = h('button', {
    class: `btn ${curItem.flagged ? 'flagged' : ''}`,
    onclick: () => actions.flag(),
  }, curItem.flagged ? 'Flagged' : 'Flag for review');

  const reportBtn = h('button', {
    class: `btn quiet ${isReported ? 'reported' : ''}`,
    disabled: isReported,
    onclick: () => actions.openReport(q),
  }, isReported ? 'Reported' : 'Report this question');

  const finishText = s.mode === 'exam' ? 'Submit exam' : 'End journey';
  const finishBtn = h('button', {
    class: 'btn stop',
    onclick: () => actions.requestFinish(),
  }, finishText);

  const nextBtn = s.index < s.items.length - 1
    ? h('button', { class: 'btn go', onclick: () => actions.next() }, 'Next stop')
    : null;

  const toolbar = h('div', { class: 'quiz-toolbar' },
    h('div', { class: 'tb-left' }, prevBtn, flagBtn, reportBtn),
    h('span', { class: 'spacer' }),
    h('div', { class: 'tb-right' }, finishBtn, nextBtn)
  );

  const keyHints = h('p', { class: 'keyhints' },
    `Keys: 1 to ${q.options ? q.options.length : 4} answer, N next, P previous, F flag`
  );

  mount(root,
    appHeader(app, actions),
    h('main', { class: 'page-quiz' },
      routeNav,
      nowAt,
      stemEl,
      multiHint,
      optionsGroup,
      feedbackEl,
      toolbar,
      keyHints
    ),
    disclaimer()
  );

  // Center active stop in route nav
  setTimeout(() => {
    const activeBtn = document.getElementById(`stop-${s.index}`);
    const navEl = document.querySelector('nav.route');
    if (activeBtn && navEl) {
      navEl.scrollLeft = activeBtn.offsetLeft - navEl.clientWidth / 2 + activeBtn.clientWidth / 2;
    }
  }, 0);
}

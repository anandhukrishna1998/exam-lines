import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  navigatorCells,
  sectionBars,
  lineChartPoints,
  subLabel,
  runtimeRefresh,
  mapLayout,
  masteryBySub,
} from '../src/ui/viewmodels.js';
import { fmtClock, LETTERS } from '../src/ui/dom.js';
import { PMLE, SAA } from '../src/js/exams.js';
import { SECTIONS } from '../src/js/sections.js';
import { makeValidQuestion } from './helpers/fixtures.js';
import { createSession, selectOption } from '../src/js/session.js';

test('navigator hides correctness during an unfinished exam', () => {
  const q = makeValidQuestion({ section: 2 });
  const s = createSession({ mode: 'exam', questions: [q] });
  selectOption(s, 0); // chosen correct option

  const cells = navigatorCells(s);
  assert.equal(cells.length, 1);
  assert.equal(cells[0].section, 2);
  assert.equal(cells[0].state, 'answered', 'Exam must hide correctness while unfinished');

  // Finish exam
  s.finishedAt = Date.now();
  s.items[0].checked = true;
  const finishedCells = navigatorCells(s);
  assert.equal(finishedCells[0].state, 'correct');
});

test('navigator shows correctness in practice mode after check', () => {
  const q = makeValidQuestion({ section: 3 });
  const s = createSession({ mode: 'practice', questions: [q] });
  selectOption(s, 0);

  const cells = navigatorCells(s);
  assert.equal(cells[0].state, 'correct');
  assert.equal(cells[0].current, true);
});

test('sectionBars computes percentages and handles nulls for 0 total', () => {
  const perSection = {
    1: { correct: 3, total: 4 },
    2: { correct: 0, total: 0 },
  };
  const bars = sectionBars(perSection, SECTIONS);

  assert.equal(bars[0].pct, 75);
  assert.equal(bars[1].pct, null);
  assert.equal(bars.length, SECTIONS.length);
});

test('lineChartPoints layout and clamping', () => {
  const pts = lineChartPoints([0, 50, 100], { width: 640, height: 220, padX: 40, padY: 20 });
  assert.equal(pts.length, 3);
  assert.equal(pts[0].x, 40);
  assert.equal(pts[0].y, 200); // 0% at bottom (220 - 20)
  assert.equal(pts[1].x, 320); // middle
  assert.equal(pts[1].y, 110);
  assert.equal(pts[2].x, 600); // right (640 - 40)
  assert.equal(pts[2].y, 20);  // 100% at top (20)

  // Single point centered
  const single = lineChartPoints([75], { width: 640, height: 220 });
  assert.equal(single.length, 1);
  assert.equal(single[0].x, 320);
});

test('subLabel and fmtClock', () => {
  assert.equal(subLabel('3.2', PMLE.subobjectives), '3.2 Training models');
  assert.equal(subLabel('99.9', PMLE.subobjectives), '99.9');

  assert.equal(fmtClock(0), '0:00');
  assert.equal(fmtClock(65), '1:05');
  assert.equal(fmtClock(7200), '120:00');
});

test('runtimeRefresh plans', () => {
  assert.equal(runtimeRefresh('storage', 'home'), 'full');
  assert.equal(runtimeRefresh('storage', 'history'), 'full');
  assert.equal(runtimeRefresh('storage', 'quiz'), 'chips');
  assert.equal(runtimeRefresh('pool', 'home'), 'pool-panel');
  assert.equal(runtimeRefresh('pool', 'quiz'), 'chips');
});

test('mapLayout creates one line per section, stations for all subs, stations left of terminus', () => {
  for (const exam of [PMLE, SAA]) {
    const layout = mapLayout(exam);
    assert.equal(layout.lines.length, exam.sections.length);
    assert.ok(layout.height > 0);

    let stationCount = 0;
    for (const line of layout.lines) {
      assert.ok(line.stations.length > 0);
      stationCount += line.stations.length;
      for (const st of line.stations) {
        assert.ok(st.x < layout.terminus.x, `Station ${st.code} x=${st.x} must be left of terminus x=${layout.terminus.x}`);
      }
    }
    assert.equal(stationCount, Object.keys(exam.subobjectives).length);
  }
});

test('masteryBySub filters per exam', () => {
  const history = [
    { exam: 'pmle', perSub: { '1.1': { c: 2, n: 2 } } },
    { exam: 'saa', perSub: { '1.1': { c: 1, n: 4 } } },
  ];

  const pmleMastery = masteryBySub(history, 'pmle');
  assert.equal(pmleMastery['1.1'].pct, 100);

  const saaMastery = masteryBySub(history, 'saa');
  assert.equal(saaMastery['1.1'].pct, 25);
});

test('LETTERS covers 5 options', () => {
  assert.ok(LETTERS.length >= 5);
  assert.deepEqual(LETTERS.slice(0, 5), ['A', 'B', 'C', 'D', 'E']);
});

import { svgEl, h } from './dom.js';
import { mapLayout } from './viewmodels.js';

export function systemMap(exam, { mastery = {}, onLine, draw = false, label = true } = {}) {
  const layout = mapLayout(exam);
  const word = exam.sectionWord || 'Section';
  const cls = `sysmap${draw ? ' draw' : ''}`;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    class: cls,
    role: 'img',
    'aria-label': `${exam.name} transit network map`,
  });

  // Terminus
  const T = layout.terminus;
  const terminusGroup = svgEl('g', { class: 'g-terminus' },
    svgEl('rect', {
      class: 'terminus',
      x: T.x - 8,
      y: T.y1 - 20,
      width: 16,
      height: T.y2 - T.y1 + 40,
      rx: 8,
    }),
    svgEl('text', { class: 'tname', x: T.x, y: T.y1 - 28, 'text-anchor': 'middle' }, exam.code),
    svgEl('text', { class: 'tsub', x: T.x, y: T.y2 + 36, 'text-anchor': 'middle' }, 'Exam day')
  );
  svg.appendChild(terminusGroup);

  // Lines
  layout.lines.forEach((line, i) => {
    const isClickable = typeof onLine === 'function';
    const lineAttrs = {
      class: `ln${i + 1} l${line.id}${isClickable ? ' ride' : ''}`,
    };

    if (isClickable) {
      lineAttrs.tabindex = '0';
      lineAttrs.role = 'button';
      lineAttrs['aria-label'] = `Ride ${word} ${line.id}, ${line.title}, as a line drill`;
      lineAttrs.onclick = () => onLine(line.id);
      lineAttrs.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onLine(line.id);
        }
      };
    }

    const gLine = svgEl('g', lineAttrs,
      svgEl('title', {}, `${word} ${line.id}: ${line.title} (about ${line.weight}% of the exam)`),
      svgEl('path', { class: 'track', d: `M${line.x0} ${line.y} H${layout.terminus.x}` }),
      svgEl('g', { class: 'badge' },
        svgEl('circle', { cx: 28, cy: line.y, r: 17 }),
        svgEl('text', { x: 28, y: line.y + 5, 'text-anchor': 'middle' }, String(line.id))
      ),
      svgEl('text', { class: 'ltitle', x: line.x0 + 4, y: line.y - 17 }, `${line.title}, ~${line.weight}%`)
    );

    // Stations
    line.stations.forEach((st) => {
      const m = mastery[st.code];
      const hasPracticed = m && m.n > 0 && m.pct !== null;
      const tooltipText = hasPracticed
        ? `${st.code} ${st.title}: ${m.pct}% of ${m.n} questions right`
        : `${st.code} ${st.title}: not practised yet`;

      const gStation = svgEl('g', { class: 'station' },
        svgEl('title', {}, tooltipText),
        svgEl('circle', { class: 'stop', cx: st.x, cy: st.y, r: 10 })
      );

      if (hasPracticed) {
        const r = 2 + Math.round((5.5 * m.pct) / 100);
        const opacity = (0.35 + (0.65 * m.pct) / 100).toFixed(2);
        gStation.appendChild(
          svgEl('circle', {
            class: 'fill',
            cx: st.x,
            cy: st.y,
            r,
            'fill-opacity': opacity,
          })
        );
      }

      if (label) {
        gStation.appendChild(svgEl('text', { class: 'scode', x: st.x, y: st.y + 28, 'text-anchor': 'middle' }, st.code));
        gStation.appendChild(svgEl('text', { class: 'sname', x: st.x, y: st.y + 43, 'text-anchor': 'middle' }, st.short));
      }

      gLine.appendChild(gStation);
    });

    svg.appendChild(gLine);
  });

  return svg;
}

export function mapLegend() {
  return h('p', { class: 'maplegend' },
    h('span', { class: 'leg-item' }, 'Hollow station: not practised yet'),
    h('span', { class: 'leg-sep' }, ' · '),
    h('span', { class: 'leg-item' }, 'Filled station: bigger and darker means more of its questions right')
  );
}

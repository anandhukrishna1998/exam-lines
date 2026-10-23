export const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') {
        el.className = v;
      } else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (v === true) {
        if (k in el) {
          try { el[k] = true; } catch {}
        }
        el.setAttribute(k, '');
      } else if (v === false || v == null) {
        // Skip false and null/undefined
      } else {
        if (k in el && typeof el[k] === 'boolean') {
          el[k] = !!v;
        }
        el.setAttribute(k, String(v));
      }
    }
  }

  function appendChildDeep(child) {
    if (child == null || child === false || child === true) return;
    if (Array.isArray(child)) {
      for (const c of child) appendChildDeep(c);
      return;
    }
    if (child instanceof Node) {
      el.appendChild(child);
    } else {
      el.appendChild(document.createTextNode(String(child)));
    }
  }

  for (const c of children) {
    appendChildDeep(c);
  }

  return el;
}

export function svgEl(tag, attrs, ...children) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') {
        el.setAttribute('class', v);
      } else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (v === true) {
        el.setAttribute(k, '');
      } else if (v === false || v == null) {
        // skip
      } else {
        el.setAttribute(k, String(v));
      }
    }
  }

  function appendChildDeep(child) {
    if (child == null || child === false || child === true) return;
    if (Array.isArray(child)) {
      for (const c of child) appendChildDeep(c);
      return;
    }
    if (child instanceof Node) {
      el.appendChild(child);
    } else {
      el.appendChild(document.createTextNode(String(child)));
    }
  }

  for (const c of children) {
    appendChildDeep(c);
  }

  return el;
}

export function mount(root, ...nodes) {
  const flat = nodes.flat(Infinity).filter(n => n != null && n !== false);
  root.replaceChildren(...flat);
}

export function fmtClock(sec) {
  if (sec == null || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

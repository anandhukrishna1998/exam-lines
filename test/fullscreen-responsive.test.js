import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildHtml } from '../build.mjs';
import { createApp } from '../src/main.js';
import { isFullscreenActive } from '../src/ui/chrome.js';

function createMockDom() {
  const attrs = new Map();
  const listeners = new Map();
  const elementsById = new Map();

  const htmlEl = {
    setAttribute(k, v) { attrs.set(k, String(v)); },
    getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
    removeAttribute(k) { attrs.delete(k); },
    requestFullscreen: null,
  };

  const doc = {
    documentElement: htmlEl,
    fullscreenElement: null,
    webkitFullscreenElement: null,
    mozFullScreenElement: null,
    msFullscreenElement: null,
    exitFullscreen: null,
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    getElementById(id) {
      return elementsById.get(id) || null;
    },
    emit(type, evt = {}) {
      for (const fn of (listeners.get(type) || [])) {
        fn(evt);
      }
    },
  };

  return { doc, htmlEl, elementsById };
}

test('built HTML includes responsive viewport meta and dynamic fullscreen CSS rules', () => {
  const html = buildHtml('.');
  const first8K = html.slice(0, 8192);

  assert.ok(
    first8K.includes('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'),
    'Built HTML must declare responsive viewport meta tag in first 8 KB'
  );

  // Dynamic container without fixed 1180px ceiling
  assert.ok(!/\.app\s*\{[^}]*max-width:\s*1180px/.test(html), '.app must not be locked to a static 1180px max-width');
  assert.ok(html.includes('min-height: 100dvh;'), '.app should span full dynamic viewport height');
  assert.ok(html.includes(':root[data-fullscreen="true"]'), 'Must style fallback full-viewport mode');
  assert.ok(html.includes(':fullscreen::backdrop'), 'Must style native fullscreen backdrop');
  assert.ok(html.includes('.quiz-stage'), 'Must include dynamic quiz-stage grid container for TV/widescreen');
  assert.ok(html.includes('min-width: 900px'), 'Must adapt to 2x-scaled 1080p Smart TV viewports (960x540+)');
  assert.ok(html.includes('(max-width: 759px), (max-height: 620px)'), 'Must unstick topbar on narrow mobile or short TV viewports');
  assert.ok(html.includes('id="fs-toggle"') || html.includes("id: 'fs-toggle'"), 'Must include fullscreen toggle button');
});

test('manifest declares fullscreen display_override for TV/kiosk PWAs', () => {
  const manifest = JSON.parse(readFileSync('./src/manifest.json', 'utf8'));
  assert.ok(Array.isArray(manifest.display_override));
  assert.ok(manifest.display_override.includes('fullscreen'));
  assert.equal(manifest.display, 'standalone');
});

test('toggleFullscreen uses native fullscreen when available and syncs button state on exit', async () => {
  const { doc, htmlEl, elementsById } = createMockDom();
  const fsBtnAttrs = new Map([['aria-pressed', 'false']]);
  const labelNode = { textContent: 'Full screen' };
  const activeClasses = new Set();

  elementsById.set('fs-toggle', {
    setAttribute(k, v) { fsBtnAttrs.set(k, String(v)); },
    getAttribute(k) { return fsBtnAttrs.get(k); },
    classList: {
      toggle(cls, force) {
        if (force) activeClasses.add(cls);
        else activeClasses.delete(cls);
      },
    },
    querySelector(sel) {
      return sel === '.fs-label' ? labelNode : null;
    },
  });

  htmlEl.requestFullscreen = async () => {
    doc.fullscreenElement = htmlEl;
    doc.emit('fullscreenchange');
  };
  doc.exitFullscreen = async () => {
    doc.fullscreenElement = null;
    doc.emit('fullscreenchange');
  };

  const prevDoc = globalThis.document;
  globalThis.document = doc;
  try {
    const { app, actions } = createApp();
    assert.equal(isFullscreenActive(app), false);

    const entered = await actions.toggleFullscreen();
    assert.equal(entered, true);
    assert.equal(app.isFullscreen, true);
    assert.equal(htmlEl.getAttribute('data-fullscreen'), 'true');
    assert.equal(fsBtnAttrs.get('aria-pressed'), 'true');
    assert.equal(labelNode.textContent, 'Exit full screen');
    assert.ok(activeClasses.has('active'));

    // Simulate user exiting via Escape (browser fires fullscreenchange with null fullscreenElement)
    doc.fullscreenElement = null;
    doc.emit('fullscreenchange');
    assert.equal(app.isFullscreen, false);
    assert.equal(htmlEl.getAttribute('data-fullscreen'), null);
    assert.equal(fsBtnAttrs.get('aria-pressed'), 'false');
    assert.equal(labelNode.textContent, 'Full screen');
    assert.ok(!activeClasses.has('active'));
  } finally {
    globalThis.document = prevDoc;
  }
});

test('toggleFullscreen falls back to data-fullscreen attribute when Fullscreen API is rejected or unsupported', async () => {
  const { doc, htmlEl } = createMockDom();
  htmlEl.requestFullscreen = async () => {
    throw new Error('Permissions check failed');
  };

  const prevDoc = globalThis.document;
  globalThis.document = doc;
  try {
    const { app, actions } = createApp();

    const entered = await actions.toggleFullscreen();
    assert.equal(entered, true);
    assert.equal(app.isFullscreen, true);
    assert.equal(htmlEl.getAttribute('data-fullscreen'), 'true');
    assert.equal(isFullscreenActive(app), true);

    // Pressing Escape in fallback mode closes it
    let prevented = false;
    doc.emit('keydown', {
      key: 'Escape',
      preventDefault() { prevented = true; },
    });

    // Wait a tick for async toggleFullscreen
    await new Promise(r => setTimeout(r, 10));
    assert.equal(prevented, true);
    assert.equal(app.isFullscreen, false);
    assert.equal(htmlEl.getAttribute('data-fullscreen'), null);
  } finally {
    globalThis.document = prevDoc;
  }
});

test('toggleFullscreen keeps fallback active when requestFullscreen hangs or emits null fullscreenchange', async () => {
  const { doc, htmlEl, elementsById } = createMockDom();
  const fsBtnAttrs = new Map([['aria-pressed', 'false']]);
  const labelNode = { textContent: 'Full screen' };
  const activeClasses = new Set();

  elementsById.set('fs-toggle', {
    setAttribute(k, v) { fsBtnAttrs.set(k, String(v)); },
    getAttribute(k) { return fsBtnAttrs.get(k); },
    classList: {
      toggle(cls, force) {
        if (force) activeClasses.add(cls);
        else activeClasses.delete(cls);
      },
    },
    querySelector(sel) {
      return sel === '.fs-label' ? labelNode : null;
    },
  });

  // Simulate embedded WebView / TV browser whose requestFullscreen never settles and fires empty fullscreenchange
  htmlEl.requestFullscreen = () => {
    setTimeout(() => {
      doc.fullscreenElement = null;
      doc.emit('fullscreenchange');
    }, 5);
    return new Promise(() => {});
  };

  const prevDoc = globalThis.document;
  globalThis.document = doc;
  try {
    const { app, actions } = createApp();
    const promise = actions.toggleFullscreen();

    // Synchronously updated even before promise resolves
    assert.equal(app.isFullscreen, true);
    assert.equal(htmlEl.getAttribute('data-fullscreen'), 'true');
    assert.equal(fsBtnAttrs.get('aria-pressed'), 'true');
    assert.equal(labelNode.textContent, 'Exit full screen');

    const entered = await promise;
    assert.equal(entered, true);
    await new Promise(r => setTimeout(r, 20));
    assert.equal(app.isFullscreen, true);
    assert.equal(htmlEl.getAttribute('data-fullscreen'), 'true');
    assert.equal(fsBtnAttrs.get('aria-pressed'), 'true');
    assert.ok(activeClasses.has('active'));

    // Second toggle exits cleanly
    const exited = await actions.toggleFullscreen();
    assert.equal(exited, false);
    assert.equal(app.isFullscreen, false);
    assert.equal(htmlEl.getAttribute('data-fullscreen'), null);
    assert.equal(fsBtnAttrs.get('aria-pressed'), 'false');
    assert.equal(labelNode.textContent, 'Full screen');
  } finally {
    globalThis.document = prevDoc;
  }
});

test('toggleFullscreen retries bare requestFullscreen when options object throws TypeError', async () => {
  const { doc, htmlEl } = createMockDom();
  let calls = 0;
  htmlEl.requestFullscreen = async (opts) => {
    calls += 1;
    if (opts) throw new TypeError('Options not supported');
    doc.fullscreenElement = htmlEl;
    doc.emit('fullscreenchange');
  };

  const prevDoc = globalThis.document;
  globalThis.document = doc;
  try {
    const { app, actions } = createApp();
    const entered = await actions.toggleFullscreen();
    assert.equal(entered, true);
    assert.equal(calls, 2);
    assert.equal(doc.fullscreenElement, htmlEl);
    assert.equal(app.isFullscreen, true);
  } finally {
    globalThis.document = prevDoc;
  }
});

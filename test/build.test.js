import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { MODULE_ORDER, stripModuleSyntax, buildHtml } from '../build.mjs';

test('stripModuleSyntax removes import lines and export prefixes', () => {
  const code = `import { foo } from './bar.js';
import {
  baz,
  qux
} from './deep.js';

export const A = 1;
export let B = 2;
export function fn() {
  const msg = "export const text inside string";
  return msg;
}
export async function asyncFn() {}
export class MyClass {}
`;

  const stripped = stripModuleSyntax(code);
  assert.ok(!stripped.includes('import { foo }'), 'Should remove single-line import');
  assert.ok(!stripped.includes("from './deep.js';"), 'Should remove multi-line import');
  assert.ok(!stripped.includes('export const A'), 'Should strip leading export');
  assert.ok(stripped.includes('const A = 1;'));
  assert.ok(stripped.includes('let B = 2;'));
  assert.ok(stripped.includes('function fn()'));
  assert.ok(stripped.includes('async function asyncFn()'));
  assert.ok(stripped.includes('class MyClass'));
  assert.ok(stripped.includes('"export const text inside string"'), 'Mid-line export const in string must survive');
});

test('every MODULE_ORDER file exists exactly once on disk', () => {
  const seen = new Set();
  for (const rel of MODULE_ORDER) {
    assert.ok(!seen.has(rel), `MODULE_ORDER has duplicate entry: ${rel}`);
    seen.add(rel);
    const fullPath = resolve('.', rel);
    assert.ok(existsSync(fullPath), `File in MODULE_ORDER does not exist: ${rel}`);
  }
  assert.equal(MODULE_ORDER.length, 35);
});

test('the built HTML page satisfies all build constraints', () => {
  const html = buildHtml('.');

  // Under 16 MB
  const byteSize = Buffer.byteLength(html, 'utf8');
  assert.ok(byteSize < 16 * 1024 * 1024, `Built HTML is ${byteSize} bytes, must be under 16 MB`);

  // <title>Exam Lines</title> in first 8 KB
  const first8K = html.slice(0, 8192);
  assert.ok(first8K.includes('<title>Exam Lines</title>'), '<title>Exam Lines</title> must be in first 8 KB');

  // No doctype, html, head, or body tags
  assert.ok(!/<!doctype/i.test(html), 'Must not contain <!DOCTYPE>');
  assert.ok(!/<html[\s>]/i.test(html), 'Must not contain <html>');
  assert.ok(!/<head[\s>]/i.test(html), 'Must not contain <head>');
  assert.ok(!/<body[\s>]/i.test(html), 'Must not contain <body>');

  // Exactly one <script> tag
  const scriptMatches = html.match(/<script\b/gi) || [];
  assert.equal(scriptMatches.length, 1, `Expected exactly 1 <script> tag, got ${scriptMatches.length}`);

  // Only allowed <link href> are Google Fonts
  const linkMatches = [...html.matchAll(/<link\s+[^>]*href=["']([^"']+)["']/gi)];
  for (const match of linkMatches) {
    const href = match[1];
    assert.ok(
      href.includes('fonts.googleapis.com') || href.includes('fonts.gstatic.com'),
      `Disallowed link href: ${href}`
    );
  }

  // Extract script content
  const scriptStart = html.indexOf('<script>') + '<script>'.length;
  const scriptEnd = html.lastIndexOf('</script>');
  assert.ok(scriptStart > 0 && scriptEnd > scriptStart);
  const js = html.slice(scriptStart, scriptEnd);

  // Check no import or export keywords outside strings/comments
  // And no innerHTML, outerHTML =, insertAdjacentHTML, document.write, alert, confirm, prompt
  const forbiddenPatterns = [
    { re: /\binnerHTML\b/, name: 'innerHTML' },
    { re: /\bouterHTML\s*=/, name: 'outerHTML =' },
    { re: /\binsertAdjacentHTML\b/, name: 'insertAdjacentHTML' },
    { re: /\bdocument\.write\b/, name: 'document.write' },
    { re: /\balert\s*\(/, name: 'alert(' },
    { re: /\bconfirm\s*\(/, name: 'confirm(' },
    { re: /\bprompt\s*\(/, name: 'prompt(' },
  ];

  for (const { re, name } of forbiddenPatterns) {
    assert.ok(!re.test(js), `Forbidden DOM API found in concatenated script: ${name}`);
  }

  // Compile with node:vm to catch syntax errors and duplicate top-level identifiers
  assert.doesNotThrow(() => {
    new vm.Script(js);
  }, 'Concatenated script must compile cleanly in vm.Script without duplicate top-level declarations');
});

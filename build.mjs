import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const MODULE_ORDER = [
  'src/js/sections.js', 'src/js/exams.js', 'src/js/util.js', 'src/js/validate.js', 'src/js/select.js',
  'src/js/scoring.js', 'src/js/session.js', 'src/js/store.js', 'src/js/generate.js', 'src/js/library.js',
  'src/js/providers.js',
  'src/bank/section1.js', 'src/bank/section2.js', 'src/bank/section3.js', 'src/bank/section4.js',
  'src/bank/section5.js', 'src/bank/section6.js', 'src/bank/index.js',
  'src/bank/aws/domain1.js', 'src/bank/aws/domain2.js', 'src/bank/aws/domain3.js', 'src/bank/aws/domain4.js',
  'src/bank/aws/index.js',
  'src/ui/dom.js', 'src/ui/keys.js', 'src/ui/viewmodels.js', 'src/ui/chrome.js', 'src/ui/overlay.js',
  'src/ui/map.js', 'src/ui/home.js', 'src/ui/quiz.js', 'src/ui/results.js', 'src/ui/history.js',
  'src/runtime.js', 'src/main.js',
];

export function stripModuleSyntax(src) {
  // Removes whole-line import ... ; statements (including multi-line ones)
  let out = src.replace(/^import\s+[^;]+;[ \t]*\r?\n?/gm, '');
  // Strips leading export only before const|let|function|async function|class
  out = out.replace(/^export\s+(?=(?:const|let|function|async\s+function|class)\b)/gm, '');
  return out;
}

export function buildHtml(root = '.') {
  const shellPath = resolve(root, 'src/shell.html');
  const cssPath = resolve(root, 'src/styles.css');
  const shell = readFileSync(shellPath, 'utf8');
  const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';

  const moduleSnippets = [];
  for (const modRel of MODULE_ORDER) {
    const modPath = resolve(root, modRel);
    if (existsSync(modPath)) {
      const raw = readFileSync(modPath, 'utf8');
      const stripped = stripModuleSyntax(raw);
      moduleSnippets.push(`// ---- ${modRel}\n${stripped}`);
    }
  }

  const scriptContent = `(() => {\n'use strict';\n${moduleSnippets.join('\n\n')}\n})();`;

  let html = shell.replace('/*__STYLES__*/', () => css);
  html = html.replace('/*__SCRIPT__*/', () => scriptContent);
  return html;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = process.cwd();
  const distDir = resolve(root, 'dist');
  mkdirSync(distDir, { recursive: true });

  const html = buildHtml(root);
  const examLinesPath = join(distDir, 'exam-lines.html');
  const indexPath = join(distDir, 'index.html');

  writeFileSync(examLinesPath, html, 'utf8');
  writeFileSync(indexPath, html, 'utf8');

  for (const asset of ['manifest.json', 'sw.js', 'icon.svg']) {
    const srcAsset = resolve(root, 'src', asset);
    if (existsSync(srcAsset)) {
      copyFileSync(srcAsset, join(distDir, asset));
    }
  }

  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log(`Built ${examLinesPath} and ${indexPath} (${kb} KB)`);
}

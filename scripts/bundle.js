// Bitropolis — mini « bundler » sans dépendance : concatène three.js + nos modules dans
// un seul fichier HTML autonome (fonctionne en file://, sans serveur, sans Internet).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { assetsScript } from './assets.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = [
  'src/core/rules.js',
  'src/core/analyze.js',
  'src/core/layout.js',
  'src/core/terrain.js',
  'src/core/catalog.js',
  'src/core/grid.js',
  'src/core/obf.js',
  'src/viewer/assets.js',
  'src/viewer/themes/lowpoly.js',
  'src/viewer/themes/index.js',
  'src/viewer/controls.js',
  'src/viewer/landscape.js',
  'src/viewer/citypack.js',
  'src/viewer/traffic.js',
  'src/viewer/render.js',
  'src/viewer/ui.js',
  'src/viewer/main.js'
];

function threeSource() {
  const require = createRequire(import.meta.url);
  const pkgDir = path.resolve(path.dirname(require.resolve('three')), '..');
  const src = fs.readFileSync(path.join(pkgDir, 'build/three.module.min.js'), 'utf8');
  const i = src.lastIndexOf('export{');
  if (i < 0) throw new Error('Format de three.module.min.js inattendu');
  const list = src.slice(i + 7, src.indexOf('}', i));
  const props = list.split(',').map((s) => {
    const [local, exported] = s.trim().split(/\s+as\s+/);
    return exported ? `${exported}:${local}` : local;
  });
  return '{\n' + src.slice(0, i) + `\nglobalThis.THREE = {${props.join(',')}};\n}\n`;
}

function stripModule(code, file) {
  return code
    .split('\n')
    .filter((l) => !/^\s*import\s.+from\s+['"].+['"];?\s*$/.test(l))
    .map((l) => l.replace(/^export\s+(?=(const|let|function|class|async)\b)/, ''))
    .join('\n')
    .replace(/^/, `// ---- ${file}\n`);
}

export function buildAppScript() {
  return [threeSource(), assetsScript(), ...MODULES.map((m) => stripModule(fs.readFileSync(path.join(ROOT, m), 'utf8'), m))].join('\n');
}

function safeJSON(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
}

export function renderHTML({ data = null, demo = null, appScript } = {}) {
  const tpl = fs.readFileSync(path.join(ROOT, 'src/viewer/template.html'), 'utf8');
  const app = (appScript || buildAppScript()).replace(/<\/script/gi, '<\\/script');
  return tpl
    .replace('/*__DATA__*/', () => safeJSON(data))
    .replace('/*__DEMO__*/', () => safeJSON(demo))
    .replace('/*__APP__*/', () => app);
}

export function injectData(html, data) {
  const marker = '<script id="bitropolis-data" type="application/json">';
  const start = html.indexOf(marker) + marker.length;
  const end = html.indexOf('</script>', start);
  return html.slice(0, start) + safeJSON(data) + html.slice(end);
}

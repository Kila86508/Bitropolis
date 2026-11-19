#!/usr/bin/env node
// Bitropolis — CLI : analyse un dossier et génère une ville 3D dans un seul fichier HTML.
// 100 % local : aucune requête réseau, aucun code source copié dans le résultat.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scanDirectory } from '../src/node/scan.js';
import { analyzeProject, KINDS } from '../src/core/analyze.js';
import { growthSnapshot } from '../src/core/catalog.js';
import { t, setLang, fmtNum, kindLabel } from '../src/viewer/i18n.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

// Langue : --lang xx, sinon BITROPOLIS_LANG, sinon celle du système (voir i18n.js)
{
  const i = process.argv.findIndex((x) => x === '--lang' || x === '-l');
  const code = (i >= 0 && process.argv[i + 1]) || process.env.BITROPOLIS_LANG;
  if (code) setLang(String(code).slice(0, 2).toLowerCase());
}

const pad = (s, w) => (s + ' ').padEnd(w);
const HELP = () => `
  🏙️  Bitropolis ${VERSION} — ${t('cli.tagline')}

  ${t('cli.usage')}
    bitropolis [${t('cli.arg.dir')}] [options]

  ${t('cli.options')}
    -o, --out ${pad(`<${t('cli.arg.file')}>`, 12)}${t('cli.o.out')}
    -n, --name ${pad(`<${t('cli.arg.name')}>`, 11)}${t('cli.o.name')}
        --json            ${t('cli.o.json')}
        --no-open         ${t('cli.o.noopen')}
    -l, --lang <xx>       ${t('cli.o.lang')}
    -v, --version         ${t('cli.o.version')}
    -h, --help            ${t('cli.o.help')}

  ${t('cli.examples')}
    npx bitropolis                     # ${t('cli.ex.cwd')}
    npx bitropolis ~/code/my-game -o my-game.html
`;

function parseArgs(argv) {
  const o = { dir: '.', out: null, name: null, json: false, open: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') o.help = true;
    else if (a === '-v' || a === '--version') o.version = true;
    else if (a === '-o' || a === '--out') o.out = argv[++i];
    else if (a === '-n' || a === '--name') o.name = argv[++i];
    else if (a === '--json') o.json = true;
    else if (a === '--no-open') o.open = false;
    else if (a === '-l' || a === '--lang') i++;
    else if (a.startsWith('-')) { console.error(t('cli.unknown', { a })); process.exit(1); }
    else o.dir = a;
  }
  return o;
}

function openInBrowser(file) {
  const url = 'file://' + file;
  const cmd = process.platform === 'darwin' ? ['open', [file]]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', file]]
    : ['xdg-open', [file]];
  try {
    const child = spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true });
    child.on('error', () => console.log('   ' + t('cli.openit', { url })));
    child.unref();
  } catch { console.log('   ' + t('cli.openit', { url })); }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(HELP()); return; }
  if (opts.version) { console.log(VERSION); return; }

  const dir = path.resolve(opts.dir);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error('❌ ' + t('cli.notfound', { dir }));
    process.exit(1);
  }
  const name = opts.name || path.basename(dir);
  console.log('\n🏗️  ' + t('cli.building', { name }));

  const t0 = Date.now();
  const raw = await scanDirectory(dir, { onProgress: (n) => process.stdout.isTTY && process.stdout.write('\r   📂 ' + t('cli.reading', { n })) });
  if (process.stdout.isTTY) process.stdout.write('\r' + ' '.repeat(40) + '\r');
  if (!raw.length) { console.error('❌ ' + t('cli.nofiles')); process.exit(1); }
  const analysis = analyzeProject(raw, { name, skipped: raw.skipped });
  const s = analysis.stats;

  // Ville précédente au même endroit : on garde le stade de chaque bâtiment pour animer ce qui a grandi.
  const out = path.resolve(opts.out || path.join(process.cwd(), 'bitropolis-city', 'index.html'));
  try {
    const old = fs.readFileSync(out, 'utf8');
    const marker = '<script id="bitropolis-data" type="application/json">';
    const i = old.indexOf(marker);
    if (i >= 0) {
      const prev = JSON.parse(old.slice(i + marker.length, old.indexOf('</script>', i)));
      if (prev && prev.files) analysis.previous = growthSnapshot(prev.files, prev.generatedAt);
    }
  } catch { /* première génération */ }

  let template = path.join(ROOT, 'dist/bitropolis.html');
  let html;
  if (fs.existsSync(template)) {
    const { injectData } = await import('../scripts/bundle.js');
    html = injectData(fs.readFileSync(template, 'utf8'), analysis);
  } else {
    const { renderHTML } = await import('../scripts/bundle.js');
    html = renderHTML({ data: analysis });
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  if (opts.json) fs.writeFileSync(out.replace(/\.html?$/i, '') + '.city.json', JSON.stringify(analysis, null, 2));

  const top = Object.entries(s.kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${KINDS[k].icon} ${n} ${kindLabel(k).toLowerCase()}`).join(' · ');
  console.log('   🏢 ' + t('cli.summary', { files: fmtNum(s.files), loc: fmtNum(s.loc), edges: fmtNum(s.edges) }));
  console.log(`   🗺️  ${top}`);
  if (analysis.truncated) console.log('   ⚠️  ' + t('cli.truncated', { n: fmtNum(analysis.truncated) }));
  console.log('   ✅ ' + t('cli.ready', { s: ((Date.now() - t0) / 1000).toFixed(1), out: path.relative(process.cwd(), out) || out }));
  console.log('   🔒 ' + t('cli.local') + '\n');
  if (opts.open) openInBrowser(out);
}

main().catch((err) => { console.error('❌', err); process.exit(1); });

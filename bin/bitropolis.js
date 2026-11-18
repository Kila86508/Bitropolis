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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

const HELP = `
  🏙️  Bitropolis ${VERSION} — ton code devient une ville

  Utilisation
    bitropolis [dossier] [options]

  Options
    -o, --out <fichier>   Fichier HTML à créer (défaut : ./bitropolis-city/index.html)
    -n, --name <nom>      Nom de la ville (défaut : nom du dossier)
        --json            Écrit aussi l'analyse brute (city.json) à côté du HTML
        --no-open         Ne pas ouvrir le navigateur
    -v, --version         Version
    -h, --help            Aide

  Exemples
    bitropolis                     # la ville du dossier courant
    bitropolis ~/code/mon-jeu -o mon-jeu.html
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
    else if (a.startsWith('-')) { console.error(`Option inconnue : ${a}`); process.exit(1); }
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
    child.on('error', () => console.log(`   Ouvre ce fichier dans ton navigateur : ${url}`));
    child.unref();
  } catch { console.log(`   Ouvre ce fichier dans ton navigateur : ${url}`); }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(HELP); return; }
  if (opts.version) { console.log(VERSION); return; }

  const dir = path.resolve(opts.dir);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error(`❌ Dossier introuvable : ${dir}`);
    process.exit(1);
  }
  const name = opts.name || path.basename(dir);
  console.log(`\n🏗️  Bitropolis — construction de « ${name} »`);

  const t0 = Date.now();
  const raw = scanDirectory(dir, { onProgress: (n) => process.stdout.isTTY && process.stdout.write(`\r   📂 ${n} fichiers lus…`) });
  if (process.stdout.isTTY) process.stdout.write('\r' + ' '.repeat(40) + '\r');
  if (!raw.length) { console.error('❌ Aucun fichier exploitable dans ce dossier.'); process.exit(1); }
  const analysis = analyzeProject(raw, { name });
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

  const top = Object.entries(s.kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${KINDS[k].icon} ${n} ${KINDS[k].label.toLowerCase()}`).join(' · ');
  console.log(`   🏢 ${s.files} bâtiments · 📝 ${s.loc.toLocaleString('fr-FR')} lignes · 🔗 ${s.edges} liaisons`);
  console.log(`   🗺️  ${top}`);
  if (analysis.truncated) console.log(`   ⚠️  ${analysis.truncated} fichiers mineurs ignorés (projet géant)`);
  console.log(`   ✅ Ville prête en ${((Date.now() - t0) / 1000).toFixed(1)} s → ${path.relative(process.cwd(), out) || out}`);
  console.log(`   🔒 100 % local : aucun code source n'est copié, rien n'est envoyé.\n`);
  if (opts.open) openInBrowser(out);
}

main().catch((err) => { console.error('❌', err); process.exit(1); });

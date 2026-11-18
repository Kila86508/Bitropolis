// Construit dist/bitropolis.html (visualiseur autonome + ville démo = Bitropolis lui-même).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderHTML } from './bundle.js';
import { scanDirectory } from '../src/node/scan.js';
import { analyzeProject } from '../src/core/analyze.js';
import { demoProject } from './demo-project.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Ville démo : un faux projet (par défaut) ou un vrai dossier via BITROPOLIS_DEMO=chemin
const demoDir = process.env.BITROPOLIS_DEMO;
const demo = demoDir
  ? analyzeProject(scanDirectory(demoDir), { name: path.basename(path.resolve(demoDir)) })
  : analyzeProject(demoProject(), { name: 'hotel-booking (démo)' });
const html = renderHTML({ data: null, demo });
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist/bitropolis.html'), html);
console.log(`dist/bitropolis.html  ${(html.length / 1024).toFixed(0)} Ko  (démo : ${demo.stats.files} fichiers)`);

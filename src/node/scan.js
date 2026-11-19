// Bitropolis — lecture locale d'un dossier (Node.js). Rien n'est envoyé nulle part.
import fs from 'node:fs';
import path from 'node:path';
import { shouldSkipDir, shouldSkipFile, shouldReadContent, makeIgnoreMatcher, selectFiles, SCAN_LIMIT } from '../core/rules.js';

// Exécute fn sur chaque élément, `width` à la fois (les accès disque en parallèle vont bien plus vite).
async function scanPool(items, width, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(width, items.length) }, async () => {
    while (i < items.length) { const k = i++; await fn(items[k], k); }
  }));
}

// 1) parcourt tout le projet (noms et tailles seulement), 2) choisit les fichiers représentatifs,
// 3) ne lit que ceux-là. Le tableau renvoyé porte `skipped` : le nombre de fichiers écartés.
export async function scanDirectory(rootDir, { onProgress } = {}) {
  const root = path.resolve(rootDir);
  let gitignore = '';
  try { gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8'); } catch {}
  const ignored = makeIgnoreMatcher(gitignore);
  const found = [];
  const walk = (abs, rel) => {
    let entries;
    try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
    entries.sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const e of entries) {
      if (found.length >= SCAN_LIMIT) return;
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        if (shouldSkipDir(e.name) || ignored(r, true)) continue;
        walk(path.join(abs, e.name), r);
      } else if (e.isFile()) {
        if (shouldSkipFile(e.name) || ignored(r, false)) continue;
        found.push({ path: r, abs: path.join(abs, e.name), size: -1 });
      }
    }
  };
  walk(root, '');

  let done = 0;
  await scanPool(found, 48, async (f) => {
    try { f.size = (await fs.promises.stat(f.abs)).size; } catch {}
    if (onProgress && ++done % 1000 === 0) onProgress(done);
  });
  const listed = found.filter((f) => f.size >= 0);
  const chosen = selectFiles(listed);

  const out = new Array(chosen.length);
  await scanPool(chosen, 48, async ({ path: r, abs, size }, k) => {
    let content = null;
    if (shouldReadContent(r, size)) {
      try {
        const buf = await fs.promises.readFile(abs);
        // fichier binaire déguisé ? (octet nul dans le début)
        if (!buf.subarray(0, 8000).includes(0)) content = buf.toString('utf8');
      } catch {}
    }
    out[k] = { path: r, size, content };
  });
  out.skipped = listed.length - chosen.length;
  return out;
}

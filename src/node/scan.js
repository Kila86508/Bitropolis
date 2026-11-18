// Bitropolis — lecture locale d'un dossier (Node.js). Rien n'est envoyé nulle part.
import fs from 'node:fs';
import path from 'node:path';
import { shouldSkipDir, shouldSkipFile, shouldReadContent, makeIgnoreMatcher, MAX_FILES } from '../core/rules.js';

export function scanDirectory(rootDir, { onProgress } = {}) {
  const root = path.resolve(rootDir);
  let gitignore = '';
  try { gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8'); } catch {}
  const ignored = makeIgnoreMatcher(gitignore);
  const out = [];
  const hardLimit = MAX_FILES * 3;
  const walk = (abs, rel) => {
    let entries;
    try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
    entries.sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const e of entries) {
      if (out.length >= hardLimit) return;
      const r = rel ? rel + '/' + e.name : e.name;
      const a = path.join(abs, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        if (shouldSkipDir(e.name) || ignored(r, true)) continue;
        walk(a, r);
      } else if (e.isFile()) {
        if (shouldSkipFile(e.name) || ignored(r, false)) continue;
        let size = 0;
        try { size = fs.statSync(a).size; } catch { continue; }
        let content = null;
        if (shouldReadContent(r, size)) {
          try {
            const buf = fs.readFileSync(a);
            // fichier binaire déguisé ? (octet nul dans le début)
            if (!buf.subarray(0, 8000).includes(0)) content = buf.toString('utf8');
          } catch {}
        }
        out.push({ path: r, size, content });
        if (onProgress && out.length % 200 === 0) onProgress(out.length);
      }
    }
  };
  walk(root, '');
  return out;
}

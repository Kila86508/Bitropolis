// Bitropolis — analyse d'un projet : métriques, dépendances, importance, type de bâtiment.
// Entrée : [{ path, size, content|null }]. Sortie : modèle sans aucun code source.
import { baseName, dirName, extOf, stripExt, langOf, ASSET_EXT, CODE_EXT, MAX_FILES, selectFiles } from './rules.js';

export const KINDS = {
  townhall: { label: 'Hôtel de ville', role: "Point d'entrée principal du projet", icon: '🏛️' },
  tower:    { label: 'Immeuble', role: 'Code source', icon: '🏢' },
  shop:     { label: 'Commerces', role: 'Interface : composants, vues, styles', icon: '🛍️' },
  bank:     { label: 'Banque', role: 'Données : modèles, schémas, état', icon: '🏦' },
  police:   { label: 'Commissariat', role: 'Tests & sécurité', icon: '🚓' },
  fire:     { label: 'Caserne de pompiers', role: 'CI/CD, Docker, scripts, déploiement', icon: '🚒' },
  hospital: { label: 'Hôpital', role: 'Erreurs, logs, monitoring', icon: '🏥' },
  library:  { label: 'Bibliothèque', role: 'Documentation', icon: '📚' },
  factory:  { label: 'Usine', role: 'Configuration & outillage', icon: '🏭' },
  power:    { label: 'Centrale électrique', role: 'Dépendances & manifestes', icon: '⚡' },
  warehouse:{ label: 'Entrepôt', role: 'Données brutes, SQL, migrations', icon: '📦' },
  park:     { label: 'Parc', role: 'Assets : images, sons, polices', icon: '🌳' }
};

export const TIER_NAMES = {
  tower: ['Maison', 'Petit immeuble', 'Immeuble', 'Tour', 'Gratte-ciel'],
  default: ['Niveau 1', 'Niveau 2', 'Niveau 3', 'Niveau 4', 'Niveau 5']
};

const RX = {
  jsImport: /(?:^|[^\w.$])(?:import|export)\s+(?:type\s+)?(?:[^'"`;]*?\s+from\s+)?['"]([^'"\n]+)['"]/g,
  jsCall: /\b(?:require|import)\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g,
  pyFrom: /^[ \t]*from[ \t]+([.\w]+)[ \t]+import\b/gm,
  pyImport: /^[ \t]*import[ \t]+([\w.]+(?:[ \t]*,[ \t]*[\w.]+)*)/gm,
  goSingle: /\bimport[ \t]+(?:[\w.]+[ \t]+)?"([^"]+)"/g,
  goBlock: /\bimport[ \t]*\(([\s\S]*?)\)/g,
  quoted: /"([^"]+)"/g,
  rsMod: /^[ \t]*(?:pub(?:\([^)]*\))?[ \t]+)?mod[ \t]+(\w+)[ \t]*;/gm,
  rsUse: /\buse[ \t]+(crate|super|self)::([\w:]+)/g,
  jvImport: /^[ \t]*import[ \t]+(?:static[ \t]+)?([\w.]+)/gm,
  cInclude: /#[ \t]*include[ \t]*"([^"]+)"/g,
  cIncludeSys: /#[ \t]*include[ \t]*<([^>\n]+)>/g,
  cssImport: /@(?:import|use|forward)\s+(?:url\()?\s*['"]?([^'")\s;]+)/g,
  phpReq: /\b(?:require|include)(?:_once)?\s*\(?\s*['"]([^'"]+)['"]/g,
  phpUse: /^[ \t]*use[ \t]+([\w\\]+)/gm,
  rbRel: /\brequire_relative\s*\(?\s*['"]([^'"]+)['"]/g,
  rbReq: /\brequire\s*\(?\s*['"]([^'"]+)['"]/g,
  htmlRef: /<(?:script|link|img|source)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"'#?]+)/gi,
  dartImport: /\b(?:import|export|part)\s+['"]([^'"]+)['"]/g,
  luaReq: /\brequire\s*\(?\s*['"]([^'"]+)['"]/g,
  csUsing: /^[ \t]*using[ \t]+([\w.]+)\s*;/gm,
  funcs: /\b(?:function|def|fn|func|fun|sub|proc)\b|=>/g,
  classes: /\b(?:class|struct|interface|trait|enum|impl)\s+[A-Z_a-z]/g,
  branches: /\b(?:if|for|while|case|catch|elif|elsif|except|when|guard|match)\b|&&|\|\|/g,
  todos: /\b(?:TODO|FIXME|HACK|XXX|BUG)\b/g
};

function allMatches(rx, text, group = 1) {
  const out = []; rx.lastIndex = 0; let m;
  while ((m = rx.exec(text))) { out.push(m[group]); if (m.index === rx.lastIndex) rx.lastIndex++; }
  return out;
}
function countMatches(rx, text) { rx.lastIndex = 0; let n = 0; while (rx.exec(text)) n++; return n; }

// Extrait des « specs » d'import : { s: chaîne, t: 'rel'|'alias'|'dotted'|'pyrel'|'suffix'|'gopkg'|'rsmod'|'bare' }
function extractImports(path, ext, text) {
  const specs = [];
  const add = (s, t) => { if (s && s.length < 300) specs.push({ s, t }); };
  const jsLike = (txt) => {
    for (const s of allMatches(RX.jsImport, txt).concat(allMatches(RX.jsCall, txt))) {
      if (s.startsWith('.') || s.startsWith('/')) add(s, 'rel');
      else if (/^(@\/|~\/|#\/|\$lib\/|src\/|app\/)/.test(s)) add(s.replace(/^(@|~|#|\$lib)\//, ''), 'alias');
      else add(s, 'bare');
    }
  };
  switch (ext) {
    case 'js': case 'mjs': case 'cjs': case 'jsx': case 'ts': case 'mts': case 'cts': case 'tsx':
    case 'vue': case 'svelte': case 'astro':
      jsLike(text);
      if (ext === 'vue' || ext === 'svelte' || ext === 'astro') for (const s of allMatches(RX.cssImport, text)) if (s.startsWith('.')) add(s, 'rel');
      break;
    case 'py': case 'pyw':
      for (const s of allMatches(RX.pyFrom, text)) add(s, s.startsWith('.') ? 'pyrel' : 'dotted');
      for (const grp of allMatches(RX.pyImport, text)) for (const s of grp.split(',')) add(s.trim(), 'dotted');
      break;
    case 'go': {
      for (const s of allMatches(RX.goSingle, text)) add(s, 'gopkg');
      for (const blk of allMatches(RX.goBlock, text)) for (const s of allMatches(RX.quoted, blk)) add(s, 'gopkg');
      break;
    }
    case 'rs':
      for (const s of allMatches(RX.rsMod, text)) add(s, 'rsmod');
      RX.rsUse.lastIndex = 0; { let m; while ((m = RX.rsUse.exec(text))) add(m[2].replace(/::\{.*$/, '').split('::').filter(Boolean).join('/'), 'suffix'); }
      break;
    case 'java': case 'kt': case 'kts': case 'scala': case 'groovy':
      for (const s of allMatches(RX.jvImport, text)) add(s.replace(/\.\*$/, ''), 'dotted');
      break;
    case 'c': case 'h': case 'cpp': case 'cc': case 'cxx': case 'hpp': case 'hh': case 'm': case 'mm':
      for (const s of allMatches(RX.cInclude, text)) add(s, 'rel');
      for (const s of allMatches(RX.cIncludeSys, text)) add(s, 'cinc');
      break;
    case 'css': case 'scss': case 'sass': case 'less': case 'styl':
      for (const s of allMatches(RX.cssImport, text)) if (!/^(https?:|\/\/|data:)/.test(s)) add(s, s.startsWith('.') ? 'rel' : 'relish');
      break;
    case 'php':
      for (const s of allMatches(RX.phpReq, text)) add(s, 'rel');
      for (const s of allMatches(RX.phpUse, text)) add(s.replace(/\\/g, '.'), 'dotted');
      break;
    case 'rb': case 'erb':
      for (const s of allMatches(RX.rbRel, text)) add(s, 'rel');
      for (const s of allMatches(RX.rbReq, text)) add(s, 'suffix');
      break;
    case 'html': case 'htm':
      for (const s of allMatches(RX.htmlRef, text)) if (!/^(https?:|\/\/|data:|mailto:)/.test(s)) add(s, 'relish');
      jsLike(text);
      break;
    case 'dart':
      for (const s of allMatches(RX.dartImport, text)) {
        if (s.startsWith('dart:')) continue;
        if (s.startsWith('package:')) add(s.replace(/^package:[^/]+\//, ''), 'suffix'); else add(s, 'rel');
      }
      break;
    case 'lua':
      for (const s of allMatches(RX.luaReq, text)) add(s, 'dotted');
      break;
    case 'cs':
      for (const s of allMatches(RX.csUsing, text)) add(s, 'dotted');
      break;
  }
  return specs;
}

function normPath(p) {
  const out = [];
  for (const seg of p.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') out.pop(); else out.push(seg);
  }
  return out.join('/');
}
function joinPath(a, b) { return normPath(a ? a + '/' + b : b); }

function commonPrefixLen(a, b) {
  const n = Math.min(a.length, b.length); let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

function buildIndex(files) {
  const exact = new Map();   // chemin (avec ou sans extension) -> id
  const suffix = new Map();  // suffixe sans extension -> [ids]
  const dirs = new Map();    // dossier -> [ids]
  const indexNames = new Set(['index', '__init__', 'mod', 'main', 'lib', '_index', 'init']);
  const put = (m, k, id) => { if (!m.has(k)) m.set(k, id); };
  for (const f of files) {
    put(exact, f.path, f.id);
    const ne = stripExt(f.path);
    put(exact, ne, f.id);
    const stem = baseName(ne);
    if (indexNames.has(stem.toLowerCase()) && f.dir) put(exact, f.dir, f.id);
    const segs = ne.split('/');
    for (let k = 1; k <= Math.min(5, segs.length); k++) {
      const key = segs.slice(segs.length - k).join('/');
      if (!suffix.has(key)) suffix.set(key, []);
      suffix.get(key).push(f.id);
      if (indexNames.has(stem.toLowerCase()) && k < segs.length) {
        const dkey = segs.slice(segs.length - k - 1, segs.length - 1).join('/');
        if (!suffix.has(dkey)) suffix.set(dkey, []);
        suffix.get(dkey).push(f.id);
      }
    }
    if (!dirs.has(f.dir)) dirs.set(f.dir, []);
    dirs.get(f.dir).push(f.id);
  }
  return { exact, suffix, dirs };
}

function pickClosest(ids, from, files) {
  if (!ids || !ids.length) return -1;
  if (ids.length === 1) return ids[0];
  let best = ids[0], bestScore = -1;
  for (const id of ids) {
    const s = commonPrefixLen(files[id].path, from.path);
    if (s > bestScore) { bestScore = s; best = id; }
  }
  return best;
}

function resolveSpec(f, spec, idx, files) {
  const { s, t } = spec;
  const tryExact = (p) => (idx.exact.has(p) ? idx.exact.get(p) : (idx.exact.has(stripExt(p)) ? idx.exact.get(stripExt(p)) : -1));
  const trySuffix = (p) => pickClosest(idx.suffix.get(normPath(stripExt(p))), f, files);
  const clean = s.replace(/[?#].*$/, '');
  switch (t) {
    case 'rel': case 'relish': {
      const base = clean.startsWith('/') ? clean.slice(1) : joinPath(f.dir, clean);
      let id = tryExact(base);
      if (id < 0 && t === 'relish') id = tryExact(joinPath(f.dir, clean));
      if (id < 0) {
        // SCSS partials : _nom.scss
        const d = dirName(base), b = baseName(base);
        id = tryExact((d ? d + '/' : '') + '_' + b);
      }
      if (id < 0 && (f.ext === 'c' || f.ext === 'h' || f.ext === 'cpp' || f.ext === 'hpp' || f.ext === 'cc')) id = trySuffix(clean);
      return id;
    }
    case 'cinc': {
      // #include <linux/sched.h> : à côté du fichier, sinon dans un dossier include/ du projet
      // (include/, arch/x86/include/, include/uapi/…). <stdio.h> sans équivalent dans le projet reste externe.
      const p = normPath(clean);
      const near = tryExact(joinPath(f.dir, p));
      if (near >= 0) return near;
      const cands = idx.suffix.get(stripExt(p));
      if (!cands) return -1;
      const ok = cands.filter((c) => {
        const fp = files[c].path;
        if (!fp.endsWith(p)) return false;
        const pre = fp.slice(0, fp.length - p.length);
        return pre === '' || /(^|\/)include\/(uapi\/|generated\/)?$/.test(pre);
      });
      return pickClosest(ok, f, files);
    }
    case 'alias': {
      let id = tryExact(normPath(clean));
      if (id < 0) id = tryExact('src/' + normPath(clean));
      if (id < 0) id = trySuffix(clean);
      return id;
    }
    case 'pyrel': {
      const dots = clean.match(/^\.+/)[0].length;
      let d = f.dir;
      for (let i = 1; i < dots; i++) d = dirName(d);
      const rest = clean.slice(dots).replace(/\./g, '/');
      return rest ? tryExact(joinPath(d, rest)) : tryExact(d);
    }
    case 'dotted': {
      const p = clean.replace(/\./g, '/');
      let id = tryExact(p);
      if (id < 0) id = trySuffix(p);
      // java : com.foo.Bar.baz -> on retire le dernier segment
      if (id < 0 && p.includes('/')) id = trySuffix(dirName(p));
      return id;
    }
    case 'gopkg': {
      const segs = clean.split('/');
      for (let k = Math.min(3, segs.length); k >= 1; k--) {
        const key = segs.slice(segs.length - k).join('/');
        for (const [d, ids] of idx.dirs) {
          if (d === key || d.endsWith('/' + key)) return ids.slice().sort((a, b) => files[b].loc - files[a].loc)[0];
        }
      }
      return -1;
    }
    case 'rsmod': {
      const stem = baseName(stripExt(f.path));
      const d = ['mod', 'lib', 'main'].includes(stem) ? f.dir : joinPath(f.dir, stem);
      let id = tryExact(joinPath(d, clean));
      if (id < 0) id = tryExact(joinPath(d, clean + '/mod'));
      return id;
    }
    case 'suffix': {
      let id = trySuffix(clean);
      if (id < 0 && clean.includes('/')) id = trySuffix(dirName(clean));
      return id;
    }
    default: return -1; // 'bare' => paquet externe
  }
}

function classify(f) {
  const name = f.name.toLowerCase();
  const stem = stripExt(name);
  const segs = f.dir.toLowerCase().split('/').filter(Boolean);
  const inDir = (...xs) => segs.some((s) => xs.includes(s));
  const ext = f.ext;
  if (ASSET_EXT.has(ext)) return 'park';
  if (/(^|[._-])(test|tests|spec|specs|e2e|bench)([._-]|$)/.test(name) || /^test_/.test(name) || /_test$/.test(stem) ||
      inDir('test', 'tests', '__tests__', 'spec', 'specs', 'e2e', 'cypress', 'playwright', '__mocks__', 'fixtures-test'))
    return 'police';
  if (/(auth|security|secur|guard|permission|crypto|password|passwd|token|session|policy|firewall|sanitiz|csrf|oauth|jwt|acl|captcha)/.test(stem))
    return 'police';
  if (/^(dockerfile|docker-compose|compose|jenkinsfile|procfile|vagrantfile|makefile|gnumakefile|\.gitlab-ci|netlify|vercel|fly|render|app\.yaml|skaffold|cloudbuild|azure-pipelines|\.travis|appveyor)/.test(name) ||
      ['sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd', 'dockerfile', 'makefile', 'tf'].includes(ext) ||
      inDir('.github', '.gitlab', '.circleci', '.husky', 'ci', 'deploy', 'deployment', 'docker', 'k8s', 'kubernetes', 'helm', 'infra', 'terraform', 'ansible', 'scripts', 'script', 'bin', 'tools', 'devops', '.devcontainer'))
    return 'fire';
  if (/(error|exception|crash|health|monitor|logger|logging|^log$|^logs$|sentry|telemetry|metrics|recover|retry|fallback|panic|debug|diagnos|trace)/.test(stem))
    return 'hospital';
  if (/^(package\.json|cargo\.toml|go\.mod|go\.sum|pyproject\.toml|setup\.py|setup\.cfg|pipfile|gemfile|composer\.json|pom\.xml|build\.gradle(\.kts)?|settings\.gradle(\.kts)?|pubspec\.yaml|mix\.exs|deno\.json|bun\.lockb|requirements.*\.txt|.*\.csproj|.*\.sln|.*\.gemspec|.*\.cabal|.*\.nimble|cmakelists\.txt|meson\.build|flake\.nix)$/.test(name) ||
      /\.lock$|lock\.(json|yaml)$/.test(name))
    return 'power';
  if (['md', 'mdx', 'rst', 'txt', 'adoc', 'tex', 'org'].includes(ext) || /^(license|licence|copying|authors|contributors|changelog|readme|notice|code_of_conduct)/.test(name) || inDir('docs', 'doc', 'documentation', 'wiki', 'guides'))
    return 'library';
  if (['csv', 'tsv', 'sql', 'xml', 'ndjson', 'jsonl', 'graphql', 'gql', 'proto', 'prisma', 'avsc'].includes(ext) || inDir('migrations', 'migration', 'seeds', 'seeders', 'fixtures', 'data', 'datasets', 'db', 'database', 'sql'))
    return 'warehouse';
  if (['json', 'jsonc', 'yaml', 'yml', 'toml', 'ini', 'env', 'conf', 'cfg', 'properties', 'editorconfig', 'lock', 'plist'].includes(ext) || name.startsWith('.') ||
      /(config|conf|settings|setup|rc$|\.config$|constants?$|env$)/.test(stem) || inDir('config', 'configs', 'conf', 'settings'))
    return 'factory';
  if (/(model|schema|entity|entities|store|state|reducer|repository|repo$|dao|database|^db$|slice|types?$|dto|record|migration|orm|query|queries|cache)/.test(stem) || inDir('models', 'model', 'schemas', 'entities', 'store', 'stores', 'state', 'redux', 'types', 'dto', 'domain', 'repositories'))
    return 'bank';
  if (['jsx', 'tsx', 'vue', 'svelte', 'astro', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'styl', 'erb'].includes(ext) ||
      inDir('components', 'component', 'views', 'view', 'pages', 'page', 'ui', 'screens', 'widgets', 'layouts', 'templates', 'styles', 'css', 'public', 'frontend', 'client', 'app', 'routes'))
    return 'shop';
  return 'tower';
}

const ENTRY_RX = /^(main|index|app|server|program|__main__|manage|cli|application|bootstrap|start|run|entry|lib|mod|game|init)$/i;

export function analyzeProject(rawFiles, options = {}) {
  const projectName = options.name || 'projet';
  let list = rawFiles
    .filter((f) => f && f.path)
    .map((f) => ({ path: normPath(f.path.replace(/\\/g, '/')), size: f.size || 0, content: f.content }))
    .filter((f) => f.path);
  list.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  // options.skipped : fichiers déjà écartés par le scan (gros projets, voir selectFiles)
  let truncated = options.skipped || 0;
  if (list.length > MAX_FILES) {
    const before = list.length;
    list = selectFiles(list);
    truncated += before - list.length;
  }

  const files = list.map((raw, id) => {
    const ext = extOf(raw.path);
    const text = typeof raw.content === 'string' ? raw.content : null;
    let loc = 0, lines = 0;
    if (text) {
      const ls = text.split('\n');
      lines = ls.length;
      for (const l of ls) if (l.trim()) loc++;
    }
    const isCode = CODE_EXT.has(ext);
    return {
      id, path: raw.path, name: baseName(raw.path), dir: dirName(raw.path), ext,
      lang: langOf(raw.path), size: raw.size || (text ? text.length : 0), lines, loc,
      funcs: text && isCode ? countMatches(RX.funcs, text) : 0,
      classes: text && isCode ? countMatches(RX.classes, text) : 0,
      branches: text && isCode ? countMatches(RX.branches, text) : 0,
      todos: text ? countMatches(RX.todos, text) : 0,
      isCode,
      specs: text ? extractImports(raw.path, ext, text) : [],
      imports: [], importedBy: [], external: 0
    };
  });

  // Résolution des dépendances internes.
  const idx = buildIndex(files);
  const externals = new Map();
  for (const f of files) {
    const seen = new Set();
    for (const spec of f.specs) {
      const id = resolveSpec(f, spec, idx, files);
      if (id >= 0 && id !== f.id) { if (!seen.has(id)) { seen.add(id); f.imports.push(id); } }
      else if (id < 0 && (spec.t === 'bare' || spec.t === 'dotted' || spec.t === 'gopkg')) {
        f.external++;
        const pkg = spec.t === 'bare' ? (spec.s.startsWith('@') ? spec.s.split('/').slice(0, 2).join('/') : spec.s.split('/')[0]) : spec.s.split(/[./]/)[0];
        if (pkg && !pkg.startsWith('node:')) externals.set(pkg, (externals.get(pkg) || 0) + 1);
      }
    }
    delete f.specs;
  }
  for (const f of files) for (const t of f.imports) files[t].importedBy.push(f.id);

  // Importance : taille du code, nombre de fichiers qui en dépendent, complexité.
  const maxOf = (fn) => Math.max(1, ...files.map(fn));
  const mLoc = Math.log1p(maxOf((f) => f.loc));
  const mIn = Math.log1p(maxOf((f) => f.importedBy.length));
  const mOut = Math.log1p(maxOf((f) => f.imports.length));
  const mSize = Math.log1p(maxOf((f) => f.size));
  const mBr = Math.log1p(maxOf((f) => f.branches));
  for (const f of files) {
    const loc = Math.log1p(f.loc) / mLoc;
    const inn = Math.log1p(f.importedBy.length) / mIn;
    const out = Math.log1p(f.imports.length) / mOut;
    const size = Math.log1p(f.size) / mSize;
    const br = Math.log1p(f.branches) / mBr;
    f.score = f.loc > 0
      ? 0.42 * loc + 0.33 * inn + 0.1 * out + 0.15 * br
      : 0.55 * size + 0.45 * inn;
    if (!f.isCode) f.score *= 0.85;
  }
  const ranked = files.slice().sort((a, b) => b.score - a.score);
  const n = files.length;
  const cut = (p) => Math.max(1, Math.round(n * p));
  const c5 = n >= 3 ? cut(0.04) : 0, c4 = cut(0.12), c3 = cut(0.3), c2 = cut(0.6);
  ranked.forEach((f, r) => { f.tier = r < c5 ? 5 : r < c4 ? 4 : r < c3 ? 3 : r < c2 ? 2 : 1; f.rank = r + 1; });

  for (const f of files) f.kind = classify(f);

  // Un seul hôtel de ville : le point d'entrée le plus important et le moins profond.
  let hall = null, hallScore = -1;
  for (const f of files) {
    if (!f.isCode || f.kind === 'police') continue;
    const stem = stripExt(f.name);
    const depth = f.dir ? f.dir.split('/').length : 0;
    let s = f.score * 0.6 - depth * 0.25;
    if (ENTRY_RX.test(stem)) s += /^(main|index|__main__|program)$/i.test(stem) ? 0.65 : 0.45;
    s += Math.min(0.45, f.imports.length / 40) * (depth === 0 ? 1 : 0.4);
    if (/^(src|app|lib|cmd|source)$/i.test(f.dir.split('/')[0] || '')) s += 0.1;
    if (s > hallScore) { hallScore = s; hall = f; }
  }
  if (!hall) hall = ranked.find((f) => f.kind !== 'park') || null;
  if (hall) { hall.kind = 'townhall'; hall.tier = 5; }

  const kinds = {};
  for (const f of files) kinds[f.kind] = (kinds[f.kind] || 0) + 1;
  const langs = {};
  for (const f of files) if (f.loc) langs[f.lang] = (langs[f.lang] || 0) + f.loc;
  const edges = files.reduce((s, f) => s + f.imports.length, 0);

  return {
    format: 'bitropolis/1',
    name: projectName,
    generatedAt: new Date().toISOString(),
    truncated,
    stats: {
      files: n, loc: files.reduce((s, f) => s + f.loc, 0), edges, kinds, langs,
      externals: [...externals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)
    },
    files: files.map((f) => ({
      id: f.id, path: f.path, name: f.name, dir: f.dir, ext: f.ext, lang: f.lang,
      size: f.size, lines: f.lines, loc: f.loc, funcs: f.funcs, classes: f.classes,
      branches: f.branches, todos: f.todos, external: f.external,
      imports: f.imports, importedBy: f.importedBy,
      score: Math.round(f.score * 1000) / 1000, tier: f.tier, rank: f.rank, kind: f.kind
    }))
  };
}

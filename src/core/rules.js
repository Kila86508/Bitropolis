// Bitropolis — règles de scan partagées (Node + navigateur). Aucune dépendance.

export const IGNORED_DIRS = new Set([
  'node_modules', 'bower_components', 'jspm_packages', '.git', '.hg', '.svn',
  'dist', 'build', 'out', '.next', '.nuxt', '.output', '.svelte-kit', '.turbo',
  '.parcel-cache', '.cache', 'coverage', '.nyc_output', '__pycache__', '.pytest_cache',
  '.mypy_cache', '.tox', '.venv', 'venv', 'env', 'target', 'vendor', 'Pods',
  '.gradle', '.idea', '.vs', 'obj', 'DerivedData', '.dart_tool', '.expo',
  'bitropolis-city', 'site-packages', '.terraform', 'tmp', '.tmp', 'logs'
]);

// Dossiers cachés qu'on garde quand même (ils comptent dans la ville).
export const KEPT_DOT_DIRS = new Set(['.github', '.gitlab', '.circleci', '.husky', '.devcontainer', '.storybook', '.vscode']);

export const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);

export const MAX_TEXT_SIZE = 768 * 1024;   // au-delà, on ne lit pas le contenu
export const MAX_FILES = 4000;             // au-delà, on garde les plus importants

export const ASSET_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'ico', 'bmp', 'tif', 'tiff', 'psd', 'ai', 'xcf',
  'mp3', 'wav', 'ogg', 'flac', 'm4a', 'mp4', 'webm', 'mov', 'avi',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'glb', 'gltf', 'obj', 'fbx', 'blend', 'stl', 'hdr', 'exr', 'aseprite'
]);

export const BINARY_EXT = new Set([
  ...ASSET_EXT,
  'zip', 'gz', 'tgz', 'rar', '7z', 'tar', 'pdf', 'exe', 'dll', 'so', 'dylib', 'a', 'lib', 'o',
  'class', 'jar', 'war', 'pyc', 'pyo', 'wasm', 'bin', 'dat', 'db', 'sqlite', 'sqlite3', 'parquet',
  'node', 'keystore', 'jks', 'p12', 'pem', 'der', 'crt', 'key', 'map'
]);

// Fichiers texte qu'on ne lit pas (énormes et sans intérêt pour les liens).
export const NO_READ_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'Cargo.lock', 'poetry.lock', 'composer.lock', 'Gemfile.lock', 'go.sum', 'bun.lockb', 'Pipfile.lock']);

export const LANGS = {
  js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', jsx: 'React (JSX)',
  ts: 'TypeScript', mts: 'TypeScript', cts: 'TypeScript', tsx: 'React (TSX)',
  py: 'Python', pyw: 'Python', ipynb: 'Jupyter', go: 'Go', rs: 'Rust',
  java: 'Java', kt: 'Kotlin', kts: 'Kotlin', scala: 'Scala', groovy: 'Groovy', gradle: 'Gradle',
  swift: 'Swift', m: 'Objective-C', mm: 'Objective-C++',
  c: 'C', h: 'C/C++ header', cpp: 'C++', cc: 'C++', cxx: 'C++', hpp: 'C++ header', hh: 'C++ header',
  cs: 'C#', fs: 'F#', vb: 'Visual Basic', php: 'PHP', rb: 'Ruby', erb: 'Ruby (ERB)',
  lua: 'Lua', dart: 'Dart', ex: 'Elixir', exs: 'Elixir', erl: 'Erlang', hs: 'Haskell',
  clj: 'Clojure', ml: 'OCaml', r: 'R', jl: 'Julia', pl: 'Perl', zig: 'Zig', nim: 'Nim', v: 'V',
  gd: 'GDScript', sol: 'Solidity', elm: 'Elm',
  vue: 'Vue', svelte: 'Svelte', astro: 'Astro', html: 'HTML', htm: 'HTML',
  css: 'CSS', scss: 'SCSS', sass: 'Sass', less: 'Less', styl: 'Stylus',
  md: 'Markdown', mdx: 'MDX', rst: 'reStructuredText', txt: 'Texte', adoc: 'AsciiDoc',
  json: 'JSON', jsonc: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML', ini: 'INI', env: 'Env',
  xml: 'XML', sql: 'SQL', csv: 'CSV', tsv: 'TSV', graphql: 'GraphQL', gql: 'GraphQL', proto: 'Protobuf',
  sh: 'Shell', bash: 'Shell', zsh: 'Shell', fish: 'Shell', ps1: 'PowerShell', bat: 'Batch', cmd: 'Batch',
  dockerfile: 'Docker', makefile: 'Make', tf: 'Terraform', nix: 'Nix', cmake: 'CMake'
};

export const CODE_EXT = new Set([
  'js', 'mjs', 'cjs', 'jsx', 'ts', 'mts', 'cts', 'tsx', 'py', 'pyw', 'go', 'rs', 'java', 'kt', 'kts',
  'scala', 'groovy', 'swift', 'm', 'mm', 'c', 'h', 'cpp', 'cc', 'cxx', 'hpp', 'hh', 'cs', 'fs', 'vb',
  'php', 'rb', 'lua', 'dart', 'ex', 'exs', 'erl', 'hs', 'clj', 'ml', 'r', 'jl', 'pl', 'zig', 'nim',
  'gd', 'sol', 'elm', 'vue', 'svelte', 'astro', 'sh', 'bash', 'zsh', 'ps1'
]);

export function baseName(p) { const i = p.lastIndexOf('/'); return i < 0 ? p : p.slice(i + 1); }
export function dirName(p) { const i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i); }
export function extOf(p) {
  const b = baseName(p).toLowerCase();
  if (b === 'dockerfile' || b.startsWith('dockerfile.')) return 'dockerfile';
  if (b === 'makefile' || b === 'gnumakefile') return 'makefile';
  const i = b.lastIndexOf('.');
  return i <= 0 ? '' : b.slice(i + 1);
}
export function stripExt(p) {
  const b = baseName(p); const i = b.lastIndexOf('.');
  return i <= 0 ? p : p.slice(0, p.length - (b.length - i));
}
export function langOf(p) { return LANGS[extOf(p)] || (extOf(p) ? extOf(p).toUpperCase() : 'Fichier'); }
export function isBinaryPath(p) { return BINARY_EXT.has(extOf(p)); }
export function shouldReadContent(p, size) {
  return !isBinaryPath(p) && !NO_READ_FILES.has(baseName(p)) && size <= MAX_TEXT_SIZE;
}
export function shouldSkipDir(name) {
  if (IGNORED_DIRS.has(name)) return true;
  if (name.startsWith('.') && !KEPT_DOT_DIRS.has(name)) return true;
  return false;
}
export function shouldSkipFile(name) { return IGNORED_FILES.has(name); }

// Mini interprète de .gitignore (motifs simples : noms, *.ext, dossiers/, chemins).
export function makeIgnoreMatcher(text) {
  const rules = [];
  for (let line of (text || '').split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    let negate = false;
    if (line.startsWith('!')) { negate = true; line = line.slice(1); }
    let dirOnly = line.endsWith('/');
    if (dirOnly) line = line.slice(0, -1);
    const anchored = line.startsWith('/') || line.slice(0, -1).includes('/');
    if (line.startsWith('/')) line = line.slice(1);
    const re = line
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*\/?/g, '\u0000')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
      .replace(/\u0000/g, '(?:.*/)?');
    const rx = new RegExp(anchored ? `^${re}(?:/.*)?$` : `(?:^|/)${re}(?:/.*)?$`);
    rules.push({ rx, negate, dirOnly });
  }
  return (path, isDir) => {
    let ignored = false;
    for (const r of rules) {
      if (r.dirOnly && !isDir && !r.rx.test(dirName(path))) continue;
      if (r.rx.test(path)) ignored = !r.negate;
    }
    return ignored;
  };
}

// Petit générateur pseudo-aléatoire déterministe (même projet => même ville).
export function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function makeRng(seed) {
  let a = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

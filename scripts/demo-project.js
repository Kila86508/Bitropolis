// Génère un faux projet (web app « Hôtel Booking ») pour la ville de démonstration.
// Aucun vrai code n'est inclus : seulement des fichiers factices avec des imports.
import { makeRng } from '../src/core/rules.js';

export function demoProject() {
  const rng = makeRng('bitropolis-demo');
  const files = [];
  const R = (a, b) => Math.floor(a + rng() * (b - a));
  const add = (path, imports = [], loc = 40, kind = 'ts') => files.push({ path, imports, loc, kind });

  const comps = ['Button', 'Card', 'Modal', 'Navbar', 'Footer', 'Avatar', 'Calendar', 'SearchBar', 'RoomCard', 'PriceTag', 'Rating', 'Map', 'Gallery', 'Toast', 'Dropdown', 'Tabs', 'Spinner', 'Pagination'];
  const pages = ['Home', 'Search', 'RoomDetails', 'Checkout', 'Profile', 'Bookings', 'Login', 'Signup', 'Admin', 'NotFound'];
  const services = ['api', 'bookings', 'rooms', 'payments', 'users', 'reviews', 'notifications', 'search'];
  const models = ['User', 'Room', 'Booking', 'Payment', 'Review', 'Hotel'];
  const utils = ['date', 'format', 'currency', 'validation', 'i18n', 'storage', 'debounce', 'geo'];

  add('src/main.ts', ['src/App', 'src/store/index', 'src/lib/logger', 'src/config/env'], 120);
  add('src/App.tsx', ['src/router', 'src/components/layout/Navbar', 'src/components/layout/Footer', 'src/store/index', 'src/auth/AuthProvider'], 180, 'tsx');
  add('src/router.ts', pages.map((p) => `src/pages/${p}Page`).concat(['src/auth/guard']), 140);
  for (const c of comps) {
    const dir = ['Navbar', 'Footer'].includes(c) ? 'src/components/layout' : ['RoomCard', 'PriceTag', 'Rating', 'Gallery', 'Map', 'Calendar'].includes(c) ? 'src/components/booking' : 'src/components/ui';
    const deps = ['src/styles/theme'];
    if (dir !== 'src/components/ui') deps.push('src/components/ui/Button', 'src/components/ui/Card');
    if (rng() < 0.5) deps.push(`src/utils/${utils[R(0, utils.length)]}`);
    add(`${dir}/${c}.tsx`, deps, R(30, 260), 'tsx');
    add(`${dir}/${c}.module.css`, [], R(15, 90), 'css');
  }
  for (const p of pages) {
    const deps = [];
    for (let i = 0; i < R(2, 6); i++) deps.push(`src/components/${['ui', 'booking'][R(0, 2)]}/${comps[R(0, comps.length)]}`);
    for (let i = 0; i < R(1, 3); i++) deps.push(`src/services/${services[R(0, services.length)]}`);
    deps.push('src/store/index');
    add(`src/pages/${p}Page.tsx`, deps, R(80, 420), 'tsx');
  }
  for (const s of services) add(`src/services/${s}.ts`, [s === 'api' ? 'src/config/env' : 'src/services/api', `src/models/${models[R(0, models.length)]}`, 'src/lib/errors', 'src/lib/logger'], s === 'api' ? 380 : R(60, 300));
  for (const m of models) add(`src/models/${m}.ts`, ['src/models/types'], R(25, 140));
  add('src/models/types.ts', [], 210);
  add('src/store/index.ts', ['src/store/bookingSlice', 'src/store/userSlice', 'src/store/searchSlice'], 90);
  for (const s of ['bookingSlice', 'userSlice', 'searchSlice']) add(`src/store/${s}.ts`, ['src/services/api', 'src/models/types'], R(80, 220));
  for (const u of utils) add(`src/utils/${u}.ts`, rng() < 0.3 ? ['src/utils/format'] : [], R(20, 160));
  add('src/auth/AuthProvider.tsx', ['src/auth/session', 'src/services/users'], 160, 'tsx');
  add('src/auth/guard.ts', ['src/auth/session'], 70);
  add('src/auth/session.ts', ['src/auth/jwt', 'src/utils/storage'], 120);
  add('src/auth/jwt.ts', [], 90);
  add('src/lib/logger.ts', ['src/config/env'], 110);
  add('src/lib/errors.ts', ['src/lib/logger'], 140);
  add('src/lib/monitoring.ts', ['src/lib/logger'], 80);
  add('src/config/env.ts', [], 60);
  add('src/config/constants.ts', [], 45);
  add('src/styles/theme.ts', [], 150);
  add('src/styles/global.css', [], 220, 'css');
  add('server/index.ts', ['server/routes', 'server/db', 'src/lib/logger'], 160);
  add('server/routes.ts', ['server/controllers/bookings', 'server/controllers/rooms', 'server/controllers/payments', 'server/middleware/auth'], 130);
  for (const c of ['bookings', 'rooms', 'payments', 'users']) add(`server/controllers/${c}.ts`, ['server/db', 'src/models/types', 'server/middleware/validate'], R(90, 330));
  add('server/middleware/auth.ts', ['src/auth/jwt'], 90);
  add('server/middleware/validate.ts', ['src/utils/validation'], 70);
  add('server/middleware/rateLimit.ts', [], 50);
  add('server/db.ts', ['src/config/env'], 120);
  for (const t of ['booking', 'payments', 'search', 'auth', 'format', 'currency']) add(`tests/${t}.test.ts`, [`src/services/${services.includes(t) ? t : 'api'}`], R(40, 200));
  add('tests/e2e/checkout.spec.ts', [], 160);
  add('tests/e2e/login.spec.ts', [], 90);
  for (const m of ['001_init', '002_rooms', '003_bookings', '004_reviews']) add(`db/migrations/${m}.sql`, [], R(20, 90), 'sql');
  add('db/seeds/hotels.csv', [], 400, 'csv');
  add('db/schema.prisma', [], 140, 'prisma');
  for (const d of ['README', 'architecture', 'api', 'deployment', 'contributing']) add(d === 'README' ? 'README.md' : `docs/${d}.md`, [], R(30, 220), 'md');
  add('CHANGELOG.md', [], 120, 'md');
  add('LICENSE', [], 21, 'txt');
  for (const a of ['logo.svg', 'hero.jpg', 'room-1.jpg', 'room-2.jpg', 'room-3.jpg', 'room-4.jpg', 'favicon.ico', 'pattern.png']) add(`public/images/${a}`, [], 0, 'asset');
  for (const a of ['Inter.woff2', 'Inter-Bold.woff2']) add(`public/fonts/${a}`, [], 0, 'asset');
  add('public/sounds/notify.mp3', [], 0, 'asset');
  add('package.json', [], 60, 'json');
  add('package-lock.json', [], 0, 'json');
  add('tsconfig.json', [], 30, 'json');
  add('vite.config.ts', [], 40);
  add('.eslintrc.json', [], 35, 'json');
  add('.prettierrc', [], 8, 'json');
  add('Dockerfile', [], 28, 'docker');
  add('docker-compose.yml', [], 45, 'yaml');
  add('.github/workflows/ci.yml', [], 70, 'yaml');
  add('.github/workflows/deploy.yml', [], 55, 'yaml');
  add('scripts/seed.sh', [], 40, 'sh');
  add('scripts/release.sh', [], 60, 'sh');

  const all = new Set(files.map((f) => f.path.replace(/\.[^/.]+$/, '')));
  return files.map((f) => {
    if (f.kind === 'asset') return { path: f.path, size: R(4000, 900000), content: null };
    const lines = [];
    const dir = f.path.split('/').slice(0, -1);
    for (const imp of f.imports) {
      if (!all.has(imp)) continue;
      const to = imp.split('/');
      let i = 0; while (i < dir.length && i < to.length - 1 && dir[i] === to[i]) i++;
      const rel = (dir.length - i === 0 ? './' : '../'.repeat(dir.length - i)) + to.slice(i).join('/');
      lines.push(f.kind === 'css' ? `@import '${rel}';` : `import x${lines.length} from '${rel}';`);
    }
    const body = f.kind === 'ts' || f.kind === 'tsx'
      ? (i) => (i % 9 === 0 ? `export function fn${i}(a) {` : i % 9 === 4 ? `  if (a && a.ok) { return a; }` : i % 9 === 8 ? '}' : i % 13 === 0 ? `  // TODO: améliorer ${i}` : `  const v${i} = a?.value ?? ${i};`)
      : (i) => `ligne ${i}`;
    for (let i = 0; i < f.loc; i++) lines.push(body(i));
    const content = lines.join('\n');
    return { path: f.path, size: content.length, content };
  });
}

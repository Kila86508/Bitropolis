import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProject } from '../src/core/analyze.js';
import { layoutCity } from '../src/core/layout.js';
import { makeIgnoreMatcher } from '../src/core/rules.js';

const project = [
  { path: 'src/main.ts', content: "import { App } from './app/App';\nimport cfg from './config';\nconsole.log(App, cfg);\n" },
  { path: 'src/app/App.tsx', content: "import { Button } from '../components/Button';\nimport { api } from '@/services/api';\nexport const App = () => Button;\n" },
  { path: 'src/components/Button.tsx', content: "import React from 'react';\nexport const Button = () => null;\n" },
  { path: 'src/services/api.ts', content: "import { log } from '../lib/logger';\nexport const api = { get() { if (1) log(); } };\n" },
  { path: 'src/lib/logger.ts', content: 'export function log() {}\n' },
  { path: 'src/config.ts', content: 'export default {};\n' },
  { path: 'tests/api.test.ts', content: "import { api } from '../src/services/api';\n" },
  { path: 'app/models/user.py', content: 'from .base import Model\nclass User(Model):\n    pass\n' },
  { path: 'app/models/base.py', content: 'class Model:\n    pass\n' },
  { path: 'app/main.py', content: 'from app.models.user import User\n' },
  { path: 'public/logo.png', size: 2048, content: null },
  { path: 'README.md', content: '# Démo\n' },
  { path: 'package.json', content: '{}' },
  { path: 'Dockerfile', content: 'FROM node\n' }
];

test('résout les imports JS/TS (relatifs, alias) et Python', () => {
  const a = analyzeProject(project, { name: 'demo' });
  const byPath = Object.fromEntries(a.files.map((f) => [f.path, f]));
  const deps = (p) => byPath[p].imports.map((i) => a.files[i].path).sort();
  assert.deepEqual(deps('src/main.ts'), ['src/app/App.tsx', 'src/config.ts']);
  assert.deepEqual(deps('src/app/App.tsx'), ['src/components/Button.tsx', 'src/services/api.ts']);
  assert.deepEqual(deps('app/models/user.py'), ['app/models/base.py']);
  assert.deepEqual(deps('app/main.py'), ['app/models/user.py']);
  assert.equal(byPath['src/components/Button.tsx'].external, 1);
  assert.deepEqual(byPath['src/services/api.ts'].importedBy.map((i) => a.files[i].path).sort(), ['src/app/App.tsx', 'tests/api.test.ts']);
});

test('attribue les bons types de bâtiments', () => {
  const a = analyzeProject(project, { name: 'demo' });
  const kind = (p) => a.files.find((f) => f.path === p).kind;
  assert.equal(kind('src/main.ts'), 'townhall');
  assert.equal(kind('tests/api.test.ts'), 'police');
  assert.equal(kind('public/logo.png'), 'park');
  assert.equal(kind('README.md'), 'library');
  assert.equal(kind('package.json'), 'power');
  assert.equal(kind('Dockerfile'), 'fire');
  assert.equal(kind('src/lib/logger.ts'), 'hospital');
  assert.equal(kind('src/components/Button.tsx'), 'shop');
  assert.equal(kind('app/models/user.py'), 'bank');
  assert.equal(a.files.filter((f) => f.kind === 'townhall').length, 1);
});

test("ne garde aucun code source dans l'analyse", () => {
  const a = analyzeProject(project, { name: 'demo' });
  assert.ok(!JSON.stringify(a).includes('console.log'));
});

test('place chaque fichier sur une parcelle sans chevauchement', () => {
  const a = analyzeProject(project, { name: 'demo' });
  const city = layoutCity(a);
  assert.equal(city.lots.filter(Boolean).length, a.files.length);
  const lots = city.lots;
  for (let i = 0; i < lots.length; i++) {
    for (let j = i + 1; j < lots.length; j++) {
      const A = lots[i], B = lots[j];
      const overlap = Math.abs(A.x - B.x) < (A.size + B.size) / 2 - 1e-6 && Math.abs(A.z - B.z) < (A.size + B.size) / 2 - 1e-6;
      assert.ok(!overlap, `${a.files[i].path} chevauche ${a.files[j].path}`);
    }
    assert.ok(Math.abs(lots[i].x) < city.size / 2 && Math.abs(lots[i].z) < city.size / 2);
  }
  assert.ok(city.roads.length >= 4);
});

test('le plan est déterministe', () => {
  const a = analyzeProject(project, { name: 'demo' });
  assert.deepEqual(layoutCity(a).lots, layoutCity(a).lots);
});

test('.gitignore simplifié', () => {
  const ig = makeIgnoreMatcher('*.log\n/secret\nbuild/\n!keep.log');
  assert.ok(ig('a/b/x.log', false));
  assert.ok(!ig('a/keep.log', false));
  assert.ok(ig('secret', true));
  assert.ok(!ig('a/secret', true));
  assert.ok(ig('build', true));
});

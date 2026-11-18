import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyzeProject } from '../src/core/analyze.js';
import { layoutGrid } from '../src/core/grid.js';
import { growthOf, growthSnapshot, growthDiff, packModelNames, CHAINS } from '../src/core/catalog.js';
import { demoProject } from '../scripts/demo-project.js';

const demo = analyzeProject(demoProject(), { name: 'demo' });

test('ville en grille : chaque fichier a sa parcelle, sans chevauchement, façade sur une route', () => {
  const c = layoutGrid(demo);
  const taken = new Map();
  for (const f of demo.files) {
    const l = c.lots[f.id];
    assert.ok(l, `${f.path} sans parcelle`);
    for (let j = 0; j < l.d; j++) for (let i = 0; i < l.w; i++) {
      const k = `${l.cx + i},${l.cz + j}`;
      assert.ok(!taken.has(k), `${f.path} chevauche ${taken.get(k)}`);
      taken.set(k, f.path);
      assert.equal(c.cellAt(l.cx + i, l.cz + j), 2);
    }
    const front = l.facing === 0 ? l.cz + l.d : l.cz - 1;
    for (let i = 0; i < l.w; i++) assert.equal(c.cellAt(l.cx + i, front), 1, `${f.path} ne donne pas sur une route`);
  }
});

test('réseau routier : connexe, jamais de routes accolées, tuiles du pack', () => {
  const c = layoutGrid(demo);
  const road = (x, z) => x >= 0 && z >= 0 && x < c.cols && z < c.rows && c.cellAt(x, z) === 1;
  let total = 0;
  for (let z = 0; z < c.rows; z++) for (let x = 0; x < c.cols; x++) {
    if (!road(x, z)) continue;
    total++;
    assert.ok(!(road(x + 1, z) && road(x, z + 1) && road(x + 1, z + 1)), `routes accolées en ${x},${z}`);
  }
  const seen = new Set(['0,0']), stack = [[0, 0]];
  while (stack.length) {
    const [x, z] = stack.pop();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${z + dz}`;
      if (road(x + dx, z + dz) && !seen.has(k)) { seen.add(k); stack.push([x + dx, z + dz]); }
    }
  }
  assert.equal(seen.size, total);
  const models = new Set(packModelNames());
  for (const t of c.roadTiles) assert.ok(models.has(t.model), t.model);
  assert.ok(c.roadTiles.some((t) => t.model.endsWith('_N8')), 'les avenues les plus chargées montent au niveau N8');
});

test('le plan en grille est déterministe', () => {
  assert.deepEqual(layoutGrid(demo).lots, layoutGrid(demo).lots);
});

test('croissance absolue : un fichier ne rétrécit pas parce que les autres grossissent', () => {
  const f = { kind: 'tower', loc: 120, importedBy: [1, 2], branches: 10, funcs: 6 };
  const before = growthOf(f);
  const bigger = growthOf({ ...f, loc: 900, importedBy: [1, 2, 3, 4, 5, 6] });
  assert.ok(bigger.stage > before.stage);
  // le stade ne dépend que du fichier : même résultat dans un projet minuscule ou géant
  const a = analyzeProject([{ path: 'a.js', content: 'x\n'.repeat(120) }], { name: 'p' });
  const b = analyzeProject([{ path: 'a.js', content: 'x\n'.repeat(120) }, ...Array.from({ length: 30 }, (_, i) => ({ path: `big${i}.js`, content: 'y\n'.repeat(2000) }))], { name: 'p' });
  const fa = a.files.find((x) => x.path === 'a.js'), fb = b.files.find((x) => x.path === 'a.js');
  assert.notEqual(fa.tier, fb.tier, 'le rang relatif, lui, change');
  assert.equal(growthOf({ ...fa, kind: 'tower' }).model, growthOf({ ...fb, kind: 'tower' }).model);
});

test('évolution entre deux scans : grandi, nouveau, démoli', () => {
  const v1 = analyzeProject([{ path: 'a.js', content: 'x\n'.repeat(10) }, { path: 'old.js', content: 'z\n' }], { name: 'p' });
  const v2 = analyzeProject([{ path: 'a.js', content: 'x\n'.repeat(800) }, { path: 'new.js', content: 'y\n' }], { name: 'p' });
  const d = growthDiff(growthSnapshot(v1.files), growthSnapshot(v2.files));
  assert.deepEqual(d.grown.map((g) => g.path), ['a.js']);
  assert.deepEqual(d.added, ['new.js']);
  assert.deepEqual(d.removed, ['old.js']);
});

test('tous les modèles du catalogue existent dans le pack (si le pack est présent)', (t) => {
  const dir = new URL('../FULL_VERSION_250_MODELS/GLB/', import.meta.url);
  if (!fs.existsSync(dir)) return t.skip('pack absent');
  const have = new Set(fs.readdirSync(dir).flatMap((c) => { try { return fs.readdirSync(new URL(c + '/', dir)); } catch { return []; } }).map((f) => f.replace(/\.glb$/, '')));
  for (const m of packModelNames()) assert.ok(have.has(m), m);
  for (const chain of Object.values(CHAINS)) assert.ok(chain.length >= 5);
});

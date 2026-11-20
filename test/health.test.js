import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProject, HEALTH } from '../src/core/analyze.js';

test('santé du code : boucles d\'imports, fichiers géants, orphelins, TODO, complexité', () => {
  const a = analyzeProject([
    { path: 'src/a.ts', content: "import './b';\n" },
    { path: 'src/b.ts', content: "import './c';\n" },
    { path: 'src/c.ts', content: "import './a';\n" + '// TODO\n'.repeat(6) },
    { path: 'src/lonely.ts', content: 'export const x = 1;\n' },
    { path: 'src/main.ts', content: "import './a';\nimport './big';\nimport './knot';\n" },
    { path: 'src/big.ts', content: 'let x = 1;\n'.repeat(1200) },
    { path: 'src/knot.ts', content: 'if (a) { b(); }\n'.repeat(160) },
    { path: 'tests/a.test.ts', content: "import '../src/a';\n" },
    { path: 'scripts/build.js', content: 'run();\n' }
  ], { name: 'santé' });
  const h = (name) => a.files.find((f) => f.name === name).h || 0;
  for (const n of ['a.ts', 'b.ts', 'c.ts']) assert.ok(h(n) & HEALTH.CYCLE, `${n} dans la boucle`);
  assert.equal(a.health.cycleGroups, 1);
  assert.deepEqual(a.health.cycles[0].map((i) => a.files[i].name).sort(), ['a.ts', 'b.ts', 'c.ts']);
  assert.ok(h('c.ts') & HEALTH.TODO);
  assert.ok(h('big.ts') & HEALTH.HUGE);
  assert.ok(h('knot.ts') & HEALTH.COMPLEX);
  assert.ok(h('lonely.ts') & HEALTH.ORPHAN, 'jamais importé');
  assert.equal(h('main.ts') & HEALTH.ORPHAN, 0, 'point d\'entrée : pas orphelin');
  assert.equal(h('a.test.ts') & HEALTH.ORPHAN, 0, 'un test n\'est jamais importé, c\'est normal');
  assert.equal(h('build.js') & HEALTH.ORPHAN, 0, 'un script non plus');
});

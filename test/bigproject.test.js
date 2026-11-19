import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProject } from '../src/core/analyze.js';
import { selectFiles, MAX_FILES } from '../src/core/rules.js';
import { layoutGrid } from '../src/core/grid.js';

test('les #include <…> du C rejoignent les dossiers include/ du projet', () => {
  const a = analyzeProject([
    { path: 'kernel/sched.c', content: '#include <linux/sched.h>\n#include <stdio.h>\n#include "local.h"\n' },
    { path: 'kernel/local.h', content: '' },
    { path: 'include/linux/sched.h', content: '' },
    { path: 'arch/x86/include/asm/io.h', content: '' },
    { path: 'drivers/net/eth.c', content: '#include <asm/io.h>\n#include <linux/sched.h>\n' }
  ], { name: 'k' });
  const id = (p) => a.files.find((f) => f.path === p).id;
  const sched = a.files[id('kernel/sched.c')];
  assert.deepEqual(sched.imports.map((i) => a.files[i].path).sort(), ['include/linux/sched.h', 'kernel/local.h']);
  const eth = a.files[id('drivers/net/eth.c')];
  assert.deepEqual(eth.imports.map((i) => a.files[i].path).sort(), ['arch/x86/include/asm/io.h', 'include/linux/sched.h']);
});

test('gros projet : sélection représentative (code d\'abord, tous les dossiers présents)', () => {
  const entries = [];
  for (let i = 0; i < 9000; i++) entries.push({ path: `Documentation/d${i % 300}/f${i}.rst`, size: 4000 });
  for (let i = 0; i < 30000; i++) entries.push({ path: `drivers/x${i % 900}/f${i}.c`, size: 2000 + (i % 50) * 100 });
  for (let i = 0; i < 400; i++) entries.push({ path: `kernel/k${i}.c`, size: 3000 });
  for (let i = 0; i < 150; i++) entries.push({ path: `mm/m${i}.c`, size: 3000 });
  const kept = selectFiles(entries);
  assert.equal(kept.length, MAX_FILES);
  const count = (top) => kept.filter((e) => e.path.startsWith(top + '/')).length;
  assert.ok(count('drivers') > count('kernel'), 'drivers reste le plus grand quartier');
  assert.ok(count('kernel') >= 100, `kernel bien représenté (${count('kernel')})`);
  assert.ok(count('mm') >= 50, `mm bien représenté (${count('mm')})`);
  assert.ok(count('Documentation') < MAX_FILES * 0.15, `la doc ne domine plus (${count('Documentation')})`);
});

test('gros projet : les petits sous-dossiers rejoignent leur parent (ville dense)', () => {
  const raw = [];
  for (let d = 0; d < 1500; d++) raw.push({ path: `drivers/a${d % 30}/b${d}/f.c`, content: 'int x;\n'.repeat(20) });
  const a = analyzeProject(raw, { name: 'big' });
  const city = layoutGrid(a);
  assert.ok(city.districts.length < 200, `${city.districts.length} quartiers`);
});

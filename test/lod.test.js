import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LOD_DEFAULT, lodCluster } from '../src/core/lod.js';
import { chooseLod, simplify, visibleConflict, LOD_MAX_CONFLICT } from '../scripts/lodpick.js';
import { readOBJ } from '../scripts/assets.js';
import { objScale } from '../src/core/catalog.js';

// Pavé (12 triangles, normales vers l'extérieur) ajouté à une géométrie { pos, col, idx }.
// topFirst : écrire les sommets du dessus avant ceux du dessous (l'ancien réglage gardait le premier rencontré).
function box(g, x0, x1, y0, y1, z0, z1, color, topFirst = false) {
  const b = g.pos.length / 3;
  for (const y of topFirst ? [y1, y0] : [y0, y1]) for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) { g.pos.push(x, y, z); g.col.push(color); }
  const quads = [[0, 1, 2, 3], [7, 6, 5, 4], [4, 5, 1, 0], [5, 6, 2, 1], [6, 7, 3, 2], [7, 4, 0, 3]];
  for (const [a, c, d, e] of quads) {
    if (topFirst) g.idx.push(b + d, b + c, b + a, b + e, b + d, b + a);
    else g.idx.push(b + a, b + c, b + d, b + a, b + d, b + e);
  }
}
// positions entières comme dans un pack (Int16) et pas de quantification
function packed(g) {
  const s = 0.5 / 32767, P = Int16Array.from(g.pos, (v) => Math.round(v / s));
  return { P, s, C: Uint16Array.from(g.col), I: Uint16Array.from(g.idx), pos: Float32Array.from(P, (v) => v * s) };
}

test('simplification : deux couleurs ne fusionnent jamais, les triangles aplatis disparaissent', () => {
  const g = { pos: [], col: [], idx: [] };
  box(g, -0.5, 0.5, 0, 0.002, -0.5, 0.5, 0);
  box(g, -0.5, 0.5, 0, 0.002, -0.5, 0.5, 1);
  const { keep, idx } = lodCluster(g.pos, (v) => g.col[v], g.idx, LOD_DEFAULT);
  assert.equal(keep.length, 8, 'quatre coins par couleur');
  assert.equal(new Set(keep.map((v) => g.col[v])).size, 2);
  assert.equal(idx.length / 3, 8, 'chaque dalle mince devient une feuille (dessus et dessous), ses côtés disparaissent');
});

test('couches empilées : le réglage choisi ne les plaque pas dans le même plan', () => {
  // un sol, une chaussée mince posée dessus, un marquage encore plus mince sur la chaussée
  const g = { pos: [], col: [], idx: [] };
  box(g, -0.5, 0.5, 0, 0.002, -0.5, 0.5, 0, true);
  box(g, -0.3, 0.3, 0.002, 0.008, -0.5, 0.5, 1);
  box(g, -0.02, 0.02, 0.008, 0.01, -0.4, 0.4, 2);
  const m = packed(g);
  // premier sommet rencontré (ancien comportement) : le sol garde son dessus, la chaussée s'écrase sur son dessous,
  // et les deux se retrouvent à la même hauteur
  const old = simplify(m.pos, m.C, m.I, LOD_DEFAULT);
  assert.ok(visibleConflict(old.pos, old.col, old.idx) > 0.1, 'l\'ancien réglage crée bien le défaut');
  const code = chooseLod(m.P, m.s, m.C, m.I, { useCache: false });
  assert.ok(code > 0, 'un réglage sans défaut existe');
  const L = simplify(m.pos, m.C, m.I, code);
  assert.ok(L.worth, 'et il retire assez de triangles');
  assert.ok(visibleConflict(L.pos, L.col, L.idx) <= LOD_MAX_CONFLICT);
});

test('modèle déjà défectueux (deux couleurs dans le même plan) : pas de version simplifiée', () => {
  const g = { pos: [], col: [], idx: [] };
  box(g, -0.5, 0.5, 0, 0.2, -0.5, 0.5, 0);
  box(g, -0.3, 0.3, 0.1, 0.2, -0.3, 0.3, 1);
  const m = packed(g);
  assert.ok(visibleConflict(m.pos, m.C, m.I) > 0.3);
  assert.equal(chooseLod(m.P, m.s, m.C, m.I, { useCache: false }), 0);
});

test('ponts du kit de voirie : la vue lointaine ne superpose plus les couches du tablier (si Asset/ présent)', { skip: !fs.existsSync('Asset/export_obj/Avenue_PontDroit.obj') }, () => {
  for (const name of ['Avenue_PontDroit', 'Route_PontCroise', 'Avenue_Viaduc', 'Route_Courbe']) {
    // même mise en forme que le pack : positions quantifiées sur 16 bits, une couleur par matériau
    const { prims } = readOBJ(`Asset/export_obj/${name}.obj`, objScale(name));
    let ext = 1e-6;
    for (const p of prims) for (const v of p.pos) ext = Math.max(ext, Math.abs(v));
    const s = ext / 32767, pos = [], col = [], idx = [];
    prims.forEach((p, k) => {
      const base = pos.length / 3;
      for (const v of p.pos) pos.push(Math.round(v / s));
      for (let i = 0; i < p.pos.length / 3; i++) col.push(k);
      for (const q of p.idx) idx.push(base + q);
    });
    const P = Int16Array.from(pos), C = Uint16Array.from(col), I = Uint16Array.from(idx), f = Float32Array.from(P, (v) => v * s);
    assert.ok(visibleConflict(f, C, I) <= LOD_MAX_CONFLICT, `${name} : modèle complet sain`);
    const code = chooseLod(P, s, C, I, { useCache: false });
    assert.ok(code > 0, `${name} : garde une version simplifiée`);
    const L = simplify(f, C, I, code);
    assert.ok(L.worth && L.idx.length < I.length / 2, `${name} : au moins deux fois moins de triangles`);
    assert.ok(visibleConflict(L.pos, L.col, L.idx) <= LOD_MAX_CONFLICT, `${name} : aucune couche plaquée`);
  }
});

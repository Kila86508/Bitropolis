import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { lodPieces } from '../src/core/lod.js';
import { lodAllowed, simplify, layerConflict, LOD_MAX_WORSE } from '../scripts/lodpick.js';
import { readOBJ } from '../scripts/assets.js';
import { objScale } from '../src/core/catalog.js';

// Pavé fermé (8 sommets partagés, 12 triangles, normales vers l'extérieur) ajouté à une géométrie { pos, col, idx }.
function box(g, x0, x1, y0, y1, z0, z1, color) {
  const b = g.pos.length / 3;
  for (const y of [y0, y1]) for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) { g.pos.push(x, y, z); g.col.push(color); }
  const quads = [[0, 1, 2, 3], [7, 6, 5, 4], [4, 5, 1, 0], [5, 6, 2, 1], [6, 7, 3, 2], [7, 4, 0, 3]];
  for (const [a, c, d, e] of quads) g.idx.push(b + a, b + c, b + d, b + a, b + d, b + e);
}
const geo = () => ({ pos: [], col: [], idx: [] });
const lod = (g, keep = null) => lodPieces(g.pos, (v) => g.col[v], g.idx, keep);
// hauteurs (arrondies au dixième de millième) des faces tournées vers le haut, par couleur
function tops(pos, colOf, idx) {
  const out = {};
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [idx[i] * 3, idx[i + 1] * 3, idx[i + 2] * 3];
    const ny = (pos[b + 2] - pos[a + 2]) * (pos[c] - pos[a]) - (pos[b] - pos[a]) * (pos[c + 2] - pos[a + 2]);
    if (ny > 1e-9) (out[colOf(idx[i])] = out[colOf(idx[i])] || new Set()).add(Math.round(pos[a + 1] * 1e4) / 1e4);
  }
  return Object.fromEntries(Object.entries(out).map(([k, s]) => [k, [...s].sort()]));
}

test('vue lointaine : un pavé épais reste un pavé, à ses dimensions exactes', () => {
  const g = geo();
  box(g, -0.3, 0.2, 0.1, 0.6, -0.4, 0.1, 5);
  const L = lod(g);
  assert.equal(L.idx.length / 3, 12);
  for (let k = 0; k < 3; k++) {
    const xs = L.pos.filter((_, i) => i % 3 === k);
    assert.deepEqual([Math.min(...xs), Math.max(...xs)], [[-0.3, 0.2], [0.1, 0.6], [-0.4, 0.1]][k]);
  }
});

test('vue lointaine : couches minces empilées — chacune garde sa hauteur, aucune ne s\'écrase sur sa voisine', () => {
  // un sol, une chaussée mince posée dessus, un marquage encore plus mince sur la chaussée
  const g = geo();
  box(g, -0.5, 0.5, 0, 0.002, -0.5, 0.5, 0);
  box(g, -0.3, 0.3, 0.002, 0.008, -0.5, 0.5, 1);
  box(g, -0.01, 0.01, 0.008, 0.01, -0.4, 0.4, 2);
  const L = lod(g);
  assert.equal(L.idx.length / 3, 12, 'trois pièces minces : deux grandes faces chacune');
  assert.deepEqual(tops(L.pos, (v) => g.col[L.src[v]], L.idx), { 0: [0.002], 1: [0.008], 2: [0.01] });
  assert.equal(layerConflict(L.pos, L.src.map((v) => g.col[v]), L.idx, 4e-5), 0, 'aucune couche dans le même plan qu\'une autre');
});

test('vue lointaine : les petites pièces disparaissent, sauf les lampes', () => {
  const g = geo();
  box(g, -0.4, 0.4, 0, 0.3, -0.4, 0.4, 0);          // bâtiment
  box(g, 0.45, 0.47, 0, 0.3, 0.45, 0.47, 1);         // mât fin
  box(g, 0.44, 0.48, 0.3, 0.33, 0.44, 0.48, 2);      // ampoule
  box(g, -0.48, -0.46, 0, 0.02, -0.48, -0.46, 3);    // caillou
  assert.equal(lod(g).idx.length / 3, 12, 'il ne reste que le bâtiment');
  const kept = lod(g, (v) => g.col[v] === 2);
  assert.equal(kept.idx.length / 3, 24, 'l\'ampoule est gardée');
  assert.ok(kept.src.some((v) => g.col[v] === 2));
});

test('vue lointaine : une surface ouverte (anciens modèles à faces séparées) n\'est pas touchée', () => {
  const g = { pos: [0, 0, 0, 0.01, 0, 0, 0.01, 0, 0.01, 0, 0, 0.01], col: [0, 0, 0, 0], idx: [0, 2, 1, 0, 3, 2] };
  const L = lod(g), corners = (pos, idx) => idx.map((v) => [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]]);
  assert.deepEqual(corners(L.pos, L.idx), corners(g.pos, g.idx), 'mêmes triangles, aux mêmes endroits');
});

test('mesure des couches qui se gênent : même plan ou à moins de 4 cm, mais pas à 5 cm', () => {
  const pair = (gap) => { const g = geo(); box(g, -0.5, 0.5, 0, 0.2, -0.5, 0.5, 0); box(g, -0.3, 0.3, 0.1, 0.2 + gap, -0.3, 0.3, 1); return layerConflict(g.pos, g.col, g.idx); };
  assert.ok(pair(0) > 0.3, 'deux dessus dans le même plan');
  assert.ok(pair(0.002) > 0.3, 'à 2 cm');
  assert.equal(pair(0.005), 0, 'à 5 cm : assez loin');
});

// même mise en forme que le pack : positions quantifiées sur 16 bits, une couleur par matériau
function packed(file, scale) {
  const { prims } = readOBJ(file, scale);
  let ext = 1e-6;
  for (const p of prims) for (const v of p.pos) ext = Math.max(ext, Math.abs(v));
  const s = ext / 32767, pos = [], col = [], lit = [], idx = [];
  prims.forEach((p, k) => {
    const base = pos.length / 3;
    for (const v of p.pos) pos.push(Math.round(v / s));
    for (let i = 0; i < p.pos.length / 3; i++) { col.push(k); lit.push(p.lit); }
    for (const q of p.idx) idx.push(base + q);
  });
  const P = Int16Array.from(pos);
  return { P, s, C: Uint16Array.from(col), I: Uint16Array.from(idx), lit, f: Float32Array.from(P, (v) => v * s) };
}

test('ponts et rampes du kit de voirie : la vue lointaine ne rapproche aucune couche (si Asset/ présent)', { skip: !fs.existsSync('Asset/export_obj/Avenue_PontDroit.obj') }, () => {
  for (const name of ['Avenue_PontDroit', 'Route_PontCroise', 'Avenue_Viaduc', 'Route_Rampe', 'Route_Courbe']) {
    const m = packed(`Asset/export_obj/${name}.obj`, objScale(name));
    const L = simplify(m.f, m.C, m.I, m.lit);
    assert.ok(L.worth && L.idx.length < m.I.length * 0.6, `${name} : au moins 40 % de triangles en moins`);
    for (const gap of [4e-5, 0.004]) {
      const full = layerConflict(m.f, m.C, m.I, gap), far = layerConflict(L.pos, L.col, L.idx, gap);
      assert.ok(far <= full + LOD_MAX_WORSE, `${name} : pas plus de couches à moins de ${gap * 1e3} cm que le modèle complet (${full.toFixed(4)} → ${far.toFixed(4)})`);
    }
    assert.equal(lodAllowed(m.P, m.s, m.C, m.I, (c) => m.lit[m.C.indexOf(c)], { useCache: false }), 1, `${name} : garde sa version simplifiée`);
  }
});

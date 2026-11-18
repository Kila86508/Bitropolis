// Bitropolis — campagne procédurale autour de la ville (sans dépendance, Node + navigateur).
// Une grille de tuiles de 16 m (kit Asset/models) : collines en pente douce, plateaux à falaises,
// lacs, rivière, mares, puis forêts, buissons, rochers et herbes semés par biomes.
// Même graine (nom du projet) ⇒ même carte : chaque projet a sa campagne à lui.
import { makeRng } from './rules.js';

export const TILE = 16;                     // côté d'une tuile
export const V_SCALE = 1.5;                 // étirement vertical des tuiles : relief plus lisible
export const LEVEL_H = 3 * V_SCALE;         // hauteur d'un niveau de colline
export const GROUND_TOP = 0.2 * V_SCALE;    // dessus d'une pelouse dans le repère des tuiles
export const TILE_Y0 = -0.05 - GROUND_TOP;  // la pelouse affleure juste sous le bitume de la ville
const MAX_LEVEL = 3;

// --- Bruit de valeur lissé + fBm
function trNoise(seed) {
  const r = makeRng(seed);
  const perm = new Uint8Array(512), vals = new Float32Array(256);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) vals[i] = r() * 2 - 1;
  const lat = (i, j) => vals[perm[(i & 255) + perm[j & 255]]];
  const s = (t) => t * t * (3 - 2 * t);
  const noise = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), u = s(x - xi), v = s(z - zi);
    const a = lat(xi, zi), b = lat(xi + 1, zi), c = lat(xi, zi + 1), d = lat(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  return (x, z, oct = 3) => {
    let sum = 0, amp = 1, f = 1, norm = 0;
    for (let o = 0; o < oct; o++) { sum += noise(x * f + o * 17.3, z * f - o * 9.1) * amp; norm += amp; amp *= 0.5; f *= 2.03; }
    return sum / norm;
  };
}

// --- Tables de tuiles : motif de coins (ou de sorties de rivière) → modèle + rotation.
// Coins : 0 = (-x,-z), 1 = (+x,-z), 2 = (+x,+z), 3 = (-x,+z). Rotation k : k × 90° autour de Y (sens three.js).
const TR_CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const TR_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // -x, +x, -z, +z
const trRot = ([x, z], k) => {
  const a = (k * Math.PI) / 2, c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a));
  return [x * c + z * s, -x * s + z * c];
};
function trTable(vectors, bases) {
  const table = {};
  for (const [model, idx] of bases) {
    for (let k = 0; k < 4; k++) {
      let mask = 0;
      for (const i of idx) {
        const [x, z] = trRot(vectors[i], k);
        mask |= 1 << vectors.findIndex((v) => v[0] === x && v[1] === z);
      }
      if (!(mask in table)) table[mask] = { model, rot: k };
    }
  }
  return table;
}
// coins hauts
const SLOPES = trTable(TR_CORNERS, [['slope_grass', [2, 3]], ['slope_grass_inner', [0, 2, 3]], ['slope_grass_outer', [3]]]);
const CLIFFS = trTable(TR_CORNERS, [['cliff', [0, 1]], ['cliff_corner', [1]]]);
// coins en eau
const SHORES = trTable(TR_CORNERS, [['open_water', [0, 1, 2, 3]], ['lake_shore', [2, 3]], ['lake_shore_inner', [3]], ['lake_shore_outer', [0, 2, 3]]]);
// sorties de rivière
const RIVERS = trTable(TR_DIRS, [['river_straight', [0, 1]], ['river_corner', [0, 3]], ['river_end', [0]]]);

// Hauteur relative (0 → 1 niveau) d'une tuile de pente au point (u, v) ∈ [0,1]², d'après le profil des
// modèles : pente droite = linéaire, coin extérieur (1 coin haut) = min, coin intérieur (3 coins hauts) = max.
const TR_UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
export function trSlopeFrac(mask, u, v) {
  if (!mask) return 0;
  const hi = [0, 1, 2, 3].filter((n) => mask & (1 << n));
  const prox = (n) => { const [cu, cv] = TR_UV[n]; return [cu ? u : 1 - u, cv ? v : 1 - v]; };
  if (hi.length === 1) return Math.min(...prox(hi[0]));
  if (hi.length === 3) return 1 - Math.min(...prox([0, 1, 2, 3].find((n) => !(mask & (1 << n)))));
  const w = [(1 - u) * (1 - v), u * (1 - v), u * v, (1 - u) * v];
  return hi.reduce((s, n) => s + w[n], 0);
}

// --- Plan de la campagne
// cityHalf : demi-côté de la ville (bordure comprise). Renvoie les tuiles, les objets semés et la taille.
export function planTerrain({ seed = 'bitropolis', cityHalf = 20, margin = 4 } = {}) {
  const N = Math.min(48, 2 * Math.ceil((cityHalf + margin * TILE) / TILE));
  const half = (N * TILE) / 2;
  const rng = makeRng('terrain:' + seed);
  const nHill = trNoise('hill:' + seed), nLake = trNoise('lake:' + seed), nForest = trNoise('forest:' + seed), nRock = trNoise('rock:' + seed);
  const mood = { hills: 0.3 + rng() * 0.4, lakes: 0.08 + rng() * 0.18, forest: rng() * 0.3 - 0.1 };

  const C = N + 1;                                   // coins par côté
  const cx = (i) => -half + i * TILE;                // position d'un coin / bord gauche d'une cellule
  const cityGap = (x, z) => Math.max(0, Math.max(Math.abs(x), Math.abs(z)) - cityHalf) / TILE; // distance à la ville (en tuiles)
  const isCityCell = (i, j) => cx(i) < cityHalf + 1 && cx(i + 1) > -cityHalf - 1 && cx(j) < cityHalf + 1 && cx(j + 1) > -cityHalf - 1;
  const border = (i, j) => i === 0 || j === 0 || i === N || j === N;

  // 1) relief : niveau entier par coin
  const level = new Int8Array(C * C);
  const L = (i, j) => level[j * C + i];
  for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) {
    const x = cx(i), z = cx(j), d = cityGap(x, z);
    if (border(i, j) || d < 1.2) continue;
    const ramp = Math.min(1, (d - 1.2) / 2);
    const h = (nHill(x / 80, z / 80) + mood.hills) * 3.8 * ramp + Math.max(0, d - 3) * 0.25;
    level[j * C + i] = Math.max(0, Math.min(MAX_LEVEL, Math.floor(h)));
  }
  const cornersOf = (i, j) => [j * C + i, j * C + i + 1, (j + 1) * C + i + 1, (j + 1) * C + i];
  // contraintes : au plus un niveau d'écart entre voisins, pas de motif en damier (on abaisse : converge toujours)
  for (let iter = 0, changed = true; changed && iter < 64; iter++) {
    changed = false;
    for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) {
      let m = level[j * C + i];
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const a = i + di, b = j + dj;
        if (a >= 0 && b >= 0 && a < C && b < C) m = Math.min(m, level[b * C + a] + 1);
      }
      if (m !== level[j * C + i]) { level[j * C + i] = m; changed = true; }
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = cornersOf(i, j), v = k.map((q) => level[q]);
      if (v[0] === v[2] && v[1] === v[3] && v[0] !== v[1]) {
        const lo = Math.min(v[0], v[1]);
        for (const q of k) level[q] = lo;
        changed = true;
      }
    }
  }

  // 2) plateaux rocheux : rectangles de coins surélevés d'un niveau, bordés de falaises
  const cliffCell = new Uint8Array(N * N);
  const nMesas = Math.round(N * N * (0.006 + rng() * 0.01));
  for (let t = 0, made = 0; t < nMesas * 30 && made < nMesas; t++) {
    const w = 1 + Math.floor(rng() * 3), d = 1 + Math.floor(rng() * 3);
    const i0 = 2 + Math.floor(rng() * (C - 4 - w)), j0 = 2 + Math.floor(rng() * (C - 4 - d));
    const i1 = i0 + w - 1, j1 = j0 + d - 1;
    const base = L(i0, j0);
    if (base >= MAX_LEVEL) continue;
    let ok = true;
    for (let j = j0 - 1; ok && j <= j1 + 1; j++) for (let i = i0 - 1; ok && i <= i1 + 1; i++) {
      if (L(i, j) !== base || border(i, j) || cityGap(cx(i), cx(j)) < 1.5) ok = false;
    }
    for (let j = j0 - 1; ok && j <= j1; j++) for (let i = i0 - 1; ok && i <= i1; i++) if (cliffCell[j * N + i]) ok = false;
    if (!ok) continue;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) level[j * C + i] = base + 1;
    for (let j = j0 - 1; j <= j1; j++) for (let i = i0 - 1; i <= i1; i++) cliffCell[j * N + i] = 1;
    made++;
  }

  // 3) lacs : coins en eau sur terrain plat de niveau 0
  const water = new Uint8Array(C * C);
  for (let j = 1; j < N; j++) for (let i = 1; i < N; i++) {
    const x = cx(i), z = cx(j);
    if (cityGap(x, z) < 1.5 || nLake(x / 70, z / 70) < mood.lakes) continue;
    let flat = true;
    for (let dj = -1; flat && dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (L(i + di, j + dj) !== 0 || border(i + di, j + dj)) { flat = false; break; }
    }
    if (flat) water[j * C + i] = 1;
  }
  for (let iter = 0, changed = true; changed && iter < 32; iter++) {
    changed = false;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = cornersOf(i, j), v = k.map((q) => water[q]);
      if (v[0] === v[2] && v[1] === v[3] && v[0] !== v[1]) { for (const q of k) water[q] = 0; changed = true; }
    }
  }

  // 4) rivière(s) : chemin de cellules plates, terminé par deux sources
  const cellFlat0 = (i, j) => i > 0 && j > 0 && i < N - 1 && j < N - 1 && !isCityCell(i, j) && !cliffCell[j * N + i] &&
    cornersOf(i, j).every((q) => level[q] === 0 && !water[q]);
  const river = new Map(); // index de cellule → masque de sorties
  const nRivers = rng() < 0.75 ? (N > 20 && rng() < 0.5 ? 2 : 1) : 0;
  for (let rv = 0, tries = 0; rv < nRivers && tries < 60; tries++) {
    let i = 1 + Math.floor(rng() * (N - 2)), j = 1 + Math.floor(rng() * (N - 2));
    if (!cellFlat0(i, j) || river.has(j * N + i)) continue;
    const path = [[i, j]], taken = new Set([j * N + i]);
    let dir = Math.floor(rng() * 4);
    const target = 4 + Math.floor(rng() * 10);
    for (let guard = 0; path.length < target && guard < 200; guard++) {
      // tout droit (souvent) ou virage à gauche / droite
      const turnA = dir < 2 ? 2 : 0, turnB = dir < 2 ? 3 : 1;
      const choice = rng() < 0.62 ? dir : rng() < 0.5 ? turnA : turnB;
      const [dx, dz] = TR_DIRS[choice];
      const ni = path[path.length - 1][0] + dx, nj = path[path.length - 1][1] + dz;
      const key = nj * N + ni;
      // la nouvelle cellule ne doit toucher que la précédente
      let fine = cellFlat0(ni, nj) && !taken.has(key) && !river.has(key);
      for (const [ax, az] of TR_DIRS) {
        const k2 = (nj + az) * N + (ni + ax);
        if (fine && taken.has(k2) && !(ni + ax === path[path.length - 1][0] && nj + az === path[path.length - 1][1])) fine = false;
        if (fine && river.has(k2)) fine = false;
      }
      if (!fine) { if (choice === dir) break; continue; }
      path.push([ni, nj]); taken.add(key); dir = choice;
    }
    if (path.length < 3) continue;
    path.forEach(([pi, pj], n) => {
      let mask = 0;
      for (const q of [path[n - 1], path[n + 1]]) {
        if (!q) continue;
        mask |= 1 << TR_DIRS.findIndex(([dx, dz]) => dx === q[0] - pi && dz === q[1] - pj);
      }
      river.set(pj * N + pi, mask);
    });
    rv++;
  }

  // 5) choix des tuiles
  const tiles = [], flats = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = cornersOf(i, j), v = k.map((q) => level[q]);
    const m = Math.min(...v);
    const x = cx(i) + TILE / 2, z = cx(j) + TILE / 2;
    const y = TILE_Y0 + m * LEVEL_H;
    let mask = 0;
    v.forEach((l, n) => { if (l > m) mask |= 1 << n; });
    const cell = j * N + i;
    if (mask) {
      const cliff = !!(cliffCell[cell] && CLIFFS[mask]);
      const t = cliff ? CLIFFS[mask] : SLOPES[mask];
      tiles.push({ model: t.model, x, y, z, rot: t.rot });
      if (!cliff) flats.push({ i, j, x, z, level: m, mask, city: isCityCell(i, j), cliff: false });
      continue;
    }
    let wmask = 0;
    k.forEach((q, n) => { if (water[q]) wmask |= 1 << n; });
    if (wmask) { const t = SHORES[wmask]; tiles.push({ model: t.model, x, y, z, rot: t.rot, water: true }); continue; }
    if (river.has(cell)) { const t = RIVERS[river.get(cell)]; tiles.push({ model: t.model, x, y, z, rot: t.rot, water: true }); continue; }
    const city = isCityCell(i, j);
    if (!city && rng() < 0.035) { tiles.push({ model: 'pond', x, y, z, rot: Math.floor(rng() * 4), water: true }); continue; }
    if (m === 0) tiles.push({ model: 'lawn_plain', x, y, z, rot: 0 });
    else tiles.push({ model: 'raised_lawn_plain', x, y: y - LEVEL_H, z, rot: 0 });
    flats.push({ i, j, x, z, level: m, mask: 0, city, cliff: !!cliffCell[cell] });
  }

  // 6) végétation et rochers, semés sur les tuiles plates et les pentes douces
  const scatter = [];
  const put = (model, x, y, z, s) => scatter.push({ model, x, y, z, rot: rng() * Math.PI * 2, s });
  const pick = (list) => { let r = rng() * list.reduce((t, e) => t + e[1], 0); for (const [m, w] of list) { if ((r -= w) <= 0) return m; } return list[0][0]; };
  const keepOut = cityHalf + 1.8;
  for (const f of flats) {
    const near = cityGap(f.x, f.z) < 1.5;
    const slope = f.mask !== 0;
    for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) {
      if (slope && rng() < 0.35) continue;
      const x = f.x - TILE / 2 + (gx + 0.5) * 4 + (rng() - 0.5) * 3.2;
      const z = f.z - TILE / 2 + (gy + 0.5) * 4 + (rng() - 0.5) * 3.2;
      if (f.city && Math.abs(x) < keepOut && Math.abs(z) < keepOut) continue;
      const top = TILE_Y0 + GROUND_TOP + (f.level + trSlopeFrac(f.mask, (x - f.x) / TILE + 0.5, (z - f.z) / TILE + 0.5)) * LEVEL_H - (slope ? 0.08 : 0);
      const forest = nForest(x / 60, z / 60) + mood.forest + f.level * 0.12 - (near ? 0.35 : 0);
      const rock = nRock(x / 45, z / 45) + f.level * 0.18 + (f.cliff ? 0.3 : 0);
      const r = rng();
      if (rock > 0.32 && r < 0.4) {
        const m = pick([['boulder_s', 4], ['boulder_m', 3], ['boulder_l', 1.5], ['rock_pile', 2], ['rock_outcrop', near ? 0 : 0.6], ['rock_ledge', near ? 0 : 0.5], ['tree_dead', 0.5]]);
        put(m, x, top, z, 0.55 + rng() * 0.35);
      } else if (forest > 0.22) {
        if (r < 0.72) {
          const m = f.level >= 1 || forest > 0.45
            ? pick([['tree_pine', 6], ['tree_birch', 1], ['tree_young', 1]])
            : pick([['tree_oak', 3], ['tree_birch', 3], ['tree_pine', 2], ['tree_young', 2]]);
          put(m, x, top, z, 0.5 + rng() * 0.22);
        } else if (r < 0.84) put('bush_clump', x, top, z, 0.6 + rng() * 0.3);
        else if (r < 0.9) put(rng() < 0.5 ? 'tree_stump' : 'fallen_log', x, top, z, 0.6 + rng() * 0.2);
        else put('grass_tufts', x, top, z, 0.8 + rng() * 0.4);
      } else if (forest > 0.02) {
        if (r < 0.22) put(pick([['tree_young', 3], ['tree_birch', 2], ['tree_oak', 2]]), x, top, z, 0.5 + rng() * 0.2);
        else if (r < 0.5) put('bush_clump', x, top, z, 0.55 + rng() * 0.35);
        else if (r < 0.72) put('grass_tufts', x, top, z, 0.8 + rng() * 0.4);
      } else {
        if (r < 0.34) put('grass_tufts', x, top, z, 0.8 + rng() * 0.5);
        else if (r < 0.43) put('bush_clump', x, top, z, 0.5 + rng() * 0.3);
        else if (r < 0.46 && !near) put('tree_oak', x, top, z, 0.5 + rng() * 0.2);
      }
    }
  }
  return { N, half, tile: TILE, tiles, scatter, stats: { tiles: tiles.length, objects: scatter.length, rivers: nRivers } };
}

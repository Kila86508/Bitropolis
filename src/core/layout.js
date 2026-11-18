// Bitropolis — urbanisme : transforme l'analyse en plan de ville.
// Dossiers => quartiers, fichiers => parcelles, séparations => routes,
// routes très empruntées par les dépendances => rond-points.
import { makeRng } from './rules.js';

export const LOT_SIZE = { 1: 3.2, 2: 3.9, 3: 4.7, 4: 5.6, 5: 6.8 };
const SPECIAL_MIN_TIER = { townhall: 5, power: 2, fire: 2, police: 2, hospital: 2 };
const LOT_MARGIN = 0.6;      // trottoir autour d'un îlot
const RING_ROAD = 6;         // périphérique
function roadWidth(depth) { return depth <= 0 ? 5.2 : depth === 1 ? 4.4 : 3.6; }

function lotTier(f) { return Math.max(f.tier, SPECIAL_MIN_TIER[f.kind] || 1); }

export function buildTree(files) {
  const root = { name: '', path: '', dirs: new Map(), files: [], depth: 0 };
  for (const f of files) {
    let node = root;
    if (f.dir) {
      const segs = f.dir.split('/');
      let p = '';
      for (const s of segs) {
        p = p ? p + '/' + s : s;
        if (!node.dirs.has(s)) node.dirs.set(s, { name: s, path: p, dirs: new Map(), files: [], depth: node.depth + 1 });
        node = node.dirs.get(s);
      }
    }
    node.files.push(f);
  }
  // Compacte les chaînes de dossiers uniques (src/main/java/com/x => un seul quartier)
  const compact = (node) => {
    for (const [k, child] of [...node.dirs]) {
      let c = child;
      while (c.files.length === 0 && c.dirs.size === 1) {
        const only = [...c.dirs.values()][0];
        only.name = c.name + '/' + only.name;
        c = only;
      }
      node.dirs.set(k, c);
      compact(c);
    }
  };
  compact(root);
  return root;
}

function weigh(node) {
  let filesW = 0;
  for (const f of node.files) { const s = LOT_SIZE[lotTier(f)]; filesW += s * s; }
  node.filesWeight = filesW ? filesW * 1.18 + 6 : 0;
  let inner = node.filesWeight;
  let items = node.filesWeight ? 1 : 0;
  for (const c of node.dirs.values()) { inner += weigh(c); items++; }
  node.weight = inner + Math.max(0, items - 1) * roadWidth(node.depth) * Math.sqrt(inner) * 1.05;
  node.count = node.files.length + [...node.dirs.values()].reduce((s, c) => s + c.count, 0);
  return node.weight;
}

// Empaquetage des parcelles dans un îlot (rangées, justifiées).
function packLots(files, rect, rng) {
  const inner = { x: rect.x + LOT_MARGIN, z: rect.z + LOT_MARGIN, w: Math.max(0.5, rect.w - 2 * LOT_MARGIN), d: Math.max(0.5, rect.d - 2 * LOT_MARGIN) };
  const sorted = files.slice().sort((a, b) => lotTier(b) - lotTier(a) || b.score - a.score || (a.name < b.name ? -1 : 1));
  let scale = 1, rows = null;
  for (let iter = 0; iter < 60; iter++) {
    rows = []; let row = null, totalD = 0, ok = true;
    for (const f of sorted) {
      const s = LOT_SIZE[lotTier(f)] * scale;
      if (s > inner.w || s > inner.d) { ok = false; break; }
      if (!row || row.w + s > inner.w + 1e-6) {
        row = { items: [], w: 0, d: 0 }; rows.push(row);
      }
      row.items.push({ f, s }); row.w += s; row.d = Math.max(row.d, s);
    }
    totalD = rows.reduce((t, r) => t + r.d, 0);
    if (ok && totalD <= inner.d + 1e-6) break;
    scale *= 0.93;
  }
  const lots = [], trees = [];
  const totalD = rows.reduce((t, r) => t + r.d, 0);
  const gapZ = rows.length > 0 ? (inner.d - totalD) / rows.length : 0;
  let z = inner.z + gapZ / 2;
  for (const row of rows) {
    const gapX = (inner.w - row.w) / row.items.length;
    let x = inner.x + gapX / 2;
    for (const it of row.items) {
      const cx = x + it.s / 2, cz = z + row.d / 2;
      // orientation : façade vers la route la plus proche
      const dl = cx - rect.x, dr = rect.x + rect.w - cx, dt = cz - rect.z, db = rect.z + rect.d - cz;
      const m = Math.min(dl, dr, dt, db);
      const facing = m === db ? 0 : m === dr ? 1 : m === dt ? 2 : 3;
      lots.push({ id: it.f.id, x: cx, z: cz, size: it.s, facing });
      if (gapX > 2.2) {
        const tx = x + it.s + gapX / 2;
        if (tx < inner.x + inner.w - 0.8) trees.push({ x: tx, z: cz + (rng() - 0.5) * row.d * 0.5, s: 0.7 + rng() * 0.6 });
      }
      x += it.s + gapX;
    }
    if (gapZ > 2.2) {
      const n = Math.floor(inner.w / 3.2);
      for (let i = 0; i < n; i++) trees.push({ x: inner.x + (i + 0.5) * (inner.w / n), z: z + row.d + gapZ / 2, s: 0.6 + rng() * 0.6 });
    }
    z += row.d + gapZ;
  }
  return { lots, trees };
}

export function layoutCity(analysis) {
  const files = analysis.files;
  const root = buildTree(files);
  weigh(root);
  const side = Math.max(24, Math.sqrt(root.weight));
  const rng = makeRng(analysis.name + ':' + files.length);
  const city = {
    size: side, ring: RING_ROAD,
    roads: [], blocks: [], districts: [], lots: new Array(files.length), roundabouts: [], trees: []
  };
  const topIndex = new Map();
  let topCounter = 0;

  const rect0 = { x: -side / 2, z: -side / 2, w: side, d: side, sides: { l: RING_ROAD, r: RING_ROAD, t: RING_ROAD, b: RING_ROAD } };
  const h = side / 2 + RING_ROAD / 2;
  // Périphérique
  city.roads.push(
    { x1: -h, z1: -h, x2: h, z2: -h, w: RING_ROAD, traffic: 0, ring: true },
    { x1: h, z1: -h, x2: h, z2: h, w: RING_ROAD, traffic: 0, ring: true },
    { x1: h, z1: h, x2: -h, z2: h, w: RING_ROAD, traffic: 0, ring: true },
    { x1: -h, z1: h, x2: -h, z2: -h, w: RING_ROAD, traffic: 0, ring: true }
  );

  function districtOf(node) {
    if (!node.path) return -1;
    const top = node.path.split('/')[0];
    if (!topIndex.has(top)) topIndex.set(top, topCounter++);
    return topIndex.get(top);
  }

  function placeFiles(node, rect) {
    const district = districtOf(node);
    const { lots, trees } = packLots(node.files, rect, rng);
    const assets = node.files.filter((f) => f.kind === 'park').length;
    const block = { x: rect.x, z: rect.z, w: rect.w, d: rect.d, path: node.path, name: node.name || '/', district, park: assets / node.files.length > 0.6 };
    city.blocks.push(block);
    for (const l of lots) { l.block = city.blocks.length - 1; l.district = district; city.lots[l.id] = l; }
    for (const t of trees) city.trees.push(t);
    return node.files.map((f) => f.id);
  }

  function split(items, rect, depth) {
    if (items.length === 1) return items[0].place(rect);
    const total = items.reduce((s, it) => s + it.weight, 0);
    let acc = 0, k = 1, best = Infinity;
    for (let i = 1; i < items.length; i++) {
      acc += items[i - 1].weight;
      const diff = Math.abs(acc - total / 2);
      if (diff < best) { best = diff; k = i; }
    }
    const A = items.slice(0, k), B = items.slice(k);
    const wA = A.reduce((s, it) => s + it.weight, 0);
    const g = roadWidth(depth);
    const vertical = rect.w >= rect.d;
    let rA, rB, road;
    if (vertical) {
      const avail = Math.max(0.1, rect.w - g), wa = avail * (wA / total);
      rA = { x: rect.x, z: rect.z, w: wa, d: rect.d, sides: { ...rect.sides, r: g } };
      rB = { x: rect.x + wa + g, z: rect.z, w: avail - wa, d: rect.d, sides: { ...rect.sides, l: g } };
      const x = rect.x + wa + g / 2;
      road = { x1: x, z1: rect.z - rect.sides.t / 2, x2: x, z2: rect.z + rect.d + rect.sides.b / 2, w: g, ends: [rect.sides.t, rect.sides.b] };
    } else {
      const avail = Math.max(0.1, rect.d - g), da = avail * (wA / total);
      rA = { x: rect.x, z: rect.z, w: rect.w, d: da, sides: { ...rect.sides, b: g } };
      rB = { x: rect.x, z: rect.z + da + g, w: rect.w, d: avail - da, sides: { ...rect.sides, t: g } };
      const z = rect.z + da + g / 2;
      road = { x1: rect.x - rect.sides.l / 2, z1: z, x2: rect.x + rect.w + rect.sides.r / 2, z2: z, w: g, ends: [rect.sides.l, rect.sides.r] };
    }
    const idsA = split(A, rA, depth), idsB = split(B, rB, depth);
    // Trafic = nombre de dépendances qui traversent cette route.
    const setA = new Set(idsA);
    let traffic = 0;
    for (const id of idsB) {
      const f = files[id];
      for (const t of f.imports) if (setA.has(t)) traffic++;
      for (const t of f.importedBy) if (setA.has(t)) traffic++;
    }
    road.traffic = traffic;
    road.depth = depth;
    road.labels = [A.map((it) => it.label).join(', '), B.map((it) => it.label).join(', ')];
    city.roads.push(road);
    return idsA.concat(idsB);
  }

  function layoutDir(node, rect) {
    const district = districtOf(node);
    if (node.path) city.districts.push({ path: node.path, name: node.name, depth: node.depth, district, count: node.count, x: rect.x, z: rect.z, w: rect.w, d: rect.d });
    const items = [];
    if (node.files.length) items.push({ weight: node.filesWeight, label: node.name ? node.name + ' (fichiers)' : 'racine', place: (r) => placeFiles(node, r) });
    const children = [...node.dirs.values()].sort((a, b) => b.weight - a.weight || (a.name < b.name ? -1 : 1));
    for (const c of children) items.push({ weight: c.weight, label: c.name, place: (r) => layoutDir(c, r) });
    if (!items.length) return [];
    items.sort((a, b) => b.weight - a.weight);
    return split(items, rect, node.depth);
  }

  layoutDir(root, rect0);
  city.districtNames = [...topIndex.keys()];

  // Rond-points : aux carrefours des routes qui portent le plus de dépendances.
  const candidates = [];
  for (const r of city.roads) {
    if (r.ring || !r.traffic) continue;
    const ends = [[r.x1, r.z1, r.ends[0]], [r.x2, r.z2, r.ends[1]]];
    for (const [x, z, w2] of ends) {
      const radius = Math.min(Math.min(r.w, w2) * 0.5 + 1.1 + Math.log2(1 + r.traffic) * 0.18, Math.min(r.w, w2) * 0.5 + 2.2);
      candidates.push({ x, z, traffic: r.traffic, radius, labels: r.labels, crossWidth: w2 });
    }
  }
  candidates.sort((a, b) => b.traffic - a.traffic);
  const maxRb = Math.max(2, Math.min(28, Math.round(city.roads.length / 4)));
  for (const c of candidates) {
    if (city.roundabouts.length >= maxRb) break;
    if (city.roundabouts.some((o) => Math.hypot(o.x - c.x, o.z - c.z) < o.radius + c.radius + 6)) continue;
    city.roundabouts.push(c);
  }

  // Campagne autour de la ville
  const outer = side / 2 + RING_ROAD + 2;
  const nTrees = Math.round(40 + side * 1.6);
  const spread = side * 0.6 + 26;
  for (let i = 0, guard = 0; i < nTrees && guard < nTrees * 20; guard++) {
    const x = (rng() * 2 - 1) * (outer + spread), z = (rng() * 2 - 1) * (outer + spread);
    if (Math.abs(x) < outer + 1 && Math.abs(z) < outer + 1) continue;
    city.trees.push({ x, z, s: 0.8 + rng() * 1.1, wild: true }); i++;
  }
  return city;
}

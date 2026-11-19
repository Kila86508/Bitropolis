// Bitropolis — urbanisme en grille (pack de ville) : dossiers → quartiers, fichiers → bâtiments du pack
// posés sur des cases, séparés par des routes en tuiles. Chaque façade donne sur une route, il n'y a jamais
// deux routes accolées, et le trafic vient des dépendances acheminées par le réseau routier :
// les avenues les plus empruntées montent jusqu'au niveau N8.
import { makeRng } from './rules.js';
import { buildTree } from './layout.js';
import { growthOf, footprint, MONUMENTS, ROAD_TIERS, TREES, VEHICLES } from './catalog.js';

export const CELL = 4; // une case du pack = 4 m
const MAX_LEAF_W = 16;

// ---- Îlot de fichiers : rangées dos à dos, une route intérieure entre chaque paire de rangées.
// Rangée paire : façades vers -z (route du haut) ; rangée impaire : façades vers +z (route du bas).
// Des cases libres sont glissées entre certains bâtiments (jardins, placettes) pour aérer les rangées.
const GAP_RATE = 0.16;
function gdLeaf(node, items) {
  const rng = makeRng('leaf:' + node.path + ':' + items.length);
  const sorted = items.slice().sort((a, b) => b.d - a.d || b.w - a.w || b.score - a.score || (a.path < b.path ? -1 : 1));
  const area = sorted.reduce((s, it) => s + it.w * it.d, 0) * (1 + GAP_RATE);
  const maxW = Math.max(...sorted.map((it) => it.w));
  const W = Math.max(maxW, Math.min(MAX_LEAF_W, Math.ceil(Math.sqrt(area * 1.7))));
  const rows = [];
  let row = null;
  for (const it of sorted) {
    if (row && row.items.length && rng() < GAP_RATE && row.used + 1 + it.w <= W) { row.items.push({ gap: true, w: 1, d: 1 }); row.used += 1; }
    if (!row || row.used + it.w > W) { row = { items: [], used: 0, d: 0 }; rows.push(row); }
    row.items.push(it); row.used += it.w; row.d = Math.max(row.d, it.d);
  }
  const leaf = { kind: 'leaf', node, rows, w: W, extra: 0 };
  leaf.d = rows.reduce((s, r) => s + r.d, 0) + Math.max(0, Math.ceil(rows.length / 2) - 1);
  return leaf;
}

// ---- Quartier composé : enfants rangés sur des étagères, routes entre eux.
function gdCompose(node, children) {
  if (children.length === 1) return children[0];
  const kids = children.slice().sort((a, b) => b.d - a.d || b.w - a.w);
  const shelve = (target) => {
    const shelves = [];
    let sh = null;
    for (const c of kids) {
      if (sh) {
        // empile sous le dernier enfant de l'étagère s'il reste de la hauteur (colonne de petits quartiers)
        const last = sh.items[sh.items.length - 1];
        const stackW = Math.max(last.w, c.w);
        if (sh.items.length > 1 || last.d < sh.h) {
          if (last.d + 1 + c.d <= sh.h && sh.used - last.w + stackW <= target) {
            const st = last.stack ? last : { kind: 'comp', stack: true, node: null, shelves: [{ items: [last], used: last.w, h: last.d }], w: last.w, d: last.d };
            st.shelves.push({ items: [c], used: c.w, h: c.d });
            st.w = stackW; st.d += 1 + c.d;
            sh.items[sh.items.length - 1] = st;
            sh.used += stackW - last.w;
            continue;
          }
        }
      }
      const need = sh && sh.items.length ? sh.used + 1 + c.w : c.w;
      if (!sh || need > target) { sh = { items: [c], used: c.w, h: c.d }; shelves.push(sh); }
      else { sh.items.push(c); sh.used = need; sh.h = Math.max(sh.h, c.d); }
    }
    const w = Math.max(...shelves.map((s) => s.used)), d = shelves.reduce((s, x) => s + x.h, 0) + shelves.length - 1;
    return { shelves, w, d };
  };
  // on essaie plusieurs largeurs et on garde la plus compacte (surface + pénalité si trop allongée)
  const minW = Math.max(...kids.map((c) => c.w)), maxW = kids.reduce((s, c) => s + c.w + 1, -1);
  let best = null, bestCost = Infinity;
  for (let t = minW; t <= maxW; t++) {
    const r = shelve(t);
    const cost = r.w * r.d * (1 + 0.35 * Math.abs(Math.log(r.w / r.d)));
    if (cost < bestCost - 1e-9) { bestCost = cost; best = r; }
    if (r.shelves.length === 1) break;
  }
  return { kind: 'comp', node, shelves: best.shelves, w: best.w, d: best.d };
}

// Agrandissements (évitent les routes accolées) : un îlot absorbe des rangées / colonnes de verdure.
function gdGrowD(n, k) { if (k <= 0) return; if (n.kind === 'leaf') n.extra += k; else n.shelves[n.shelves.length - 1].h += k; n.d += k; }
function gdGrowW(n, k) { if (k > 0) n.w += k; }

// ---- Écriture des cases (coordonnées entières, origine en haut à gauche)
function gdEmit(n, ox, oz, out) {
  if (n.kind === 'leaf') {
    const block = { x: ox, z: oz, w: n.w, d: n.d, node: n.node, ids: [] };
    out.leaves.push(block);
    let z = oz;
    n.rows.forEach((row, r) => {
      const top = r % 2 === 0;
      let x = ox;
      for (const it of row.items) {
        if (it.gap) { x += 1; continue; }
        const iz = top ? z : z + row.d - it.d;
        out.items.push({ ...it, x, z: iz, facing: top ? 2 : 0, leaf: out.leaves.length - 1 });
        block.ids.push(it.id);
        x += it.w;
      }
      z += row.d;
      if (r === 0 && n.extra) z += n.extra;            // verdure entre deux rangées dos à dos
      if (!top && r < n.rows.length - 1) {             // route intérieure après chaque paire
        for (let i = 0; i < n.w; i++) out.road(ox + i, z);
        z += 1;
      }
    });
    return;
  }
  let z = oz;
  n.shelves.forEach((sh, si) => {
    if (si > 0) { for (let i = 0; i < n.w; i++) out.road(ox + i, z - 1); }
    let x = ox;
    sh.items.forEach((c, ci) => {
      if (ci > 0) { for (let j = 0; j < sh.h; j++) out.road(x, z + j); x += 1; }
      const gap = sh.h - c.d;
      if (gap === 1) gdGrowD(c, 1);
      const last = ci === sh.items.length - 1;
      if (last && n.w - (x + c.w - ox) === 1) gdGrowW(c, 1);
      gdEmit(c, x, z, out);
      if (gap >= 2) for (let i = 0; i < c.w; i++) out.road(x + i, z + c.d);
      x += c.w;
    });
    if (n.w - (x - ox) >= 2) for (let j = 0; j < sh.h; j++) out.road(x, z + j);
    z += sh.h + 1;
  });
}

// Tables de tuiles de route : sorties (-x, +x, -z, +z) → forme + rotation (k × 90°, sens three.js)
const GD_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const gdRot = ([x, z], k) => { const a = (k * Math.PI) / 2, c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a)); return [x * c + z * s, -x * s + z * c]; };
const GD_ROADS = (() => {
  const t = {};
  for (const [shape, dirs] of [['Road_Cross', [0, 1, 2, 3]], ['Road_Straight', [0, 1]], ['Road_T', [0, 1, 3]], ['Road_Corner', [0, 3]], ['Road_End', [0]]]) {
    for (let k = 0; k < 4; k++) {
      let mask = 0;
      for (const i of dirs) { const [x, z] = gdRot(GD_DIRS[i], k); mask |= 1 << GD_DIRS.findIndex((v) => v[0] === x && v[1] === z); }
      if (!(mask in t)) t[mask] = { shape, rot: k };
    }
  }
  return t;
})();

// Gros projets : un sous-dossier de moins de `min` fichiers rejoint le quartier de son parent.
// Sinon des milliers de quartiers d'un ou deux bâtiments, chacun entouré de routes, laissent la ville à moitié vide.
function gdFoldSmallDirs(root, min) {
  if (min < 2) return;
  const all = (n, acc = []) => { acc.push(...n.files); for (const c of n.dirs.values()) all(c, acc); return acc; };
  const fold = (n) => {
    for (const [k, c] of [...n.dirs]) {
      fold(c);
      const sub = all(c);
      if (sub.length < min) { n.files.push(...sub); n.dirs.delete(k); }
    }
  };
  fold(root);
}

export function layoutGrid(analysis) {
  const files = analysis.files;
  const rng = makeRng('grid:' + analysis.name + ':' + files.length);
  const growth = files.map((f) => growthOf(f));
  const root = buildTree(files);
  gdFoldSmallDirs(root, Math.floor(files.length / 400));
  const topIndex = new Map();
  const districtOf = (path) => {
    if (!path) return -1;
    const top = path.split('/')[0];
    if (!topIndex.has(top)) topIndex.set(top, topIndex.size);
    return topIndex.get(top);
  };

  // 1) tailles, du bas vers le haut
  const build = (node) => {
    const children = [];
    if (node.files.length) {
      children.push(gdLeaf(node, node.files.map((f) => {
        const g = growth[f.id], [w, d] = footprint(g.model);
        return { id: f.id, w, d, score: f.score, path: f.path };
      })));
    }
    const subs = [...node.dirs.values()].sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const c of subs) { const b = build(c); if (b) children.push(b); }
    if (!children.length) return null;
    return gdCompose(node, children);
  };
  const top = build(root);

  // 2) placement : périphérique tout autour
  const cols = top.w + 2, rows = top.d + 2;
  const grid = new Int8Array(cols * rows); // 0 verdure, 1 route, 2 bâtiment
  const out = { items: [], leaves: [], road: (x, z) => { grid[z * cols + x] = 1; } };
  gdEmit(top, 1, 1, out);
  for (let x = 0; x < cols; x++) { grid[x] = 1; grid[(rows - 1) * cols + x] = 1; }
  for (let z = 0; z < rows; z++) { grid[z * cols] = 1; grid[z * cols + cols - 1] = 1; }
  for (const it of out.items) for (let j = 0; j < it.d; j++) for (let i = 0; i < it.w; i++) grid[(it.z + j) * cols + it.x + i] = 2;

  const ox = -(cols * CELL) / 2, oz = -(rows * CELL) / 2;
  const wx = (x) => ox + (x + 0.5) * CELL, wz = (z) => oz + (z + 0.5) * CELL;
  const isRoad = (x, z) => x >= 0 && z >= 0 && x < cols && z < rows && grid[z * cols + x] === 1;

  // 3) trafic : chaque dépendance entre deux îlots est acheminée par le plus court chemin routier
  const traffic = new Float64Array(cols * rows), pairOf = new Array(cols * rows);
  const leafOf = new Int32Array(files.length).fill(-1);
  out.items.forEach((it) => { leafOf[it.id] = it.leaf; });
  const anchors = out.leaves.map((b) => {
    let best = -1, bd = Infinity;
    const cx = b.x + b.w / 2, cz = b.z + b.d / 2;
    for (let x = b.x - 1; x <= b.x + b.w; x++) for (const z of [b.z - 1, b.z + b.d]) if (isRoad(x, z)) { const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz); if (d < bd) { bd = d; best = z * cols + x; } }
    for (let z = b.z; z < b.z + b.d; z++) for (const x of [b.x - 1, b.x + b.w]) if (isRoad(x, z)) { const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz); if (d < bd) { bd = d; best = z * cols + x; } }
    return best;
  });
  const pairs = new Map();
  for (const f of files) for (const t of f.imports) {
    const a = leafOf[f.id], b = leafOf[t];
    if (a < 0 || b < 0) continue;
    const key = a < b ? a * 100000 + b : b * 100000 + a;
    pairs.set(key, (pairs.get(key) || 0) + 1);
  }
  const bySource = new Map();
  for (const [key, c] of pairs) { const a = Math.floor(key / 100000), b = key % 100000; if (!bySource.has(a)) bySource.set(a, []); bySource.get(a).push([b, c]); }
  const prev = new Int32Array(cols * rows);
  const queue = new Int32Array(cols * rows);
  for (const [a, targets] of bySource) {
    const s = anchors[a];
    if (s < 0) continue;
    prev.fill(-2); prev[s] = -1;
    let qh = 0, qt = 0; queue[qt++] = s;
    while (qh < qt) {
      const c = queue[qh++], x = c % cols, z = (c - x) / cols;
      for (const [dx, dz] of GD_DIRS) {
        const nx = x + dx, nz = z + dz;
        if (!isRoad(nx, nz)) continue;
        const k = nz * cols + nx;
        if (prev[k] !== -2) continue;
        prev[k] = c; queue[qt++] = k;
      }
    }
    for (const [b, c] of targets) {
      let k = anchors[b];
      if (k < 0 || prev[k] === -2) continue;
      const label = [out.leaves[a].node.path || '/', out.leaves[b].node.path || '/'];
      while (k >= 0) {
        traffic[k] += c;
        if (!pairOf[k] || pairOf[k].c < c) pairOf[k] = { c, label };
        k = prev[k];
      }
    }
  }
  // un peu de trafic local devant chaque îlot (ses dépendances internes)
  out.leaves.forEach((b, i) => {
    const local = b.ids.reduce((s, id) => s + files[id].imports.filter((t) => leafOf[t] === i).length, 0);
    if (anchors[i] >= 0) traffic[anchors[i]] += local * 0.5;
  });

  // 4) segments droits (voitures, statistiques) et niveau de chaque tronçon
  let maxT = 0;
  for (let i = 0; i < traffic.length; i++) maxT = Math.max(maxT, traffic[i]);
  const tierOfTraffic = (t) => (t <= 0 || maxT <= 0 ? 1 : 1 + Math.round((ROAD_TIERS - 1) * Math.log1p(t) / Math.log1p(maxT)));
  const ring = (x, z) => x === 0 || z === 0 || x === cols - 1 || z === rows - 1;
  const cellTier = new Int8Array(cols * rows);
  const segments = [];
  const runs = (horizontal) => {
    const A = horizontal ? rows : cols, B = horizontal ? cols : rows;
    for (let a = 0; a < A; a++) {
      let b = 0;
      while (b < B) {
        const at = (bb) => (horizontal ? isRoad(bb, a) : isRoad(a, bb));
        if (!at(b)) { b++; continue; }
        let e = b;
        while (e + 1 < B && at(e + 1)) e++;
        if (e > b) {
          let t = 0, onRing = true, best = null;
          for (let k = b; k <= e; k++) {
            const x = horizontal ? k : a, z = horizontal ? a : k, c = z * cols + x;
            t = Math.max(t, traffic[c]);
            if (!ring(x, z)) onRing = false;
            if (pairOf[c] && (!best || pairOf[c].c > best.c)) best = pairOf[c];
          }
          const tier = Math.max(tierOfTraffic(t), onRing ? 4 : 2);
          for (let k = b; k <= e; k++) { const c = horizontal ? a * cols + k : k * cols + a; cellTier[c] = Math.max(cellTier[c], tier); }
          const x1 = horizontal ? b : a, z1 = horizontal ? a : b, x2 = horizontal ? e : a, z2 = horizontal ? a : e;
          segments.push({ x1: wx(x1), z1: wz(z1), x2: wx(x2), z2: wz(z2), w: CELL * (0.32 + tier * 0.075), traffic: Math.round(t), tier, ring: onRing, labels: best ? best.label : null, cells: [x1, z1, x2, z2] });
        }
        b = e + 1;
      }
    }
  };
  runs(true); runs(false);

  // 5) tuiles de route
  const roadTiles = [];
  for (let z = 0; z < rows; z++) for (let x = 0; x < cols; x++) {
    if (!isRoad(x, z)) continue;
    let mask = 0;
    GD_DIRS.forEach(([dx, dz], i) => { if (isRoad(x + dx, z + dz)) mask |= 1 << i; });
    const t = GD_ROADS[mask] || GD_ROADS[3];
    // ligne droite qui débouche sur un carrefour : passage piéton (kit de voirie)
    const degree = (cx, cz) => GD_DIRS.reduce((n, [dx, dz]) => n + (isRoad(cx + dx, cz + dz) ? 1 : 0), 0);
    const crossing = t.shape === 'Road_Straight' && GD_DIRS.some(([dx, dz], i) => (mask & (1 << i)) && degree(x + dx, z + dz) >= 3);
    roadTiles.push({ x: wx(x), z: wz(z), cx: x, cz: z, model: `${t.shape}_N${Math.max(1, cellTier[z * cols + x] || 2)}`, rot: t.rot, crossing });
  }

  // 6) bâtiments (parcelles)
  const lots = new Array(files.length);
  const blocks = out.leaves.map((b) => ({
    x: ox + b.x * CELL, z: oz + b.z * CELL, w: b.w * CELL, d: b.d * CELL,
    path: b.node.path, name: b.node.name || '/', district: districtOf(b.node.path), park: false
  }));
  for (const it of out.items) {
    const g = growth[it.id];
    lots[it.id] = {
      id: it.id, x: ox + (it.x + it.w / 2) * CELL, z: oz + (it.z + it.d / 2) * CELL, size: Math.max(it.w, it.d) * CELL * 0.92,
      w: it.w, d: it.d, cx: it.x, cz: it.z, facing: it.facing, block: it.leaf, district: blocks[it.leaf].district,
      model: g.model, stage: g.stage, stages: g.stages, family: g.family, familyName: g.name, points: g.points, start: g.start, next: g.next
    };
  }

  // 7) quartiers (étiquettes)
  const districts = [];
  const countFiles = (node) => (node.count = node.files.length + [...node.dirs.values()].reduce((s, c) => s + countFiles(c), 0));
  countFiles(root);
  // positions des quartiers : enveloppe de leurs bâtiments
  const env = new Map();
  for (const it of out.items) {
    const p = files[it.id].dir;
    const segs = p ? p.split('/') : [];
    for (let k = 1; k <= segs.length; k++) {
      const key = segs.slice(0, k).join('/');
      const e = env.get(key) || { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity };
      e.x0 = Math.min(e.x0, it.x); e.z0 = Math.min(e.z0, it.z); e.x1 = Math.max(e.x1, it.x + it.w); e.z1 = Math.max(e.z1, it.z + it.d);
      env.set(key, e);
    }
  }
  const walkDirs = (node) => {
    for (const c of node.dirs.values()) {
      const e = env.get(c.path);
      if (e) districts.push({ path: c.path, name: c.name, depth: c.depth, district: districtOf(c.path), count: c.count, x: ox + e.x0 * CELL, z: oz + e.z0 * CELL, w: (e.x1 - e.x0) * CELL, d: (e.z1 - e.z0) * CELL });
      walkDirs(c);
    }
  };
  walkDirs(root);

  // 8) verdure : arbres et places à monuments sur les cases libres
  const trees = [], greens = [];
  const roundabouts = [];
  const free = [];
  for (let z = 1; z < rows - 1; z++) for (let x = 1; x < cols - 1; x++) {
    if (grid[z * cols + x] !== 0) continue;
    greens.push({ x: wx(x), z: wz(z), cx: x, cz: z });
    let t = 0, pair = null;
    for (const [dx, dz] of GD_DIRS) { const k = (z + dz) * cols + x + dx; if (isRoad(x + dx, z + dz) && traffic[k] > t) { t = traffic[k]; pair = pairOf[k]; } }
    free.push({ x, z, t, pair });
  }
  free.sort((a, b) => b.t - a.t || a.z - b.z || a.x - b.x);
  const nMon = Math.max(1, Math.min(10, Math.round(segments.length / 10)));
  const monumentCells = new Set();
  for (const f of free) {
    if (roundabouts.length >= nMon || f.t <= 0) break;
    if (roundabouts.some((r) => Math.abs(r.cx - f.x) + Math.abs(r.cz - f.z) < 6)) continue;
    roundabouts.push({ x: wx(f.x), z: wz(f.z), cx: f.x, cz: f.z, radius: CELL * 0.5, crossWidth: CELL, traffic: Math.round(f.t), labels: f.pair ? f.pair.label : ['/', '/'], model: MONUMENTS[roundabouts.length % MONUMENTS.length] });
    monumentCells.add(f.z * cols + f.x);
  }
  // Mobilier des cases libres : au bord d'une route, placettes (banc, lampadaire, poubelle), jardins,
  // petits parkings ; à l'arrière, jardins, arbres ou simple pelouse. Pas de forêt compacte.
  const decor = [], paved = [];
  const put = (model, x, z, rot, s = 1) => decor.push({ model, x, z, rot, s });
  const tree = (x, z) => {
    const r = rng();
    if (r < 0.48) put(TREES[Math.floor(rng() * TREES.length)], x, z, rng() * 6.28, 1.05 + rng() * 0.5);
    else if (r < 0.64) put(r < 0.56 ? 'fp_tree2' : 'fp_tree6', x, z, rng() * 6.28, 0.85 + rng() * 0.35);
    else if (r < 0.9) put(['rk_Tree3', 'rk_Tree4', 'rk_tree_1_a'][Math.floor(rng() * 3)], x, z, rng() * 6.28, 0.85 + rng() * 0.35);
    else put('rk_bush_1', x, z, rng() * 6.28, 0.8 + rng() * 0.4);
  };
  const off = () => (rng() - 0.5) * CELL * 0.5;
  for (const g of greens) {
    if (monumentCells.has(g.cz * cols + g.cx)) continue;
    let road = -1;
    GD_DIRS.forEach(([dx, dz], i) => { if (road < 0 && isRoad(g.cx + dx, g.cz + dz)) road = i; });
    const r = rng();
    if (road >= 0) {
      const [dx, dz] = GD_DIRS[road];
      const edgeX = g.x + dx * CELL * 0.32, edgeZ = g.z + dz * CELL * 0.32;      // bord côté route
      const along = dz !== 0 ? 0 : Math.PI / 2;                                  // parallèle à la route
      const tx = dz !== 0 ? 1 : 0, tz = dz !== 0 ? 0 : 1;                        // direction le long de la route
      if (r < 0.32) {                       // placette
        paved.push(g.cz * cols + g.cx);
        put('fp_bench2', edgeX - tx * CELL * 0.12, edgeZ - tz * CELL * 0.12, along + (dz > 0 || dx > 0 ? Math.PI : 0));
        const lamp = rng();
        put(lamp < 0.5 ? 'fp_streetLight' : lamp < 0.8 ? 'rk_lamp_1' : 'rk_lamp_2', edgeX + tx * CELL * 0.3, edgeZ + tz * CELL * 0.3, along + (lamp >= 0.5 ? Math.atan2(-dx, -dz) - along : 0));
        if (rng() < 0.6) put('fp_garbageBin', edgeX + tx * CELL * 0.14, edgeZ + tz * CELL * 0.14, rng() * 6.28);
        tree(g.x - dx * CELL * 0.2 + off() * 0.4, g.z - dz * CELL * 0.2 + off() * 0.4);
      } else if (r < 0.52) {                // jardin
        put('fp_garden1', g.x, g.z, Math.floor(rng() * 4) * Math.PI / 2);
        if (rng() < 0.4) put('fp_fireHydrant', edgeX + tx * CELL * 0.38, edgeZ + tz * CELL * 0.38, rng() * 6.28);
      } else if (r < 0.66) {                // petit parking
        paved.push(g.cz * cols + g.cx);
        const n = 1 + Math.floor(rng() * 2);
        for (let k = 0; k < n; k++) {
          const car = rng() < 0.3 ? 'fp_redCar' : VEHICLES.car[Math.floor(rng() * VEHICLES.car.length)];
          const t = (k - (n - 1) / 2) * CELL * 0.34;
          put(car, g.x + tx * t, g.z + tz * t, along + Math.PI / 2 + (rng() < 0.5 ? Math.PI : 0), car === 'fp_redCar' ? 1 : 2.2);
        }
        const extra = rng();
        if (extra < 0.3) put('fp_trafficCone', edgeX + tx * CELL * 0.4, edgeZ + tz * CELL * 0.4, rng() * 6.28);
        else if (extra < 0.55) put('rk_hazzard_cone_1', edgeX + tx * CELL * 0.4, edgeZ + tz * CELL * 0.4, rng() * 6.28);
        else if (extra < 0.7) put('rk_traffic_barell_1', g.x - dx * CELL * 0.35 + tx * CELL * 0.38, g.z - dz * CELL * 0.35 + tz * CELL * 0.38, rng() * 6.28);
      } else if (r < 0.9) {                 // arbres d'alignement
        tree(edgeX - dx * CELL * 0.1 + tx * CELL * 0.22, edgeZ - dz * CELL * 0.1 + tz * CELL * 0.22);
        if (rng() < 0.55) tree(edgeX - dx * CELL * 0.1 - tx * CELL * 0.22, edgeZ - dz * CELL * 0.1 - tz * CELL * 0.22);
      }
    } else {
      if (r < 0.3) put('fp_garden1', g.x, g.z, Math.floor(rng() * 4) * Math.PI / 2);
      else if (r < 0.62) { tree(g.x + off(), g.z + off()); if (rng() < 0.4) tree(g.x + off(), g.z + off()); }
      else if (r < 0.72) { put('fp_garbageBin', g.x + off(), g.z + off(), rng() * 6.28); put(rng() < 0.5 ? 'fp_trashBag1' : 'fp_trashBag2', g.x + off(), g.z + off(), rng() * 6.28); }
    }
  }
  for (const d of decor) if (TREES.includes(d.model)) trees.push({ x: d.x, z: d.z, s: d.s, kind: TREES.indexOf(d.model) });

  return {
    grid: true, cell: CELL, cols, rows, origin: [ox, oz],
    size: Math.max(cols, rows) * CELL, ring: 0,
    roads: segments, roadTiles, blocks, districts, lots, roundabouts, trees, greens, decor, paved,
    districtNames: [...topIndex.keys()], maxTraffic: maxT,
    cellAt: (x, z) => grid[z * cols + x]
  };
}

// Bitropolis — version simplifiée d'un modèle pour l'affichage lointain. Module pur, partagé par la visionneuse
// (qui l'applique) et par le constructeur de packs (qui vérifie le résultat, voir scripts/lodpick.js).
//
// Règle d'or : ne déplacer aucune surface. Fusionner des sommets voisins à travers tout le modèle écrase les
// couches minces les unes sur les autres (chaussée et tablier d'un pont, dalle de toit et dessus d'un bâtiment) :
// deux couleurs se retrouvent dans le même plan, ou à un cheveu, et l'écran clignote. On travaille donc pièce par
// pièce (une pièce = un volume fermé d'une seule couleur), et chaque pièce garde exactement ses dimensions :
//  - trop petite pour se voir de loin, ou simple barre fine : retirée ;
//  - pavé (chanfreiné ou non) aligné sur les axes : pavé net de 12 triangles, ou ses deux grandes faces s'il est mince ;
//  - boule : icosaèdre de 20 triangles, même centre, même rayon ;
//  - autre : seuls les sommets très proches (chanfreins) sont soudés, vers l'extérieur de la pièce.
// Les surfaces ouvertes (anciens modèles à faces séparées) ne sont pas touchées.

// seuils en unités de modèle (un lot = 1, soit 10 m)
export const LOD_OPTS = {
  corner: 0.012, // un sommet « de coin » est à moins de ça (et de 34 % de la dimension) d'un coin de la boîte englobante
  thin: 0.02,    // pavé plus mince que ça (et que 20 % de sa dimension suivante) : on ne garde que ses deux grandes faces
  tiny: 0.04,    // pièce entièrement plus petite que ça : retirée
  bar: 0.02,     // pièce dont deux dimensions sont plus petites que ça (barreau, mât) : retirée
  weld: 0.01     // sommets d'une même pièce plus proches que ça : soudés
};

const LOD_T = (1 + Math.sqrt(5)) / 2;
const LOD_ICO_V = [[-1, LOD_T, 0], [1, LOD_T, 0], [-1, -LOD_T, 0], [1, -LOD_T, 0], [0, -1, LOD_T], [0, 1, LOD_T], [0, -1, -LOD_T], [0, 1, -LOD_T], [LOD_T, 0, -1], [LOD_T, 0, 1], [-LOD_T, 0, -1], [-LOD_T, 0, 1]]
  .map((v) => v.map((x) => x / Math.hypot(1, LOD_T)));
const LOD_ICO_F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
// faces d'un pavé [coins, axe] — coin k : bit 0 = x max, bit 1 = y max, bit 2 = z max ; normales vers l'extérieur
const LOD_BOX_F = [[[0, 4, 6, 2], 0], [[1, 3, 7, 5], 0], [[0, 1, 5, 4], 1], [[2, 6, 7, 3], 1], [[0, 2, 3, 1], 2], [[4, 5, 7, 6], 2]];

// pos : positions (x, y, z par sommet) ; colorOf(v) : clé de couleur du sommet ; index : triangles ;
// keepSmall(v) : vrai pour une pièce à garder même minuscule (lampes : elles s'allument la nuit).
// Renvoie { pos, src, idx } : positions des nouveaux sommets, sommet d'origine dont chacun reprend la couleur, triangles.
export function lodPieces(pos, colorOf, index, keepSmall = null, opts = LOD_OPTS) {
  const n = pos.length / 3, par = new Int32Array(n);
  for (let i = 0; i < n; i++) par[i] = i;
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let i = 0; i < index.length; i += 3) { const a = find(index[i]); par[find(index[i + 1])] = a; par[find(index[i + 2])] = a; }
  // pièces : sommets reliés par des triangles
  const pieces = new Map();
  for (let v = 0; v < n; v++) {
    const r = find(v);
    let c = pieces.get(r);
    if (!c) pieces.set(r, c = { v: [], t: [], min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], col: colorOf(v), mono: true });
    c.v.push(v);
    if (c.mono && colorOf(v) !== c.col) c.mono = false;
    for (let k = 0; k < 3; k++) { const x = pos[v * 3 + k]; if (x < c.min[k]) c.min[k] = x; if (x > c.max[k]) c.max[k] = x; }
  }
  for (let i = 0; i < index.length; i += 3) pieces.get(find(index[i])).t.push(i);

  const out = [], src = [], idx = [];
  const copy = (c) => { // pièce recopiée telle quelle
    const map = new Map();
    for (const t of c.t) for (let k = 0; k < 3; k++) {
      const v = index[t + k];
      let m = map.get(v);
      if (m === undefined) { m = src.length; map.set(v, m); out.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); src.push(v); }
      idx.push(m);
    }
  };
  for (const c of pieces.values()) {
    if (!c.t.length) continue;
    // volume fermé d'une seule couleur ? (chaque arête partagée par exactement deux triangles)
    let solid = c.mono;
    if (solid) {
      const edges = new Map();
      for (const t of c.t) for (let k = 0; k < 3; k++) {
        const a = index[t + k], b = index[t + (k + 1) % 3], key = a < b ? a * n + b : b * n + a;
        edges.set(key, (edges.get(key) || 0) + 1);
      }
      for (const cnt of edges.values()) if (cnt !== 2) { solid = false; break; }
    }
    if (!solid) { copy(c); continue; }

    const e = [0, 1, 2].map((k) => c.max[k] - c.min[k]), order = [0, 1, 2].sort((a, b) => e[a] - e[b]);
    const small = e[order[2]] < opts.tiny, flatOnGround = order[0] === 1 && e[1] <= opts.thin; // marquage au sol : on le garde
    if ((small || (e[order[1]] < opts.bar && !flatOnGround)) && !(keepSmall && keepSmall(c.v[0]))) continue;

    // pavé aligné sur les axes : tous les sommets près d'un coin de la boîte englobante, les huit coins occupés
    let box = true, seen = 0;
    const d = e.map((x) => Math.min(opts.corner, 0.34 * x));
    for (const v of c.v) {
      let code = 0;
      for (let k = 0; k < 3; k++) {
        const x = pos[v * 3 + k];
        if (x - c.min[k] <= d[k] + 1e-7) continue;
        if (c.max[k] - x <= d[k] + 1e-7) code |= 1 << k; else { box = false; break; }
      }
      if (!box) break;
      seen |= 1 << code;
    }
    if (box && seen === 255) {
      const b = src.length, flat = e[order[0]] <= opts.thin && e[order[0]] <= 0.2 * e[order[1]] ? order[0] : -1;
      for (let k = 0; k < 8; k++) { out.push(k & 1 ? c.max[0] : c.min[0], k & 2 ? c.max[1] : c.min[1], k & 4 ? c.max[2] : c.min[2]); src.push(c.v[0]); }
      for (const [q, ax] of LOD_BOX_F) if (flat < 0 || ax === flat) idx.push(b + q[0], b + q[1], b + q[2], b + q[0], b + q[2], b + q[3]);
      continue;
    }
    // boule (icosphère à 42 sommets)
    if (c.v.length === 42 && c.t.length === 80) {
      let cx = 0, cy = 0, cz = 0;
      for (const v of c.v) { cx += pos[v * 3]; cy += pos[v * 3 + 1]; cz += pos[v * 3 + 2]; }
      cx /= 42; cy /= 42; cz /= 42;
      let r0 = Infinity, r1 = 0;
      for (const v of c.v) { const r = Math.hypot(pos[v * 3] - cx, pos[v * 3 + 1] - cy, pos[v * 3 + 2] - cz); if (r < r0) r0 = r; if (r > r1) r1 = r; }
      if (r1 - r0 < 0.02 * r1) {
        const b = src.length;
        for (const [x, y, z] of LOD_ICO_V) { out.push(cx + x * r1, cy + y * r1, cz + z * r1); src.push(c.v[0]); }
        for (const [a, q, w] of LOD_ICO_F) idx.push(b + a, b + q, b + w);
        continue;
      }
    }
    // autre pièce : souder les sommets très proches ; le sommet soudé prend, sur chaque axe, la coordonnée la plus
    // éloignée du centre de la pièce (à égalité : la plus haute, la plus loin de l'axe du modèle)
    const ctr = [0, 1, 2].map((k) => (c.min[k] + c.max[k]) / 2), map = new Map(), rep = new Map(), tris = new Set();
    for (const v of c.v) {
      const key = `${Math.round((pos[v * 3] - c.min[0]) / opts.weld)},${Math.round((pos[v * 3 + 1] - c.min[1]) / opts.weld)},${Math.round((pos[v * 3 + 2] - c.min[2]) / opts.weld)}`;
      let m = map.get(key);
      if (m === undefined) { m = src.length; map.set(key, m); out.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); src.push(v); }
      else for (let k = 0; k < 3; k++) {
        const x = pos[v * 3 + k], cur = out[m * 3 + k], far = Math.abs(x - ctr[k]) - Math.abs(cur - ctr[k]);
        if (far > 1e-9 || (far >= -1e-9 && (k === 1 ? x > cur : Math.abs(x) > Math.abs(cur)))) out[m * 3 + k] = x;
      }
      rep.set(v, m);
    }
    for (const t of c.t) {
      const a = rep.get(index[t]), b = rep.get(index[t + 1]), w = rep.get(index[t + 2]);
      if (a === b || b === w || a === w) continue;
      const lo = Math.min(a, b, w), hi = Math.max(a, b, w), key = `${lo},${a + b + w - lo - hi},${hi}`;
      if (tris.has(key)) continue;
      tris.add(key); idx.push(a, b, w);
    }
  }
  return { pos: out, src, idx };
}

// Une version simplifiée ne vaut une seconde géométrie que si elle retire au moins 30 % des triangles.
export function lodWorth(idx, index) { return idx.length < index.length * 0.7; }

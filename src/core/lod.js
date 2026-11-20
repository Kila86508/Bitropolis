// Bitropolis — version simplifiée d'un modèle pour l'affichage lointain. Module pur, partagé par le constructeur
// de packs (qui choisit le réglage de chaque modèle, voir scripts/lodpick.js) et par la visionneuse (qui l'applique).
//
// Principe : les sommets d'une même couleur qui tombent dans la même cellule sont fusionnés en un seul, et les
// triangles devenus plats ou en double disparaissent. Le danger est de plaquer l'une sur l'autre deux couches
// voisines (chaussée et tablier d'un pont, vitre et mur) : elles se retrouvent dans le même plan et l'écran
// scintille. D'où deux leviers, réglés modèle par modèle :
//  - la taille de la cellule, à plat et en hauteur (une cellule basse ne mélange pas deux couches empilées) ;
//  - le sommet gardé pour représenter le groupe.

// [taille à plat, taille en hauteur] en unités de modèle (un lot = 1), de la plus grossière à la plus fine
export const LOD_CELLS = [[0.035, 0.035], [0.035, 0.004], [0.026, 0.026], [0.026, 0.004], [0.02, 0.02], [0.02, 0.004], [0.014, 0.014], [0.014, 0.004]];

const lodR2 = (p, v) => p[v * 3] * p[v * 3] + p[v * 3 + 2] * p[v * 3 + 2]; // distance² à l'axe vertical du modèle
// Chaque règle dit si le sommet v représente mieux le groupe que le représentant courant c.
export const LOD_RULES = [
  null, // le premier sommet rencontré
  (p, v, c) => { const d = p[v * 3 + 1] - p[c * 3 + 1]; return Math.abs(d) > 1e-6 ? d > 0 : lodR2(p, v) > lodR2(p, c) + 1e-9; }, // le plus haut
  (p, v, c) => { const d = p[v * 3 + 1] - p[c * 3 + 1]; return Math.abs(d) > 1e-6 ? d < 0 : lodR2(p, v) > lodR2(p, c) + 1e-9; }, // le plus bas
  (p, v, c) => { const d = lodR2(p, v) - lodR2(p, c); return Math.abs(d) > 1e-9 ? d > 0 : p[v * 3 + 1] > p[c * 3 + 1]; },       // le plus à l'extérieur
  (p, v, c) => { const d = lodR2(p, v) - lodR2(p, c); return Math.abs(d) > 1e-9 ? d < 0 : p[v * 3 + 1] > p[c * 3 + 1]; }        // le plus à l'intérieur
];

// Réglage d'un modèle, rangé dans le pack sous la forme d'un entier : 0 = pas de version simplifiée,
// sinon 1 + (indice de cellule) × (nombre de règles) + (indice de règle).
export function lodCode(cell, rule) { return 1 + cell * LOD_RULES.length + rule; }
export const LOD_DEFAULT = lodCode(0, 0); // packs construits avant ce choix : grande cellule, premier sommet

// pos : positions (x, y, z par sommet) ; colorOf(v) : clé de couleur du sommet (deux couleurs ne fusionnent jamais) ;
// index : triangles ; code : réglage (voir lodCode). Renvoie les sommets gardés et les triangles restants.
export function lodCluster(pos, colorOf, index, code) {
  const k = code - 1, [cx, cy] = LOD_CELLS[Math.floor(k / LOD_RULES.length)] || LOD_CELLS[0], better = LOD_RULES[k % LOD_RULES.length];
  const n = pos.length / 3, rep = new Int32Array(n), keep = [], map = new Map();
  for (let v = 0; v < n; v++) {
    const key = `${Math.round(pos[v * 3] / cx)},${Math.round(pos[v * 3 + 1] / cy)},${Math.round(pos[v * 3 + 2] / cx)},${colorOf(v)}`;
    let r = map.get(key);
    if (r === undefined) { r = keep.length; map.set(key, r); keep.push(v); }
    else if (better && better(pos, v, keep[r])) keep[r] = v;
    rep[v] = r;
  }
  const idx = [], seen = new Set();
  for (let i = 0; i < index.length; i += 3) {
    const a = rep[index[i]], b = rep[index[i + 1]], c = rep[index[i + 2]];
    if (a === b || b === c || a === c) continue;
    const lo = Math.min(a, b, c), hi = Math.max(a, b, c), t = `${lo},${a + b + c - lo - hi},${hi}`;
    if (seen.has(t)) continue;
    seen.add(t); idx.push(a, b, c);
  }
  return { keep, idx };
}

// Une version simplifiée ne vaut une seconde géométrie que si elle retire au moins 30 % des triangles.
export function lodWorth(idx, index) { return idx.length < index.length * 0.7; }

// Bitropolis — catalogue du pack de ville (FULL_VERSION_250_MODELS) et croissance des bâtiments.
// Chaque type de fichier suit une « chaîne » de modèles : un fichier qui grandit monte dans sa chaîne
// (ex. éolienne → panneaux solaires → centrale à charbon → centrale nucléaire).
// Le stade est ABSOLU : il ne dépend que du fichier lui-même (lignes, fichiers qui l'importent,
// complexité), pas de son rang dans le projet. Un fichier ne rétrécit donc pas parce que d'autres grossissent.

const N = (family, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${family}_N${from + i}`);

// Pour varier la ville, chaque type de fichier a plusieurs chaînes possibles [poids, chaîne].
// Le choix dépend du chemin du fichier : il est stable d'une génération à l'autre (l'évolution reste lisible).
export const VARIANTS = {
  townhall:  [[1, N('Townhall', 1, 8)]],
  tower:     [[5, N('Residential', 1, 8)], [2, N('Office', 1, 6)], [1.3, N('Residential_Block', 1, 8)], [0.8, N('Commercial', 1, 6)]],
  shop:      [[4, N('Commercial', 1, 6)], [1, N('Theater', 1, 5)], [0.35, N('Opera', 1, 4)], [1, N('Residential', 2, 8)]],
  bank:      [[3, N('Office', 1, 6)], [1.6, N('Research', 1, 4)], [0.8, N('Residential_Block', 2, 8)]],
  police:    [[4, N('Police', 1, 5)], [0.4, N('Prison', 1, 3)]],
  fire:      [[3, N('Fire', 1, 5)], [1.3, N('Transit', 1, 4)]],
  hospital:  [[2, [...N('Clinic', 1, 4), 'Hospital_N3', 'Hospital_N4']], [1, N('Hospital', 1, 4)]],
  library:   [[2, [...N('Library', 1, 4), 'University_N2', 'University_N4']], [1.6, N('School', 1, 5)], [0.6, N('University', 1, 4)]],
  factory:   [[2, [...N('Light_Industry', 1, 5), 'Heavy_Industry_N4', 'Heavy_Industry_N5', 'Industrial_Complex_N5']],
              [1.2, N('Light_Industrial_Complex', 1, 5)], [0.9, N('Heavy_Industry', 1, 5)]],
  power:     [[2, ['Wind_N1', 'Wind_N3', 'Wind_N5', 'Solar_N3', 'Solar_N6', 'Coal_N3', 'Coal_N5', 'Nuclear_N3']],
              [0.8, N('Solar_Complex', 1, 6)], [0.8, N('Wind', 1, 5)]],
  warehouse: [[2, [...N('Water', 1, 5), 'Wastewater_N3', 'Wastewater_N5', 'Recycling_N7']], [1, N('Recycling', 1, 7)], [0.8, N('Wastewater', 1, 5)]],
  park:      [[3, ['@grove', '@grove2', ...N('Park', 1, 4), 'Park_N6', 'Park_N8']], [1, ['@grove2', 'Park_N1', 'Park_N3', 'Park_N5', 'Park_N7']]]
};
// Chaîne principale de chaque type (compatibilité)
export const CHAINS = Object.fromEntries(Object.entries(VARIANTS).map(([k, v]) => [k, v[0][1]]));

// Empreinte stable d'un texte → [0, 1)
function ctHash(s, seed = 0x811c9dc5) {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}
// Chaîne d'un fichier : tirée parmi les variantes de son type, d'après son chemin
export function chainOf(f) {
  const vars = VARIANTS[f.kind] || VARIANTS.tower;
  if (vars.length === 1 || !f.path) return vars[0][1];
  let r = ctHash(f.path + '|' + f.kind) * vars.reduce((t, v) => t + v[0], 0);
  for (const [w, chain] of vars) { if ((r -= w) < 0) return chain; }
  return vars[0][1];
}

// Noms affichés
export const FAMILY_NAMES = {
  Townhall: 'Hôtel de ville', Residential: 'Résidence', Commercial: 'Commerce', Office: 'Bureaux', Police: 'Commissariat',
  Fire: 'Caserne', Clinic: 'Clinique', Hospital: 'Hôpital', Library: 'Bibliothèque', University: 'Université',
  Light_Industry: 'Atelier', Heavy_Industry: 'Usine', Industrial_Complex: 'Complexe industriel', Wind: 'Éolienne',
  Solar: 'Ferme solaire', Coal: 'Centrale à charbon', Nuclear: 'Centrale nucléaire', Water: "Château d'eau",
  Wastewater: "Station d'épuration", Recycling: 'Centre de recyclage', Park: 'Parc', '@grove': 'Bosquet', '@grove2': 'Jardin',
  Residential_Block: 'Îlot résidentiel', Theater: 'Théâtre', Opera: 'Opéra', Research: 'Centre de recherche', Prison: 'Prison',
  Transit: 'Gare routière', School: 'École', Light_Industrial_Complex: 'Zone artisanale', Solar_Complex: 'Centrale solaire'
};

// Emprise au sol en cases [largeur x, profondeur z] (relevée sur les modèles, façade vers +z).
const FOOT = {
  Hospital: [2, 1], University: [2, 2], Heavy_Industry: [1, 2], Industrial_Complex: [2, 2], Solar: [1, 2],
  Coal: [2, 1], Nuclear: [2, 2], Wastewater: [1, 2], Recycling: [2, 2], Townhall: [2, 2],
  Residential_Block: [2, 2], Opera: [2, 2], Prison: [2, 2], Transit: [1, 2], Light_Industrial_Complex: [2, 1], Solar_Complex: [2, 2],
  Park_N1: [2, 2], Park_N2: [2, 2], Park_N3: [2, 2], Park_N4: [2, 2], Park_N5: [3, 3], Park_N6: [3, 3], Park_N7: [3, 3], Park_N8: [3, 3]
};
export function familyOf(model) { return model.startsWith('@') ? model : model.replace(/_N\d+$/, ''); }
export function footprint(model) { return FOOT[model] || FOOT[familyOf(model)] || [1, 1]; }

// Routes : 8 niveaux selon le trafic de dépendances
export const ROAD_SHAPES = ['Road_Straight', 'Road_Corner', 'Road_T', 'Road_Cross', 'Road_End'];
export const ROAD_TIERS = 8;
export const MONUMENTS = ['Monument_Obelisk', 'Monument_Arch', 'Monument_Statue', 'Monument_Tree', 'Monument_Cube'];
export const TREES = ['Tree_Dark', 'Tree_Fresh', 'Tree_Light', 'Tree_Lime', 'Tree_Mint', 'Tree_Teal'];
export const GROUNDS = ['Ground_Urban_A', 'Ground_Urban_B', 'Ground_Locked_A', 'Ground_Locked_B'];
// Accessoires urbains (dossier « obj free city pack ») : nom → échelle (unités du .obj → cases de la grille)
export const PROPS = {
  bench2: 0.05, fireHydrant: 0.05, garbageBin: 0.045, trashBag1: 0.045, trashBag2: 0.045, trafficCone: 0.045,
  streetLight: 0.045, tree2: 0.1, tree6: 0.1, garden1: 0.07, redCar: 0.065
};
export const VEHICLES = {
  car: ['Car_Blue', 'Car_Coral', 'Car_Sand', 'Car_Silver', 'Car_Teal'],
  truck: ['Freight_Truck_Blue', 'Freight_Truck_Coral', 'Freight_Truck_Sand', 'Freight_Truck_Silver', 'Freight_Truck_Teal'],
  special: ['Bus', 'Ambulance', 'Fire_Truck', 'Police_Car', 'Recycling_Truck']
};

// Tous les modèles du pack dont Bitropolis a besoin (le build n'embarque que ceux-là).
export function packModelNames() {
  const set = new Set();
  for (const vars of Object.values(VARIANTS)) for (const [, chain] of vars) for (const m of chain) if (!m.startsWith('@')) set.add(m);
  for (const s of ROAD_SHAPES) for (let t = 1; t <= ROAD_TIERS; t++) set.add(`${s}_N${t}`);
  for (const m of [...MONUMENTS, ...TREES, ...GROUNDS, 'Rock', 'Rock_B', ...Object.values(VEHICLES).flat()]) set.add(m);
  return [...set];
}

// --- Croissance
// Points de croissance : taille du code + fichiers qui en dépendent + complexité (assets : taille du fichier).
export function growthPoints(f) {
  const used = (f.importedBy ? f.importedBy.length : 0) * 15;
  if (f.loc > 0) return f.loc + used + (f.branches || 0) * 2 + (f.funcs || 0) * 3;
  return (f.size || 0) / 2000 + used;
}
const G_BASE = 20, G_MAX = 3000, G_SPAN = Math.log2(1 + G_MAX / G_BASE);
const levelOf = (points) => Math.max(0, Math.min(1, Math.log2(1 + Math.max(0, points) / G_BASE) / G_SPAN));
const pointsAt = (level) => G_BASE * (Math.pow(2, level * G_SPAN) - 1);

// → { model, stage (1..stages), stages, family, name, points, next (points du stade suivant ou null) }
// Chaque fichier a ses propres seuils (±25 %, d'après son chemin) : deux fichiers de même taille
// ne sont pas forcément au même stade, mais un fichier donné grandit toujours de la même façon.
export function growthOf(f, points = growthPoints(f)) {
  const chain = chainOf(f);
  const n = chain.length;
  const jit = f.path ? 0.75 + 0.5 * ctHash(f.path, 0x9e3779b9) : 1;
  let idx = Math.min(n - 1, Math.floor(levelOf(points * jit) * n));
  if (f.kind === 'townhall') idx = Math.max(idx, 2); // un hôtel de ville n'est jamais une cabane
  const model = chain[idx], family = familyOf(model);
  return {
    model, stage: idx + 1, stages: n, family, name: FAMILY_NAMES[family] || family,
    points: Math.round(points), start: idx ? Math.ceil(pointsAt(idx / n) / jit) : 0,
    next: idx + 1 < n ? Math.ceil(pointsAt((idx + 1) / n) / jit) : null
  };
}

// « Résidence N3 », « Bosquet »… pour les étiquettes d'évolution
export function modelLabel(model) {
  const fam = familyOf(model), name = FAMILY_NAMES[fam] || fam;
  const m = /_N(\d+)$/.exec(model);
  return m ? `${name} N${m[1]}` : name;
}

// Version du catalogue : à incrémenter quand les chaînes changent (sinon des changements de famille
// passeraient pour de la croissance au rechargement).
export const CATALOG_VERSION = 2;

// Instantané compact d'une ville (chemin → [modèle, stade, points]) pour repérer ce qui a grandi.
export function growthSnapshot(files, at = null) {
  const out = {};
  for (const f of files) { const g = growthOf(f); out[f.path] = [g.model, g.stage, g.points]; }
  return { at, v: CATALOG_VERSION, files: out };
}

// Compare deux instantanés → { grown: [{ path, from, to }], added: [path], removed: [path] }
export function growthDiff(prev, cur) {
  const grown = [], added = [], removed = [];
  if (!prev || !prev.files) return { grown, added, removed };
  const sameCatalog = prev.v === cur.v;
  for (const [path, c] of Object.entries(cur.files)) {
    const p = prev.files[path];
    if (!p) added.push(path);
    else if (sameCatalog ? c[1] > p[1] || (c[0] !== p[0] && c[2] > p[2]) : c[2] > p[2] && c[1] > p[1] && c[0] !== p[0]) grown.push({ path, from: p[0], to: c[0] });
  }
  for (const path of Object.keys(prev.files)) if (!(path in cur.files)) removed.push(path);
  return { grown, added, removed };
}

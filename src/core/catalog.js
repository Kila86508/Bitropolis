// Bitropolis — catalogue du pack de ville (FULL_VERSION_250_MODELS) et croissance des bâtiments.
// Chaque type de fichier suit une « chaîne » de modèles : un fichier qui grandit monte dans sa chaîne
// (ex. éolienne → panneaux solaires → centrale à charbon → centrale nucléaire).
// Le stade est ABSOLU : il ne dépend que du fichier lui-même (lignes, fichiers qui l'importent,
// complexité), pas de son rang dans le projet. Un fichier ne rétrécit donc pas parce que d'autres grossissent.

const N = (family, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${family}_N${from + i}`);

export const CHAINS = {
  townhall:  N('Townhall', 1, 8),
  tower:     N('Residential', 1, 8),
  shop:      N('Commercial', 1, 6),
  bank:      N('Office', 1, 6),
  police:    N('Police', 1, 5),
  fire:      N('Fire', 1, 5),
  hospital:  [...N('Clinic', 1, 4), 'Hospital_N3', 'Hospital_N4'],
  library:   [...N('Library', 1, 4), 'University_N2', 'University_N4'],
  factory:   [...N('Light_Industry', 1, 5), 'Heavy_Industry_N4', 'Heavy_Industry_N5', 'Industrial_Complex_N5'],
  power:     ['Wind_N1', 'Wind_N3', 'Wind_N5', 'Solar_N3', 'Solar_N6', 'Coal_N3', 'Coal_N5', 'Nuclear_N3'],
  warehouse: [...N('Water', 1, 5), 'Wastewater_N3', 'Wastewater_N5', 'Recycling_N7'],
  park:      ['@grove', '@grove2', ...N('Park', 1, 4), 'Park_N6', 'Park_N8']
};

// Noms affichés
export const FAMILY_NAMES = {
  Townhall: 'Hôtel de ville', Residential: 'Résidence', Commercial: 'Commerce', Office: 'Bureaux', Police: 'Commissariat',
  Fire: 'Caserne', Clinic: 'Clinique', Hospital: 'Hôpital', Library: 'Bibliothèque', University: 'Université',
  Light_Industry: 'Atelier', Heavy_Industry: 'Usine', Industrial_Complex: 'Complexe industriel', Wind: 'Éolienne',
  Solar: 'Ferme solaire', Coal: 'Centrale à charbon', Nuclear: 'Centrale nucléaire', Water: "Château d'eau",
  Wastewater: "Station d'épuration", Recycling: 'Centre de recyclage', Park: 'Parc', '@grove': 'Bosquet', '@grove2': 'Jardin'
};

// Emprise au sol en cases [largeur x, profondeur z] (relevée sur les modèles, façade vers +z).
const FOOT = {
  Hospital: [2, 1], University: [2, 2], Heavy_Industry: [1, 2], Industrial_Complex: [2, 2], Solar: [1, 2],
  Coal: [2, 1], Nuclear: [2, 2], Wastewater: [1, 2], Recycling: [2, 2], Townhall: [2, 2],
  Park_N1: [2, 2], Park_N2: [2, 2], Park_N3: [2, 2], Park_N4: [2, 2], Park_N6: [3, 3], Park_N8: [3, 3]
};
export function familyOf(model) { return model.startsWith('@') ? model : model.replace(/_N\d+$/, ''); }
export function footprint(model) { return FOOT[model] || FOOT[familyOf(model)] || [1, 1]; }

// Routes : 8 niveaux selon le trafic de dépendances
export const ROAD_SHAPES = ['Road_Straight', 'Road_Corner', 'Road_T', 'Road_Cross', 'Road_End'];
export const ROAD_TIERS = 8;
export const MONUMENTS = ['Monument_Obelisk', 'Monument_Arch', 'Monument_Statue', 'Monument_Tree', 'Monument_Cube'];
export const TREES = ['Tree_Dark', 'Tree_Fresh', 'Tree_Light', 'Tree_Lime', 'Tree_Mint', 'Tree_Teal'];
export const GROUNDS = ['Ground_Urban_A', 'Ground_Urban_B', 'Ground_Locked_A', 'Ground_Locked_B'];
export const VEHICLES = {
  car: ['Car_Blue', 'Car_Coral', 'Car_Sand', 'Car_Silver', 'Car_Teal'],
  truck: ['Freight_Truck_Blue', 'Freight_Truck_Coral', 'Freight_Truck_Sand', 'Freight_Truck_Silver', 'Freight_Truck_Teal'],
  special: ['Bus', 'Ambulance', 'Fire_Truck', 'Police_Car', 'Recycling_Truck']
};

// Tous les modèles du pack dont Bitropolis a besoin (le build n'embarque que ceux-là).
export function packModelNames() {
  const set = new Set();
  for (const chain of Object.values(CHAINS)) for (const m of chain) if (!m.startsWith('@')) set.add(m);
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
export function growthOf(f, points = growthPoints(f)) {
  const chain = CHAINS[f.kind] || CHAINS.tower;
  const n = chain.length;
  let idx = Math.min(n - 1, Math.floor(levelOf(points) * n));
  if (f.kind === 'townhall') idx = Math.max(idx, 2); // un hôtel de ville n'est jamais une cabane
  const model = chain[idx], family = familyOf(model);
  return {
    model, stage: idx + 1, stages: n, family, name: FAMILY_NAMES[family] || family,
    points: Math.round(points), start: idx ? Math.ceil(pointsAt(idx / n)) : 0,
    next: idx + 1 < n ? Math.ceil(pointsAt((idx + 1) / n)) : null
  };
}

// « Résidence N3 », « Bosquet »… pour les étiquettes d'évolution
export function modelLabel(model) {
  const fam = familyOf(model), name = FAMILY_NAMES[fam] || fam;
  const m = /_N(\d+)$/.exec(model);
  return m ? `${name} N${m[1]}` : name;
}

// Instantané compact d'une ville (chemin → [modèle, stade, points]) pour repérer ce qui a grandi.
export function growthSnapshot(files, at = null) {
  const out = {};
  for (const f of files) { const g = growthOf(f); out[f.path] = [g.model, g.stage, g.points]; }
  return { at, files: out };
}

// Compare deux instantanés → { grown: [{ path, from, to }], added: [path], removed: [path] }
export function growthDiff(prev, cur) {
  const grown = [], added = [], removed = [];
  if (!prev || !prev.files) return { grown, added, removed };
  for (const [path, c] of Object.entries(cur.files)) {
    const p = prev.files[path];
    if (!p) added.push(path);
    else if (c[1] > p[1] || (c[0] !== p[0] && c[2] > p[2])) grown.push({ path, from: p[0], to: c[0] });
  }
  for (const path of Object.keys(prev.files)) if (!(path in cur.files)) removed.push(path);
  return { grown, added, removed };
}

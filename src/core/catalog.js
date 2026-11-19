// Bitropolis — catalogue du pack de ville (FULL_VERSION_250_MODELS) et croissance des bâtiments.
// Chaque type de fichier suit une « chaîne » de modèles : un fichier qui grandit monte dans sa chaîne
// (ex. éolienne → panneaux solaires → centrale à charbon → centrale nucléaire).
// Le stade est ABSOLU : il ne dépend que du fichier lui-même (lignes, fichiers qui l'importent,
// complexité), pas de son rang dans le projet. Un fichier ne rétrécit donc pas parce que d'autres grossissent.

const N = (family, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${family}_N${from + i}`);
// Nouvelles familles (Asset/export_obj, niveaux L1 à L8)
const L = (family) => Array.from({ length: 8 }, (_, i) => `${family}_L${i + 1}`);

// Pour varier la ville, chaque type de fichier a plusieurs chaînes possibles [poids, chaîne].
// Le choix dépend du chemin du fichier : il est stable d'une génération à l'autre (l'évolution reste lisible).
export const VARIANTS = {
  townhall:  [[1, N('Townhall', 1, 8)], [2, L('TownHall')]],
  tower:     [[3, N('Residential', 1, 8)], [3, L('Residential')], [1.2, N('Office', 1, 6)], [0.8, N('Residential_Block', 1, 8)], [0.5, N('Commercial', 1, 6)],
              // gratte-ciel (onze silhouettes)
              [0.45, L('TourAiguille')], [0.45, L('TourArche')], [0.45, L('TourBoucle')], [0.45, L('TourDeco')], [0.45, L('TourEclat')], [0.45, L('TourHyper')], [0.45, L('TourJumelles')], [0.45, L('TourOeuf')], [0.45, L('TourPagode')], [0.45, L('TourTorsade')], [0.45, L('TourTubes')]],
  shop:      [[2.5, N('Commercial', 1, 6)], [2.5, L('Commercial')], [2, L('Cinema')], [2, L('Restaurant')], [1.5, L('Hotel')],
              [0.8, N('Theater', 1, 5)], [0.3, N('Opera', 1, 4)], [0.6, N('Residential', 2, 8)]],
  bank:      [[2, N('Office', 1, 6)], [2, L('Office')], [2.5, L('Banque')], [1.2, N('Research', 1, 4)], [0.6, N('Residential_Block', 2, 8)]],
  police:    [[3, N('Police', 1, 5)], [3, L('Police')], [0.4, N('Prison', 1, 3)]],
  fire:      [[2.5, N('Fire', 1, 5)], [2.5, L('FireStation')], [2, L('Gare')], [1, N('Transit', 1, 4)]],
  hospital:  [[2, [...N('Clinic', 1, 4), 'Hospital_N3', 'Hospital_N4']], [2, L('Hospital')], [1, N('Hospital', 1, 4)]],
  library:   [[2, [...N('Library', 1, 4), 'University_N2', 'University_N4']], [1.2, L('ClockTower')], [1.6, N('School', 1, 5)], [0.6, N('University', 1, 4)],
              [2, L('Ecole')], [1.5, L('Eglise')]],
  factory:   [[2, [...N('Light_Industry', 1, 5), 'Heavy_Industry_N4', 'Heavy_Industry_N5', 'Industrial_Complex_N5']],
              [1.2, N('Light_Industrial_Complex', 1, 5)], [0.9, N('Heavy_Industry', 1, 5)],
              // usines (aciérie, scierie, chimie, high-tech, textile)
              [1.2, L('Usine_Acier')], [1.2, L('Usine_Bois')], [1.2, L('Usine_Chimie')], [1.2, L('Usine_Tech')], [1.2, L('Usine_Textile')]],
  power:     [[2, ['Wind_N1', 'Wind_N3', 'Wind_N5', 'Solar_N3', 'Solar_N6', 'Coal_N3', 'Coal_N5', 'Nuclear_N3']],
              [0.8, N('Solar_Complex', 1, 6)], [0.8, N('Wind', 1, 5)], [2.5, L('Centrale')]],
  warehouse: [[2, [...N('Water', 1, 5), 'Wastewater_N3', 'Wastewater_N5', 'Recycling_N7']], [1, N('Recycling', 1, 7)], [0.8, N('Wastewater', 1, 5)],
              [1, L('ParkingA')], [1, L('ParkingB')], [1, L('ParkingC')]],
  park:      [[3, ['@grove', '@grove2', ...N('Park', 1, 4), 'Park_N6', 'Park_N8']], [1, ['@grove2', 'Park_N1', 'Park_N3', 'Park_N5', 'Park_N7']],
              [1.5, L('Fountain')], [1, L('Memorial')]]
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
  Transit: 'Gare routière', School: 'École', Light_Industrial_Complex: 'Zone artisanale', Solar_Complex: 'Centrale solaire',
  ClockTower_L: "Tour de l'horloge", Commercial_L: 'Commerce', FireStation_L: 'Caserne', Fountain_L: 'Fontaine', Hospital_L: 'Hôpital',
  Memorial_L: 'Mémorial', Office_L: 'Bureaux', Residential_L: 'Résidence', TownHall_L: 'Hôtel de ville',
  Banque_L: 'Banque', Centrale_L: 'Centrale électrique', Cinema_L: 'Cinéma', Ecole_L: 'École', Eglise_L: 'Église', Gare_L: 'Gare',
  Hotel_L: 'Hôtel', ParkingA_L: 'Parking', ParkingB_L: 'Parking', ParkingC_L: 'Parking', Police_L: 'Commissariat', Restaurant_L: 'Restaurant',
  Usine_Acier_L: 'Aciérie', Usine_Bois_L: 'Scierie', Usine_Chimie_L: 'Usine chimique', Usine_Tech_L: 'Usine high-tech', Usine_Textile_L: 'Usine textile',
  TourAiguille_L: 'Tour Aiguille', TourArche_L: 'Tour Arche', TourBoucle_L: 'Tour Boucle', TourDeco_L: 'Tour Déco', TourEclat_L: 'Tour Éclat', TourHyper_L: 'Tour Hyper', TourJumelles_L: 'Tours jumelles', TourOeuf_L: 'Tour Œuf', TourPagode_L: 'Tour Pagode', TourTorsade_L: 'Tour Torsade', TourTubes_L: 'Tour Tubes'
};

// Emprise au sol en cases [largeur x, profondeur z] (relevée sur les modèles, façade vers +z).
const FOOT = {
  Hospital: [2, 1], University: [2, 2], Heavy_Industry: [1, 2], Industrial_Complex: [2, 2], Solar: [1, 2],
  Coal: [2, 1], Nuclear: [2, 2], Wastewater: [1, 2], Recycling: [2, 2], Townhall: [2, 2],
  Residential_Block: [2, 2], Opera: [2, 2], TownHall_L: [2, 2], Prison: [2, 2], Transit: [1, 2], Light_Industrial_Complex: [2, 1], Solar_Complex: [2, 2],
  Park_N1: [2, 2], Park_N2: [2, 2], Park_N3: [2, 2], Park_N4: [2, 2], Park_N5: [3, 3], Park_N6: [3, 3], Park_N7: [3, 3], Park_N8: [3, 3]
};
// « Residential_N3 » → « Residential » ; « Residential_L3 » (nouvelles familles) → « Residential_L »
export function familyOf(model) { return model.startsWith('@') ? model : model.replace(/_N\d+$/, '').replace(/_L\d+$/, '_L'); }
// Échelle des modèles .obj des nouvelles familles (terrain de 10 × 10 unités → une case ; hôtel de ville sur 2 × 2)
export function objScale(model) { return /^TownHall_L/.test(model) ? 0.19 : 0.1; }
export function footprint(model) { return FOOT[model] || FOOT[familyOf(model)] || [1, 1]; }

// Kit de voirie (Asset/export_obj) : 4 gabarits selon le niveau de trafic, 5 formes.
// Les tuiles du kit n'ont pas la même orientation de base que celles du pack : la rotation est déduite des sorties.
export const ROAD_KIT_TIERS = ['Chemin', 'Chemin', 'PetiteRoute', 'PetiteRoute', 'PetiteRoute', 'Route', 'Route', 'Avenue', 'Avenue']; // index = niveau 1…8 (feux : Route et Avenue)
// demi-largeur de chaussée de chaque gabarit (fraction de case), pour placer les voies de circulation
export const ROAD_KIT_HALF = [0.12, 0.12, 0.17, 0.17, 0.17, 0.25, 0.25, 0.33, 0.33];
export const ROAD_KIT_TOP = 0.016; // dessus de la chaussée du kit (fraction de case)
const KIT_SHAPES = { Road_Straight: 'Droite', Road_Corner: 'Courbe', Road_T: 'T', Road_Cross: 'Croix', Road_End: 'Impasse' };
// sorties de chaque forme à rotation nulle : 0 = -x, 1 = +x, 2 = -z, 3 = +z
const PACK_EXITS = { Road_Straight: [0, 1], Road_Corner: [0, 3], Road_T: [0, 1, 3], Road_Cross: [0, 1, 2, 3], Road_End: [0] };
const KIT_EXITS = { Droite: [2, 3], Courbe: [1, 3], T: [0, 1, 3], Croix: [0, 1, 2, 3], Impasse: [3] };
const KIT_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
function kitMask(exits, k) {
  const a = (k * Math.PI) / 2, c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a));
  let m = 0;
  for (const i of exits) {
    const [x, z] = KIT_DIRS[i], rx = x * c + z * s, rz = -x * s + z * c;
    m |= 1 << KIT_DIRS.findIndex((d) => d[0] === rx && d[1] === rz);
  }
  return m;
}
// quart(s) de tour à ajouter pour qu'une tuile du kit ait les mêmes sorties que la tuile du pack
const KIT_ROT = Object.fromEntries(Object.entries(KIT_SHAPES).map(([shape, kit]) => {
  const want = kitMask(PACK_EXITS[shape], 0);
  return [shape, [0, 1, 2, 3].find((k) => kitMask(KIT_EXITS[kit], k) === want)];
}));
// Hauteurs (fraction de case) : tablier des ponts, rampes et passages supérieurs ; petit pont en bois des chemins
export const ROAD_KIT_DECK = 0.26, ROAD_KIT_DECK_WOOD = 0.05;
// rampe du kit : côté haut au nord (-z) à rotation nulle → rotation pour que le côté haut regarde `up`
const RAMP_ROT = { 2: 0, 0: 1, 3: 2, 1: 3 };
// Tuile du kit pour une tuile de route : « Road_T_N6 », rotation 1 → { model: 'Route_T', rot: 1 }.
// t.crossing : passage piéton ; t.kind : 'bridge' (pont sur la rivière), 'ramp' (côté haut vers t.up),
// 'over' (passage supérieur, tablier dans l'axe t.axis : 0 = x, 1 = z), 'round' (rond-point)
export function kitRoad(model, rot, t = {}) {
  if (typeof t === 'boolean') t = { crossing: t };
  const m = /^(Road_[A-Za-z]+)_N(\d+)$/.exec(model);
  if (!m || !(m[1] in KIT_SHAPES)) return null;
  const tier = ROAD_KIT_TIERS[Math.min(8, Math.max(1, +m[2]))];
  const straightRot = (rot + KIT_ROT.Road_Straight) % 4; // pièces droites du kit : axe nord–sud à rotation nulle
  if (t.kind === 'round') return { model: 'Route_RondPoint', rot: 0 };
  if (t.kind === 'bridge') return { model: tier === 'Chemin' ? 'Chemin_PontBois' : `${tier}_PontDroit`, rot: straightRot };
  if (t.kind === 'ramp') return tier === 'Chemin' ? { model: 'Chemin_Droite', rot: straightRot } : { model: `${tier}_Rampe`, rot: RAMP_ROT[t.up] };
  if (t.kind === 'over') return { model: `${tier === 'Chemin' ? 'PetiteRoute' : tier}_PontCroise`, rot: t.axis === 0 ? 1 : 0 };
  let shape = KIT_SHAPES[m[1]];
  if (shape === 'Droite' && t.crossing && tier !== 'Chemin') shape = 'Passage';
  return { model: `${tier}_${shape}`, rot: (rot + KIT_ROT[m[1]]) % 4 };
}
export function roadKitModelNames() {
  const out = ['Route_RondPoint', 'Chemin_PontBois', 'Riviere_Droite', 'Riviere_Courbe'];
  for (const tier of new Set(ROAD_KIT_TIERS)) {
    for (const shape of [...Object.values(KIT_SHAPES), 'Passage']) if (!(tier === 'Chemin' && shape === 'Passage')) out.push(`${tier}_${shape}`);
    if (tier !== 'Chemin') for (const shape of ['PontDroit', 'Rampe', 'PontCroise']) out.push(`${tier}_${shape}`);
  }
  return out;
}

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
// Accessoires du kit de routes (Asset/Maison/road) : nom → échelle (mètres du kit → cases du pack,
// réduite pour s'accorder aux proportions « maquette » du pack)
export const KIT_PROPS = {
  lamp_1: 0.065, lamp_2: 0.065, hazzard_cone_1: 0.13, traffic_barell_1: 0.08, Tree3: 0.09, Tree4: 0.08, tree_1_a: 0.13, bush_1: 0.12
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
  for (const m of roadKitModelNames()) set.add(m);
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
  const m = /_[NL](\d+)$/.exec(model);
  return m ? `${name} N${m[1]}` : name;
}

// Version du catalogue : à incrémenter quand les chaînes changent (sinon des changements de famille
// passeraient pour de la croissance au rechargement).
export const CATALOG_VERSION = 4;

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

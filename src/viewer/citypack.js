// Bitropolis — affiche une ville en grille (src/core/grid.js) avec les modèles du pack de ville.
// Sol, routes (8 niveaux), bâtiments à stades N1→N8, arbres et monuments : un InstancedMesh par modèle.
import { CELL } from '../core/grid.js';
import { TREES, GROUNDS, VARIANTS, chainOf, footprint, familyOf, kitRoad } from '../core/catalog.js';
import { packGeometry, packModel, packLodGeometry, overlayActive, overlayHas } from './assets.js';
import { hashString } from '../core/rules.js';

// Harmonies de couleurs pour les matériaux recolorables du pack (murs 1–3, toit, boiseries, accent).
// Chaque bâtiment en tire une d'après son chemin (graine stable) ; la graine 0 garde les couleurs d'origine.
const PACK_SCHEMES = [
  ['#e8d8b8', '#c9b18a', '#a8c4d8', '#b5523b', '#5b4636', '#2e86ab'],
  ['#f2e3c6', '#d9a066', '#e8d8b8', '#6d7178', '#3b3b44', '#d1495b'],
  ['#cfe1e8', '#9fbfd0', '#ffffff', '#2f4858', '#f5f5f0', '#f6ae2d'],
  ['#f4c7a1', '#e09f7d', '#fff1e0', '#7a4b3a', '#4a3b33', '#3e8e7e'],
  ['#dfe7d0', '#b8cfa0', '#f7f7ef', '#5a7d4f', '#3d4a35', '#e76f51'],
  ['#e9e4f0', '#c5b8d9', '#ffffff', '#4b3f72', '#2e2a3d', '#f4a261'],
  ['#f7f1e3', '#e0c9a6', '#c8d6e5', '#c0392b', '#7f5539', '#2a9d8f'],
  ['#d6d2c4', '#a89f91', '#efeae0', '#3a3f47', '#1f2328', '#e9c46a'],
  ['#fbe7c6', '#f4b393', '#fffaf0', '#8c5e58', '#5c4033', '#457b9d'],
  ['#c9d6df', '#8fa9b8', '#f0f4f7', '#52616b', '#1e2022', '#ff7f50'],
  ['#f1dfd1', '#d4a5a5', '#fff5ee', '#6b4f4f', '#3c2f2f', '#6a994e']
];
const PACK_SCHEME_COUNT = PACK_SCHEMES.length + 1;

export const CITY_Y = 0.05;          // la ville affleure juste au-dessus de la pelouse de la campagne
const GROUND_Y = CITY_Y - 0.012 * CELL; // dalles de sol, légèrement sous les routes et les bâtiments

// Matériau des modèles du pack : couleurs par sommet, et la nuit :
//  - fenêtres (aLit = 1) allumées étage par étage, qui s'allument et s'éteignent chacune à son rythme ;
//  - façades vitrées (aLit = 9) : même principe, plus doux et plus clairsemé ;
//  - lampadaires et signaux lumineux (aLit = 2) toujours allumés ;
//  - lentilles des feux tricolores (aLit 3–5 : têtes « X », 6–8 : têtes « Y » ; rouge, vert, orange),
//    commandées par l'attribut d'instance aSig = (état X, état Y) : 0 rouge, 1 orange, 2 vert.
//  - néons (aLit = 10) : brillent dans leur propre couleur, de jour un peu, de nuit beaucoup.
// opts.winTint : part de la couleur du matériau dans la lueur des fenêtres (0,15 : orangé chaud ; Cyberpunk : couleurs vives)
export function makePackMaterial(uGlow, uTime, opts = {}) {
  // double face : permet d'inverser certains bâtiments en miroir (l'éclairage « flat » reste juste)
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.78, metalness: 0.02, side: THREE.DoubleSide });
  const schemes = PACK_SCHEMES.flat().map((hex) => new THREE.Color(hex));
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = uGlow;
    sh.uniforms.uTime = uTime;
    sh.uniforms.uScheme = { value: schemes };
    sh.uniforms.uWinTint = { value: opts.winTint ?? 0.15 };
    sh.vertexShader = `attribute float aLit;\nattribute float aRole;\nattribute float aSeed;\nattribute vec2 aSig;\nuniform float uTime;\nuniform vec3 uScheme[${schemes.length}];\nvarying float vLit;\nvarying float vLamp;\nvarying float vOn;\nvarying vec3 vLampCol;\nvarying vec3 vRecol;\nvarying float vRecolOn;\nvarying float vWin;\nvarying float vFy;\nvarying float vRnd;\nvarying float vIdS;\nvarying float vNeon;\n` +
      sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      // identité stable de l'instance (sa graine), même quand le niveau de détail renumérote les instances
      #ifdef USE_INSTANCING
        float bxId = floor(aSeed * 65536.0);
      #else
        float bxId = 0.0;
      #endif
      float bxRnd = fract(sin(bxId * 12.9898 + 78.233) * 43758.5453);
      vLit = 0.0; vLamp = 0.0; vOn = 0.0; vLampCol = vec3(0.0);
      vWin = 0.0; vFy = position.y; vRnd = bxRnd; vIdS = bxId; vNeon = 0.0;
      vRecol = vec3(0.0); vRecolOn = 0.0;
      #ifdef USE_INSTANCING
      if (aRole > 0.5) {
        float si = floor(fract(aSeed) * ${PACK_SCHEME_COUNT}.0);
        if (si > 0.5) { vRecol = uScheme[int(si - 1.0) * 6 + int(aRole + 0.5) - 1]; vRecolOn = 1.0; }
      }
      #endif
      if (aLit > 9.5) {
        vNeon = 1.0; // néon
      } else if (aLit > 8.5) {
        vWin = 2.0; // façade vitrée : étages calculés par pixel (voir le fragment), plus doux qu'une fenêtre
      } else if (aLit > 2.5) {
        float axisY = aLit > 5.5 ? 1.0 : 0.0;
        float lamp = aLit - (axisY > 0.5 ? 6.0 : 3.0);             // 0 rouge, 1 vert, 2 orange
        float st = axisY > 0.5 ? aSig.y : aSig.x;                  // 0 rouge, 1 orange, 2 vert
        float want = lamp < 0.5 ? 0.0 : (lamp < 1.5 ? 2.0 : 1.0);
        vLamp = 1.0;
        vOn = abs(st - want) < 0.5 ? 1.0 : 0.0;
        vLampCol = lamp < 0.5 ? vec3(1.0, 0.08, 0.04) : (lamp < 1.5 ? vec3(0.1, 1.0, 0.3) : vec3(1.0, 0.62, 0.05));
      } else if (aLit > 1.5) {
        vLit = 1.6;
      } else if (aLit > 0.5) {
        vWin = 1.0; // fenêtre : étages calculés par pixel (un grand panneau vitré couvre plusieurs étages)
      }`);
    sh.fragmentShader = 'uniform float uGlow;\nuniform float uTime;\nvarying float vLit;\nvarying float vLamp;\nvarying float vOn;\nvarying vec3 vLampCol;\nvarying vec3 vRecol;\nvarying float vRecolOn;\nvarying float vWin;\nvarying float vFy;\nvarying float vRnd;\nvarying float vIdS;\nvarying float vNeon;\nuniform float uWinTint;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, vRecol, vRecolOn);
        if (vLamp > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb * 0.22, vLampCol * 0.55, vOn);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        // fenêtres : un étage = une bande de hauteur, chaque étage s'allume et s'éteint à son propre rythme
        float litF = vLit;
        if (vWin > 0.5) {
          // graine arrondie à un entier : le hachage ne dépend plus des infimes écarts d'interpolation entre pixels
          float sd = floor(vRnd * 997.0 + 0.5), sr = sd / 997.0;
          float glass = step(1.5, vWin);
          float fl = floor(vFy * 9.0);
          float period = mix(9.0 + 26.0 * fract(sr * 7.31 + fl * 0.173), 12.0 + 30.0 * fract(sr * 5.17 + fl * 0.231), glass);
          float cyc = floor(uTime / period + sr * 31.0 + fl * 0.37);
          float hh = fract(sin(fl * 91.7 + sd * 12.9898 + cyc * 37.719) * 43758.5453);
          litF = glass > 0.5 ? (hh > 0.62 ? 0.16 : 0.0) : (hh > 0.42 ? 0.4 : 0.0);
        }
        totalEmissiveRadiance += mix(vec3(1.0, 0.68, 0.32), vColor.rgb, uWinTint) * uGlow * litF;
        totalEmissiveRadiance += vColor.rgb * vNeon * (0.35 + 1.5 * uGlow);
        if (vLamp > 0.5) totalEmissiveRadiance += vLampCol * vOn * (0.7 + 1.6 * uGlow);`);
  };
  mat.customProgramCacheKey = () => 'bitropolis-pack-6';
  return mat;
}

// Regroupe des instances par modèle puis crée les InstancedMesh.
class PackInstancer {
  constructor(material) { this.material = material; this.lists = new Map(); this.dummy = new THREE.Object3D(); }
  // mirror : inverse le modèle selon x ; seed ∈ [0,1) : choix de la palette de couleurs
  add(model, x, y, z, ry, s = CELL, sy = s, mirror = false, seed = Math.random()) {
    const d = this.dummy;
    d.position.set(x, y, z); d.rotation.set(0, ry, 0); d.scale.set(mirror ? -s : s, sy, s); d.updateMatrix();
    return this.addMatrix(model, d.matrix, seed);
  }
  addMatrix(model, matrix, seed = Math.random()) {
    if (!this.lists.has(model)) this.lists.set(model, []);
    const list = this.lists.get(model);
    list.push({ m: matrix.clone(), seed });
    return { model, index: list.length - 1 };
  }
  // lod : PackLOD facultatif ; manage(model, list) dit si ce modèle passe par lui
  build(group, meshes, { shadow = true, lod = null, manage = null } = {}) {
    for (const [model, list] of this.lists) {
      if (lod && manage && manage(model, list)) {
        const mesh = lod.add(model, list, this.material, group, shadow);
        if (mesh) meshes.set(model, mesh);
        continue;
      }
      const geo = packGeoView(packGeometry('city', model));
      if (!geo) continue;
      const mesh = new THREE.InstancedMesh(geo, this.material, list.length);
      const seeds = new Float32Array(list.length);
      list.forEach((it, i) => { mesh.setMatrixAt(i, it.m); seeds[i] = it.seed; });
      geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.castShadow = shadow; mesh.receiveShadow = true;
      mesh.name = model;
      group.add(mesh);
      meshes.set(model, mesh);
    }
    this.lists.clear();
  }
}

// Enveloppe propre à un groupe d'instances autour d'une géométrie du pack : mêmes données de sommets (partagées
// sur la carte graphique), mais ses propres attributs d'instance (aSeed). Sans elle, les voitures garées du décor
// et celles qui circulent (même modèle) se disputaient l'attribut, et les secondes n'étaient plus dessinées.
function packGeoView(src) {
  if (!src) return null;
  const g = new THREE.BufferGeometry();
  for (const [k, a] of Object.entries(src.attributes)) if (k !== 'aSeed') g.setAttribute(k, a);
  g.setIndex(src.index);
  g.boundingSphere = src.boundingSphere; g.boundingBox = src.boundingBox;
  return g;
}

// Grandes villes : on ne dessine que ce qui est dans le champ de la caméra, et les objets lointains en version
// simplifiée (packLodGeometry). Chaque modèle géré a deux InstancedMesh (complet / simplifié) que l'on
// remplit à chaque mouvement de caméra avec les seules instances visibles. Les pièces mobiles, les tuiles à feux
// (attribut aSig indexé) et les petits modèles (moins coûteux à dessiner qu'à trier) ne sont pas gérés ici.
export const LOD_NEAR = 64;   // au-delà (mètres de la scène), version simplifiée
export class PackLOD {
  constructor() {
    this.models = new Map();
    this.frustum = new THREE.Frustum();
    this.pm = new THREE.Matrix4();
    this.lastCam = new Float32Array(32);
    this.dirty = true;
  }
  owns(model) { return this.models.has(model); }
  // list : [{ m: Matrix4, seed }] (voir PackInstancer)
  add(model, list, material, group, castShadow) {
    const full = packGeoView(packGeometry('city', model));
    if (!full) return null;
    const lodGeo = packGeoView(packLodGeometry('city', model));
    const n = list.length, mats = new Float32Array(n * 16), seeds = new Float32Array(n), spheres = new Float32Array(n * 4);
    if (!full.boundingSphere) full.computeBoundingSphere();
    const bs = full.boundingSphere, v = new THREE.Vector3();
    list.forEach((it, i) => {
      it.m.toArray(mats, i * 16);
      seeds[i] = it.seed;
      this._sphere(mats, i, bs, spheres, v);
    });
    const mk = (geo) => {
      const mesh = new THREE.InstancedMesh(geo, material, n);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
      mesh.castShadow = castShadow; mesh.receiveShadow = true;
      mesh.name = model;
      group.add(mesh);
      return mesh;
    };
    const entry = { model, n, mats, seeds, spheres, bs, full: mk(full), lod: lodGeo ? mk(lodGeo) : null };
    this.models.set(model, entry);
    this.dirty = true;
    return entry.full;
  }
  _sphere(mats, i, bs, spheres, v) {
    const o = i * 16;
    v.copy(bs.center).applyMatrix4(new THREE.Matrix4().fromArray(mats, o));
    const s = Math.max(Math.hypot(mats[o], mats[o + 1], mats[o + 2]), Math.hypot(mats[o + 4], mats[o + 5], mats[o + 6]), Math.hypot(mats[o + 8], mats[o + 9], mats[o + 10]));
    spheres[i * 4] = v.x; spheres[i * 4 + 1] = v.y; spheres[i * 4 + 2] = v.z; spheres[i * 4 + 3] = bs.radius * s;
  }
  // une instance a bougé (animation de croissance)
  setMatrix(model, index, matrix) {
    const e = this.models.get(model);
    if (!e) return;
    matrix.toArray(e.mats, index * 16);
    this._sphere(e.mats, index, e.bs, e.spheres, new THREE.Vector3());
    this.dirty = true;
  }
  update(camera) {
    camera.updateMatrixWorld();
    const a = camera.matrixWorld.elements, b = camera.projectionMatrix.elements, last = this.lastCam;
    let moved = this.dirty;
    for (let i = 0; i < 16 && !moved; i++) if (Math.abs(a[i] - last[i]) > 1e-4 || Math.abs(b[i] - last[16 + i]) > 1e-6) moved = true;
    if (!moved) return;
    for (let i = 0; i < 16; i++) { last[i] = a[i]; last[16 + i] = b[i]; }
    this.dirty = false;
    this.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pm);
    const planes = this.frustum.planes.map((p) => [p.normal.x, p.normal.y, p.normal.z, p.constant]);
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, near2 = LOD_NEAR * LOD_NEAR;
    for (const e of this.models.values()) {
      const F = e.full.instanceMatrix.array, FS = e.full.geometry.getAttribute('aSeed').array;
      const L = e.lod ? e.lod.instanceMatrix.array : null, LS = e.lod ? e.lod.geometry.getAttribute('aSeed').array : null;
      let nf = 0, nl = 0;
      const S = e.spheres, M = e.mats;
      for (let i = 0; i < e.n; i++) {
        const x = S[i * 4], y = S[i * 4 + 1], z = S[i * 4 + 2], r = S[i * 4 + 3] + 2; // marge : ombres en bord d'écran
        let inside = true;
        for (let p = 0; p < 6; p++) { const P = planes[p]; if (P[0] * x + P[1] * y + P[2] * z + P[3] < -r) { inside = false; break; } }
        if (!inside) continue;
        const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy) + (z - cz) * (z - cz);
        const useLod = L && d2 > near2 + r * r;
        const dst = useLod ? L : F, ds = useLod ? LS : FS, j = useLod ? nl++ : nf++;
        const o = i * 16, q = j * 16;
        for (let k = 0; k < 16; k++) dst[q + k] = M[o + k];
        ds[j] = e.seeds[i];
      }
      e.full.count = nf; e.full.instanceMatrix.needsUpdate = true; e.full.geometry.getAttribute('aSeed').needsUpdate = true;
      if (e.lod) { e.lod.count = nl; e.lod.instanceMatrix.needsUpdate = true; e.lod.geometry.getAttribute('aSeed').needsUpdate = true; }
    }
  }
}

// Boîte englobante d'un modèle posé (rotation 0 ou π autour de Y)
function packBox(model, x, z, ry, s, mirror = false) {
  const m = packModel('city', model);
  const box = new THREE.Box3();
  if (!m) { box.setFromCenterAndSize(new THREE.Vector3(x, s / 2, z), new THREE.Vector3(s, s, s)); return box; }
  const flip = Math.abs(Math.cos(ry)) > 0.5 && Math.cos(ry) < 0;
  let x0 = m.min[0] * s, x1 = m.max[0] * s;
  if (mirror) [x0, x1] = [-x1, -x0];
  const z0 = m.min[2] * s, z1 = m.max[2] * s;
  box.min.set(x + (flip ? -x1 : x0), CITY_Y, z + (flip ? -z1 : z0));
  box.max.set(x + (flip ? -x0 : x1), CITY_Y + m.max[1] * s, z + (flip ? -z0 : z1));
  return box;
}

// Apparences équivalentes d'un bâtiment : le modèle de son stade, ses variantes de couleur, et le modèle
// de même emprise au même stade relatif dans les autres chaînes de son type (ex. Résidence N3 ⇄ Résidence L3).
// Le stade et l'évolution du fichier ne changent pas : seule l'apparence peut être remplacée.
// (cost : léger coût pour les stades voisins, afin de rester au plus près du stade réel)
function packCandidates(f, lot) {
  const out = new Map(); // clé du modèle affiché → { base, cost }
  const [fw, fd] = footprint(lot.model);
  const add = (m, cost) => {
    if (!m || m.startsWith('@')) return;
    const [w, d] = footprint(m);
    if (w !== fw || d !== fd) return;
    if (overlayActive() && !overlayHas(m)) return;
    const info = packModel('city', m);
    if (!info) return;
    for (const k of [m, ...(info.alts || [])]) if (!out.has(k) || out.get(k).cost > cost) out.set(k, { base: m, cost });
  };
  add(lot.model, 0);
  const own = chainOf(f, overlayActive() ? (c) => c.every((m) => /_L\d$/.test(m)) : null), i = own.indexOf(lot.model), n = own.length;
  if (i >= 0 && !/^Townhall|^TownHall/.test(lot.model)) {
    for (const [, chain] of VARIANTS[f.kind] || []) {
      const j = Math.round((i * (chain.length - 1)) / Math.max(1, n - 1));
      add(chain[j], 0);
      add(chain[j - 1], 0.35);   // stades voisins : silhouettes différentes, hauteurs proches
      add(chain[j + 1], 0.35);
    }
  }
  return [...out].map(([key, v]) => ({ key, base: v.base, cost: v.cost }));
}

// Choisit pour chaque bâtiment l'apparence qui ressemble le moins à ses voisins (rayon de 2 cases) :
// même modèle à côté = forte pénalité, même modèle de base (variante de couleur) = moyenne, même famille = faible.
function packAppearances(city, analysis) {
  const shown = new Map(), placed = new Map();
  const lots = analysis.files.map((f) => [f, city.lots[f.id]]).filter(([, l]) => l && !l.model.startsWith('@'))
    .sort((a, b) => a[1].cz - b[1].cz || a[1].cx - b[1].cx);
  for (const [f, l] of lots) {
    const cands = packCandidates(f, l);
    let best = cands[0], bestScore = Infinity;
    for (const c of cands) {
      let score = (c.key === l.model ? -0.6 : 0) + c.cost + (hashString(f.path + '|' + c.key) / 4294967296) * 0.4;
      for (let z = l.cz - 2; z < l.cz + l.d + 2; z++) for (let x = l.cx - 2; x < l.cx + l.w + 2; x++) {
        if (x >= l.cx && x < l.cx + l.w && z >= l.cz && z < l.cz + l.d) continue;
        const e = placed.get(z * city.cols + x);
        if (!e) continue;
        const dist = Math.max(Math.max(l.cx - x, x - (l.cx + l.w - 1), 0), Math.max(l.cz - z, z - (l.cz + l.d - 1), 0));
        if (e.key === c.key) score += 6 / dist;
        else if (e.base === c.base) score += 2 / dist;
        else if (familyOf(e.base) === familyOf(c.base)) score += 0.8 / dist;
      }
      if (score < bestScore) { bestScore = score; best = c; }
    }
    shown.set(f.id, best.key);
    for (let z = l.cz; z < l.cz + l.d; z++) for (let x = l.cx; x < l.cx + l.w; x++) placed.set(z * city.cols + x, best);
  }
  return shown;
}

// → { group, buildings[id] = { id, box, lot, ref, matrix }, monuments, meshes: Map(model → InstancedMesh),
//     parts: pièces mobiles à animer, fx: émetteurs d'effets (fumée, balise, fontaine) }
export function buildPackCity(city, analysis, material, rng) {
  const group = new THREE.Group();
  group.name = 'city-pack';
  const meshes = new Map();
  const I = new PackInstancer(material);
  const ox = city.origin[0], oz = city.origin[1];
  const wx = (x) => ox + (x + 0.5) * CELL, wz = (z) => oz + (z + 0.5) * CELL;

  // --- sol : dalles urbaines sous les bâtiments et les routes, dalles vertes sur les places
  const tops = new Map(), paved = new Set(city.paved || []);
  for (const l of city.lots) if (l) for (let j = 0; j < l.d; j++) for (let i = 0; i < l.w; i++) tops.set((l.cz + j) * city.cols + l.cx + i, l.district);
  for (let z = 0; z < city.rows; z++) for (let x = 0; x < city.cols; x++) {
    const type = city.cellAt(x, z), k = z * city.cols + x;
    let model;
    if (type === 0) model = paved.has(k) ? GROUNDS[(x + z) & 1] : GROUNDS[2 + ((x + z) & 1)];
    else if (type === 2) model = GROUNDS[(tops.get(k) ?? 0) & 1 ? 1 : 0];
    else if (type === 3) continue; // eau : la tuile de rivière a son propre lit
    else model = GROUNDS[0];
    I.add(model, wx(x), GROUND_Y, wz(z), 0);
  }
  // --- routes
  // tuiles du kit de voirie quand le pack les contient (sinon anciennes routes du pack)
  const roadRefs = city.roadTiles.map((t) => {
    const k = kitRoad(t.model, t.rot, t);
    const use = k && packModel('city', k.model) ? k : t;
    return I.add(use.model, t.x, CITY_Y, t.z, (use.rot * Math.PI) / 2);
  });

  // eau de la rivière (le pont porte sa propre eau)
  for (const w of city.water || []) if (packModel('city', w.model)) I.add(w.model, w.x, CITY_Y, w.z, (w.rot * Math.PI) / 2);

  // --- bâtiments
  const buildings = new Array(analysis.files.length);
  const appearance = packAppearances(city, analysis);
  const parts = [], fx = [];
  // pièces mobiles et points d'effets d'un modèle posé (matrix = placement du bâtiment)
  const attach = (owner, model) => {
    const info = packModel('city', model);
    if (!info) return;
    for (const pt of info.parts || []) {
      const pivot = new THREE.Matrix4().fromArray(pt.m);
      const ref = I.addMatrix(pt.k, owner.matrix.clone().multiply(pivot), owner.seed);
      parts.push({ owner, ref, pivot, kind: pt.n.replace(/_\d+$/, ''), phase: rng() * 6.28 });
    }
    for (const e of info.fx || []) fx.push({ owner, type: e.t, p: new THREE.Vector3(...e.p), phase: rng(), big: /^Nuclear/.test(model) });
  };
  for (const f of analysis.files) {
    const lot = city.lots[f.id];
    if (!lot) continue;
    const ry = lot.facing === 2 ? Math.PI : 0;
    let ref = null, box;
    if (lot.model.startsWith('@')) {
      // bosquet / jardin : quelques arbres et rochers du pack
      const n = lot.model === '@grove' ? 2 : 4;
      const r = () => (rng() - 0.5) * CELL * 0.62;
      for (let k = 0; k < n; k++) I.add(TREES[Math.floor(rng() * TREES.length)], lot.x + r(), CITY_Y, lot.z + r(), rng() * 6.28, CELL * (1.1 + rng() * 0.5));
      I.add(rng() < 0.5 ? 'Rock' : 'Rock_B', lot.x + r(), CITY_Y, lot.z + r(), rng() * 6.28, CELL * 1.2);
      box = new THREE.Box3(new THREE.Vector3(lot.x - CELL * 0.45, CITY_Y, lot.z - CELL * 0.45), new THREE.Vector3(lot.x + CELL * 0.45, CITY_Y + CELL * 0.9, lot.z + CELL * 0.45));
    }
    // apparence propre au fichier (stable d'une génération à l'autre) : palette de couleurs et miroir
    const h = hashString(f.path);
    const seed = ((h >>> 8) % 100000) / 100000;
    const mirror = !lot.model.startsWith('@') && !/^Townhall/.test(lot.model) && (h & 1) === 1;
    const shown = appearance.get(f.id) || lot.model; // apparence choisie pour éviter les répétitions voisines
    if (!lot.model.startsWith('@')) {
      ref = I.add(shown, lot.x, CITY_Y, lot.z, ry, CELL, CELL, mirror, seed);
      box = packBox(shown, lot.x, lot.z, ry, CELL, mirror);
    }
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(lot.x, CITY_Y, lot.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(mirror ? -CELL : CELL, CELL, CELL));
    buildings[f.id] = { id: f.id, box, lot, ref, ry, matrix, mirror, seed };
    if (ref) attach(buildings[f.id], shown);
  }

  // --- mobilier des cases libres (arbres, bancs, lampadaires, jardins, voitures garées) et monuments
  if (city.decor) {
    for (const d of city.decor) if (packModel('city', d.model)) I.add(d.model, d.x, CITY_Y, d.z, d.rot, CELL * d.s);
  } else {
    for (const t of city.trees) I.add(TREES[t.kind % TREES.length], t.x, CITY_Y, t.z, t.s * 9, CELL * t.s * 1.2);
  }
  // thème Cyberpunk : les monuments du pack (blancs) cèdent la place aux mémoriaux et fontaines néon
  const NEON_MON = ['Memorial_L6', 'Fountain_L6', 'Memorial_L8', 'Fountain_L8', 'Memorial_L4'];
  const monuments = city.roundabouts.map((m0, mi) => {
    const neon = overlayActive() && NEON_MON.find((n, k) => k >= mi % NEON_MON.length && overlayHas(n));
    const m = neon ? { ...m0, model: neon } : m0;
    I.add(m.model, m.x, CITY_Y, m.z, Math.PI);
    const mon = { ...m, box: packBox(m.model, m.x, m.z, Math.PI, CELL) };
    mon.matrix = new THREE.Matrix4().compose(new THREE.Vector3(m.x, CITY_Y, m.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), new THREE.Vector3(CELL, CELL, CELL));
    attach(mon, m.model);
    return mon;
  });

  // modèles gérés par le niveau de détail : bâtiments, routes, arbres… (assez de triangles pour que le tri
  // en vaille la peine), hors pièces mobiles et tuiles à feux
  const lod = new PackLOD();
  const signal = /^(Road_(T|Cross)_N[5-8]|(Route|Avenue)_(T|Croix))$/;
  I.build(group, meshes, {
    lod,
    manage: (model) => {
      if (model.includes('#') || signal.test(model) || /^Ground_/.test(model)) return false;
      const g = packGeometry('city', model);
      return !!g && g.index && g.index.count / 3 >= 150;
    }
  });
  for (const e of lod.models.values()) if (/^(Avenue|Route|PetiteRoute|Chemin|Riviere)_|^fp_(?!tree)|^rk_(?!Tree)/.test(e.model)) { e.full.castShadow = false; if (e.lod) e.lod.castShadow = false; }
  // ombres portées : bâtiments, monuments et arbres seulement (routes, sol et petit mobilier en reçoivent sans en
  // projeter : sur une grande ville, la passe d'ombre redessinait sinon des millions de triangles)
  for (const [model, mesh] of meshes) {
    if (/^(Avenue|Route|PetiteRoute|Chemin|Riviere|Ground)_|^fp_(?!tree)|^rk_(?!Tree)/.test(model)) mesh.castShadow = false;
  }
  for (const pt of parts) pt.mesh = meshes.get(pt.ref.model);
  for (const r of roadRefs) r.mesh = meshes.get(r.model);
  // état des feux par tuile (aSig), piloté par la simulation de trafic
  for (const [model, mesh] of meshes) {
    if (!/^(Road_(T|Cross)_N[5-8]|(Route|Avenue)_(T|Croix))$/.test(model)) continue;
    mesh.geometry.setAttribute('aSig', new THREE.InstancedBufferAttribute(new Float32Array(mesh.count * 2), 2).setUsage(THREE.DynamicDrawUsage));
  }
  return { group, buildings, monuments, meshes, parts: parts.filter((pt) => pt.mesh), fx, roadRefs, lod };
}

// Véhicules du pack (InstancedMesh par modèle) ; renvoie les meshes indexés par nom.
export function buildPackVehicles(names, counts, material) {
  const out = new Map();
  for (const name of names) {
    const n = counts.get(name) || 0;
    const geo = packGeoView(packGeometry('city', name));
    if (!geo || !n) continue;
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(Float32Array.from({ length: n }, () => Math.random()), 1));
    const mesh = new THREE.InstancedMesh(geo, material, n);
    mesh.count = n; mesh.castShadow = true; mesh.frustumCulled = false;
    out.set(name, mesh);
  }
  return out;
}

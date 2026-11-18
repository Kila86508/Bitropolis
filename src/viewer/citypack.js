// Bitropolis — affiche une ville en grille (src/core/grid.js) avec les modèles du pack de ville.
// Sol, routes (8 niveaux), bâtiments à stades N1→N8, arbres et monuments : un InstancedMesh par modèle.
import { CELL } from '../core/grid.js';
import { TREES, GROUNDS } from '../core/catalog.js';
import { packGeometry, packModel } from './assets.js';

export const CITY_Y = 0.05;          // la ville affleure juste au-dessus de la pelouse de la campagne
const GROUND_Y = CITY_Y - 0.012 * CELL; // dalles de sol, légèrement sous les routes et les bâtiments

// Matériau des modèles du pack : couleurs par sommet, et la nuit :
//  - fenêtres (aLit = 1) allumées étage par étage, qui s'allument et s'éteignent chacune à son rythme ;
//  - lampadaires et signaux lumineux (aLit = 2) toujours allumés ;
//  - lentilles des feux tricolores (aLit 3–5 : têtes « X », 6–8 : têtes « Y » ; rouge, vert, orange),
//    commandées par l'attribut d'instance aSig = (état X, état Y) : 0 rouge, 1 orange, 2 vert.
export function makePackMaterial(uGlow, uTime) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.78, metalness: 0.02 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = uGlow;
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'attribute float aLit;\nattribute vec2 aSig;\nuniform float uTime;\nvarying float vLit;\nvarying float vLamp;\nvarying float vOn;\nvarying vec3 vLampCol;\n' +
      sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float bxId = float(gl_InstanceID);
      #else
        float bxId = 0.0;
      #endif
      float bxRnd = fract(sin(bxId * 12.9898 + 78.233) * 43758.5453);
      vLit = 0.0; vLamp = 0.0; vOn = 0.0; vLampCol = vec3(0.0);
      if (aLit > 2.5) {
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
        // un étage = une bande de hauteur ; chaque étage change d'état à son propre rythme
        float floorId = floor(position.y * 9.0);
        float period = 9.0 + 26.0 * fract(bxRnd * 7.31 + floorId * 0.173);
        float cycle = floor(uTime / period + bxRnd * 31.0 + floorId * 0.37);
        float h = fract(sin(floorId * 91.7 + bxId * 12.9898 + cycle * 37.719) * 43758.5453);
        vLit = h > 0.42 ? 0.4 : 0.0;
      }`);
    sh.fragmentShader = 'uniform float uGlow;\nvarying float vLit;\nvarying float vLamp;\nvarying float vOn;\nvarying vec3 vLampCol;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vLamp > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb * 0.22, vLampCol * 0.55, vOn);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += mix(vec3(1.0, 0.68, 0.32), vColor.rgb, 0.15) * uGlow * vLit;
        if (vLamp > 0.5) totalEmissiveRadiance += vLampCol * vOn * (0.7 + 1.6 * uGlow);`);
  };
  mat.customProgramCacheKey = () => 'bitropolis-pack-2';
  return mat;
}

// Regroupe des instances par modèle puis crée les InstancedMesh.
class PackInstancer {
  constructor(material) { this.material = material; this.lists = new Map(); this.dummy = new THREE.Object3D(); }
  add(model, x, y, z, ry, s = CELL, sy = s) {
    const d = this.dummy;
    d.position.set(x, y, z); d.rotation.set(0, ry, 0); d.scale.set(s, sy, s); d.updateMatrix();
    return this.addMatrix(model, d.matrix);
  }
  addMatrix(model, matrix) {
    if (!this.lists.has(model)) this.lists.set(model, []);
    const list = this.lists.get(model);
    list.push(matrix.clone());
    return { model, index: list.length - 1 };
  }
  build(group, meshes, { shadow = true } = {}) {
    for (const [model, list] of this.lists) {
      const geo = packGeometry('city', model);
      if (!geo) continue;
      const mesh = new THREE.InstancedMesh(geo, this.material, list.length);
      list.forEach((m, i) => mesh.setMatrixAt(i, m));
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

// Boîte englobante d'un modèle posé (rotation 0 ou π autour de Y)
function packBox(model, x, z, ry, s) {
  const m = packModel('city', model);
  const box = new THREE.Box3();
  if (!m) { box.setFromCenterAndSize(new THREE.Vector3(x, s / 2, z), new THREE.Vector3(s, s, s)); return box; }
  const flip = Math.abs(Math.cos(ry)) > 0.5 && Math.cos(ry) < 0;
  const x0 = m.min[0] * s, x1 = m.max[0] * s, z0 = m.min[2] * s, z1 = m.max[2] * s;
  box.min.set(x + (flip ? -x1 : x0), CITY_Y, z + (flip ? -z1 : z0));
  box.max.set(x + (flip ? -x0 : x1), CITY_Y + m.max[1] * s, z + (flip ? -z0 : z1));
  return box;
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
    else model = GROUNDS[0];
    I.add(model, wx(x), GROUND_Y, wz(z), 0);
  }
  // --- routes
  const roadRefs = city.roadTiles.map((t) => I.add(t.model, t.x, CITY_Y, t.z, (t.rot * Math.PI) / 2));

  // --- bâtiments
  const buildings = new Array(analysis.files.length);
  const parts = [], fx = [];
  // pièces mobiles et points d'effets d'un modèle posé (matrix = placement du bâtiment)
  const attach = (owner, model) => {
    const info = packModel('city', model);
    if (!info) return;
    for (const pt of info.parts || []) {
      const pivot = new THREE.Matrix4().fromArray(pt.m);
      const ref = I.addMatrix(pt.k, owner.matrix.clone().multiply(pivot));
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
    } else {
      ref = I.add(lot.model, lot.x, CITY_Y, lot.z, ry);
      box = packBox(lot.model, lot.x, lot.z, ry, CELL);
    }
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(lot.x, CITY_Y, lot.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(CELL, CELL, CELL));
    buildings[f.id] = { id: f.id, box, lot, ref, ry, matrix };
    if (ref) attach(buildings[f.id], lot.model);
  }

  // --- mobilier des cases libres (arbres, bancs, lampadaires, jardins, voitures garées) et monuments
  if (city.decor) {
    for (const d of city.decor) if (packModel('city', d.model)) I.add(d.model, d.x, CITY_Y, d.z, d.rot, CELL * d.s);
  } else {
    for (const t of city.trees) I.add(TREES[t.kind % TREES.length], t.x, CITY_Y, t.z, t.s * 9, CELL * t.s * 1.2);
  }
  const monuments = city.roundabouts.map((m) => {
    I.add(m.model, m.x, CITY_Y, m.z, Math.PI);
    const mon = { ...m, box: packBox(m.model, m.x, m.z, Math.PI, CELL) };
    mon.matrix = new THREE.Matrix4().compose(new THREE.Vector3(m.x, CITY_Y, m.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), new THREE.Vector3(CELL, CELL, CELL));
    attach(mon, m.model);
    return mon;
  });

  I.build(group, meshes);
  for (const pt of parts) pt.mesh = meshes.get(pt.ref.model);
  for (const r of roadRefs) r.mesh = meshes.get(r.model);
  // état des feux par tuile (aSig), piloté par la simulation de trafic
  for (const [model, mesh] of meshes) {
    if (!/^Road_(T|Cross)_N[5-8]$/.test(model)) continue;
    mesh.geometry.setAttribute('aSig', new THREE.InstancedBufferAttribute(new Float32Array(mesh.count * 2), 2).setUsage(THREE.DynamicDrawUsage));
  }
  return { group, buildings, monuments, meshes, parts: parts.filter((pt) => pt.mesh), fx, roadRefs };
}

// Véhicules du pack (InstancedMesh par modèle) ; renvoie les meshes indexés par nom.
export function buildPackVehicles(names, counts, material) {
  const out = new Map();
  for (const name of names) {
    const n = counts.get(name) || 0;
    const geo = packGeometry('city', name);
    if (!geo || !n) continue;
    const mesh = new THREE.InstancedMesh(geo, material, n);
    mesh.count = n; mesh.castShadow = true; mesh.frustumCulled = false;
    out.set(name, mesh);
  }
  return out;
}

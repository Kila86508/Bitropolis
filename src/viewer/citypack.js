// Bitropolis — affiche une ville en grille (src/core/grid.js) avec les modèles du pack de ville.
// Sol, routes (8 niveaux), bâtiments à stades N1→N8, arbres et monuments : un InstancedMesh par modèle.
import { CELL } from '../core/grid.js';
import { TREES, GROUNDS } from '../core/catalog.js';
import { packGeometry, packModel } from './assets.js';

export const CITY_Y = 0.05;          // la ville affleure juste au-dessus de la pelouse de la campagne
const GROUND_Y = CITY_Y - 0.012 * CELL; // dalles de sol, légèrement sous les routes et les bâtiments

// Matériau des modèles du pack : couleurs par sommet + fenêtres et lampadaires qui s'allument la nuit.
export function makePackMaterial(uGlow) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.78, metalness: 0.02 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = uGlow;
    sh.vertexShader = 'attribute float aLit;\nvarying float vLit;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float bxRnd = fract(sin(float(gl_InstanceID) * 12.9898 + 78.233) * 43758.5453);
      #else
        float bxRnd = 0.5;
      #endif
      vLit = aLit > 1.5 ? 1.6 : (aLit > 0.5 ? 0.38 * step(0.3, bxRnd) : 0.0);`);
    sh.fragmentShader = 'uniform float uGlow;\nvarying float vLit;\n' + sh.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\ntotalEmissiveRadiance += mix(vec3(1.0, 0.68, 0.32), vColor.rgb, 0.15) * uGlow * vLit;');
  };
  mat.customProgramCacheKey = () => 'bitropolis-pack';
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
  const tops = new Map();
  for (const l of city.lots) if (l) for (let j = 0; j < l.d; j++) for (let i = 0; i < l.w; i++) tops.set((l.cz + j) * city.cols + l.cx + i, l.district);
  for (let z = 0; z < city.rows; z++) for (let x = 0; x < city.cols; x++) {
    const type = city.cellAt(x, z), k = z * city.cols + x;
    let model;
    if (type === 0) model = GROUNDS[2 + ((x + z) & 1)];
    else if (type === 2) model = GROUNDS[(tops.get(k) ?? 0) & 1 ? 1 : 0];
    else model = GROUNDS[0];
    I.add(model, wx(x), GROUND_Y, wz(z), 0);
  }
  // --- routes
  for (const t of city.roadTiles) I.add(t.model, t.x, CITY_Y, t.z, (t.rot * Math.PI) / 2);

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

  // --- arbres des places et monuments
  for (const t of city.trees) I.add(TREES[t.kind % TREES.length], t.x, CITY_Y, t.z, t.s * 9, CELL * t.s * 1.2);
  const monuments = city.roundabouts.map((m) => {
    I.add(m.model, m.x, CITY_Y, m.z, Math.PI);
    const mon = { ...m, box: packBox(m.model, m.x, m.z, Math.PI, CELL) };
    mon.matrix = new THREE.Matrix4().compose(new THREE.Vector3(m.x, CITY_Y, m.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), new THREE.Vector3(CELL, CELL, CELL));
    attach(mon, m.model);
    return mon;
  });

  I.build(group, meshes);
  for (const pt of parts) pt.mesh = meshes.get(pt.ref.model);
  return { group, buildings, monuments, meshes, parts: parts.filter((pt) => pt.mesh), fx };
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

// Bitropolis — affiche la campagne procédurale (src/core/terrain.js) avec les modèles du kit Asset/.
// Chaque modèle devient un InstancedMesh : des milliers d'arbres et de tuiles en quelques appels de dessin.
import { planTerrain, V_SCALE } from '../core/terrain.js';
import { hasPack, packReady, packGeometry } from './assets.js';

export function hasLandscapeAssets() { return hasPack('landscape'); }

// Socle diorama « 9-slice » : le cadre garde son épaisseur, l'intérieur s'étire à N × N tuiles.
function landPlinth(N) {
  const inner = 7.85, grow = (N - 1) * 8;
  const f = (inner + grow) / inner;
  const w = (v) => (Math.abs(v) < inner ? v * f : v + Math.sign(v) * grow);
  return packGeometry('landscape', 'diorama_base_1x1', (x, y, z) => [w(x), y, w(z)]);
}

// Construit la campagne. Renvoie { group, plan } ; `material` = matériau partagé (couleurs par sommet).
export function buildLandscape({ seed, cityHalf, material }) {
  const plan = planTerrain({ seed, cityHalf });
  const group = new THREE.Group();
  group.name = 'landscape';
  if (!packReady('landscape')) return { group, plan };
  const byModel = new Map();
  const add = (model, x, y, z, ry, s = 1, sy = s) => {
    if (!byModel.has(model)) byModel.set(model, []);
    byModel.get(model).push([x, y, z, ry, s, sy]);
  };
  for (const t of plan.tiles) add(t.model, t.x, t.y, t.z, (t.rot * Math.PI) / 2, 1, V_SCALE);
  for (const o of plan.scatter) add(o.model, o.x, o.y, o.z, o.rot, o.s);

  const dummy = new THREE.Object3D();
  const missing = [];
  for (const [model, list] of byModel) {
    const geo = packGeometry('landscape', model);
    if (!geo) { missing.push(model); continue; }
    const mesh = new THREE.InstancedMesh(geo, material, list.length);
    list.forEach(([x, y, z, ry, s, sy], i) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, ry, 0);
      dummy.scale.set(s, sy, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = model;
    group.add(mesh);
  }
  const plinth = landPlinth(plan.N);
  if (plinth) {
    const m = new THREE.Mesh(plinth, material);
    m.position.y = -0.3;
    m.receiveShadow = true;
    group.add(m);
  }
  if (missing.length) console.warn('Bitropolis : modèles manquants', missing);
  return { group, plan };
}

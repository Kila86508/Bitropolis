import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kitRoad, roadKitModelNames, VARIANTS } from '../src/core/catalog.js';
import fs from 'node:fs';

// sorties (0 = -x, 1 = +x, 2 = -z, 3 = +z) d'une forme tournée de k quarts de tour (sens three.js)
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const rotMask = (exits, k) => {
  const a = (k * Math.PI) / 2, c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a));
  return exits.reduce((m, i) => { const [x, z] = DIRS[i]; return m | (1 << DIRS.findIndex((d) => d[0] === x * c + z * s && d[1] === -x * s + z * c)); }, 0);
};
const PACK = { Road_Straight: [0, 1], Road_Corner: [0, 3], Road_T: [0, 1, 3], Road_Cross: [0, 1, 2, 3], Road_End: [0] };
// relevé sur les .obj du kit : droite nord–sud, courbe est–sud, T sans le nord, impasse ouverte au sud
const KIT = { Droite: [2, 3], Passage: [2, 3], Courbe: [1, 3], T: [0, 1, 3], Croix: [0, 1, 2, 3], Impasse: [3] };

test('kit de voirie : chaque tuile garde les sorties de la route d\'origine', () => {
  for (const [shape, exits] of Object.entries(PACK)) {
    for (let rot = 0; rot < 4; rot++) for (let tier = 1; tier <= 8; tier++) {
      const k = kitRoad(`${shape}_N${tier}`, rot, true);
      const kitShape = k.model.split('_')[1];
      assert.equal(rotMask(KIT[kitShape], k.rot), rotMask(exits, rot), `${shape} N${tier} rot ${rot} → ${k.model} rot ${k.rot}`);
    }
  }
});

test('kit de voirie : feux seulement sur les routes et avenues (niveaux 5 à 8)', () => {
  for (let tier = 1; tier <= 8; tier++) {
    const m = kitRoad(`Road_Cross_N${tier}`, 0).model;
    assert.equal(/^(Route|Avenue)_/.test(m), tier >= 5, `${tier} → ${m}`);
  }
});

test('les modèles des chaînes et du kit existent dans Asset/export_obj (si présent)', { skip: !fs.existsSync('Asset/export_obj') }, () => {
  const names = new Set(roadKitModelNames());
  for (const vars of Object.values(VARIANTS)) for (const [, chain] of vars) for (const m of chain) if (/_L\d$/.test(m)) names.add(m);
  const missing = [...names].filter((n) => !fs.existsSync(`Asset/export_obj/${n}.obj`));
  assert.deepEqual(missing, []);
});

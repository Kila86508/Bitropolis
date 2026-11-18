import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planTerrain, trSlopeFrac, TILE } from '../src/core/terrain.js';

// Les modèles d'origine ne sont pas publiés : on ne vérifie les noms que s'ils sont présents.
const MODELS_DIR = new URL('../Asset/models/', import.meta.url);
const MODELS = fs.existsSync(MODELS_DIR) ? new Set(fs.readdirSync(MODELS_DIR).filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4))) : null;

test('même projet ⇒ même campagne, autre projet ⇒ autre campagne', () => {
  const a = planTerrain({ seed: 'mon-projet', cityHalf: 30 });
  const b = planTerrain({ seed: 'mon-projet', cityHalf: 30 });
  const c = planTerrain({ seed: 'autre-projet', cityHalf: 30 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.tiles, c.tiles);
});

test('une tuile par case, toutes issues du kit, rien de semé dans la ville', () => {
  for (const seed of ['a', 'b', 'c', 'd', 'e', 'three.js', 'hotel-booking']) {
    const cityHalf = 25 + seed.length * 9;
    const p = planTerrain({ seed, cityHalf });
    assert.equal(p.tiles.length, p.N * p.N);
    const cells = new Set(p.tiles.map((t) => `${t.x},${t.z}`));
    assert.equal(cells.size, p.N * p.N);
    for (const t of p.tiles) assert.ok(!MODELS || MODELS.has(t.model), `modèle inconnu : ${t.model}`);
    for (const o of p.scatter) {
      assert.ok(!MODELS || MODELS.has(o.model), `modèle inconnu : ${o.model}`);
      assert.ok(Math.abs(o.x) > cityHalf + 1 || Math.abs(o.z) > cityHalf + 1, `${o.model} planté dans la ville`);
      assert.ok(Math.abs(o.x) < p.half && Math.abs(o.z) < p.half, `${o.model} hors de la carte`);
    }
    assert.ok(p.half * 2 >= 2 * cityHalf + 4 * TILE);
  }
});

test('profil des pentes : continu sur les bords', () => {
  assert.equal(trSlopeFrac(0, 0.3, 0.7), 0);
  assert.equal(trSlopeFrac(0b1100, 0.5, 1), 1);    // coins 2 et 3 hauts : bord +z en haut
  assert.equal(trSlopeFrac(0b1100, 0.5, 0), 0);
  assert.equal(trSlopeFrac(0b0100, 1, 1), 1);      // coin extérieur
  assert.equal(trSlopeFrac(0b0100, 1, 0.5), 0.5);
  assert.equal(trSlopeFrac(0b1101, 1, 0), 0);      // coin intérieur : seul le coin 1 est bas
  assert.equal(trSlopeFrac(0b1101, 0, 0), 1);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProject } from '../src/core/analyze.js';
import { layoutGrid, CELL } from '../src/core/grid.js';
import { VEHICLES, ROAD_KIT_HALF, ROAD_KIT_TOP, ROAD_KIT_TIERS, ROAD_KIT_DECK, ROAD_KIT_DECK_WOOD } from '../src/core/catalog.js';
import { makeRng } from '../src/core/rules.js';

globalThis.THREE = globalThis.THREE || {
  Object3D: class { constructor() { this.position = { set() {} }; this.rotation = { set() {} }; this.scale = { setScalar() {} }; this.matrix = null; } updateMatrix() {} }
};
const { TrafficSim } = await import('../src/viewer/traffic.js');

// projet synthétique assez grand pour avoir rivière, ponts, passages supérieurs et ronds-points
function bigProject() {
  const raw = [], nd = 80;
  for (let d = 0; d < nd; d++) for (let f = 0; f < 18; f++) {
    const imps = [1, 2, 5].map((o) => `import x${o} from '../../g${((d + o) % nd) % 6}/m${(d + o) % nd}/f${(f + o) % 18}';`).join('\n');
    raw.push({ path: `src/g${d % 6}/m${d}/f${f}.ts`, content: imps + '\n' + 'export const v = 1;\n'.repeat(20 + f * 3) });
  }
  return analyzeProject(raw, { name: 'kit' });
}
const city = layoutGrid(bigProject(), { kit: true });
const makeSim = () => new TrafficSim({
  city, cell: CELL, cityY: 0, rng: makeRng('kit'), models: VEHICLES, roadRefs: null,
  halfWidths: ROAD_KIT_HALF, roadTop: ROAD_KIT_TOP, deckOf: (t) => (ROAD_KIT_TIERS[t] === 'Chemin' ? ROAD_KIT_DECK_WOOD : ROAD_KIT_DECK),
  buildMeshes: (names) => new Map(names.map((n) => [n, { setMatrixAt() {}, instanceMatrix: {}, visible: true }]))
});
const kinds = (k) => city.roadTiles.filter((t) => t.kind === k);

test('plan : rivière traversée par des ponts, rampes droites, passages supérieurs et ronds-points', () => {
  assert.ok(city.river && city.water.length > 10, 'une rivière');
  assert.ok(kinds('bridge').length >= 2 && kinds('over').length >= 1 && kinds('round').length >= 1);
  for (const r of kinds('ramp')) assert.ok(r.mask === 3 || r.mask === 12, 'une rampe est une ligne droite');
  // chaque pont est encadré par deux rampes qui montent vers lui
  for (const b of kinds('bridge')) {
    const at = (dz) => city.roadTiles.find((t) => t.cx === b.cx && t.cz === b.cz + dz);
    assert.equal(at(-1).kind, 'ramp'); assert.equal(at(-1).up, 3);
    assert.equal(at(1).kind, 'ramp'); assert.equal(at(1).up, 2);
  }
});

test('hauteur des voitures : tablier sur les ponts, pente sur les rampes, dessous du passage supérieur au sol', () => {
  const sim = makeSim();
  const k = (t) => t.cz * city.cols + t.cx;
  const deck = (ROAD_KIT_DECK - ROAD_KIT_TOP) * CELL;
  const ramp = kinds('ramp').find((t) => sim.tier[k(t)] > 1);
  const [hUp] = sim._lift({ k: k(ramp), entry: ramp.up, s: 1 });
  const [hDown, pitch] = sim._lift({ k: k(ramp), entry: ramp.up ^ 1, s: 1 });
  assert.ok(Math.abs(hUp - deck) < 1e-6 && Math.abs(hDown) < 1e-6 && pitch < 0);
  const over = kinds('over')[0];
  const along = over.axis === 0 ? 1 : 3, across = over.axis === 0 ? 3 : 1;
  assert.ok(sim._lift({ k: k(over), entry: along, s: 0.5 })[0] > 0.5, 'sur le tablier');
  assert.equal(sim._lift({ k: k(over), entry: across, s: 0.5 })[0], 0, 'dessous, au sol');
  assert.ok(!sim.junctions.has(k(over)), 'un passage supérieur n\'est pas un carrefour');
  assert.equal(sim._chooseDir(k(over), across), across, 'tout droit sous le pont');
});

test('circulation avec ponts et ronds-points : ça roule, personne ne se chevauche', () => {
  const sim = makeSim();
  let respawns = 0;
  const orig = sim._respawn.bind(sim);
  sim._respawn = (c) => { respawns++; orig(c); };
  let overlaps = 0, frames = 0, moving = 0;
  const visits = new Set();
  for (let f = 0; f < 60; f++) {
    for (let i = 0; i < 20; i++) sim.update(0.05); // une minute simulée
    const P = sim.cars.map((c) => [c.px, c.pz, sim._lift(c)[0]]);
    for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) {
      if (Math.abs(P[a][2] - P[b][2]) < 0.3 && Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]) < 0.5) overlaps++;
    }
    moving += sim.cars.filter((c) => c.v > 0.3).length / sim.cars.length;
    for (const c of sim.cars) if (sim.junctions.get(c.k)?.round) visits.add(c.id);
    frames++;
  }
  assert.ok(visits.size >= 5, `des voitures passent par les ronds-points (${visits.size})`);
  assert.ok(moving / frames > 0.45, `trop de voitures à l'arrêt (${(1 - moving / frames).toFixed(2)})`);
  assert.ok(overlaps / frames < 0.15, `chevauchements : ${(overlaps / frames).toFixed(2)} par image`);
  assert.ok(respawns <= sim.cars.length * 0.03, `${respawns} réapparitions`);
});

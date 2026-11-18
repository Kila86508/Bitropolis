import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProject } from '../src/core/analyze.js';
import { layoutGrid, CELL } from '../src/core/grid.js';
import { VEHICLES } from '../src/core/catalog.js';
import { makeRng } from '../src/core/rules.js';
import { demoProject } from '../scripts/demo-project.js';

// three.js n'est pas chargé dans les tests : un objet minimal suffit au simulateur
globalThis.THREE = globalThis.THREE || {
  Object3D: class { constructor() { this.position = { set() {} }; this.rotation = { set() {} }; this.scale = { setScalar() {} }; this.matrix = null; } updateMatrix() {} }
};
const { TrafficSim } = await import('../src/viewer/traffic.js');

function makeSim() {
  const city = layoutGrid(analyzeProject(demoProject(), { name: 'demo' }));
  const fakeMesh = () => ({ setMatrixAt() {}, instanceMatrix: {}, visible: true });
  return new TrafficSim({
    city, cell: CELL, cityY: 0, rng: makeRng('test'), models: VEHICLES, roadRefs: null,
    buildMeshes: (names) => new Map(names.map((n) => [n, fakeMesh()]))
  });
}
const posOf = (c) => {
  const [E, C, X] = c.P, t = Math.min(1, Math.max(0, c.s)), u = 1 - t;
  return [u * u * E[0] + 2 * u * t * C[0] + t * t * X[0], u * u * E[1] + 2 * u * t * C[1] + t * t * X[1]];
};

test('circulation : pas de blocage complet, les voitures ne se traversent pas', () => {
  const sim = makeSim();
  assert.ok(sim.cars.length > 30);
  let respawns = 0;
  const orig = sim._respawn.bind(sim);
  sim._respawn = (c) => { respawns++; orig(c); };
  let overlaps = 0, frames = 0, moving = 0;
  for (let k = 0; k < 120; k++) {
    for (let i = 0; i < 40; i++) sim.update(0.05); // 4 minutes simulées
    const P = sim.cars.map(posOf);
    for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) if (Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]) < 0.5) overlaps++;
    moving += sim.cars.filter((c) => c.v > 0.3).length / sim.cars.length;
    frames++;
  }
  assert.ok(moving / frames > 0.4, `trop de voitures à l'arrêt (${(1 - moving / frames).toFixed(2)})`);
  assert.ok(overlaps / frames < 0.1, `voitures qui se chevauchent : ${(overlaps / frames).toFixed(2)} par image`);
  assert.ok(respawns <= 5, `${respawns} réapparitions (blocages)`);
});

test('feux : jamais vert sur les deux axes à la fois', () => {
  const sim = makeSim();
  const j = [...sim.junctions.values()].find((x) => x.signaled);
  assert.ok(j, 'au moins un carrefour à feux');
  for (let t = 0; t < 60; t += 0.25) {
    sim.time = t;
    assert.ok(!(sim.signalState(j, 0) === 2 && sim.signalState(j, 1) === 2));
  }
});

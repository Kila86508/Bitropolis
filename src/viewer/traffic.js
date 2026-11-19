// Bitropolis — circulation sur le réseau routier en grille (thème Ville 3D).
// Les véhicules roulent à droite, case par case, tournent aux carrefours, gardent leurs distances
// (d'où les bouchons sur les avenues chargées), s'arrêtent aux feux rouges et respectent la priorité
// à droite aux carrefours sans feux. Les feux du pack (lentilles rouge / orange / verte) s'allument
// selon l'état de chaque carrefour. Kit de voirie : on cède le passage à l'anneau des ronds-points, on monte
// sur les ponts et les passages supérieurs (qui ne sont pas des carrefours : un flux passe dessous).

const TF_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];           // -x, +x, -z, +z
const tfOpp = (d) => d ^ 1;
const tfDirOf = (dx, dz) => (dx < 0 ? 0 : dx > 0 ? 1 : dz < 0 ? 2 : 3);
// demi-largeur de la chaussée de chaque niveau de route (unités du pack, relevée sur les modèles)
const TF_HALF = [0.13, 0.13, 0.21, 0.27, 0.27, 0.33, 0.39, 0.39, 0.45];
const TF_ROAD_TOP = 0.024;  // hauteur de l'asphalte (unités du pack)
const TF_CAR_BOTTOM = 0.031; // dessous des véhicules du pack
// cases spéciales du kit de voirie
const TF_RAMP = 1, TF_BRIDGE = 2, TF_OVER = 3, TF_ROUND = 4;
const TF_KIND = { ramp: TF_RAMP, bridge: TF_BRIDGE, over: TF_OVER, round: TF_ROUND };
const TF_RING = 0.27;   // rayon de l'anneau des ronds-points (fraction de case : îlot 0,14 + demi-voiture)
const TF_MERGE = 0.45;  // angle (rad) entre le bord d'entrée et le point où l'on rejoint l'anneau
// angle de chaque direction sur l'anneau (x vers la droite, z vers le bas de l'écran)
const TF_ANG = [Math.PI, 0, -Math.PI / 2, Math.PI / 2];
const tfWrap = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
// cycle des feux (secondes) : vert, orange, rouge partout ; puis l'autre axe
const TF_GREEN = 7, TF_AMBER = 1.6, TF_CLEAR = 1.1, TF_CYCLE = 2 * (TF_GREEN + TF_AMBER + TF_CLEAR);

export class TrafficSim {
  // city : plan en grille ; vehicles : Map(nom → InstancedMesh) ; roadRefs : instances des tuiles de route
  // halfWidths / roadTop : gabarits du kit de voirie s'il est utilisé (sinon ceux des routes du pack)
  // deckOf(tier) : hauteur du tablier des ponts / rampes / passages supérieurs (fraction de case), kit seulement
  constructor({ city, cell, cityY, rng, models, buildMeshes, roadRefs, halfWidths = TF_HALF, roadTop = TF_ROAD_TOP, deckOf = null }) {
    this.half = halfWidths;
    this.roadTop = roadTop;
    this.deckOf = deckOf;
    this.city = city; this.cell = cell; this.cityY = cityY; this.rng = rng;
    this.cols = city.cols; this.rows = city.rows;
    this.time = 0;
    this.carScale = cell * 2.2;
    this.y = cityY + roadTop * cell - TF_CAR_BOTTOM * this.carScale;
    const ox = city.origin[0], oz = city.origin[1];
    this.wx = (x) => ox + (x + 0.5) * cell;
    this.wz = (z) => oz + (z + 0.5) * cell;

    // --- réseau : niveau de chaque case de route, voisins, carrefours
    const N = this.cols * this.rows;
    this.tier = new Int8Array(N);
    this.mask = new Int8Array(N);
    this.road = new Uint8Array(N);
    this.kind = new Int8Array(N);              // TF_RAMP, TF_BRIDGE, TF_OVER, TF_ROUND
    this.up = new Int8Array(N).fill(-1);       // rampe : direction du côté haut
    this.axis = new Int8Array(N).fill(-1);     // pont / passage supérieur : axe du tablier (0 = x, 1 = z)
    const tileAt = new Map(), tileMask = new Map();
    city.roadTiles.forEach((t, i) => {
      const k = t.cz * this.cols + t.cx;
      this.road[k] = 1;
      this.tier[k] = +((/_N(\d+)$/.exec(t.model) || [0, 2])[1]);
      if (t.kind) { this.kind[k] = TF_KIND[t.kind] || 0; if (t.up !== undefined) this.up[k] = t.up; if (t.axis !== undefined) this.axis[k] = t.axis; }
      if (t.mask !== undefined) tileMask.set(k, t.mask); // raccordements imposés par le plan (rampes, ponts)
      tileAt.set(k, i);
    });
    for (let z = 0; z < this.rows; z++) for (let x = 0; x < this.cols; x++) {
      const k = z * this.cols + x;
      if (!this.road[k]) continue;
      let m = 0;
      TF_DIRS.forEach(([dx, dz], d) => { if (this.isRoad(x + dx, z + dz)) m |= 1 << d; });
      this.mask[k] = tileMask.has(k) ? tileMask.get(k) : m;
    }
    // carrefours (3 ou 4 branches) : feux sur les tuiles qui en ont (T / croix N5 à N8), rond-point (on cède le
    // passage à l'anneau), sinon priorité à droite. Un passage supérieur n'est pas un carrefour : les deux flux
    // passent l'un au-dessus de l'autre.
    this.junctions = new Map();
    for (const [k, i] of tileAt) {
      const branches = [0, 1, 2, 3].filter((d) => this.mask[k] & (1 << d)).length;
      if (branches < 3 || this.kind[k] === TF_OVER) continue;
      const t = city.roadTiles[i];
      const round = this.kind[k] === TF_ROUND;
      const signaled = !round && /^Road_(T|Cross)_N[5-8]$/.test(t.model);
      this.junctions.set(k, { k, signaled, round, cx: this.wx(t.cx), cz: this.wz(t.cz), rot: t.rot, ref: roadRefs ? roadRefs[i] : null, offset: rng() * TF_CYCLE, inside: new Set(), waiting: [null, null, null, null] });
    }

    // --- véhicules
    const roadCells = [];
    for (let k = 0; k < N; k++) if (this.road[k]) roadCells.push(k);
    const n = Math.min(600, Math.round(roadCells.length * 0.22));
    const weights = roadCells.map((k) => Math.pow(this.tier[k] || 1, 1.5));
    const total = weights.reduce((a, b) => a + b, 0);
    this.cars = [];
    this.slots = new Map();
    for (let tries = 0; this.cars.length < n && tries < n * 6; tries++) {
      let r = rng() * total, idx = 0;
      while ((r -= weights[idx]) > 0 && idx < weights.length - 1) idx++;
      const k = roadCells[idx];
      const entries = [0, 1, 2, 3].filter((d) => this.mask[k] & (1 << tfOpp(d))); // arrivé depuis ce voisin
      if (!entries.length || this.junctions.has(k)) continue;
      const entry = entries[Math.floor(rng() * entries.length)];
      const s = 0.1 + rng() * 0.8;
      if (this._slot(k, entry).some((c) => Math.abs(c.s - s) < 0.45)) continue;
      const r2 = rng();
      const list = r2 < 0.7 ? models.car : r2 < 0.9 ? models.truck : models.special;
      const model = list[Math.floor(rng() * list.length)];
      const len = (/Bus|Truck/.test(model) ? 0.3 : /Ambulance|Fire|Recycling/.test(model) ? 0.24 : 0.16) * this.carScale;
      const car = { id: this.cars.length, model, len, k, entry, exit: -1, plan: -1, s, v: 0, vmax: (3.4 + rng() * 1.4) * (/Bus|Truck/.test(model) ? 0.85 : 1), committed: false };
      car.exit = this._chooseDir(k, entry);
      car.plan = this._chooseDir(this._next(k, car.exit), car.exit);
      this._build(car);
      this.cars.push(car);
      this._slot(k, entry).push(car);
    }
    // meshes : un InstancedMesh par modèle de véhicule
    const counts = new Map();
    for (const c of this.cars) counts.set(c.model, (counts.get(c.model) || 0) + 1);
    this.meshes = buildMeshes([...counts.keys()], counts);
    const next = new Map();
    for (const c of this.cars) { c.mesh = this.meshes.get(c.model); c.index = next.get(c.model) || 0; next.set(c.model, c.index + 1); }
    this.dummy = new THREE.Object3D();
    this._applySignals(true);
  }

  isRoad(x, z) { return x >= 0 && z >= 0 && x < this.cols && z < this.rows && this.road[z * this.cols + x] === 1; }
  _slot(k, entry) { const key = k * 4 + entry; let s = this.slots.get(key); if (!s) { s = []; this.slots.set(key, s); } return s; }
  _next(k, d) { const x = k % this.cols, z = (k - x) / this.cols; return (z + TF_DIRS[d][1]) * this.cols + x + TF_DIRS[d][0]; }
  // décalage de voie (mètres) au passage entre deux cases : moyenne des deux chaussées
  _lane(a, b) { return Math.max(0.32, (this.half[this.tier[a] || 1] + this.half[this.tier[b] || 1]) * 0.25 * this.cell); }
  // manœuvre au carrefour : 0 tout droit, 1 à droite, 2 à gauche, 3 demi-tour
  _turn(heading, out) {
    if (out === heading) return 0;
    const [dx, dz] = TF_DIRS[heading];
    if (out === tfDirOf(-dz, dx)) return 1;
    if (out === tfDirOf(dz, -dx)) return 2;
    return 3;
  }

  // Sortie d'une case k où l'on entre avec la direction `entry` : tout droit de préférence, vers les grandes avenues.
  // (Chaque voiture connaît aussi sa sortie de la case suivante : elle sait si la sortie d'un carrefour est libre.)
  _chooseDir(k, entry) {
    const m = this.mask[k];
    if (this.kind[k] === TF_OVER && (m & (1 << entry))) return entry; // passage supérieur : tout droit (dessus ou dessous)
    const back = tfOpp(entry);
    const opts = [0, 1, 2, 3].filter((d) => (m & (1 << d)) && d !== back);
    if (!opts.length) return back; // cul-de-sac : demi-tour
    let total = 0;
    const w = opts.map((d) => { const t = this.tier[this._next(k, d)] || 1; const v = (d === entry ? 2.4 : 1) * Math.pow(t, 1.2); total += v; return v; });
    let r = this.rng() * total;
    for (let i = 0; i < opts.length; i++) { if ((r -= w[i]) <= 0) return opts[i]; }
    return opts[opts.length - 1];
  }

  // Trajet dans la case : entrée sur le bord arrière (voie de droite), sortie sur le bord du côté choisi
  _build(car) {
    const k = car.k, x = k % this.cols, z = (k - x) / this.cols;
    const cx = this.wx(x), cz = this.wz(z), h = this.cell / 2;
    const [ex, ez] = TF_DIRS[car.entry], [ox, oz] = TF_DIRS[car.exit];
    const prev = this._next(k, tfOpp(car.entry)), nxt = this._next(k, car.exit);
    const li = this._lane(prev, k), lo = this._lane(k, nxt);
    const E = [cx - ex * h + -ez * li, cz - ez * h + ex * li];
    const X = [cx + ox * h + -oz * lo, cz + oz * h + ox * lo];
    car.poly = null;
    if (this.kind[k] === TF_ROUND) {
      // rond-point : on rejoint l'anneau sur sa droite, on tourne autour de l'îlot (sens antihoraire vu du
      // ciel, l'îlot à gauche) et on le quitte juste avant sa sortie
      const R = TF_RING * this.cell;
      const a0 = TF_ANG[tfOpp(car.entry)] - TF_MERGE, a1 = TF_ANG[car.exit] + TF_MERGE;
      let span = tfWrap(a0 - a1);
      if (span < 0.05) span += 2 * Math.PI;
      const pts = [E];
      const steps = Math.max(2, Math.ceil(span / 0.2));
      for (let i = 0; i <= steps; i++) { const a = a0 - (span * i) / steps; pts.push([cx + R * Math.cos(a), cz + R * Math.sin(a)]); }
      pts.push(X);
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      car.poly = pts; car.cum = cum; car.L = cum[cum.length - 1];
      car.P = [E, E, X];
      return;
    }
    let C;
    if (car.exit === car.entry) C = [(E[0] + X[0]) / 2, (E[1] + X[1]) / 2];
    else if (car.exit === tfOpp(car.entry)) C = [cx + ex * h * 1.1, cz + ez * h * 1.1];
    else { const t = (X[0] - E[0]) * ex + (X[1] - E[1]) * ez; C = [E[0] + ex * t, E[1] + ez * t]; }
    car.P = [E, C, X];
    const chord = Math.hypot(X[0] - E[0], X[1] - E[1]);
    car.L = car.exit === car.entry ? chord : car.exit === tfOpp(car.entry) ? this.cell * 1.2 : chord * 1.12;
  }

  // État d'un feu pour un axe (0 = x, 1 = z) : 0 rouge, 1 orange, 2 vert
  signalState(j, axis) {
    const t = (this.time + j.offset) % TF_CYCLE, half = TF_GREEN + TF_AMBER + TF_CLEAR;
    const local = axis === 0 ? t : (t + half) % TF_CYCLE;
    return local < TF_GREEN ? 2 : local < TF_GREEN + TF_AMBER ? 1 : 0;
  }

  // Une voiture peut-elle s'engager dans le carrefour j ?
  _mayEnter(car, j, nextK) {
    const heading = car.exit; // direction de la voiture en entrant dans le carrefour
    // on ne s'engage que si la sortie choisie a de la place (on ne bloque jamais le carrefour)
    const outK = this._next(nextK, car.plan), out = this.slots.get(outK * 4 + car.plan);
    let room = Infinity;
    if (out && out.length) { const last = out[out.length - 1]; room = last.s * (last.L || this.cell) - last.len / 2; }
    for (const o of j.inside) if (o.exit === car.plan) room -= o.len + 0.6;
    if (room < car.len + 0.6) return false;
    if (j.round) return this._mayEnterRound(car, j);
    // trajectoires qui se croisent : on ne partage le carrefour qu'avec son propre flux,
    // ou avec le flux d'en face si personne ne tourne à gauche
    const myTurn = this._turn(heading, car.plan);
    for (const o of j.inside) {
      if (o.entry === heading) continue;
      if (o.entry === tfOpp(heading) && myTurn < 2 && this._turn(o.entry, o.exit) < 2) continue;
      return false;
    }
    if (j.signaled) {
      const st = this.signalState(j, heading < 2 ? 0 : 1);
      if (st === 0) return false;
      if (st === 1 && car.s < 0.75) return false;
    } else {
      if (car.waitT > 6 && !j.inside.size) return true; // attente trop longue et carrefour vide : on passe
      // priorité à droite : une voiture attend-elle sur ma droite ?
      const [dx, dz] = TF_DIRS[heading];
      const fromRight = tfDirOf(dz, -dx);
      const w = j.waiting[fromRight];
      if (w && w !== car && this.cars[w.id] === w && w.waitT > 0.2) {
        // les quatre côtés bloqués : on débloque par ordre de direction
        const all = j.waiting.every((c) => c && c.waitT > 0.2);
        if (!(all && heading === 0)) return false;
      }
    }
    return true;
  }

  // Rond-point : l'anneau a la priorité. On entre si aucune voiture de l'anneau n'arrive sur notre point
  // d'insertion (venant de l'amont, côté gauche) et s'il reste de la place.
  _mayEnterRound(car, j) {
    if (j.inside.size >= 4) return false;
    if (car.waitT > 8 && !j.inside.size) return true;
    const merge = TF_ANG[tfOpp(car.exit)] - TF_MERGE; // car.exit = direction d'arrivée dans le rond-point
    for (const o of j.inside) {
      if (o.ang === undefined) return false;
      const upstream = tfWrap(o.ang - merge);       // > 0 : o est en amont (il tourne vers nous)
      if (upstream < 1.7 || upstream > 2 * Math.PI - 0.35) return false;
    }
    return true;
  }

  update(dt) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    const cars = this.cars;
    for (const s of this.slots.values()) s.sort((a, b) => b.s - a.s); // de la plus avancée à la moins avancée
    for (const j of this.junctions.values()) for (let d = 0; d < 4; d++) j.waiting[d] = null;
    // repère les voitures qui attendent à l'entrée de chaque carrefour
    for (const c of cars) {
      const nk = this._next(c.k, c.exit);
      const j = this.junctions.get(nk);
      if (j && c.s > 0.55 && !c.committed) {
        const cur = j.waiting[c.exit];
        if (!cur || cur.s < c.s) j.waiting[c.exit] = c;
      }
    }
    for (const c of cars) {
      // véhicule de tête : devant dans la même case, sinon dans la case suivante
      const slot = this._slot(c.k, c.entry);
      const i = slot.indexOf(c);
      let gap = Infinity, leadLen = 0;
      if (i > 0) { const l = slot[i - 1]; gap = (l.s - c.s) * c.L; leadLen = l.len; }
      else {
        const nk = this._next(c.k, c.exit), ns = this.slots.get(nk * 4 + c.exit);
        if (ns && ns.length) { const l = ns[ns.length - 1]; gap = (1 - c.s) * c.L + l.s * (l.L || this.cell); leadLen = l.len; }
      }
      // sur l'anneau d'un rond-point : distance à la voiture qui nous précède sur l'anneau
      if (this.kind[c.k] === TF_ROUND && c.ang !== undefined) {
        const jr = this.junctions.get(c.k);
        if (jr) for (const o of jr.inside) {
          if (o === c || o.ang === undefined) continue;
          const ahead = tfWrap(c.ang - o.ang);       // l'anneau tourne dans le sens des angles décroissants
          if (ahead > 0 && ahead < Math.PI / 2) { const g = ahead * TF_RING * this.cell; if (g < gap) { gap = g; leadLen = o.len; } }
        }
      }
      let target = c.vmax * (0.75 + 0.05 * (this.tier[c.k] || 1));
      if (this.kind[c.k] === TF_ROUND) target *= 0.7; // on ralentit dans le rond-point
      if (gap < Infinity) {
        const free = gap - (c.len + leadLen) / 2 - 0.55;
        target = Math.min(target, Math.sqrt(Math.max(0, 2 * 7 * free)));
      }
      // carrefour devant : feu / priorité
      const nk = this._next(c.k, c.exit);
      const j = this.junctions.get(nk);
      // (déjà dans un carrefour : on ne s'arrête pas pour le carrefour collé suivant, on le traverse en gardant ses distances)
      if (j && !c.committed && !this.junctions.has(c.k)) {
        if (this._mayEnter(c, j, nk)) { if (c.s > 0.6) c.committed = true; }
        else {
          const stop = (1 - c.s) * c.L - c.len / 2 - 0.25;
          target = Math.min(target, Math.sqrt(Math.max(0, 2 * 7 * stop)));
        }
      }
      // accélère / freine
      c.v = target > c.v ? Math.min(target, c.v + 2.6 * dt) : Math.max(target, c.v - 9 * dt);
      c.waitT = c.v < 0.15 ? (c.waitT || 0) + dt : 0;
      c.s += (c.v * dt) / c.L;
      if (c.s >= 1) this._advance(c);
      else if (c.waitT > 25) this._respawn(c); // dernier recours contre un blocage complet
    }
    this._applySignals(false);
    this._draw();
  }

  // Passage à la case suivante
  _advance(c) {
    const oldSlot = this._slot(c.k, c.entry);
    oldSlot.splice(oldSlot.indexOf(c), 1);
    const leftJ = this.junctions.get(c.k);
    if (leftJ) leftJ.inside.delete(c);
    const overflow = (c.s - 1) * c.L;
    c.k = this._next(c.k, c.exit);
    c.entry = c.exit;
    c.committed = false;
    c.exit = c.plan;
    c.plan = this._chooseDir(this._next(c.k, c.exit), c.exit);
    this._build(c);
    c.s = Math.min(0.5, overflow / c.L);
    const j = this.junctions.get(c.k);
    if (j) j.inside.add(c);
    this._slot(c.k, c.entry).push(c);
  }

  // Réapparition ailleurs (case de route libre, hors carrefour)
  _respawn(c) {
    const slot = this._slot(c.k, c.entry);
    slot.splice(slot.indexOf(c), 1);
    const j0 = this.junctions.get(c.k);
    if (j0) j0.inside.delete(c);
    const N = this.road.length;
    for (let tries = 0; tries < 200; tries++) {
      const k = Math.floor(this.rng() * N);
      if (!this.road[k] || this.junctions.has(k)) continue;
      const entries = [0, 1, 2, 3].filter((d) => this.mask[k] & (1 << tfOpp(d)));
      if (!entries.length) continue;
      const entry = entries[Math.floor(this.rng() * entries.length)];
      if (this._slot(k, entry).length) continue;
      c.k = k; c.entry = entry; c.s = 0.2; c.v = 0; c.waitT = 0; c.committed = false;
      c.exit = this._chooseDir(k, entry);
      c.plan = this._chooseDir(this._next(k, c.exit), c.exit);
      this._build(c);
      this._slot(k, entry).push(c);
      return;
    }
    this._slot(c.k, c.entry).push(c);
    c.waitT = 0;
  }

  // Lentilles des feux : (état axe x du modèle, état axe z du modèle) pour chaque tuile équipée
  _applySignals(force) {
    const touched = new Set();
    for (const j of this.junctions.values()) {
      if (!j.signaled || !j.ref || !j.ref.mesh) continue;
      const attr = j.ref.mesh.geometry.getAttribute('aSig');
      if (!attr) continue;
      const sx = this.signalState(j, 0), sz = this.signalState(j, 1);
      const odd = j.rot % 2 === 1;
      const a = odd ? sz : sx, b = odd ? sx : sz;
      if (!force && attr.getX(j.ref.index) === a && attr.getY(j.ref.index) === b) continue;
      attr.setXY(j.ref.index, a, b);
      touched.add(attr);
    }
    for (const a of touched) a.needsUpdate = true;
  }

  // Hauteur au-dessus de la chaussée (m) et pente (rad, positive en montée) d'une voiture sur sa case
  _lift(c) {
    const kind = this.kind[c.k];
    if (!kind || kind === TF_ROUND || !this.deckOf) return [0, 0];
    const deck = this.deckOf(this.tier[c.k] || 1) - this.roadTop;
    if (deck <= 0) return [0, 0];
    const s = Math.min(1, Math.max(0, c.s));
    if (kind === TF_BRIDGE) {
      if (deck > 0.1) return [deck * this.cell, 0];
      // petit pont en bois : légère bosse
      return [deck * this.cell * Math.min(1, Math.min(s, 1 - s) / 0.3), 0];
    }
    if (kind === TF_OVER) return [(c.entry < 2 ? 0 : 1) === this.axis[c.k] ? deck * this.cell : 0, 0];
    if (kind === TF_RAMP) {
      if (deck < 0.1) return [0, 0];
      const upward = c.entry === this.up[c.k];
      return [deck * this.cell * (upward ? s : 1 - s), (upward ? 1 : -1) * Math.atan(deck)];
    }
    return [0, 0];
  }

  _draw() {
    const d = this.dummy;
    d.rotation.order = 'YXZ';
    for (const c of this.cars) {
      let x, z, tx, tz;
      if (c.poly) {
        const target = Math.min(1, Math.max(0, c.s)) * c.L, P = c.poly, cum = c.cum;
        let i = 1;
        while (i < cum.length - 1 && cum[i] < target) i++;
        const f = Math.min(1, Math.max(0, (target - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1])));
        x = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f; z = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f;
        tx = P[i][0] - P[i - 1][0]; tz = P[i][1] - P[i - 1][1];
        const j = this.junctions.get(c.k);
        c.ang = j ? tfWrap(Math.atan2(z - j.cz, x - j.cx)) : undefined;
      } else {
        const [E, C, X] = c.P, t = Math.min(1, Math.max(0, c.s)), u = 1 - t;
        x = u * u * E[0] + 2 * u * t * C[0] + t * t * X[0];
        z = u * u * E[1] + 2 * u * t * C[1] + t * t * X[1];
        tx = 2 * u * (C[0] - E[0]) + 2 * t * (X[0] - C[0]); tz = 2 * u * (C[1] - E[1]) + 2 * t * (X[1] - C[1]);
        c.ang = undefined;
      }
      const [lift, pitch] = this._lift(c);
      c.px = x; c.pz = z;
      d.position.set(x, this.y + lift, z);
      d.rotation.set(-pitch, Math.atan2(tx, tz), 0);
      d.scale.setScalar(this.carScale);
      d.updateMatrix();
      c.mesh.setMatrixAt(c.index, d.matrix);
    }
    for (const m of this.meshes.values()) m.instanceMatrix.needsUpdate = true;
  }

  setVisible(on) { for (const m of this.meshes.values()) m.visible = on; }
  // bouchons : part des voitures à l'arrêt (pour l'interface)
  jamRatio() { return this.cars.length ? this.cars.filter((c) => c.v < 0.3).length / this.cars.length : 0; }
}

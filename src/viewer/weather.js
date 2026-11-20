// Bitropolis — météo : pluie (traits qui tombent autour de la vue) et orage (pluie drue, éclairs).
// Ce module ne dessine que la pluie et la foudre ; le ciel couvert, la lumière et le sol mouillé sont réglés par le
// moteur de rendu d'après `amount` (0 : ciel clair … 1 : orage) et `flash` (0 … 1 pendant un éclair).
const WX_DROPS = 7000;

export class FxWeather {
  constructor(scene) {
    this.kind = 'clear';
    this.target = 0;   // intensité visée
    this.amount = 0;   // intensité actuelle (elle rejoint la cible en quelques secondes)
    this.flash = 0;
    this._boltT = -1;  // temps écoulé depuis le dernier éclair (-1 : aucun en cours)
    this._next = 3;    // secondes avant le prochain
    this._rnd = (() => { let s = 12345; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();

    // pluie : un trait par goutte ; x, z dans [-1, 1], hauteur dans [0, 1], vitesse propre
    const seed = this.seed = new Float32Array(WX_DROPS * 4);
    for (let i = 0; i < WX_DROPS; i++) { seed[i * 4] = this._rnd() * 2 - 1; seed[i * 4 + 1] = this._rnd() * 2 - 1; seed[i * 4 + 2] = this._rnd(); seed[i * 4 + 3] = 0.8 + this._rnd() * 0.5; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(WX_DROPS * 6), 3).setUsage(THREE.DynamicDrawUsage));
    this.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#cfe0f5', transparent: true, opacity: 0, depthWrite: false }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.rain.renderOrder = 6;

    // foudre : un ruban en croix (visible de tous les côtés), très lumineux
    const bgeo = new THREE.BufferGeometry();
    bgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 2 * 6 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const bmat = new THREE.MeshBasicMaterial({ fog: false, side: THREE.DoubleSide, transparent: true });
    bmat.color.setRGB(3.2, 3.3, 4.2);
    this.bolt = new THREE.Mesh(bgeo, bmat);
    this.bolt.frustumCulled = false;
    this.bolt.visible = false;

    this.group = new THREE.Group();
    this.group.add(this.rain, this.bolt);
    scene.add(this.group);
  }

  set(kind) {
    this.kind = kind === 'rain' || kind === 'storm' ? kind : 'clear';
    this.target = this.kind === 'clear' ? 0 : this.kind === 'rain' ? 0.65 : 1;
    if (this.kind === 'storm') this._next = Math.min(this._next, 2.5);
  }

  // Avance la météo. target : point regardé ; radius : distance de vue ; groundY : niveau du sol.
  // Renvoie true si la lumière doit être recalculée (l'intensité change ou un éclair est en cours).
  update(dt, target, radius, groundY) {
    const before = this.amount, flashBefore = this.flash;
    this.amount += Math.sign(this.target - this.amount) * Math.min(Math.abs(this.target - this.amount), dt * 0.28);
    const half = Math.min(220, Math.max(18, radius * 0.85)), top = Math.min(170, Math.max(22, radius * 0.7));

    // pluie
    const a = this.amount;
    this.rain.visible = a > 0.01;
    if (this.rain.visible) {
      const P = this.rain.geometry.getAttribute('position'), p = P.array, s = this.seed, n = Math.floor(WX_DROPS * Math.min(1, a * 1.1));
      const len = top * (0.022 + 0.022 * a), lean = 0.22 + 0.25 * Math.max(0, a - 0.65) / 0.35; // l'orage couche la pluie
      for (let i = 0; i < n; i++) {
        let h = s[i * 4 + 2] - dt * s[i * 4 + 3] * (0.9 + 0.5 * a);
        if (h < 0) h += 1;
        s[i * 4 + 2] = h;
        const y = groundY + h * top, x = target.x + s[i * 4] * half + (1 - h) * top * lean, z = target.z + s[i * 4 + 1] * half;
        const o = i * 6;
        p[o] = x; p[o + 1] = y; p[o + 2] = z;
        p[o + 3] = x - len * lean; p[o + 4] = y + len; p[o + 5] = z;
      }
      this.rain.geometry.setDrawRange(0, n * 2);
      P.needsUpdate = true;
      this.rain.material.opacity = 0.16 + 0.3 * a;
    }

    // éclairs (orage installé seulement)
    if (this.kind === 'storm' && a > 0.8 && this._boltT < 0) {
      this._next -= dt;
      if (this._next <= 0) { this._strike(target, half, top, groundY, radius); this._boltT = 0; this._next = 3.5 + this._rnd() * 9; }
    }
    if (this._boltT >= 0) {
      const t = (this._boltT += dt);
      // deux éclats rapprochés puis une lueur qui s'éteint
      this.flash = t < 0.07 ? 1 : t < 0.13 ? 0.2 : t < 0.2 ? 0.85 : Math.max(0, 0.6 * Math.exp(-(t - 0.2) * 7));
      this.bolt.visible = t < 0.2 && !(t >= 0.07 && t < 0.13);
      if (t > 1) { this._boltT = -1; this.flash = 0; this.bolt.visible = false; }
    }
    return this.amount !== before || this.flash !== flashBefore;
  }

  // construit un éclair : une ligne brisée du ciel au sol, avec deux branches
  _strike(target, half, top, groundY, radius) {
    const r = this._rnd, p = this.bolt.geometry.getAttribute('position'), a = p.array, w = Math.max(0.1, radius * 0.0032);
    let k = 0;
    const seg = (x0, y0, z0, x1, y1, z1, ww) => {
      for (const [dx, dz] of [[ww, 0], [0, ww]]) {
        a.set([x0 - dx, y0, z0 - dz, x0 + dx, y0, z0 + dz, x1 + dx, y1, z1 + dz, x0 - dx, y0, z0 - dz, x1 + dx, y1, z1 + dz, x1 - dx, y1, z1 - dz], k);
        k += 18;
      }
    };
    const path = (x, y, z, yEnd, n, jit, ww) => {
      const pts = [[x, y, z]];
      for (let i = 1; i <= n; i++) pts.push([x += (r() - 0.5) * jit, y + (yEnd - y) * (i / n), z += (r() - 0.5) * jit]);
      for (let i = 0; i < n; i++) seg(...pts[i], ...pts[i + 1], ww);
      return pts;
    };
    const x = target.x + (r() * 2 - 1) * half * 0.8, z = target.z + (r() * 2 - 1) * half * 0.8, y = groundY + top * 0.98;
    const main = path(x, y, z, groundY, 14, top * 0.09, w);
    for (const at of [4, 8]) { const [bx, by, bz] = main[at]; path(bx, by, bz, by - top * (0.18 + r() * 0.15), 5, top * 0.11, w * 0.55); }
    this.bolt.geometry.setDrawRange(0, k / 3);
    p.needsUpdate = true;
  }
}

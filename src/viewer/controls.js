// Caméra orbitale maison (souris, molette, tactile, clavier) avec amortissement.
export class CityControls {
  constructor(camera, dom) {
    this.camera = camera; this.dom = dom;
    this.target = new THREE.Vector3();
    this.theta = Math.PI * 0.25; this.phi = 0.95; this.radius = 120;
    this.goal = { target: new THREE.Vector3(), theta: this.theta, phi: this.phi, radius: this.radius };
    this.minRadius = 6; this.maxRadius = 900; this.minPhi = 0.12; this.maxPhi = 1.42;
    this.autoRotate = false;
    this.keys = new Set();
    this.pointers = new Map();
    this.moved = 0;
    this._bind();
  }
  _bind() {
    const d = this.dom;
    d.addEventListener('contextmenu', (e) => e.preventDefault());
    d.addEventListener('pointerdown', (e) => {
      d.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button, shift: e.shiftKey });
      this.moved = 0;
      this.autoRotate = false;
    });
    d.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      this.moved += Math.abs(dx) + Math.abs(dy);
      if (this.pointers.size === 1) {
        if (p.button === 2 || p.button === 1 || p.shift) this.pan(dx, dy);
        else { this.goal.theta -= dx * 0.0055; this.goal.phi = Math.min(this.maxPhi, Math.max(this.minPhi, this.goal.phi - dy * 0.0045)); }
      } else if (this.pointers.size === 2) {
        const pts = [...this.pointers.values()];
        const other = pts.find((q) => q !== p);
        const before = Math.hypot(p.x - other.x, p.y - other.y);
        const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        if (before > 0) this.zoom(before / after);
        this.pan(dx / 2, dy / 2);
      }
      p.x = e.clientX; p.y = e.clientY;
    });
    const up = (e) => { this.pointers.delete(e.pointerId); };
    d.addEventListener('pointerup', up);
    d.addEventListener('pointercancel', up);
    d.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(Math.exp(e.deltaY * 0.0012)); this.autoRotate = false; }, { passive: false });
    window.addEventListener('keydown', (e) => { if (e.target.tagName !== 'INPUT') this.keys.add(e.key.toLowerCase()); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }
  zoom(k) { this.goal.radius = Math.min(this.maxRadius, Math.max(this.minRadius, this.goal.radius * k)); }
  pan(dx, dy) {
    const s = this.goal.radius * 0.0016;
    const c = Math.cos(this.theta), sn = Math.sin(this.theta);
    this.goal.target.x += (-c * dx - sn * dy) * s;
    this.goal.target.z += (sn * dx - c * dy) * s;
    this.clampTarget();
  }
  clampTarget() {
    const L = this.bounds || 500;
    this.goal.target.x = Math.max(-L, Math.min(L, this.goal.target.x));
    this.goal.target.z = Math.max(-L, Math.min(L, this.goal.target.z));
  }
  flyTo(x, y, z, radius, phi) {
    this.goal.target.set(x, y, z);
    if (radius) this.goal.radius = radius;
    if (phi) this.goal.phi = phi;
  }
  update(dt) {
    const k = this.keys;
    if (k.size) {
      const sp = 26;
      let mx = 0, my = 0;
      if (k.has('arrowleft') || k.has('q') || k.has('a')) mx += sp;
      if (k.has('arrowright') || k.has('d')) mx -= sp;
      if (k.has('arrowup') || k.has('z') || k.has('w')) my += sp;
      if (k.has('arrowdown') || k.has('s')) my -= sp;
      if (mx || my) this.pan(mx * dt * 60 / 10, my * dt * 60 / 10);
      if (k.has('+') || k.has('=')) this.zoom(1 - dt * 1.5);
      if (k.has('-')) this.zoom(1 + dt * 1.5);
    }
    if (this.autoRotate) this.goal.theta += dt * 0.06;
    const a = 1 - Math.pow(0.0009, dt);
    this.theta += (this.goal.theta - this.theta) * a;
    this.phi += (this.goal.phi - this.phi) * a;
    this.radius += (this.goal.radius - this.radius) * a;
    this.target.lerp(this.goal.target, a);
    const r = this.radius;
    this.camera.position.set(
      this.target.x + r * Math.sin(this.phi) * Math.sin(this.theta),
      this.target.y + r * Math.cos(this.phi),
      this.target.z + r * Math.sin(this.phi) * Math.cos(this.theta)
    );
    this.camera.lookAt(this.target);
  }
}

// Bitropolis — moteur de rendu : transforme le plan de ville + un thème en scène 3D.
import { layoutCity } from '../core/layout.js';
import { makeRng, hashString } from '../core/rules.js';
import { getTheme } from './themes/index.js';
import { CityControls } from './controls.js';
import { buildLandscape, hasLandscapeAssets } from './landscape.js';
import { layoutGrid, CELL } from '../core/grid.js';
import { VEHICLES } from '../core/catalog.js';
import { packReady } from './assets.js';
import { buildPackCity, buildPackVehicles, makePackMaterial, CITY_Y } from './citypack.js';
import { TrafficSim } from './traffic.js';

const BASE_Y = 0.32; // hauteur des parcelles (trottoir + dalle)

function rdPrismGeometry() {
  const a = [-.5, 0, -.5], b = [.5, 0, -.5], c = [.5, 1, 0], d = [-.5, 1, 0];
  const e = [.5, 0, .5], f = [-.5, 0, .5], g = [-.5, 1, 0], h = [.5, 1, 0];
  const tris = [
    [.5, 0, -.5], [.5, 1, 0], [.5, 0, .5],
    [-.5, 0, -.5], [-.5, 0, .5], [-.5, 1, 0],
    a, c, b, a, d, c,
    e, g, f, e, h, g,
    [-.5, 0, -.5], [.5, 0, -.5], [.5, 0, .5], [-.5, 0, -.5], [.5, 0, .5], [-.5, 0, .5]
  ];
  return new Float32Array(tris.flat());
}

function rdGeoLib() {
  const prep = (g) => (g.index ? g.toNonIndexed() : g).attributes.position.array;
  return {
    box: prep(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)),
    cyl: prep(new THREE.CylinderGeometry(0.5, 0.5, 1, 12).translate(0, 0.5, 0)),
    cyl6: prep(new THREE.CylinderGeometry(0.5, 0.5, 1, 6).translate(0, 0.5, 0)),
    cone: prep(new THREE.ConeGeometry(0.5, 1, 7).translate(0, 0.5, 0)),
    cone4: prep(new THREE.ConeGeometry(0.5 * Math.SQRT2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0)),
    ico: prep(new THREE.IcosahedronGeometry(0.5, 0).translate(0, 0.5, 0)),
    dome: prep(new THREE.SphereGeometry(0.5, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 2, 1)),
    tcyl: prep(new THREE.CylinderGeometry(0.34, 0.5, 1, 14).translate(0, 0.5, 0)),
    prism: rdPrismGeometry()
  };
}

// Fusionne des milliers de pièces en un seul maillage par matériau (rapide à afficher).
class Batcher {
  constructor(lib) {
    this.lib = lib;
    this.layers = [this._layer(), this._layer()];
    this.colorCache = new Map();
    this.box = null;
    this.rng = makeRng(7);
  }
  _layer() { return { pos: new Float32Array(1 << 16), col: new Float32Array(1 << 16), lit: new Float32Array(1 << 14), n: 0 }; }
  _grow(L, extra) {
    if ((L.n + extra) * 3 <= L.pos.length) return;
    let size = L.pos.length * 2;
    while (size < (L.n + extra) * 3) size *= 2;
    const p = new Float32Array(size); p.set(L.pos); L.pos = p;
    const c = new Float32Array(size); c.set(L.col); L.col = c;
    const l = new Float32Array(size / 3); l.set(L.lit); L.lit = l;
  }
  _color(hex) {
    let c = this.colorCache.get(hex);
    if (!c) { c = new THREE.Color(hex); this.colorCache.set(hex, c); }
    return c;
  }
  begin() { this.box = new THREE.Box3(); }
  end() { const b = this.box; this.box = null; return b; }
  // part = [forme, x, y, z, sx, sy, sz, couleur, ry, matériau]; repère : (ox, oy, oz) + rotation `face`
  add(part, ox = 0, oy = 0, oz = 0, face = 0) {
    const [g, x, y, z, sx, sy, sz, color, ry, mat] = part;
    const src = this.lib[g] || this.lib.box;
    const L = this.layers[mat ? 1 : 0];
    const nv = src.length / 3;
    this._grow(L, nv);
    const cf = Math.cos(face), sf = Math.sin(face);
    const px = ox + x * cf + z * sf, pz = oz - x * sf + z * cf, py = oy + y;
    const a = (ry || 0) + face, ca = Math.cos(a), sa = Math.sin(a);
    const col = this._color(color);
    const lit = mat ? (this.rng() < 0.72 ? 1 : 0.08) : 0;
    let o = L.n * 3;
    const bx = this.box;
    for (let i = 0; i < src.length; i += 3) {
      const lx = src[i] * sx, ly = src[i + 1] * sy, lz = src[i + 2] * sz;
      const wx = px + lx * ca + lz * sa, wy = py + ly, wz = pz - lx * sa + lz * ca;
      L.pos[o] = wx; L.pos[o + 1] = wy; L.pos[o + 2] = wz;
      L.col[o] = col.r; L.col[o + 1] = col.g; L.col[o + 2] = col.b;
      L.lit[o / 3] = lit;
      o += 3;
      if (bx) {
        if (wx < bx.min.x) bx.min.x = wx; if (wx > bx.max.x) bx.max.x = wx;
        if (wy < bx.min.y) bx.min.y = wy; if (wy > bx.max.y) bx.max.y = wy;
        if (wz < bx.min.z) bx.min.z = wz; if (wz > bx.max.z) bx.max.z = wz;
      }
    }
    L.n += nv;
  }
  build(materials) {
    const meshes = [];
    this.layers.forEach((L, i) => {
      if (!L.n) return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(L.pos.slice(0, L.n * 3), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(L.col.slice(0, L.n * 3), 3));
      geo.setAttribute('aLit', new THREE.BufferAttribute(L.lit.slice(0, L.n), 1));
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, materials[i]);
      mesh.castShadow = true; mesh.receiveShadow = true;
      meshes.push(mesh);
    });
    return meshes;
  }
}

function rdNoise(seed) {
  const r = makeRng(seed);
  const waves = Array.from({ length: 6 }, (_, i) => ({ fx: (r() - 0.5) * 0.06 * (i + 1), fz: (r() - 0.5) * 0.06 * (i + 1), p: r() * 6.28, a: 1 / (i + 1) }));
  return (x, z) => waves.reduce((s, w) => s + Math.sin(x * w.fx + z * w.fz + w.p) * w.a, 0);
}

export class CityRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.5, 4000);
    this.controls = new CityControls(this.camera, canvas);
    this.clock = new THREE.Clock();
    this.glow = { value: 0 };
    this.timeU = { value: 0 }; // horloge des lumières (fenêtres qui s'allument / s'éteignent)
    this.night = false;
    this.nightMix = 0;
    this.state = { traffic: true, deps: false, labels: true };
    this.raycaster = new THREE.Raycaster();
    this.lib = rdGeoLib();

    this.hemi = new THREE.HemisphereLight('#e6f4ff', '#6f8f5a', 1.0);
    this.sun = new THREE.DirectionalLight('#fff1d6', 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.ambient = new THREE.AmbientLight('#ffffff', 0.25);
    this.scene.add(this.hemi, this.sun, this.sun.target, this.ambient);

    this.city = null;
    this.root = null;
    this._resize = this._resize.bind(this);
    window.addEventListener('resize', this._resize);
    this._resize();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _materials() {
    const solid = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.88, metalness: 0 });
    const glow = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.35, metalness: 0.15 });
    const uGlow = this.glow;
    glow.onBeforeCompile = (sh) => {
      sh.uniforms.uGlow = uGlow;
      sh.vertexShader = 'attribute float aLit;\nvarying float vLit;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLit = aLit;');
      sh.fragmentShader = 'uniform float uGlow;\nvarying float vLit;\n' + sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += mix(vec3(1.0, 0.68, 0.32), vColor.rgb, 0.22) * uGlow * vLit * 1.5;');
    };
    return [solid, glow];
  }

  clear() {
    if (!this.root) return;
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    this.root = null;
    this.land = null;
    this.growAnims = [];
    this.growLabels = null;
    this.fx = null;
    this.animParts = [];
    this.traffic = null;
  }

  load(analysis, themeId = 'lowpoly') {
    this.clear();
    this.analysis = analysis;
    this.theme = getTheme(themeId);
    const t0 = performance.now();
    const usePack = !!(this.theme.pack && packReady('city'));
    this.usePack = usePack;
    const city = usePack ? layoutGrid(analysis) : layoutCity(analysis);
    this.city = city;
    const theme = this.theme;
    const files = analysis.files;
    const root = new THREE.Group();
    this.root = root;
    const B = new Batcher(this.lib);
    const half = city.size / 2, outer = half + city.ring;

    const withLand = hasLandscapeAssets();
    // relief simple (utilisé seulement sans le kit de campagne)
    const noise = rdNoise(analysis.name);
    this.terrainH = (x, z) => {
      const dx = Math.max(0, Math.abs(x) - outer - 3), dz = Math.max(0, Math.abs(z) - outer - 3);
      const d = Math.hypot(dx, dz);
      if (d <= 0) return 0;
      const ramp = Math.min(1, d / 30);
      return ramp * (1.2 + noise(x, z) * 1.6) + Math.max(0, d - 40) * 0.12 * (1.3 + noise(z, x));
    };
    const materials = this._materials();
    this._solid = materials[0];
    this.buildings = new Array(files.length);
    if (usePack) {
      // --- Ville du pack : sol, routes N1→N8, bâtiments à stades, arbres, monuments
      this._packMat = makePackMaterial(this.glow, this.timeU);
      const pc = buildPackCity(city, analysis, this._packMat, makeRng('pack:' + analysis.name));
      root.add(pc.group);
      this.buildings = pc.buildings;
      this.roundabouts = pc.monuments;
      this.packMeshes = pc.meshes;
      this.roadRefs = pc.roadRefs;
      this._buildFx(pc.parts, pc.fx, root);
    } else {
      // --- Sol : bitume de la ville (les espaces libres deviennent des routes)
      B.add(['box', 0, -0.3, 0, outer * 2, 0.3, outer * 2, theme.ground.asphalt, 0, 0]);
      // trottoir extérieur
      B.add(['box', 0, -0.36, 0, outer * 2 + 1.6, 0.34, outer * 2 + 1.6, theme.ground.curb, 0, 0]);

      // --- Îlots et parcelles
      const tint = (d) => (d < 0 ? theme.centerTint : theme.districtTints[d % theme.districtTints.length]);
      for (const b of city.blocks) {
        B.add(['box', b.x + b.w / 2, 0, b.z + b.d / 2, b.w, 0.22, b.d, theme.ground.sidewalk, 0, 0]);
        B.add(['box', b.x + b.w / 2, 0.22, b.z + b.d / 2, Math.max(0.1, b.w - 0.7), 0.06, Math.max(0.1, b.d - 0.7), b.park ? theme.ground.park : tint(b.district), 0, 0]);
      }

      // --- Bâtiments
      for (const f of files) {
        const lot = city.lots[f.id];
        if (!lot) continue;
        const rng = makeRng(hashString(f.path));
        const face = [0, Math.PI / 2, Math.PI, -Math.PI / 2][lot.facing];
        // dalle de parcelle
        if (f.kind !== 'park') B.add(['box', lot.x, 0.28, lot.z, lot.size * 0.9, 0.04, lot.size * 0.9, '#cfc8b8', 0, 0]);
        B.begin();
        for (const p of theme.building(f, lot, rng)) B.add(p, lot.x, BASE_Y, lot.z, face);
        const box = B.end();
        if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(lot.x, 1, lot.z), new THREE.Vector3(1, 1, 1));
        box.min.y = 0;
        this.buildings[f.id] = { id: f.id, box, lot };
      }

      // --- Arbres
      const trng = makeRng('trees' + analysis.name);
      for (const t of city.trees) {
        if (withLand && t.wild) continue; // la campagne procédurale s'en charge
        const y = t.wild ? this.terrainH(t.x, t.z) - 0.1 : 0.28;
        for (const p of theme.tree(trng, t.x, t.z, t.s)) B.add(p, 0, y, 0, 0);
      }

      // --- Rond-points
      this.roundabouts = city.roundabouts.map((rb, i) => {
        B.begin();
        for (const p of theme.roundabout(rb, makeRng(i + 99))) B.add(p, 0, 0, 0, 0);
        const box = B.end();
        return { ...rb, box };
      });

      // --- Marquages au sol
      const nearRb = (x, z) => city.roundabouts.some((r) => Math.hypot(r.x - x, r.z - z) < r.radius + 0.4);
      for (const r of city.roads) {
        const len = Math.hypot(r.x2 - r.x1, r.z2 - r.z1);
        if (len < 2) continue;
        const ux = (r.x2 - r.x1) / len, uz = (r.z2 - r.z1) / len;
        const ry = Math.atan2(ux, uz);
        const skip = r.ring ? r.w / 2 : Math.max(...(r.ends || [0])) / 2 + 0.3;
        for (let s = skip + 0.8; s < len - skip - 0.8; s += 3) {
          const x = r.x1 + ux * s, z = r.z1 + uz * s;
          if (nearRb(x, z)) continue;
          B.add(['box', x, 0.0, z, 0.16, 0.02, 1.3, theme.ground.marking, ry, 0]);
        }
      }
      const meshes = B.build(materials);
      meshes.forEach((m) => root.add(m));
    }

    // --- Campagne procédurale (tuiles du kit Asset/) ou, à défaut, terrain low poly simple
    let T = city.size * 1.6 + 260;
    this.landHalf = 0;
    if (withLand) {
      this.landSeed = this.landSeed && this.landSeedFor === analysis.name ? this.landSeed : analysis.name;
      this.landSeedFor = analysis.name;
      this._buildLand();
      T = this.landHalf * 2;
    } else {
      const tg = new THREE.PlaneGeometry(T, T, 90, 90).rotateX(-Math.PI / 2).toNonIndexed();
      const pos = tg.attributes.position;
      const tcol = new Float32Array(pos.count * 3);
      const grassA = new THREE.Color(theme.ground.grass), grassB = new THREE.Color(theme.ground.grass).offsetHSL(0.02, 0.05, -0.08), rock = new THREE.Color('#9aa38f');
      const tmp = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        const h = this.terrainH(x, z) - 0.35;
        pos.setY(i, h);
        tmp.copy(grassA).lerp(grassB, (noise(x * 2, z * 2) + 1.5) / 3);
        if (h > 9) tmp.lerp(rock, Math.min(1, (h - 9) / 10));
        tcol[i * 3] = tmp.r; tcol[i * 3 + 1] = tmp.g; tcol[i * 3 + 2] = tmp.b;
      }
      tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
      tg.computeVertexNormals();
      const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
      terrain.receiveShadow = true;
      root.add(terrain);
    }

    // --- Nuages
    this.clouds = new THREE.Group();
    const crng = makeRng('clouds');
    const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1, transparent: true, opacity: 0.92 });
    const ico = new THREE.IcosahedronGeometry(1, 0);
    const nClouds = Math.round(8 + city.size / 25);
    for (let i = 0; i < nClouds; i++) {
      const c = new THREE.Group();
      const n = 3 + Math.floor(crng() * 4);
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(ico, cloudMat);
        const s = 2 + crng() * 3;
        m.scale.set(s * 1.3, s * 0.8, s);
        m.position.set(k * 2.6 - n * 1.3, crng() * 1.5, (crng() - 0.5) * 3);
        c.add(m);
      }
      c.position.set((crng() - 0.5) * T * 0.7, 38 + crng() * 25, (crng() - 0.5) * T * 0.7);
      c.userData.speed = 1 + crng() * 2;
      this.clouds.add(c);
    }
    this.cloudSpan = T * 0.7;
    root.add(this.clouds);

    // --- Voitures
    this._buildCars(city, root);
    // --- Étiquettes de quartiers
    this._buildLabels(city, root);
    // --- Surbrillance
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
    this.hoverBox = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.95, depthTest: false }));
    this.selectBox = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: '#2ec4ff', depthTest: false }));
    this.hoverBox.visible = this.selectBox.visible = false;
    this.hoverBox.renderOrder = this.selectBox.renderOrder = 10;
    root.add(this.hoverBox, this.selectBox);
    this.depGroup = new THREE.Group();
    this.selGroup = new THREE.Group();
    root.add(this.depGroup, this.selGroup);
    this.depBuilt = false;
    this.pulses = [];

    this.scene.add(root);

    // --- Lumière & caméra adaptées à la taille de la ville
    const S = Math.max(outer + 12, this.landHalf + 4);
    const sh = this.sun.shadow.camera;
    sh.left = -S; sh.right = S; sh.top = S; sh.bottom = -S; sh.near = 1; sh.far = S * 5;
    sh.updateProjectionMatrix();
    const shadowRes = S > 60 ? 4096 : 2048;
    this.sun.shadow.mapSize.set(shadowRes, shadowRes);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.sun.position.set(S * 0.8, S * 1.6, S * 0.55);
    this.controls.bounds = Math.max(outer + 40, this.landHalf);
    this.controls.maxRadius = Math.max(260, outer * 4.5, this.landHalf * 3.2);
    this.home = { radius: Math.max(50, outer * 2.3), phi: 0.92 };
    this.controls.flyTo(0, 0, 0, this.home.radius, this.home.phi);
    this.controls.radius = this.home.radius * 1.8;
    this.controls.theta = this.controls.goal.theta - 0.9;
    this.controls.autoRotate = true;
    const fogNear = Math.max(outer * 2.2, this.landHalf * 1.5);
    this.scene.fog = new THREE.Fog(theme.sky.fogDay, fogNear, fogNear + T * (this.landHalf ? 1.6 : 0.55));
    this._applyNight(true);
    this.buildMs = Math.round(performance.now() - t0);
    return city;
  }

  // Campagne : reconstruite seule quand on change de graine (bouton 🎲)
  _buildLand() {
    if (this.land) {
      this.root.remove(this.land);
      this.land.traverse((o) => { if (o.isInstancedMesh) o.dispose(); else if (o.isMesh) o.geometry.dispose(); });
    }
    const outer = this.city.size / 2 + this.city.ring;
    const { group, plan } = buildLandscape({ seed: this.landSeed, cityHalf: outer + 0.8, material: this._solid });
    this.land = group;
    this.landPlan = plan;
    this.landHalf = plan.half;
    this.root.add(group);
  }

  // Évolution depuis la dernière visite : les bâtiments qui ont grandi (ou qui sont nouveaux) sortent de terre,
  // avec une étiquette « Résidence N3 → N4 » qui flotte au-dessus quelques secondes.
  animateGrowth(events) {
    this.growAnims = [];
    if (this.growLabels) { this.root.remove(this.growLabels); this.growLabels.traverse((o) => { if (o.material) { o.material.map?.dispose(); o.material.dispose(); } }); }
    this.growLabels = new THREE.Group();
    this.root.add(this.growLabels);
    if (!this.usePack) return;
    let labels = 0;
    events.forEach((ev, n) => {
      const b = this.buildings[ev.id];
      if (!b || !b.ref) return;
      const mesh = this.packMeshes.get(b.ref.model);
      if (!mesh) return;
      const delay = 0.9 + Math.min(2.5, n * 0.06);
      const anim = { b, mesh, index: b.ref.index, x: b.lot.x, z: b.lot.z, ry: b.ry, t: -delay, from: ev.type === 'new' ? 0.02 : 0.35 };
      this.growAnims.push(anim);
      this._growApply(anim, 0);
      if (labels++ < 30) {
        const sp = this._label(ev.label, null, ev.type === 'new' ? '#06d6a0' : '#ffb84d');
        const size = 4.2;
        sp.scale.set(size * sp.userData.aspect * 0.5, size * 0.5, 1);
        sp.position.set(b.lot.x, b.box.max.y + 2.2, b.lot.z);
        sp.userData.life = 8 + delay;
        sp.userData.y0 = sp.position.y;
        sp.material.opacity = 0;
        this.growLabels.add(sp);
      }
    });
  }

  // --- Pièces mobiles (rotors, cheminées, cube) et effets (fumée, balises, fontaines) du pack
  _buildFx(parts, emitters, root) {
    this.animParts = parts;
    this.fxTime = 0;
    const mk = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.count = n; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(m); return m; };
    const smoke = emitters.filter((e) => e.type === 'Smoke'), beacons = emitters.filter((e) => e.type === 'Beacon'), fountains = emitters.filter((e) => e.type === 'Fountain');
    const PUFFS = 7, DROPS = 14;
    this.fx = {
      smoke, beacons, fountains, PUFFS, DROPS,
      smokeMesh: mk(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#e9ecef', flatShading: true, roughness: 1, transparent: true, opacity: 0.82, depthWrite: false }), smoke.length * PUFFS),
      beaconMesh: mk(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3b30' }), beacons.length),
      dropMesh: mk(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#bfe9ff', emissive: '#4aa8d8', emissiveIntensity: 0.35, flatShading: true, roughness: 0.2 }), fountains.length * DROPS)
    };
    this.fx.smokeMesh.castShadow = false;
    this._fxV = new THREE.Vector3();
    this._fxM = new THREE.Matrix4();
    this._fxL = new THREE.Matrix4();
    this._fxD = new THREE.Object3D();
  }

  _updateFx(dt) {
    if (!this.fx) return;
    const t = (this.fxTime += dt), M = this._fxM, L = this._fxL, d = this._fxD, v = this._fxV;
    // pièces mobiles : placement du bâtiment × pivot × mouvement
    const touched = new Set();
    for (const pt of this.animParts) {
      const ph = pt.phase;
      if (pt.kind === 'Rotor') L.makeRotationZ(t * 2.4 + ph);
      else if (pt.kind === 'Chimney') L.makeScale(1, 1 + 0.06 * Math.sin(t * 2.1 + ph), 1);
      else if (pt.kind === 'Cube') L.makeRotationY(t * 0.9 + ph).setPosition(0, 0.035 * Math.sin(t * 1.6 + ph), 0);
      else continue;
      M.copy(pt.owner.matrix).multiply(pt.pivot).multiply(L);
      pt.mesh.setMatrixAt(pt.ref.index, M);
      touched.add(pt.mesh);
    }
    for (const m of touched) m.instanceMatrix.needsUpdate = true;
    const F = this.fx;
    // fumée : bouffées low poly qui montent, dérivent avec le vent et se dissipent
    F.smoke.forEach((e, i) => {
      v.copy(e.p).applyMatrix4(e.owner.matrix);
      const big = e.big ? 1.8 : 1;
      for (let k = 0; k < F.PUFFS; k++) {
        const u = (t * 0.22 + k / F.PUFFS + e.phase) % 1;
        const s = (0.55 + u * 1.7) * Math.min(1, u * 6) * Math.pow(1 - u, 0.7) * big;
        d.position.set(v.x + u * 3.2 * big, v.y + 0.3 + u * 7.5 * big, v.z + u * 1.2 * big);
        d.rotation.set(u * 2 + k, u * 3 + e.phase * 6, 0);
        d.scale.set(s, s * 0.85, s);
        d.updateMatrix();
        F.smokeMesh.setMatrixAt(i * F.PUFFS + k, d.matrix);
      }
    });
    if (F.smoke.length) F.smokeMesh.instanceMatrix.needsUpdate = true;
    // balises rouges des éoliennes : clignotent
    F.beacons.forEach((e, i) => {
      v.copy(e.p).applyMatrix4(e.owner.matrix);
      const on = (t + e.phase * 1.6) % 1.6 < 0.45;
      d.position.copy(v); d.rotation.set(0, 0, 0); d.scale.setScalar(on ? 0.13 : 0.0001); d.updateMatrix();
      F.beaconMesh.setMatrixAt(i, d.matrix);
    });
    if (F.beacons.length) F.beaconMesh.instanceMatrix.needsUpdate = true;
    // fontaines : gouttes en gerbe parabolique
    F.fountains.forEach((e, i) => {
      v.copy(e.p).applyMatrix4(e.owner.matrix);
      for (let k = 0; k < F.DROPS; k++) {
        const u = (t * 0.85 + k / F.DROPS + e.phase) % 1, a = k * 2.399 + e.phase * 6;
        const r = u * 0.55;
        d.position.set(v.x + Math.cos(a) * r, v.y + 1.5 * 4 * u * (1 - u), v.z + Math.sin(a) * r);
        d.rotation.set(0, 0, 0); d.scale.setScalar(0.07 * (1 - u * 0.4)); d.updateMatrix();
        F.dropMesh.setMatrixAt(i * F.DROPS + k, d.matrix);
      }
    });
    if (F.fountains.length) F.dropMesh.instanceMatrix.needsUpdate = true;
  }

  _growApply(a, k) {
    const d = this._growDummy || (this._growDummy = new THREE.Object3D());
    const back = 1.70158, e = k <= 0 ? 0 : k >= 1 ? 1 : 1 + (back + 1) * Math.pow(k - 1, 3) + back * Math.pow(k - 1, 2);
    const sy = a.from + (1 - a.from) * e;
    d.position.set(a.x, CITY_Y, a.z); d.rotation.set(0, a.ry, 0); d.scale.set(CELL, CELL * Math.max(0.01, sy), CELL); d.updateMatrix();
    a.mesh.setMatrixAt(a.index, d.matrix);
    a.mesh.instanceMatrix.needsUpdate = true;
    if (a.b && a.b.matrix) a.b.matrix.copy(d.matrix); // les pièces mobiles et la fumée suivent la croissance
  }

  _updateGrowth(dt) {
    if (this.growAnims && this.growAnims.length) {
      for (const a of this.growAnims) { a.t += dt; this._growApply(a, a.t / 1.1); }
      this.growAnims = this.growAnims.filter((a) => a.t < 1.2);
    }
    if (this.growLabels && this.growLabels.children.length) {
      for (const sp of [...this.growLabels.children]) {
        const u = sp.userData;
        u.life -= dt;
        const age = 8 - u.life;
        sp.material.opacity = Math.max(0, Math.min(1, age * 2, u.life / 1.5));
        sp.position.y = u.y0 + Math.max(0, age) * 0.25;
        if (u.life <= 0) { this.growLabels.remove(sp); sp.material.map?.dispose(); sp.material.dispose(); }
      }
    }
  }

  setLandSeed(seed) {
    if (!this.city || !hasLandscapeAssets()) return null;
    this.landSeed = seed;
    this._buildLand();
    return this.landPlan;
  }

  _buildCars(city, root) {
    this.traffic = null;
    if (this.usePack) {
      // ville du pack : vraie circulation (voies, distances, feux, priorité à droite)
      this.traffic = new TrafficSim({
        city, cell: CELL, cityY: CITY_Y, rng: makeRng('traffic:' + this.analysis.name), models: VEHICLES, roadRefs: this.roadRefs,
        buildMeshes: (names, counts) => buildPackVehicles(names, counts, this._packMat)
      });
      this.cars = this.traffic.cars;
      this.carMeshes = [...this.traffic.meshes.values()];
      for (const m of this.carMeshes) root.add(m);
      return;
    }
    const geoBody = new THREE.BoxGeometry(0.85, 0.45, 1.6).translate(0, 0.38, 0).toNonIndexed();
    const geoCab = new THREE.BoxGeometry(0.72, 0.36, 0.85).translate(0, 0.78, -0.08).toNonIndexed();
    const merge = (geos, colors) => {
      const total = geos.reduce((s, g) => s + g.attributes.position.count, 0);
      const p = new Float32Array(total * 3), c = new Float32Array(total * 3);
      let o = 0;
      geos.forEach((g, i) => {
        p.set(g.attributes.position.array, o * 3);
        const col = new THREE.Color(colors[i]);
        for (let k = 0; k < g.attributes.position.count; k++) { c[(o + k) * 3] = col.r; c[(o + k) * 3 + 1] = col.g; c[(o + k) * 3 + 2] = col.b; }
        o += g.attributes.position.count;
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
      geo.computeVertexNormals();
      return geo;
    };
    const rng = makeRng('cars');
    const cars = [];
    const rbAt = (x, z) => city.roundabouts.find((r) => Math.hypot(r.x - x, r.z - z) < 0.5);
    for (const r of city.roads) {
      const len = Math.hypot(r.x2 - r.x1, r.z2 - r.z1);
      if (len < 8) continue;
      const busy = r.ring ? 0.5 : Math.min(1, 0.25 + (r.traffic || 0) / 12);
      const n = Math.min(10, Math.round((len / 16) * busy * 2));
      const clip0 = (rbAt(r.x1, r.z1)?.radius || 0) + 0.5, clip1 = (rbAt(r.x2, r.z2)?.radius || 0) + 0.5;
      for (let i = 0; i < n; i++) cars.push({ r, len, lane: i % 2 ? 1 : -1, t: rng(), speed: 5 + rng() * 5, clip0, clip1 });
      if (cars.length > 700) break;
    }
    this._dummy = new THREE.Object3D();
    this.cars = cars;
    if (this.usePack) {
      // véhicules du pack : surtout des voitures, quelques camions, bus et véhicules de service
      const counts = new Map();
      for (const c of cars) {
        const r = rng();
        const list = r < 0.7 ? VEHICLES.car : r < 0.9 ? VEHICLES.truck : VEHICLES.special;
        c.model = list[Math.floor(rng() * list.length)];
        counts.set(c.model, (counts.get(c.model) || 0) + 1);
      }
      const meshes = buildPackVehicles([...counts.keys()], counts, this._packMat);
      const next = new Map();
      for (const c of cars) {
        c.mesh = meshes.get(c.model);
        c.index = next.get(c.model) || 0;
        next.set(c.model, c.index + 1);
      }
      this.carMeshes = [...meshes.values()];
      this.carScale = CELL * 2.2;
      this.carY = CITY_Y + 0.025 * CELL;
      this.laneK = 0.2;
    } else {
      const geo = merge([geoBody, geoCab], ['#ffffff', '#5a6370']);
      const palette = ['#e63946', '#f1c453', '#2a9d8f', '#457b9d', '#f4a261', '#ffffff', '#8e7dbe', '#3d405b', '#06d6a0', '#ef476f'];
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.5 }), Math.max(1, cars.length));
      const col = new THREE.Color();
      cars.forEach((c, i) => { mesh.setColorAt(i, col.set(palette[Math.floor(rng() * palette.length)])); c.mesh = mesh; c.index = i; });
      mesh.count = cars.length;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      this.carMeshes = [mesh];
      this.carScale = 1;
      this.carY = 0;
      this.laneK = 0.24;
    }
    for (const m of this.carMeshes) root.add(m);
  }

  _updateCars(dt) {
    if (this.traffic) {
      this.traffic.setVisible(this.state.traffic);
      if (this.state.traffic) this.traffic.update(dt);
      return;
    }
    if (!this.cars || !this.carMeshes) return;
    for (const m of this.carMeshes) m.visible = this.state.traffic;
    if (!this.state.traffic) return;
    const d = this._dummy;
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i], r = c.r;
      if (!c.mesh) continue;
      const usable = Math.max(1, c.len - c.clip0 - c.clip1);
      c.t = (c.t + (c.speed * dt) / usable) % 1;
      const along = c.lane > 0 ? c.clip0 + c.t * usable : c.len - c.clip1 - c.t * usable;
      const ux = (r.x2 - r.x1) / c.len, uz = (r.z2 - r.z1) / c.len;
      const off = r.w * this.laneK * c.lane;
      d.position.set(r.x1 + ux * along - uz * off * -1, this.carY, r.z1 + uz * along - ux * off);
      d.rotation.set(0, Math.atan2(ux, uz) + (c.lane > 0 ? 0 : Math.PI), 0);
      const edge = Math.min(c.t, 1 - c.t) * usable;
      const s = Math.min(1, edge / 1.5) * this.carScale;
      d.scale.set(s, s, s);
      d.updateMatrix();
      c.mesh.setMatrixAt(c.index, d.matrix);
    }
    for (const m of this.carMeshes) m.instanceMatrix.needsUpdate = true;
  }

  _label(text, sub, color) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const font = '700 54px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.font = font;
    const w = Math.ceil(Math.max(ctx.measureText(text).width, 200)) + 70;
    c.width = w; c.height = sub ? 128 : 96;
    ctx.font = font;
    ctx.fillStyle = 'rgba(16,22,38,0.78)';
    const r = 28;
    ctx.beginPath(); ctx.roundRect(4, 4, w - 8, c.height - 8, r); ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(22, 26, 10, c.height - 52);
    ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 48, sub ? 50 : c.height / 2 + 2);
    if (sub) { ctx.font = '500 28px system-ui, sans-serif'; ctx.fillStyle = '#b8c4dc'; ctx.fillText(sub, 50, 96); }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    const sp = new THREE.Sprite(mat);
    sp.userData.aspect = w / c.height;
    sp.renderOrder = 20;
    return sp;
  }

  _buildLabels(city, root) {
    this.labels = new THREE.Group();
    const theme = this.theme;
    const tops = city.districts.filter((d) => d.depth === 1);
    for (const d of tops) {
      const tint = theme.districtTints[d.district % theme.districtTints.length];
      const sp = this._label(d.name, `${d.count} fichier${d.count > 1 ? 's' : ''}`, tint);
      let maxH = 4;
      for (const f of this.analysis.files) {
        const b = this.buildings[f.id];
        if (b && f.path.startsWith(d.path + '/')) maxH = Math.max(maxH, b.box.max.y);
      }
      const size = Math.min(14, Math.max(4.5, Math.sqrt(d.w * d.d) * 0.22));
      sp.scale.set(size * sp.userData.aspect * 0.5, size * 0.5, 1);
      sp.position.set(d.x + d.w / 2, maxH + 3 + size * 0.3, d.z + d.d / 2);
      this.labels.add(sp);
    }
    root.add(this.labels);
  }

  _buildDeps() {
    if (this.depBuilt) return;
    this.depBuilt = true;
    const files = this.analysis.files;
    const pts = [], cols = [];
    const cA = new THREE.Color('#ff9f1c'), cB = new THREE.Color('#2ec4ff'), tmp = new THREE.Color();
    let count = 0;
    for (const f of files) {
      const a = this.buildings[f.id];
      if (!a) continue;
      for (const t of f.imports) {
        const b = this.buildings[t];
        if (!b || count > 6000) continue;
        count++;
        const curve = this._arc(a, b);
        const P = curve.getPoints(14);
        for (let i = 0; i < P.length - 1; i++) {
          pts.push(P[i].x, P[i].y, P[i].z, P[i + 1].x, P[i + 1].y, P[i + 1].z);
          tmp.copy(cA).lerp(cB, i / 14); cols.push(tmp.r, tmp.g, tmp.b);
          tmp.copy(cA).lerp(cB, (i + 1) / 14); cols.push(tmp.r, tmp.g, tmp.b);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45, depthWrite: false }));
    this.depGroup.add(lines);
  }

  _arc(a, b) {
    const pa = new THREE.Vector3(a.lot.x, a.box.max.y + 0.3, a.lot.z);
    const pb = new THREE.Vector3(b.lot.x, b.box.max.y + 0.3, b.lot.z);
    const dist = pa.distanceTo(pb);
    const mid = pa.clone().add(pb).multiplyScalar(0.5);
    mid.y = Math.max(pa.y, pb.y) + 3 + dist * 0.35;
    return new THREE.QuadraticBezierCurve3(pa, mid, pb);
  }

  setNight(on) { this.night = on; }
  setTraffic(on) { this.state.traffic = on; }
  setLabels(on) { this.state.labels = on; if (this.labels) this.labels.visible = on; }
  setDeps(on) { this.state.deps = on; if (on) this._buildDeps(); if (this.depGroup) this.depGroup.visible = on; }

  _applyNight(force) {
    const target = this.night ? 1 : 0;
    if (!force && Math.abs(this.nightMix - target) < 0.001) return;
    const k = this.nightMix;
    const th = this.theme;
    const sky = new THREE.Color(th.sky.day).lerp(new THREE.Color(th.sky.night), k);
    this.scene.background = sky;
    if (this.scene.fog) this.scene.fog.color.copy(new THREE.Color(th.sky.fogDay).lerp(new THREE.Color(th.sky.fogNight), k));
    this.sun.intensity = 2.4 * (1 - k) + 0.35 * k;
    this.sun.color.set('#fff1d6').lerp(new THREE.Color('#9db4ff'), k);
    this.hemi.intensity = 1.0 * (1 - k) + 0.28 * k;
    this.ambient.intensity = 0.25 * (1 - k) + 0.12 * k;
    this.glow.value = k * 1.0;
    this.renderer.toneMappingExposure = 1.05 - k * 0.1;
  }

  // --- Interaction
  pick(clientX, clientY) {
    if (!this.city) return null;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const ray = this.raycaster.ray;
    const hit = new THREE.Vector3();
    let best = null, bestD = Infinity;
    for (const b of this.buildings) {
      if (!b) continue;
      if (ray.intersectBox(b.box, hit)) {
        const d = hit.distanceToSquared(ray.origin);
        if (d < bestD) { bestD = d; best = { type: 'file', id: b.id }; }
      }
    }
    this.roundabouts.forEach((r, i) => {
      if (ray.intersectBox(r.box, hit)) {
        const d = hit.distanceToSquared(ray.origin);
        if (d < bestD) { bestD = d; best = { type: 'roundabout', index: i }; }
      }
    });
    return best;
  }

  _fitBox(helper, box) {
    const size = new THREE.Vector3(), c = new THREE.Vector3();
    box.getSize(size); box.getCenter(c);
    helper.scale.set(size.x + 0.3, size.y + 0.2, size.z + 0.3);
    helper.position.set(c.x, box.min.y, c.z);
    helper.visible = true;
  }

  hover(target) {
    if (!this.hoverBox) return;
    if (!target) { this.hoverBox.visible = false; return; }
    const box = target.type === 'file' ? this.buildings[target.id].box : this.roundabouts[target.index].box;
    this._fitBox(this.hoverBox, box);
  }

  select(id) {
    this.selectedId = id;
    this.selGroup.clear();
    this.pulses = [];
    if (id == null || !this.buildings[id]) { this.selectBox.visible = false; return; }
    const b = this.buildings[id];
    this._fitBox(this.selectBox, b.box);
    const f = this.analysis.files[id];
    const add = (from, to, color) => {
      const A = this.buildings[from], Bb = this.buildings[to];
      if (!A || !Bb) return;
      const curve = this._arc(A, Bb);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.14, 5), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
      this.selGroup.add(tube);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      this.selGroup.add(dot);
      this.pulses.push({ curve, dot, t: Math.random() });
    };
    f.imports.slice(0, 60).forEach((t) => add(id, t, '#ff9f1c'));
    f.importedBy.slice(0, 60).forEach((s) => add(s, id, '#2ec4ff'));
  }

  focus(id) {
    const b = this.buildings[id];
    if (!b) return;
    const h = b.box.max.y;
    this.controls.flyTo(b.lot.x, h * 0.4, b.lot.z, Math.max(18, h * 2.4 + 10), 0.95);
    this.controls.autoRotate = false;
  }
  focusPoint(x, z, radius) { this.controls.flyTo(x, 0, z, radius || 30, 0.9); this.controls.autoRotate = false; }
  resetView() { if (this.home) this.controls.flyTo(0, 0, 0, this.home.radius, this.home.phi); }

  screenshot() { this.renderer.render(this.scene, this.camera); return this.canvas.toDataURL('image/png'); }

  _loop() {
    requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.controls.update(dt);
    if (this.city) {
      const target = this.night ? 1 : 0;
      if (Math.abs(this.nightMix - target) > 0.001) {
        this.nightMix += Math.sign(target - this.nightMix) * Math.min(Math.abs(target - this.nightMix), dt * 1.4);
        this._applyNight(true);
      }
      this.timeU.value += dt;
      this._updateCars(dt);
      this._updateGrowth(dt);
      this._updateFx(dt);
      for (const c of this.clouds.children) {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > this.cloudSpan / 2) c.position.x = -this.cloudSpan / 2;
      }
      for (const p of this.pulses) {
        p.t = (p.t + dt * 0.45) % 1;
        p.dot.position.copy(p.curve.getPoint(p.t));
      }
      if (this.labels && this.state.labels) {
        const far = this.controls.radius;
        for (const s of this.labels.children) s.material.opacity = Math.min(1, Math.max(0.15, (far - 15) / 40));
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
}

// Bitropolis — modèles embarqués dans le HTML (voir scripts/assets.js) : déchiffrement et décompression
// en mémoire au démarrage, puis géométries three.js (position, couleur par sommet, lumière nocturne `aLit`).
// Les données restent locales à ce module : rien n'est exposé dans la page ni proposé au téléchargement.
import { obfName, obfXor } from '../core/obf.js';

/* global __BITROPOLIS_PACKS__ */
const asSrc = (typeof __BITROPOLIS_PACKS__ !== 'undefined' && __BITROPOLIS_PACKS__) || null;
const asPacks = {};
let asReadyP = null;

export function hasPack(name) { return !!(asSrc && asSrc[name]); }

async function asGunzip(b64, salt) {
  const bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  if (salt) obfXor(bytes, salt);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

// À attendre avant de construire une ville (rapide : quelques centaines de ms au premier appel).
export function assetsReady() {
  if (!asReadyP) {
    asReadyP = (async () => {
      for (const [name, p] of Object.entries(asSrc || {})) {
        try {
          asPacks[name] = { models: p.models, palette: p.palette, salt: p.salt || null, keys: new Map(), buf: await asGunzip(p.data, p.salt), colors: null, cache: new Map() };
          p.data = null; // on ne garde que la version décodée, en mémoire
        } catch (err) {
          console.warn(`Bitropolis : modèles « ${name} » illisibles`, err);
        }
      }
    })();
  }
  return asReadyP;
}

export function packReady(name) { return !!asPacks[name]; }
// nom de modèle → clé dans le pack (empreinte ; une clé déjà calculée est acceptée telle quelle)
function asKey(P, name) {
  if (!P.salt || P.models[name]) return name;
  let k = P.keys.get(name);
  if (!k) { k = obfName(name, P.salt); P.keys.set(name, k); }
  return k;
}
export function packModel(pack, name) { const P = asPacks[pack]; return (P && P.models[asKey(P, name)]) || null; }

// Version simplifiée d'un modèle pour les objets lointains : les sommets sont regroupés sur une grille de
// `cell` unités (un lot = 1 unité) — couleur et éclairage compris, donc chaque matériau garde ses couleurs —
// et les triangles devenus plats ou en double disparaissent. Les gratte-ciel passent ainsi de ~27 000 à ~4 500
// triangles. Renvoie null si le gain est trop faible pour valoir une seconde géométrie.
export function packLodGeometry(pack, name, cell = 0.035) {
  const P = asPacks[pack];
  if (!P) return null;
  const key = name + '~' + cell;
  if (P.cache.has(key)) return P.cache.get(key);
  const g = packGeometry(pack, name);
  let out = null;
  if (g && g.index) {
    const pos = g.getAttribute('position').array, col = g.getAttribute('color').array, lit = g.getAttribute('aLit').array, role = g.getAttribute('aRole').array;
    const I = g.index.array, n = pos.length / 3, rep = new Int32Array(n), keep = [];
    const map = new Map();
    for (let v = 0; v < n; v++) {
      const k = `${Math.round(pos[v * 3] / cell)},${Math.round(pos[v * 3 + 1] / cell)},${Math.round(pos[v * 3 + 2] / cell)},${col[v * 3]},${col[v * 3 + 1]},${col[v * 3 + 2]},${lit[v]},${role[v]}`;
      let r = map.get(k);
      if (r === undefined) { r = keep.length; map.set(k, r); keep.push(v); }
      rep[v] = r;
    }
    const idx = [], seen = new Set();
    for (let i = 0; i < I.length; i += 3) {
      const a = rep[I[i]], b = rep[I[i + 1]], c = rep[I[i + 2]];
      if (a === b || b === c || a === c) continue;
      const lo = Math.min(a, b, c), hi = Math.max(a, b, c), t = `${lo},${a + b + c - lo - hi},${hi}`;
      if (seen.has(t)) continue;
      seen.add(t); idx.push(a, b, c);
    }
    if (idx.length < I.length * 0.7) {
      const m = keep.length, p2 = new Float32Array(m * 3), c2 = new Float32Array(m * 3), l2 = new Float32Array(m), r2 = new Float32Array(m);
      keep.forEach((v, i) => {
        p2[i * 3] = pos[v * 3]; p2[i * 3 + 1] = pos[v * 3 + 1]; p2[i * 3 + 2] = pos[v * 3 + 2];
        c2[i * 3] = col[v * 3]; c2[i * 3 + 1] = col[v * 3 + 1]; c2[i * 3 + 2] = col[v * 3 + 2];
        l2[i] = lit[v]; r2[i] = role[v];
      });
      out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(p2, 3));
      out.setAttribute('color', new THREE.BufferAttribute(c2, 3));
      out.setAttribute('aLit', new THREE.BufferAttribute(l2, 1));
      out.setAttribute('aRole', new THREE.BufferAttribute(r2, 1));
      out.setIndex(new THREE.BufferAttribute(m > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), 1));
      out.computeVertexNormals();
      out.computeBoundingSphere();
    }
  }
  P.cache.set(key, out);
  return out;
}

// Inverse de encode16 (scripts/assets.js) : deux plans d'octets → écarts → valeurs, composante par composante.
export function asDecode16(buf, offset, n, stride, Ctor) {
  const b = new Uint8Array(buf, offset, n * 2), out = new Ctor(n);
  let o = 0;
  for (let c = 0; c < stride; c++) {
    let prev = 0;
    for (let k = c; k < n; k += stride, o++) { prev = (prev + (b[o] | (b[n + o] << 8))) & 0xffff; out[k] = prev; }
  }
  return out;
}

// Géométrie d'un modèle (mise en cache). `warp(x, y, z)` peut déformer les sommets (non mis en cache).
export function packGeometry(pack, name, warp = null) {
  const P = asPacks[pack];
  const m = P && P.models[asKey(P, name)];
  if (!m) return null;
  if (!warp && P.cache.has(name)) return P.cache.get(name);
  if (!P.colors) P.colors = P.palette.map(([r, g, b, l, role]) => { const c = new THREE.Color(`rgb(${r},${g},${b})`); return [c.r, c.g, c.b, l, role || 0]; });
  // m.e : données préparées pour la compression (packs récents) ; sinon tableaux bruts (anciens packs)
  const p = m.e ? asDecode16(P.buf, m.p, m.n * 3, 3, Int16Array) : new Int16Array(P.buf, m.p, m.n * 3);
  const c = m.e ? asDecode16(P.buf, m.c, m.n, 1, Uint16Array) : new Uint16Array(P.buf, m.c, m.n);
  const idx = m.e ? asDecode16(P.buf, m.i, m.m, 1, Uint16Array) : new Uint16Array(P.buf, m.i, m.m);
  const pos = new Float32Array(m.n * 3), col = new Float32Array(m.n * 3), lit = new Float32Array(m.n), role = new Float32Array(m.n);
  for (let v = 0; v < m.n; v++) {
    let x = p[v * 3] * m.s, y = p[v * 3 + 1] * m.s, z = p[v * 3 + 2] * m.s;
    if (warp) [x, y, z] = warp(x, y, z);
    pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
    const k = P.colors[c[v]];
    col[v * 3] = k[0]; col[v * 3 + 1] = k[1]; col[v * 3 + 2] = k[2];
    lit[v] = k[3];
    role[v] = k[4];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aLit', new THREE.BufferAttribute(lit, 1));
  g.setAttribute('aRole', new THREE.BufferAttribute(role, 1));
  g.setIndex(new THREE.BufferAttribute(new Uint16Array(idx), 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  g.userData.packed = !warp;
  if (!warp) P.cache.set(name, g);
  return g;
}

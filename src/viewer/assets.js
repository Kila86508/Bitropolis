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

// Géométrie d'un modèle (mise en cache). `warp(x, y, z)` peut déformer les sommets (non mis en cache).
export function packGeometry(pack, name, warp = null) {
  const P = asPacks[pack];
  const m = P && P.models[asKey(P, name)];
  if (!m) return null;
  if (!warp && P.cache.has(name)) return P.cache.get(name);
  if (!P.colors) P.colors = P.palette.map(([r, g, b, l, role]) => { const c = new THREE.Color(`rgb(${r},${g},${b})`); return [c.r, c.g, c.b, l, role || 0]; });
  const p = new Int16Array(P.buf, m.p, m.n * 3), c = new Uint16Array(P.buf, m.c, m.n), idx = new Uint16Array(P.buf, m.i, m.m);
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

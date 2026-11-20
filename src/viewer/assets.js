// Bitropolis — modèles embarqués dans le HTML (voir scripts/assets.js) : déchiffrement et décompression
// en mémoire au démarrage, puis géométries three.js (position, couleur par sommet, lumière nocturne `aLit`).
// Les données restent locales à ce module : rien n'est exposé dans la page ni proposé au téléchargement.
import { obfName, obfXor } from '../core/obf.js';
import { lodPieces, lodWorth } from '../core/lod.js';

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
// Pack superposé (thème Cyberpunk) : pour le pack « city », un modèle présent dans le pack superposé
// est pris là ; sinon (véhicules, sol, mobilier…) dans le pack de ville.
let asOverlay = null;
export function setPackOverlay(name) { asOverlay = name && asPacks[name] ? name : null; }
export function overlayActive() { return !!asOverlay; }
export function overlayHas(name) { const O = asOverlay && asPacks[asOverlay]; return !!(O && O.models[asKey(O, name)]); }
function asPack(pack, name) {
  if (pack === 'city' && asOverlay) { const O = asPacks[asOverlay]; if (O && O.models[asKey(O, name)]) return O; }
  return asPacks[pack];
}
export function packModel(pack, name) { const P = asPack(pack, name); return (P && P.models[asKey(P, name)]) || null; }

// Version simplifiée d'un modèle pour les objets lointains (voir core/lod.js) : chaque pièce est allégée sans
// qu'aucune surface ne bouge (pavés sans chanfrein, pièces minces réduites à leurs grandes faces, petites pièces
// retirées), et garde sa couleur et son éclairage. `l` = 0 dans le pack (la construction a mesuré que la version
// simplifiée ferait moins bien que le modèle complet) ou gain trop faible : pas de seconde géométrie (null).
export function packLodGeometry(pack, name) {
  const P = asPack(pack, name);
  if (!P) return null;
  const key = name + '~lod';
  if (P.cache.has(key)) return P.cache.get(key);
  const m = P.models[asKey(P, name)];
  const g = m && m.l !== 0 ? packGeometry(pack, name) : null;
  let out = null;
  if (g && g.index) {
    const pos = g.getAttribute('position').array, col = g.getAttribute('color').array, lit = g.getAttribute('aLit').array, role = g.getAttribute('aRole').array;
    const I = g.index.array;
    // lampes et feux (aLit ≥ 2) : gardés même minuscules, ils s'allument la nuit
    const L = lodPieces(pos, (v) => `${col[v * 3]},${col[v * 3 + 1]},${col[v * 3 + 2]},${lit[v]},${role[v]}`, I, (v) => lit[v] >= 2);
    if (lodWorth(L.idx, I)) {
      const n = L.src.length, c2 = new Float32Array(n * 3), l2 = new Float32Array(n), r2 = new Float32Array(n);
      L.src.forEach((v, i) => {
        c2[i * 3] = col[v * 3]; c2[i * 3 + 1] = col[v * 3 + 1]; c2[i * 3 + 2] = col[v * 3 + 2];
        l2[i] = lit[v]; r2[i] = role[v];
      });
      out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(new Float32Array(L.pos), 3));
      out.setAttribute('color', new THREE.BufferAttribute(c2, 3));
      out.setAttribute('aLit', new THREE.BufferAttribute(l2, 1));
      out.setAttribute('aRole', new THREE.BufferAttribute(r2, 1));
      out.setIndex(new THREE.BufferAttribute(n > 65535 ? new Uint32Array(L.idx) : new Uint16Array(L.idx), 1));
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
  const P = asPack(pack, name);
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

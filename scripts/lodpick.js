// Bitropolis — garde-fou de la version simplifiée (affichage lointain), à la construction du pack.
// On mesure, sur le modèle complet puis sur sa version simplifiée (core/lod.js), la surface où deux couches de
// couleurs différentes se recouvrent dans le même plan ou à quelques centimètres : c'est ce qui clignote à
// l'écran. Si la version simplifiée fait moins bien que le modèle complet, le modèle n'en aura pas (champ l = 0).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { lodPieces, lodWorth } from '../src/core/lod.js';

export const LOD_GAP = 0.004;        // deux couches à moins de 4 cm (unités de modèle : un lot = 1 = 10 m) se gênent de loin
export const LOD_MAX_WORSE = 0.003;  // surface en conflit tolérée en plus du modèle complet (0,3 % d'un lot)

const area2 = (P) => { let a = 0; for (let k = 0; k < P.length; k++) { const p = P[k], q = P[(k + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
// intersection de deux polygones convexes 2D (clipper en sens direct)
function clip(subject, clipper) {
  let out = subject;
  for (let k = 0; k < clipper.length && out.length; k++) {
    const [ax, ay] = clipper[k], [bx, by] = clipper[(k + 1) % clipper.length], inp = out;
    const ex = bx - ax, ey = by - ay;
    let [px, py] = inp[inp.length - 1], ps = ex * (py - ay) - ey * (px - ax);
    out = [];
    for (const [qx, qy] of inp) {
      const qs = ex * (qy - ay) - ey * (qx - ax);
      if (qs >= 0) { if (ps < 0) { const t = ps / (ps - qs); out.push([px + t * (qx - px), py + t * (qy - py)]); } out.push([qx, qy]); }
      else if (ps >= 0) { const t = ps / (ps - qs); out.push([px + t * (qx - px), py + t * (qy - py)]); }
      px = qx; py = qy; ps = qs;
    }
  }
  return out;
}
// le rayon o + t·d (t > 0) touche-t-il un triangle ? T : 9 nombres par triangle
function blocked(T, o, d) {
  for (let i = 0; i < T.length; i += 9) {
    const e1x = T[i + 3] - T[i], e1y = T[i + 4] - T[i + 1], e1z = T[i + 5] - T[i + 2], e2x = T[i + 6] - T[i], e2y = T[i + 7] - T[i + 1], e2z = T[i + 8] - T[i + 2];
    const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x, det = e1x * px + e1y * py + e1z * pz;
    if (det > -1e-12 && det < 1e-12) continue;
    const inv = 1 / det, tx = o[0] - T[i], ty = o[1] - T[i + 1], tz = o[2] - T[i + 2], u = (tx * px + ty * py + tz * pz) * inv;
    if (u < 0 || u > 1) continue;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
    if (v < 0 || u + v > 1) continue;
    if ((e2x * qx + e2y * qy + e2z * qz) * inv > 1e-5) return true;
  }
  return false;
}

// Surface (unités² de modèle) où deux triangles de couleurs différentes, tournés du même côté, se recouvrent à
// moins de `gap` l'un de l'autre, le plus extérieur étant visible (un rayon peut s'en échapper sans passer sous
// le sol). Seules les faces alignées sur les axes sont mesurées, vers le haut ou sur les côtés : les dessous
// sont cachés par leur propre volume. pos : positions ; col : couleur par sommet ; idx : triangles.
export function layerConflict(pos, col, idx, gap = LOD_GAP) {
  const groups = new Map(), T = new Float64Array(idx.length * 3);
  for (let i = 0; i < idx.length; i++) { T[i * 3] = pos[idx[i] * 3]; T[i * 3 + 1] = pos[idx[i] * 3 + 1]; T[i * 3 + 2] = pos[idx[i] * 3 + 2]; }
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, len = Math.hypot(nx, ny, nz);
    if (len < 1e-9) continue;
    const N = [nx / len, ny / len, nz / len];
    for (let ax = 0; ax < 3; ax++) {
      if (Math.abs(N[ax]) < 0.999 || (ax === 1 && N[ax] < 0)) continue;
      const u = (ax + 1) % 3, w = (ax + 2) % 3, key = `${ax}${N[ax] > 0 ? '+' : '-'}`;
      const P = [[pos[a + u], pos[a + w]], [pos[b + u], pos[b + w]], [pos[c + u], pos[c + w]]];
      if (area2(P) < 0) P.reverse();
      let L = groups.get(key);
      if (!L) groups.set(key, L = []);
      L.push({ P, c: col[idx[i]], h: pos[a + ax], x0: Math.min(P[0][0], P[1][0], P[2][0]), x1: Math.max(P[0][0], P[1][0], P[2][0]), y0: Math.min(P[0][1], P[1][1], P[2][1]), y1: Math.max(P[0][1], P[1][1], P[2][1]) });
    }
  }
  let total = 0;
  for (const [key, L] of groups) {
    const ax = +key[0], sg = key[1] === '+' ? 1 : -1, u = (ax + 1) % 3, w = (ax + 2) % 3, found = [];
    L.sort((p, q) => p.h - q.h);
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length && L[j].h - L[i].h < gap; j++) {
      const A = L[i], B = L[j];
      if (A.c === B.c || A.x1 <= B.x0 || B.x1 <= A.x0 || A.y1 <= B.y0 || B.y1 <= A.y0) continue;
      const I = clip(B.P, A.P);
      if (I.length < 3) continue;
      const ar = Math.abs(area2(I));
      if (ar > 1e-7) found.push({ ar, cx: I.reduce((s, p) => s + p[0], 0) / I.length, cy: I.reduce((s, p) => s + p[1], 0) / I.length, h: sg > 0 ? B.h : A.h });
    }
    if (!found.length) continue;
    // visibilité estimée sur les plus grands recouvrements de cette orientation, puis appliquée à toute leur surface
    found.sort((p, q) => q.ar - p.ar);
    const sum = found.reduce((s, f) => s + f.ar, 0);
    let seen = 0, tested = 0;
    for (const f of found.slice(0, 12)) {
      const o = [0, 0, 0];
      o[ax] = f.h + sg * 2e-4; o[u] = f.cx; o[w] = f.cy;
      let free = false;
      for (let k = 0; k < 13 && !free; k++) {
        const d = [0, 0, 0], tilt = k === 0 ? 0 : (k < 9 ? 0.8 : 1.3), turn = k * Math.PI / 4 + (k >= 9 ? 0.4 : 0);
        d[ax] = sg * Math.cos(tilt); d[u] = Math.sin(tilt) * Math.cos(turn); d[w] = Math.sin(tilt) * Math.sin(turn);
        if (d[1] < -0.05) continue; // la caméra ne passe jamais sous le sol
        if (!blocked(T, o, d)) free = true;
      }
      tested += f.ar;
      if (free) seen += f.ar;
    }
    total += sum * (seen / tested);
  }
  return total;
}

// Version simplifiée d'un modèle, dans les mêmes tableaux que la visionneuse. lit : éclairage par sommet.
export function simplify(pos, col, idx, lit = null) {
  const L = lodPieces(pos, (v) => col[v], idx, lit ? (v) => lit[v] >= 2 : null);
  return { pos: L.pos, col: L.src.map((v) => col[v]), idx: L.idx, worth: lodWorth(L.idx, idx) };
}

// Résultats déjà calculés, gardés d'une construction à l'autre (clé : empreinte de la géométrie).
const CACHE_FILE = path.join(os.tmpdir(), 'bitropolis-lod-v2.json');
let cache = null, dirty = false;
function loadCache() {
  if (!cache) { try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { cache = {}; } }
  return cache;
}
export function saveLodCache() {
  if (!dirty) return;
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache)); dirty = false; } catch { /* cache facultatif */ }
}

// P : positions entières du pack (Int16), s : pas de quantification, C : indice de couleur par sommet, I : triangles,
// litOf(c) : éclairage de la couleur c. Renvoie 1 si le modèle peut être simplifié de loin, 0 sinon.
export function lodAllowed(P, s, C, I, litOf = () => 0, { useCache = true } = {}) {
  let key = null;
  if (useCache) {
    const h = crypto.createHash('sha1');
    for (const a of [P, C, I]) h.update(new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
    key = h.update(String(s)).digest('base64');
    const hit = loadCache()[key];
    if (hit !== undefined) return hit;
  }
  // mêmes positions que dans la visionneuse (Float32)
  const pos = new Float32Array(P.length), lit = new Uint8Array(C.length);
  for (let k = 0; k < P.length; k++) pos[k] = P[k] * s;
  for (let v = 0; v < C.length; v++) lit[v] = litOf(C[v]);
  const L = simplify(pos, C, I, lit);
  const ok = !L.worth || layerConflict(L.pos, L.col, L.idx) <= layerConflict(pos, C, I) + LOD_MAX_WORSE ? 1 : 0;
  if (key) { loadCache()[key] = ok; dirty = true; }
  return ok;
}

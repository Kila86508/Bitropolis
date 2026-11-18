// Bitropolis — convertit les modèles .glb (kit de campagne Asset/ et pack de ville FULL_VERSION_250_MODELS/)
// en données compactes embarquées dans le HTML : positions quantifiées, une couleur par sommet (palette),
// un drapeau « lumière » pour la nuit (fenêtres, lampadaires), le tout compressé en gzip.
// On évite ainsi d'embarquer un chargeur glTF, des textures et des matériaux PBR. Aucune dépendance.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { packModelNames, PROPS, KIT_PROPS } from '../src/core/catalog.js';
import { obfName, obfXor } from '../src/core/obf.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LANDSCAPE_DIRS = [path.join(ROOT, 'Asset/models'), path.join(ROOT, 'Asset/model')];
export const CITY_PACK_DIR = [path.join(ROOT, 'Asset/FULL_VERSION_250_MODELS/GLB'), path.join(ROOT, 'FULL_VERSION_250_MODELS/GLB')].find((d) => fs.existsSync(d)) || path.join(ROOT, 'Asset/FULL_VERSION_250_MODELS/GLB');
export const PROPS_DIR = path.join(ROOT, 'Asset/Maison/obj free city pack');
export const ROAD_KIT_DIR = path.join(ROOT, 'Asset/Maison/road/PLUS/gltf');

// --- Décodeur PNG minimal (8 bits, non entrelacé : gris, RGB, palette, RGBA)
export function decodePNG(buf) {
  let p = 8, width = 0, height = 0, type = 0, depth = 0, plte = null;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), tag = buf.toString('latin1', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (tag === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); depth = data[8]; type = data[9]; if (data[12]) throw new Error('PNG entrelacé non géré'); }
    else if (tag === 'PLTE') plte = data;
    else if (tag === 'IDAT') idat.push(data);
    else if (tag === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8) throw new Error('PNG ' + depth + ' bits non géré');
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * ch, out = Buffer.alloc(width * height * 4), line = Buffer.alloc(stride), prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? line[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[i] = v & 255;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4, s = x * ch;
      if (type === 2 || type === 6) { out[o] = line[s]; out[o + 1] = line[s + 1]; out[o + 2] = line[s + 2]; out[o + 3] = type === 6 ? line[s + 3] : 255; }
      else if (type === 3) { const k = line[s] * 3; out[o] = plte[k]; out[o + 1] = plte[k + 1]; out[o + 2] = plte[k + 2]; out[o + 3] = 255; }
      else { out[o] = out[o + 1] = out[o + 2] = line[s]; out[o + 3] = type === 4 ? line[s + 1] : 255; }
    }
    line.copy(prev);
  }
  return { width, height, data: out };
}

// --- Matrices 4×4 (colonne majeure, comme glTF)
function m4mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
function m4node(n) {
  if (n.matrix) return n.matrix.slice();
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1], [tx, ty, tz] = n.translation || [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1
  ];
}

function m4inv(m) {
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  const det = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
  return [
    (a11 * b11 - a12 * b10 + a13 * b09) * det, (a02 * b10 - a01 * b11 - a03 * b09) * det, (a31 * b05 - a32 * b04 + a33 * b03) * det, (a22 * b04 - a21 * b05 - a23 * b03) * det,
    (a12 * b08 - a10 * b11 - a13 * b07) * det, (a00 * b11 - a02 * b08 + a03 * b07) * det, (a32 * b02 - a30 * b05 - a33 * b01) * det, (a20 * b05 - a22 * b02 + a23 * b01) * det,
    (a10 * b10 - a11 * b08 + a13 * b06) * det, (a01 * b08 - a00 * b10 - a03 * b06) * det, (a30 * b04 - a31 * b02 + a33 * b00) * det, (a21 * b02 - a20 * b04 - a23 * b00) * det,
    (a11 * b07 - a10 * b09 - a12 * b06) * det, (a00 * b09 - a01 * b07 + a02 * b06) * det, (a31 * b01 - a30 * b03 - a32 * b00) * det, (a20 * b03 - a21 * b01 + a22 * b00) * det
  ];
}
const m4apply = (M, x, y, z) => [M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14]];

// Pièces mobiles du pack (le jeu les anime) et points d'effets (fumée, balise, fontaine)
const PART_RX = /__(Rotor|Chimney_\d+|Cube)$/;
const FX_RX = /__FX_(Smoke|Beacon|Fountain)(?:_\d+)?$/;

// Matériaux prévus pour être recolorés (une palette différente par bâtiment)
const PALETTE_ROLES = { Palette_Wall_1: 1, Palette_Wall_2: 2, Palette_Wall_3: 3, Palette_Roof: 4, Palette_Trim: 5, Palette_Accent: 6 };

const linToSrgb = (v) => { v = Math.max(0, Math.min(1, v)); return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); };
// Lumière de nuit : 2 = toujours allumé (lampadaires, signaux), 1 = fenêtre (allumée au hasard), 0 = rien
// Lentilles des feux tricolores : 3–5 (têtes « X ») ou 6–8 (têtes « Y ») pour rouge, vert, orange (« Off »).
function litOf(mat, nodeName = '') {
  const name = (mat && mat.name) || '';
  const lens = /^Signal_(Red|Green|Off)$/.exec(name), head = /Signal_([XY])_\d+$/.exec(nodeName);
  if (lens && head) return (head[1] === 'X' ? 3 : 6) + { Red: 0, Green: 1, Off: 2 }[lens[1]];
  if (/Housing/i.test(name)) return 0;
  if (/NightLight|Signal_|Flash|Lamp_?Light|Neon/i.test(name)) return 2;
  if (/window|glass|vitre/i.test(name)) return 1;
  const e = mat && mat.emissiveFactor;
  if (e && e[0] + e[1] + e[2] > 0.3) return 2;
  return 0;
}

// --- Lecture d'un .glb : tous les maillages de la scène, transformés dans le repère du modèle.
export function readGLB(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32LE(0) !== 0x46546c67) throw new Error(file + " n'est pas un .glb");
  const jl = b.readUInt32LE(12);
  const json = JSON.parse(b.toString('utf8', 20, 20 + jl));
  const bin = b.subarray(20 + jl + 8, 20 + jl + 8 + b.readUInt32LE(20 + jl));
  const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  const accessor = (i) => {
    const a = json.accessors[i], v = json.bufferViews[a.bufferView], T = COMP[a.componentType], n = SIZE[a.type];
    const off = bin.byteOffset + (v.byteOffset || 0) + (a.byteOffset || 0);
    const stride = v.byteStride ? v.byteStride / T.BYTES_PER_ELEMENT : n;
    const copy = new Uint8Array(((a.count - 1) * stride + n) * T.BYTES_PER_ELEMENT);
    copy.set(new Uint8Array(bin.buffer, off, copy.length));
    const src = new T(copy.buffer);
    const out = new Float64Array(a.count * n);
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = src[k * stride + c];
    if (a.normalized && T !== Float32Array) { const m = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[a.componentType]; for (let k = 0; k < out.length; k++) out[k] /= m; }
    return out;
  };
  const images = new Map();
  const imageOf = (texIndex) => {
    if (texIndex == null) return null;
    const src = json.textures[texIndex].source;
    if (!images.has(src)) {
      const v = json.bufferViews[json.images[src].bufferView];
      images.set(src, decodePNG(bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength)));
    }
    return images.get(src);
  };
  const prims = [], parts = [], fx = [];
  // part : pièce mobile en cours (ses maillages sont exprimés dans le repère de son pivot)
  const walk = (ni, parent, part) => {
    const n = json.nodes[ni];
    const W = parent ? m4mul(parent, m4node(n)) : m4node(n);
    const name = n.name || '';
    if (n.mesh == null && FX_RX.test(name)) fx.push({ t: FX_RX.exec(name)[1], p: [W[12], W[13], W[14]].map((v) => +v.toFixed(4)) });
    if (!part && PART_RX.test(name)) {
      part = { name: PART_RX.exec(name)[1], pivot: W, inv: m4inv(W), prims: [] };
      parts.push(part);
    }
    const M = part ? m4mul(part.inv, W) : W;
    if (n.mesh != null) for (const pr of json.meshes[n.mesh].primitives) {
      if (pr.mode != null && pr.mode !== 4) continue; // triangles seulement
      const mat = pr.material != null ? json.materials[pr.material] : null;
      const pbr = (mat && mat.pbrMetallicRoughness) || {};
      const raw = accessor(pr.attributes.POSITION);
      const pos = new Float64Array(raw.length);
      for (let k = 0; k < raw.length; k += 3) {
        const x = raw[k], y = raw[k + 1], z = raw[k + 2];
        pos[k] = M[0] * x + M[4] * y + M[8] * z + M[12];
        pos[k + 1] = M[1] * x + M[5] * y + M[9] * z + M[13];
        pos[k + 2] = M[2] * x + M[6] * y + M[10] * z + M[14];
      }
      const det = M[0] * (M[5] * M[10] - M[9] * M[6]) - M[4] * (M[1] * M[10] - M[9] * M[2]) + M[8] * (M[1] * M[6] - M[5] * M[2]);
      let idx = pr.indices != null ? accessor(pr.indices) : Float64Array.from({ length: pos.length / 3 }, (_, i) => i);
      if (det < 0) { idx = Float64Array.from(idx); for (let t = 0; t < idx.length; t += 3) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s; } }
      (part ? part.prims : prims).push({
        pos, idx, world: part ? part.pivot : null,
        uv: pr.attributes.TEXCOORD_0 != null ? accessor(pr.attributes.TEXCOORD_0) : null,
        image: imageOf(pbr.baseColorTexture && pbr.baseColorTexture.index),
        factor: pbr.baseColorFactor || [1, 1, 1, 1],
        lit: litOf(mat, name), material: mat ? mat.name : ''
      });
    }
    for (const c of n.children || []) walk(c, W, part);
  };
  for (const r of json.scenes[json.scene || 0].nodes) walk(r, null, null);
  return { prims, parts, fx };
}

// --- Lecture d'un .obj (+ .mtl pour les couleurs « Kd ») : recentré au sol, mis à l'échelle de la grille.
export function readOBJ(file, scale = 1) {
  const dir = path.dirname(file);
  const text = fs.readFileSync(file, 'utf8');
  const kd = new Map();
  const mtl = /^mtllib\s+(.+)$/m.exec(text);
  if (mtl && fs.existsSync(path.join(dir, mtl[1].trim()))) {
    let cur = null;
    for (const line of fs.readFileSync(path.join(dir, mtl[1].trim()), 'utf8').split(/\r?\n/)) {
      const t = line.trim().split(/\s+/);
      if (t[0] === 'newmtl') cur = t.slice(1).join(' ');
      else if (t[0] === 'Kd' && cur) kd.set(cur, [+t[1], +t[2], +t[3]]);
    }
  }
  const V = [];
  const groups = new Map(); // matériau → triangles (indices globaux)
  let mat = '';
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('v ')) { const t = line.trim().split(/\s+/); V.push(+t[1], +t[2], +t[3]); }
    else if (line.startsWith('usemtl')) mat = line.slice(6).trim();
    else if (line.startsWith('f ')) {
      const ids = line.trim().split(/\s+/).slice(1).map((t) => { const v = parseInt(t, 10); return v < 0 ? V.length / 3 + v : v - 1; });
      if (!groups.has(mat)) groups.set(mat, []);
      const g = groups.get(mat);
      for (let k = 1; k + 1 < ids.length; k++) g.push(ids[0], ids[k], ids[k + 1]);
    }
  }
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < V.length; i += 3) for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], V[i + c]); max[c] = Math.max(max[c], V[i + c]); }
  const cx = (min[0] + max[0]) / 2, cz = (min[2] + max[2]) / 2, y0 = min[1];
  const prims = [];
  for (const [m, tris] of groups) {
    const map = new Map(), pos = [], idx = [];
    for (const v of tris) {
      let k = map.get(v);
      if (k === undefined) { k = pos.length / 3; map.set(v, k); pos.push((V[v * 3] - cx) * scale, (V[v * 3 + 1] - y0) * scale, (V[v * 3 + 2] - cz) * scale); }
      idx.push(k);
    }
    const c = kd.get(m) || [0.7, 0.7, 0.7];
    prims.push({ pos: Float64Array.from(pos), idx: Float64Array.from(idx), uv: null, image: null, factor: [c[0], c[1], c[2], 1], lit: /light|lamp|bulb/i.test(m) && !/pole|post|base/i.test(m) ? 2 : 0, material: m });
  }
  return { prims, parts: [], fx: [] };
}

// --- Un pack = plusieurs modèles partageant une palette, sérialisés dans un seul binaire gzip.
class PackWriter {
  constructor() { this.palette = []; this.paletteIndex = new Map(); this.chunks = []; this.size = 0; this.models = {}; }
  // role : matériau recolorable du pack (0 aucun, 1–3 murs, 4 toit, 5 boiseries, 6 accent)
  color(r, g, b, lit, role = 0) {
    const key = `${r},${g},${b},${lit},${role}`;
    let k = this.paletteIndex.get(key);
    if (k === undefined) { k = this.palette.length; this.palette.push(role ? [r, g, b, lit, role] : [r, g, b, lit]); this.paletteIndex.set(key, k); }
    return k;
  }
  push(typed) {
    const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
    const off = this.size;
    this.chunks.push(bytes);
    this.size += bytes.length;
    const pad = (4 - (this.size % 4)) % 4;
    if (pad) { this.chunks.push(new Uint8Array(pad)); this.size += pad; }
    return off;
  }
  add(name, file, scale = 1) {
    const { prims, parts, fx } = file.endsWith('.obj') ? readOBJ(file, scale) : readGLB(file);
    if (scale !== 1 && !file.endsWith('.obj')) {
      for (const p of [...prims, ...parts.flatMap((pt) => pt.prims)]) for (let k = 0; k < p.pos.length; k++) p.pos[k] *= scale;
      for (const pt of parts) for (const i of [12, 13, 14]) pt.pivot[i] *= scale;
      for (const e of fx) e.p = e.p.map((v) => v * scale);
    }
    if (!this.addPrims(name, prims, [...prims, ...parts.flatMap((pt) => pt.prims)])) return false;
    const info = this.models[name];
    if (parts.length) {
      info.parts = [];
      for (const pt of parts) {
        const key = `${name}#${pt.name}`;
        if (this.addPrims(key, pt.prims, pt.prims)) info.parts.push({ n: pt.name, k: key, m: pt.pivot.map((v) => +v.toFixed(5)) });
      }
    }
    if (fx.length) info.fx = fx;
    return true;
  }
  // boundsFrom : primitives servant à la boîte englobante (pièces mobiles comprises, dans le repère du modèle)
  addPrims(name, prims, boundsFrom) {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    let nv = 0, ni = 0;
    for (const p of prims) { nv += p.pos.length / 3; ni += p.idx.length; }
    for (const p of boundsFrom) {
      for (let k = 0; k < p.pos.length; k += 3) {
        const v = p.world && boundsFrom !== prims ? m4apply(p.world, p.pos[k], p.pos[k + 1], p.pos[k + 2]) : [p.pos[k], p.pos[k + 1], p.pos[k + 2]];
        for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], v[c]); max[c] = Math.max(max[c], v[c]); }
      }
    }
    if (!nv) return false;
    if (nv > 65535) throw new Error(`${name} : trop de sommets (${nv})`);
    let ext = 1e-6;
    for (const p of prims) for (let k = 0; k < p.pos.length; k++) ext = Math.max(ext, Math.abs(p.pos[k]));
    const s = ext / 32767;
    const P = new Int16Array(nv * 3), C = new Uint16Array(nv), I = new Uint16Array(ni);
    let v = 0, i = 0;
    for (const p of prims) {
      const base = v, n = p.pos.length / 3;
      for (let k = 0; k < n; k++, v++) {
        for (let c = 0; c < 3; c++) P[v * 3 + c] = Math.round(p.pos[k * 3 + c] / s);
        let r = 1, g = 1, b = 1;
        if (p.image && p.uv) {
          const u = p.uv[k * 2] - Math.floor(p.uv[k * 2]), w = p.uv[k * 2 + 1] - Math.floor(p.uv[k * 2 + 1]);
          const img = p.image, x = Math.min(img.width - 1, Math.floor(u * img.width)), y = Math.min(img.height - 1, Math.floor(w * img.height));
          const o = (y * img.width + x) * 4;
          // texture sRGB → linéaire, puis facteur (linéaire)
          const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
          r = toLin(img.data[o]); g = toLin(img.data[o + 1]); b = toLin(img.data[o + 2]);
        }
        C[v] = this.color(linToSrgb(r * p.factor[0]), linToSrgb(g * p.factor[1]), linToSrgb(b * p.factor[2]), p.lit, PALETTE_ROLES[p.material] || 0);
      }
      for (const q of p.idx) I[i++] = base + q;
    }
    if (this.palette.length > 65535) throw new Error('Palette trop grande');
    this.models[name] = { n: nv, m: ni, s, p: this.push(P), c: this.push(C), i: this.push(I), min: min.map((x) => +x.toFixed(4)), max: max.map((x) => +x.toFixed(4)) };
    return true;
  }
  // Sérialise le pack : gzip puis brouillage (sel aléatoire par build), noms de modèles remplacés par des empreintes.
  finish() {
    const buf = Buffer.concat(this.chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength)), this.size);
    const gz = new Uint8Array(zlib.gzipSync(buf, { level: 9 }));
    const salt = crypto.randomBytes(12).toString('base64');
    const models = {};
    for (const [name, info] of Object.entries(this.models)) {
      const copy = { ...info };
      if (copy.parts) copy.parts = copy.parts.map((pt) => ({ ...pt, k: obfName(pt.k, salt) }));
      if (copy.alts) copy.alts = copy.alts.map((a) => obfName(a, salt));
      models[obfName(name, salt)] = copy;
    }
    return { v: 2, salt, palette: this.palette, models, data: Buffer.from(obfXor(gz, salt)).toString('base64') };
  }
}

// Kit de campagne (Asset/models + socle diorama)
export function packLandscape({ skip = /^(retaining_wall|diorama_room|rail_|raised_rail|raised_road|raised_sidewalk|road_ramp)/ } = {}) {
  const w = new PackWriter();
  for (const dir of LANDSCAPE_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).sort()) {
      if (!f.endsWith('.glb')) continue;
      const name = f.slice(0, -4);
      if (!skip.test(name)) w.add(name, path.join(dir, f));
    }
  }
  return Object.keys(w.models).length ? w.finish() : null;
}

// Pack de ville : seulement les modèles utilisés par le catalogue (bâtiments, routes, arbres, véhicules).
export function packCity({ dir = CITY_PACK_DIR } = {}) {
  if (!fs.existsSync(dir)) return null;
  const w = new PackWriter();
  const index = new Map();
  for (const cat of fs.readdirSync(dir)) {
    const d = path.join(dir, cat);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d)) if (f.endsWith('.glb')) index.set(f.slice(0, -4), path.join(d, f));
  }
  const missing = [];
  for (const name of packModelNames()) {
    if (!index.has(name)) { missing.push(name); continue; }
    w.add(name, index.get(name));
    // variantes facultatives : Commercial_N2_B.glb, Commercial_N2_C.glb… (même rôle, autre apparence)
    const alts = [...index.keys()].filter((k) => k.length === name.length + 2 && k.startsWith(name + '_') && /^[A-Z]$/.test(k.slice(-1))).sort();
    for (const alt of alts) w.add(alt, index.get(alt));
    if (alts.length && w.models[name]) w.models[name].alts = alts.filter((a) => w.models[a]);
  }
  if (missing.length) console.warn('⚠️  Modèles absents du pack :', missing.join(', '));
  // accessoires urbains (.obj + .mtl)
  for (const [name, scale] of Object.entries(PROPS)) {
    const f = path.join(PROPS_DIR, name + '.obj');
    if (fs.existsSync(f)) w.add('fp_' + name, f, scale);
  }
  // accessoires du kit de routes (.glb)
  for (const [name, scale] of Object.entries(KIT_PROPS)) {
    const f = path.join(ROAD_KIT_DIR, name + '.glb');
    if (fs.existsSync(f)) w.add('rk_' + name, f, scale);
  }
  return Object.keys(w.models).length ? w.finish() : null;
}

// Packs déjà chiffrés dans un HTML construit précédemment (permet de reconstruire sans les .glb d'origine).
const PACKS_OPEN = '/*BITROPOLIS-PACKS*/', PACKS_CLOSE = '/*/BITROPOLIS-PACKS*/';
export function packsFromHTML(file = path.join(ROOT, 'dist/bitropolis.html')) {
  try {
    const html = fs.readFileSync(file, 'utf8');
    const i = html.indexOf(PACKS_OPEN), j = html.indexOf(PACKS_CLOSE, i);
    if (i < 0 || j < 0) return {};
    const body = html.slice(i + PACKS_OPEN.length, j);
    return JSON.parse(body.slice(body.indexOf('=') + 1, body.lastIndexOf(';')));
  } catch { return {}; }
}

// Script JS à injecter dans le module de l'appli : une constante locale au module (invisible depuis la console).
// Un pack dont les .glb sont absents est repris tel quel (déjà chiffré) du dist/ existant.
export function assetsScript() {
  const packs = {};
  const previous = packsFromHTML();
  const land = packLandscape() || previous.landscape;
  if (land) packs.landscape = land;
  const city = packCity() || previous.city;
  if (city) packs.city = city;
  for (const [k, p] of Object.entries(packs)) if (p === previous[k]) console.log(`ℹ️  Pack « ${k} » repris du dist/ existant (modèles d'origine absents).`);
  return Object.keys(packs).length ? `${PACKS_OPEN}const __BITROPOLIS_PACKS__ = ${JSON.stringify(packs)};${PACKS_CLOSE}` : '';
}

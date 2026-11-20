// Bitropolis — export de la ville : GIF animé (encodeur maison, sans dépendance) et vidéo (MediaRecorder du navigateur).

// Palette de 256 couleurs par coupe médiane : on découpe le nuage de couleurs échantillonnées
// selon son axe le plus étendu, jusqu'à 256 boîtes ; chaque boîte donne sa couleur moyenne.
export function gifPalette(samples) {
  const n = samples.length / 3;
  let boxes = [Array.from({ length: n }, (_, i) => i)];
  const range = (box) => {
    let lo = [255, 255, 255], hi = [0, 0, 0];
    for (const i of box) for (let c = 0; c < 3; c++) { const v = samples[i * 3 + c]; if (v < lo[c]) lo[c] = v; if (v > hi[c]) hi[c] = v; }
    const r = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
    const axis = r[0] >= r[1] && r[0] >= r[2] ? 0 : r[1] >= r[2] ? 1 : 2;
    return { axis, size: r[axis] };
  };
  while (boxes.length < 256) {
    let best = -1, bestScore = 0, bestAxis = 0;
    boxes.forEach((b, k) => { if (b.length < 2) return; const r = range(b); const sc = r.size * Math.sqrt(b.length); if (sc > bestScore) { bestScore = sc; best = k; bestAxis = r.axis; } });
    if (best < 0) break;
    const box = boxes[best].sort((a, b) => samples[a * 3 + bestAxis] - samples[b * 3 + bestAxis]);
    const mid = box.length >> 1;
    boxes.splice(best, 1, box.slice(0, mid), box.slice(mid));
  }
  const pal = new Uint8Array(256 * 3);
  boxes.forEach((box, k) => {
    let r = 0, g = 0, b = 0;
    for (const i of box) { r += samples[i * 3]; g += samples[i * 3 + 1]; b += samples[i * 3 + 2]; }
    const m = Math.max(1, box.length);
    pal[k * 3] = Math.round(r / m); pal[k * 3 + 1] = Math.round(g / m); pal[k * 3 + 2] = Math.round(b / m);
  });
  return pal;
}

// Tampon d'octets qui grandit au besoin
class GifBytes {
  constructor() { this.buf = new Uint8Array(1 << 20); this.n = 0; }
  byte(b) { if (this.n >= this.buf.length) { const nb = new Uint8Array(this.buf.length * 2); nb.set(this.buf); this.buf = nb; } this.buf[this.n++] = b & 255; }
  word(w) { this.byte(w); this.byte(w >> 8); }
  bytes(arr) { for (const b of arr) this.byte(b); }
  result() { return this.buf.slice(0, this.n); }
}

// Encodeur GIF89a : palette globale, boucle infinie, une image après l'autre (pixels RGBA d'un canvas)
export class GifEncoder {
  constructor(width, height, palette, delayCs = 8) {
    this.w = width; this.h = height; this.pal = palette; this.delay = delayCs;
    this.lut = new Int16Array(32768).fill(-1); // couleur 15 bits → indice de palette (le plus proche)
    const o = (this.out = new GifBytes());
    o.bytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // « GIF89a »
    o.word(width); o.word(height);
    o.byte(0xf7); o.byte(0); o.byte(0); // palette globale de 256 couleurs
    o.bytes(palette);
    o.bytes([0x21, 0xff, 0x0b, 0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30, 0x03, 0x01, 0x00, 0x00, 0x00]); // NETSCAPE2.0 : boucle
  }
  _nearest(key) {
    const r = ((key >> 10) & 31) * 8 + 4, g = ((key >> 5) & 31) * 8 + 4, b = (key & 31) * 8 + 4, p = this.pal;
    let best = 0, bd = Infinity;
    for (let i = 0; i < 256; i++) {
      const dr = p[i * 3] - r, dg = p[i * 3 + 1] - g, db = p[i * 3 + 2] - b, d = dr * dr * 2 + dg * dg * 4 + db * db * 3;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  addFrame(rgba) {
    const n = this.w * this.h, idx = new Uint8Array(n), lut = this.lut;
    for (let i = 0; i < n; i++) {
      const key = ((rgba[i * 4] >> 3) << 10) | ((rgba[i * 4 + 1] >> 3) << 5) | (rgba[i * 4 + 2] >> 3);
      let v = lut[key];
      if (v < 0) { v = this._nearest(key); lut[key] = v; }
      idx[i] = v;
    }
    const o = this.out;
    o.bytes([0x21, 0xf9, 0x04, 0x00]); o.word(this.delay); o.bytes([0x00, 0x00]); // délai de l'image
    o.byte(0x2c); o.word(0); o.word(0); o.word(this.w); o.word(this.h); o.byte(0);
    const minCode = 8;
    o.byte(minCode);
    const data = gifLzw(idx, minCode);
    for (let i = 0; i < data.length; i += 255) { const len = Math.min(255, data.length - i); o.byte(len); for (let k = 0; k < len; k++) o.byte(data[i + k]); }
    o.byte(0);
  }
  finish() { this.out.byte(0x3b); return this.out.result(); }
}

// Compression LZW du format GIF (codes de 9 à 12 bits, table remise à zéro quand elle est pleine)
function gifLzw(indices, minCode) {
  const clear = 1 << minCode, eoi = clear + 1;
  let codeSize = minCode + 1, next = eoi + 1, cur = 0, bits = 0;
  const out = [];
  const emit = (code) => { cur |= code << bits; bits += codeSize; while (bits >= 8) { out.push(cur & 255); cur >>>= 8; bits -= 8; } };
  const dict = new Map();
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], key = prefix * 256 + k;
    const v = dict.get(key);
    if (v !== undefined) { prefix = v; continue; }
    emit(prefix);
    if (next === 4096) { emit(clear); dict.clear(); next = eoi + 1; codeSize = minCode + 1; }
    else { if (next >= 1 << codeSize) codeSize++; dict.set(key, next++); }
    prefix = k;
  }
  emit(prefix);
  emit(eoi);
  if (bits > 0) out.push(cur & 255);
  return out;
}

// Format vidéo enregistrable par ce navigateur (MP4 si possible, sinon WebM)
export function videoFormat() {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const [type, ext] of [['video/mp4;codecs=avc1.42E01F', 'mp4'], ['video/mp4', 'mp4'], ['video/webm;codecs=vp9', 'webm'], ['video/webm;codecs=vp8', 'webm'], ['video/webm', 'webm']]) {
    if (MediaRecorder.isTypeSupported(type)) return { type, ext };
  }
  return null;
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

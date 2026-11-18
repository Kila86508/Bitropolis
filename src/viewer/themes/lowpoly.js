// Bitropolis — thème « Low poly ».
// Un thème ne dessine rien lui-même : il décrit des pièces (formes simples + couleurs),
// que le moteur fusionne ensuite en quelques maillages. Pour créer un thème (médiéval,
// pixel art…), il suffit d'exposer le même contrat que LowPolyTheme ci-dessous.
//
// Pièce = [forme, x, y, z, largeur, hauteur, profondeur, couleur, rotationY, matériau]
//   formes : box cyl cyl6 cone cone4 ico dome prism tcyl   (base posée en y = 0)
//   matériau : 0 = mat, 1 = vitre / lumière (s'allume la nuit)
// Repère local : le bâtiment regarde vers +z (sa façade donne sur la route).

function lpPart(g, x, y, z, sx, sy, sz, c, ry = 0, m = 0) { return [g, x, y, z, sx, sy, sz, c, ry, m]; }
function lpPick(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }
function lpClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

const LP = {
  walls: ['#f4e1c1', '#f6cfa8', '#eadbc8', '#dbe6ee', '#f2c9b8', '#d3e6d2', '#efe6d8', '#e9d3e4'],
  roofs: ['#d9634c', '#c4553f', '#8a5a44', '#5f7d95', '#7b8f5c', '#b5654a'],
  towers: ['#eef2f5', '#d4dde8', '#bccbd9', '#f1e8dc', '#d8e6ec', '#cfdcc9', '#e7dbe9', '#f3dcc8'],
  dark: '#3b4250', glass: '#9fd0f0', glassDeep: '#6fa8d6', stone: '#e8e0cf', stoneDark: '#c9bfa9',
  gold: '#e7b84a', metal: '#9aa5b1', white: '#f7f7f4', red: '#d94a3d', blue: '#3a6fd8',
  green: ['#6fbf5a', '#5aa84a', '#7fcd62', '#4f9a45', '#8ad16b'], trunk: '#8b5e3c'
};

function lpWindowBands(parts, w, d, y0, floors, fh, color = LP.glass) {
  for (let i = 0; i < floors; i++) {
    const y = y0 + i * fh + fh * 0.3, h = fh * 0.42;
    parts.push(lpPart('box', 0, y, d / 2 + 0.02, w * 0.84, h, 0.06, color, 0, 1));
    parts.push(lpPart('box', 0, y, -d / 2 - 0.02, w * 0.84, h, 0.06, color, 0, 1));
    parts.push(lpPart('box', w / 2 + 0.02, y, 0, 0.06, h, d * 0.84, color, 0, 1));
    parts.push(lpPart('box', -w / 2 - 0.02, y, 0, 0.06, h, d * 0.84, color, 0, 1));
  }
}
function lpColumns(parts, n, span, z, y, h, r, color) {
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : -span / 2 + (span * i) / (n - 1);
    parts.push(lpPart('cyl6', x, y, z, r, h, r, color));
  }
}
function lpCar(parts, x, z, ry, body, cabin = '#2d3440', long = 1) {
  parts.push(lpPart('box', x, 0, z, 0.8, 0.42, 1.5 * long, body, ry));
  parts.push(lpPart('box', x, 0.42, z - 0.05 * long, 0.7, 0.34, 0.8 * long, cabin, ry, 1));
}
function lpFloorsFromLoc(f, min, max) {
  const q = lpClamp(Math.log1p(f.loc || f.size / 40) / Math.log1p(2500), 0, 1);
  return Math.round(min + q * (max - min));
}

function lpTree(rng, x, z, s = 1) {
  const parts = [];
  const g = lpPick(rng, LP.green);
  if (rng() < 0.45) {
    parts.push(lpPart('cyl6', x, 0, z, 0.22 * s, 0.6 * s, 0.22 * s, LP.trunk));
    parts.push(lpPart('cone', x, 0.45 * s, z, 1.3 * s, 1.3 * s, 1.3 * s, g, rng() * 3));
    parts.push(lpPart('cone', x, 1.15 * s, z, 0.95 * s, 1.1 * s, 0.95 * s, g, rng() * 3));
  } else {
    parts.push(lpPart('cyl6', x, 0, z, 0.24 * s, 0.75 * s, 0.24 * s, LP.trunk));
    parts.push(lpPart('ico', x, 0.55 * s, z, 1.35 * s, 1.25 * s, 1.35 * s, g, rng() * 3));
  }
  return parts;
}

const LP_BUILDERS = {
  tower(f, s, rng) {
    const p = [], t = f.tier, wall = lpPick(rng, LP.towers);
    if (t === 1) {
      const w = s * 0.56, d = s * 0.5, h = 1.25 + lpClamp((f.loc || 0) / 400, 0, 0.6);
      const c = lpPick(rng, LP.walls), roof = lpPick(rng, LP.roofs);
      p.push(lpPart('box', 0, 0, 0, w, h, d, c));
      p.push(lpPart('prism', 0, h, 0, w * 1.14, h * 0.7, d * 1.16, roof));
      p.push(lpPart('box', w * 0.25, h * 0.9, -d * 0.15, 0.25, h * 0.55, 0.25, '#9c6b52'));
      p.push(lpPart('box', -w * 0.18, 0, d / 2 + 0.02, 0.38, 0.7, 0.06, '#7a5236'));
      p.push(lpPart('box', w * 0.22, 0.55, d / 2 + 0.02, 0.4, 0.36, 0.06, LP.glass, 0, 1));
      p.push(lpPart('box', w / 2 + 0.02, 0.55, 0, 0.06, 0.36, 0.4, LP.glass, 0, 1));
      p.push(lpPart('ico', -w * 0.62, 0, d * 0.35, 0.55, 0.45, 0.55, lpPick(rng, LP.green)));
      return p;
    }
    const fh = 0.95;
    if (t === 2) {
      const floors = lpFloorsFromLoc(f, 2, 3), w = s * 0.62, d = s * 0.58, h = floors * fh;
      p.push(lpPart('box', 0, 0, 0, w, h, d, wall));
      p.push(lpPart('box', 0, h, 0, w + 0.12, 0.16, d + 0.12, LP.stoneDark));
      p.push(lpPart('box', w * 0.2, h + 0.16, -d * 0.1, 0.6, 0.35, 0.5, LP.metal));
      p.push(lpPart('box', 0, 0, d / 2 + 0.03, 0.55, 0.75, 0.06, LP.dark));
      lpWindowBands(p, w, d, 0.15, floors, fh);
      return p;
    }
    if (t === 3) {
      const floors = lpFloorsFromLoc(f, 4, 7), w = s * 0.64, d = s * 0.6, h = floors * fh;
      p.push(lpPart('box', 0, 0, 0, w + 0.1, fh, d + 0.1, lpPick(rng, LP.walls)));
      p.push(lpPart('box', 0, fh, 0, w, h - fh, d, wall));
      p.push(lpPart('box', 0, h, 0, w + 0.14, 0.18, d + 0.14, LP.stoneDark));
      p.push(lpPart('cyl', -w * 0.22, h + 0.18, d * 0.15, 0.7, 0.8, 0.7, '#a8b4bf'));
      p.push(lpPart('cone', -w * 0.22, h + 0.98, d * 0.15, 0.75, 0.3, 0.75, '#8d99a5'));
      p.push(lpPart('box', 0, 0.05, d / 2 + 0.06, w * 0.7, 0.6, 0.06, LP.glass, 0, 1));
      lpWindowBands(p, w, d, fh, floors - 1, fh);
      return p;
    }
    if (t === 4) {
      const floors = lpFloorsFromLoc(f, 8, 13), w = s * 0.6, d = s * 0.6;
      const lower = Math.ceil(floors * 0.7), upper = floors - lower;
      p.push(lpPart('box', 0, 0, 0, w, lower * fh, d, wall));
      lpWindowBands(p, w, d, 0.1, lower, fh, LP.glassDeep);
      const w2 = w * 0.74, y2 = lower * fh;
      p.push(lpPart('box', 0, y2, 0, w + 0.1, 0.15, d + 0.1, LP.stoneDark));
      p.push(lpPart('box', 0, y2 + 0.15, 0, w2, upper * fh, w2, wall));
      lpWindowBands(p, w2, w2, y2 + 0.2, upper, fh, LP.glassDeep);
      const top = y2 + 0.15 + upper * fh;
      p.push(lpPart('box', 0, top, 0, w2 + 0.1, 0.2, w2 + 0.1, LP.stoneDark));
      p.push(lpPart('cyl6', w2 * 0.25, top + 0.2, 0, 0.08, 1.6, 0.08, LP.metal));
      return p;
    }
    // t === 5 : gratte-ciel
    const floors = lpFloorsFromLoc(f, 15, 26), w = s * 0.6;
    const glassy = rng() < 0.5;
    const body = glassy ? '#a9c9e3' : wall;
    const sections = [[0.55, 1], [0.3, 0.8], [0.15, 0.6]];
    let y = 0;
    for (const [frac, k] of sections) {
      const n = Math.max(2, Math.round(floors * frac)), ww = w * k;
      p.push(lpPart('box', 0, y, 0, ww, n * fh, ww, body));
      lpWindowBands(p, ww, ww, y + 0.1, n, fh, glassy ? '#d6ecff' : LP.glassDeep);
      y += n * fh;
      p.push(lpPart('box', 0, y, 0, ww + 0.12, 0.18, ww + 0.12, glassy ? '#e9f2f8' : LP.stoneDark));
      y += 0.18;
    }
    if (rng() < 0.55) {
      p.push(lpPart('cyl6', 0, y, 0, 0.16, 3.2, 0.16, LP.metal));
      p.push(lpPart('ico', 0, y + 3.2, 0, 0.32, 0.32, 0.32, '#ff3b30', 0, 1));
    } else {
      p.push(lpPart('cyl', 0, y, 0, w * 0.5, 0.08, w * 0.5, '#4f6b55'));
      p.push(lpPart('box', -0.18, y + 0.08, 0, 0.1, 0.02, 0.7, LP.white));
      p.push(lpPart('box', 0.18, y + 0.08, 0, 0.1, 0.02, 0.7, LP.white));
      p.push(lpPart('box', 0, y + 0.08, 0, 0.36, 0.02, 0.1, LP.white));
    }
    return p;
  },

  townhall(f, s) {
    const p = [], w = s * 0.78, d = s * 0.56;
    p.push(lpPart('box', 0, 0, 0.3, w + 0.6, 0.35, d + 1.4, LP.stoneDark));
    p.push(lpPart('box', 0, 0.35, 0, w, 2.6, d, '#f3ead6'));
    p.push(lpPart('box', 0, 2.95, 0, w + 0.2, 0.25, d + 0.2, LP.stone));
    lpColumns(p, 6, w * 0.8, d / 2 + 0.55, 0.35, 2.6, 0.32, LP.white);
    p.push(lpPart('box', 0, 2.95, d / 2 + 0.55, w * 0.9, 0.3, 1.0, LP.stone));
    p.push(lpPart('prism', 0, 3.25, d / 2 + 0.3, w * 0.92, 0.85, 1.5, '#efe5cf'));
    for (let i = 0; i < 3; i++) p.push(lpPart('box', 0, 0.12 * i, d / 2 + 1.05 + 0.25 * (2 - i), w * 0.5, 0.12, 0.3, LP.stone));
    lpWindowBands(p, w, d, 0.6, 2, 1.1, '#ffe7a8');
    p.push(lpPart('box', 0, 3.2, -0.2, 1.8, 2.0, 1.8, '#f3ead6'));
    p.push(lpPart('box', 0, 3.8, 0.71, 0.75, 0.75, 0.06, '#fff6d8', 0, 1));
    p.push(lpPart('cyl', 0, 5.2, -0.2, 1.7, 0.5, 1.7, LP.stone));
    p.push(lpPart('dome', 0, 5.7, -0.2, 1.7, 1.3, 1.7, '#4fa3b8'));
    p.push(lpPart('cyl6', 0, 6.9, -0.2, 0.06, 1.4, 0.06, LP.metal));
    p.push(lpPart('box', 0.32, 7.85, -0.2, 0.6, 0.38, 0.03, '#3a6fd8'));
    p.push(lpPart('ico', 0, 8.25, -0.2, 0.14, 0.14, 0.14, LP.gold));
    return p;
  },

  police(f, s) {
    const p = [], floors = 2 + (f.tier >= 4 ? 1 : 0) + (f.tier >= 5 ? 1 : 0);
    const w = s * 0.66, d = s * 0.5, fh = 0.95, h = floors * fh;
    p.push(lpPart('box', 0, 0, -0.3, w, h, d, '#eef1f6'));
    p.push(lpPart('box', 0, fh * 0.92, -0.3 + d / 2 + 0.02, w + 0.02, 0.3, 0.06, LP.blue));
    p.push(lpPart('box', 0, h, -0.3, w + 0.14, 0.2, d + 0.14, '#2f4f8f'));
    p.push(lpPart('box', -0.4, h + 0.2, -0.3, 0.32, 0.25, 0.32, '#ff3b30', 0, 1));
    p.push(lpPart('box', 0.1, h + 0.2, -0.3, 0.32, 0.25, 0.32, '#2f7bff', 0, 1));
    p.push(lpPart('box', 0, 0, -0.3 + d / 2 + 0.03, 0.8, 0.85, 0.06, '#1f3566'));
    lpWindowBands(p, w, d, fh * 1.2, floors - 1, fh, '#bcd8ff');
    p.push(lpPart('cyl6', w * 0.42, h + 0.2, -0.3, 0.07, f.tier >= 4 ? 2.6 : 1.4, 0.07, LP.metal));
    p.push(lpPart('cyl6', w / 2 + 0.25, 0, d / 2 + 0.2, 0.06, 2.2, 0.06, LP.metal));
    p.push(lpPart('box', w / 2 + 0.55, 1.85, d / 2 + 0.2, 0.55, 0.32, 0.03, LP.blue));
    lpCar(p, -w * 0.25, d / 2 + 0.9, Math.PI / 2, LP.white, '#1f3566');
    p.push(lpPart('box', -w * 0.25, 0.76, d / 2 + 0.9, 0.5, 0.1, 0.2, '#2f7bff', Math.PI / 2, 1));
    return p;
  },

  fire(f, s) {
    const p = [], w = s * 0.7, d = s * 0.5, h = 2.3 + (f.tier >= 4 ? 0.9 : 0);
    p.push(lpPart('box', 0, 0, -0.25, w, h, d, '#c4473a'));
    p.push(lpPart('box', 0, h, -0.25, w + 0.12, 0.2, d + 0.12, '#8f2f27'));
    const doors = f.tier >= 3 ? 3 : 2;
    for (let i = 0; i < doors; i++) {
      const x = -w / 2 + (w / doors) * (i + 0.5);
      p.push(lpPart('box', x, 0, -0.25 + d / 2 + 0.03, (w / doors) * 0.72, 1.45, 0.06, '#f1efe8'));
      p.push(lpPart('box', x, 0.05, -0.25 + d / 2 + 0.05, (w / doors) * 0.6, 1.3, 0.06, '#4a4f5a'));
    }
    p.push(lpPart('box', 0, 1.75, -0.25 + d / 2 + 0.04, w * 0.6, 0.3, 0.05, '#ffe9a8', 0, 1));
    const th = 3.5 + f.tier * 0.7;
    p.push(lpPart('box', -w / 2 + 0.55, 0, -0.25 - d / 2 + 0.5, 1.0, th, 1.0, '#b03f33'));
    p.push(lpPart('cone4', -w / 2 + 0.55, th, -0.25 - d / 2 + 0.5, 1.3, 0.6, 1.3, '#5d2a24'));
    p.push(lpPart('box', -w / 2 + 0.55, th - 1.0, -0.25 - d / 2 + 1.02, 0.4, 0.4, 0.06, '#ffe9a8', 0, 1));
    // camion
    p.push(lpPart('box', w * 0.18, 0, d / 2 + 1.1, 2.2, 0.62, 0.85, '#e23b2e', Math.PI / 2 * 0));
    p.push(lpPart('box', w * 0.18 + 0.95, 0.62, d / 2 + 1.1, 0.5, 0.35, 0.8, '#2d3440', 0, 1));
    p.push(lpPart('box', w * 0.18 - 0.2, 0.65, d / 2 + 1.1, 1.6, 0.1, 0.3, '#c8ccd2'));
    return p;
  },

  hospital(f, s) {
    const p = [], floors = 2 + f.tier, w = s * 0.66, d = s * 0.56, fh = 0.9, h = floors * fh;
    p.push(lpPart('box', 0, 0, 0, w, h, d, '#f6f8f9'));
    p.push(lpPart('box', 0, 0, d / 2 + 0.03, w * 0.5, 0.95, 0.06, '#8fd3c7', 0, 1));
    lpWindowBands(p, w, d, fh * 1.1, floors - 1, fh, '#9ee0d6');
    p.push(lpPart('box', 0, h, 0, w + 0.12, 0.18, d + 0.12, '#d8dee2'));
    p.push(lpPart('box', 0, h - 1.1, d / 2 + 0.06, 0.9, 0.28, 0.06, LP.red, 0, 1));
    p.push(lpPart('box', 0, h - 1.41, d / 2 + 0.06, 0.28, 0.9, 0.06, LP.red, 0, 1));
    if (f.tier >= 4) {
      p.push(lpPart('cyl', 0, h + 0.18, 0, w * 0.6, 0.06, w * 0.6, '#4f6b55'));
      p.push(lpPart('box', -0.2, h + 0.24, 0, 0.1, 0.02, 0.75, LP.white));
      p.push(lpPart('box', 0.2, h + 0.24, 0, 0.1, 0.02, 0.75, LP.white));
      p.push(lpPart('box', 0, h + 0.24, 0, 0.4, 0.02, 0.1, LP.white));
    } else {
      p.push(lpPart('box', 0, h + 0.18, 0, 1.0, 0.25, 0.3, LP.red));
      p.push(lpPart('box', 0, h + 0.18, 0, 0.3, 0.25, 1.0, LP.red));
    }
    lpCar(p, w / 2 - 0.3, d / 2 + 0.95, Math.PI / 2, LP.white, '#d94a3d', 1.15);
    return p;
  },

  library(f, s) {
    const p = [], w = s * 0.66, d = s * 0.5, h = 1.9 + f.tier * 0.25;
    p.push(lpPart('box', 0, 0, 0, w + 0.4, 0.3, d + 0.9, LP.stoneDark));
    p.push(lpPart('box', 0, 0.3, -0.1, w, h, d, '#e9dcc3'));
    lpColumns(p, 4, w * 0.75, d / 2 + 0.15, 0.3, h, 0.24, LP.white);
    p.push(lpPart('prism', 0, h + 0.3, 0, w + 0.2, 0.8, d + 0.6, '#5f8f7a'));
    p.push(lpPart('box', 0, 0.3, d / 2 - 0.05, 0.6, 1.0, 0.06, '#6b4a33'));
    lpWindowBands(p, w, d, 0.6, 1, h * 0.8, '#ffe2a0');
    if (f.tier >= 4) {
      p.push(lpPart('cyl', 0, h + 1.0, -0.1, 1.2, 0.4, 1.2, LP.stone));
      p.push(lpPart('dome', 0, h + 1.4, -0.1, 1.2, 0.9, 1.2, '#5f8f7a'));
    }
    return p;
  },

  factory(f, s, rng) {
    const p = [], w = s * 0.72, d = s * 0.52, h = 1.7 + f.tier * 0.15;
    p.push(lpPart('box', 0, 0, 0, w, h, d, '#b8c2cc'));
    const teeth = 2 + Math.min(3, f.tier);
    for (let i = 0; i < teeth; i++) {
      const x = -w / 2 + (w / teeth) * (i + 0.5);
      p.push(lpPart('prism', x, h, 0, w / teeth, 0.7, d, '#8796a5', Math.PI / 2));
    }
    p.push(lpPart('box', 0, 0, d / 2 + 0.03, w * 0.35, 1.1, 0.06, '#e89a3c'));
    const chimneys = 1 + (f.tier >= 3 ? 1 : 0) + (f.tier >= 5 ? 1 : 0);
    for (let i = 0; i < chimneys; i++) {
      const x = -w / 2 + 0.5 + i * 0.85, ch = 3 + f.tier * 0.8 - i * 0.4;
      p.push(lpPart('cyl', x, 0, -d / 2 + 0.35, 0.55, ch, 0.55, '#a0453a'));
      p.push(lpPart('cyl', x, ch - 0.6, -d / 2 + 0.35, 0.6, 0.25, 0.6, LP.white));
      for (let k = 0; k < 3; k++) {
        const sz = 0.5 + k * 0.25;
        p.push(lpPart('ico', x + k * 0.3 + rng() * 0.1, ch + 0.15 + k * 0.45, -d / 2 + 0.35 - k * 0.1, sz, sz * 0.8, sz, '#eceff2'));
      }
    }
    return p;
  },

  power(f, s) {
    const p = [], d = s * 0.6;
    p.push(lpPart('box', 0, 0, 0, s * 0.82, 0.12, s * 0.82, '#c9c6bd'));
    const towers = f.tier >= 4 ? 2 : 1, th = 2.2 + f.tier * 0.55;
    for (let i = 0; i < towers; i++) {
      const x = towers === 1 ? -s * 0.12 : -s * 0.2 + i * s * 0.36, r = 1.15 + f.tier * 0.12;
      p.push(lpPart('tcyl', x, 0.12, -d * 0.18, r * 2, th, r * 2, '#dcdcd6'));
      p.push(lpPart('cyl', x, 0.12 + th * 0.8, -d * 0.18, r * 1.62, 0.18, r * 1.62, '#c25b4a'));
      p.push(lpPart('ico', x, th + 0.1, -d * 0.18, r * 1.4, 0.9, r * 1.4, '#ffffff'));
      p.push(lpPart('ico', x + 0.3, th + 0.75, -d * 0.18 - 0.2, r * 1.0, 0.7, r * 1.0, '#f3f5f7'));
    }
    p.push(lpPart('box', s * 0.24, 0.12, d * 0.3, 0.7, 0.8, 0.5, '#6d7b88'));
    p.push(lpPart('box', s * 0.24, 0.92, d * 0.3, 0.2, 0.25, 0.2, '#ffd23f', 0, 1));
    p.push(lpPart('box', -s * 0.18, 0.12, d * 0.36, 0.5, 0.6, 0.5, '#6d7b88'));
    p.push(lpPart('box', 0, 0.75, d * 0.3 + 0.27, 0.45, 0.45, 0.04, '#ffd23f', Math.PI / 4, 1));
    return p;
  },

  warehouse(f, s, rng) {
    const p = [], w = s * 0.74, d = s * 0.5, h = 1.5 + f.tier * 0.2;
    p.push(lpPart('box', 0, 0, -0.2, w, h, d, '#c7a77f'));
    p.push(lpPart('prism', 0, h, -0.2, w + 0.1, 0.55, d + 0.1, '#7d6a58'));
    for (let i = 0; i < 2; i++) p.push(lpPart('box', -w * 0.22 + i * w * 0.44, 0, -0.2 + d / 2 + 0.03, w * 0.32, 1.1, 0.06, '#8d939b'));
    for (let i = 0; i < 2 + f.tier; i++) {
      const c = lpPick(rng, ['#b9824f', '#a06e40', '#c79560']);
      p.push(lpPart('box', -w / 2 + 0.4 + (i % 3) * 0.55, Math.floor(i / 3) * 0.45, d / 2 + 0.75, 0.45, 0.45, 0.45, c, rng() * 0.4));
    }
    if (f.tier >= 3) {
      p.push(lpPart('cyl', w / 2 + 0.1, 0, -0.2 - d / 2 + 0.3, 1.0, 2.2 + f.tier * 0.3, 1.0, '#d9d4c9'));
      p.push(lpPart('cone', w / 2 + 0.1, 2.2 + f.tier * 0.3, -0.2 - d / 2 + 0.3, 1.05, 0.5, 1.05, '#9e9a8f'));
    }
    return p;
  },

  shop(f, s, rng) {
    const p = [];
    const awning = lpPick(rng, ['#e4572e', '#29a3a3', '#f2a541', '#6a4c93', '#e85d75', '#3fa34d']);
    if (f.tier >= 4) {
      const w = s * 0.78, d = s * 0.6, h = 2.4 + (f.tier - 4) * 0.9;
      p.push(lpPart('box', 0, 0, 0, w, h, d, '#f4efe6'));
      p.push(lpPart('box', 0, 0.05, d / 2 + 0.03, w * 0.86, 1.2, 0.06, LP.glass, 0, 1));
      p.push(lpPart('box', 0, h, 0, w + 0.1, 0.18, d + 0.1, awning));
      p.push(lpPart('dome', 0, h + 0.18, 0, w * 0.5, 1.0, w * 0.5, '#bfe3f5', 0, 1));
      p.push(lpPart('box', 0, h - 0.7, d / 2 + 0.06, w * 0.5, 0.45, 0.06, awning, 0, 1));
      for (let i = 0; i < 5; i++) p.push(lpPart('box', -w * 0.4 + i * w * 0.2, 1.25, d / 2 + 0.35, w * 0.1, 0.06, 0.7, i % 2 ? awning : LP.white));
      return p;
    }
    const floors = f.tier, w = s * 0.62, d = s * 0.56, fh = 0.95, h = floors * fh + 0.2;
    p.push(lpPart('box', 0, 0, 0, w, h, d, lpPick(rng, LP.walls)));
    p.push(lpPart('box', 0, 0.08, d / 2 + 0.03, w * 0.8, 0.7, 0.06, LP.glass, 0, 1));
    const stripes = 5;
    for (let i = 0; i < stripes; i++) {
      p.push(lpPart('box', -w * 0.4 + (w * 0.8 / stripes) * (i + 0.5), 0.92, d / 2 + 0.3, w * 0.8 / stripes, 0.07, 0.6, i % 2 ? awning : LP.white));
    }
    p.push(lpPart('box', 0, 1.12, d / 2 + 0.05, w * 0.5, 0.24, 0.06, awning, 0, 1));
    if (floors > 1) lpWindowBands(p, w, d, fh + 0.4, floors - 1, fh);
    p.push(lpPart('box', 0, h, 0, w + 0.1, 0.12, d + 0.1, LP.stoneDark));
    return p;
  },

  bank(f, s) {
    const p = [], w = s * 0.7, d = s * 0.52, h = 2.1 + f.tier * 0.2;
    p.push(lpPart('box', 0, 0, 0.2, w + 0.4, 0.3, d + 0.9, LP.stoneDark));
    p.push(lpPart('box', 0, 0.3, -0.1, w, h, d, '#efe8d8'));
    lpColumns(p, f.tier >= 3 ? 6 : 4, w * 0.8, d / 2 + 0.25, 0.3, h, 0.26, LP.white);
    p.push(lpPart('box', 0, h + 0.3, 0.1, w + 0.15, 0.25, d + 0.6, LP.stone));
    p.push(lpPart('prism', 0, h + 0.55, 0.1, w + 0.15, 0.7, d + 0.6, '#eadfc7'));
    p.push(lpPart('box', 0, h + 0.35, d / 2 + 0.45, w * 0.4, 0.18, 0.04, LP.gold, 0, 1));
    p.push(lpPart('box', 0, 0.3, d / 2 - 0.05, 0.7, 1.2, 0.06, '#6b5a3a'));
    if (f.tier >= 4) {
      const th = 3 + (f.tier - 4) * 3;
      p.push(lpPart('box', 0, h + 0.3, -d / 2 + 0.4, 1.6, th, 1.2, '#e2d7bf'));
      lpWindowBands(p, 1.6, 1.2, h + 0.5, Math.round(th / 0.9), 0.9, '#ffe3a0');
      p.push(lpPart('cone4', 0, h + 0.3 + th, -d / 2 + 0.4, 1.8, 1.4, 1.4, LP.gold));
    }
    return p;
  },

  park(f, s, rng) {
    const p = [];
    p.push(lpPart('box', 0, 0, 0, s * 0.9, 0.06, s * 0.9, '#7cc26a'));
    if (f.tier >= 4) {
      p.push(lpPart('cyl', 0, 0.06, 0, 2.2, 0.35, 2.2, LP.stone));
      p.push(lpPart('cyl', 0, 0.12, 0, 1.9, 0.3, 1.9, '#5cc2e8', 0, 1));
      p.push(lpPart('cyl6', 0, 0.3, 0, 0.3, 0.9, 0.3, LP.stone));
      p.push(lpPart('ico', 0, 1.1, 0, 0.5, 0.5, 0.5, '#bfe9ff', 0, 1));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.6;
        p.push(...lpTree(rng, Math.cos(a) * s * 0.33, Math.sin(a) * s * 0.33, 0.8 + rng() * 0.3));
      }
      return p;
    }
    const n = f.tier;
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, r = n === 1 ? 0 : s * 0.22;
      p.push(...lpTree(rng, Math.cos(a) * r, Math.sin(a) * r, 0.75 + f.tier * 0.12 + rng() * 0.2));
    }
    const flowers = ['#ff6b9a', '#ffd23f', '#ff8c42', '#c77dff', '#ffffff'];
    for (let i = 0; i < 3; i++) {
      p.push(lpPart('ico', (rng() - 0.5) * s * 0.6, 0.06, (rng() - 0.5) * s * 0.6, 0.35, 0.25, 0.35, lpPick(rng, flowers)));
    }
    return p;
  }
};

export const LowPolyTheme = {
  id: 'lowpoly',
  name: 'Low poly',
  sky: { day: '#bfe3f7', night: '#0b1430', fogDay: '#d7ecf6', fogNight: '#0b1430' },
  ground: { grass: '#8fcf6b', asphalt: '#525865', ring: '#4a505c', sidewalk: '#ddd7c9', marking: '#f4f1e6', curb: '#bdb6a6', park: '#86c96a' },
  districtTints: ['#f6d6a8', '#cfe6f7', '#f4c7c3', '#d6ecc9', '#e6d4f2', '#fbe7a1', '#c9ece6', '#f7d1e3', '#dfe3c4', '#d3dbf5', '#f1dcc9', '#c8e4d4'],
  centerTint: '#ece5d6',
  building(file, lot, rng) {
    const fn = LP_BUILDERS[file.kind] || LP_BUILDERS.tower;
    return fn(file, lot.size, rng);
  },
  tree(rng, x, z, s) { return lpTree(rng, x, z, s); },
  roundabout(rb, rng) {
    const p = [], R = rb.radius;
    p.push(lpPart('cyl', rb.x, 0, rb.z, R * 2, 0.03, R * 2, '#525865'));
    p.push(lpPart('cyl', rb.x, 0, rb.z, R * 1.2, 0.16, R * 1.2, '#f4f1e6'));
    p.push(lpPart('cyl', rb.x, 0, rb.z, R * 1.08, 0.22, R * 1.08, '#7cc26a'));
    if (rb.traffic >= 6) {
      p.push(lpPart('cyl', rb.x, 0.22, rb.z, R * 0.55, 0.3, R * 0.55, LP.stone));
      const h = 1.2 + Math.log2(1 + rb.traffic) * 0.55;
      p.push(lpPart('cone4', rb.x, 0.52, rb.z, R * 0.22, h, R * 0.22, '#e9e2d0'));
      p.push(lpPart('ico', rb.x, 0.52 + h, rb.z, 0.22, 0.22, 0.22, LP.gold, 0, 1));
    } else {
      p.push(...lpTree(rng, rb.x, rb.z, Math.min(1.1, R * 0.35)).map((q) => { q[2] += 0.22; return q; }));
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      p.push(lpPart('ico', rb.x + Math.cos(a) * R * 0.4, 0.22, rb.z + Math.sin(a) * R * 0.4, 0.3, 0.22, 0.3, i % 2 ? '#ff6b9a' : '#ffd23f'));
    }
    return p;
  }
};

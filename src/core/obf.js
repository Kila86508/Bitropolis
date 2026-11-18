// Bitropolis — brouillage des modèles embarqués (dissuasion, pas une protection absolue :
// tout ce qu'un navigateur affiche peut finir par être capturé). Les données du pack sont chiffrées
// par flux (xoshiro128**) avec une graine dérivée d'un sel propre à chaque build, et les noms des
// modèles sont remplacés par des empreintes. Sans dépendance : tourne dans Node et dans le navigateur.

const OBF_PARTS = [0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1, 0xd3a2646c, 0xfd7046c5, 0xb55a4f09];

function obfMix(h, k) {
  k = Math.imul(k, 0xcc9e2d51); k = (k << 15) | (k >>> 17); k = Math.imul(k, 0x1b873593);
  h ^= k; h = (h << 13) | (h >>> 19); return (Math.imul(h, 5) + 0xe6546b64) | 0;
}
function obfFinal(h) {
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0;
}
function obfHashStr(s, seed) {
  let h = seed | 0;
  for (let i = 0; i < s.length; i++) h = obfMix(h, s.charCodeAt(i));
  return obfFinal(h ^ s.length);
}

// Graine (4 × 32 bits) dérivée du sel du build
export function obfSeed(salt) {
  return [0, 1, 2, 3].map((i) => obfHashStr(salt + ':' + i, OBF_PARTS[i] ^ OBF_PARTS[7 - i]) || 1);
}

// Empreinte d'un nom de modèle (16 caractères hexadécimaux)
export function obfName(name, salt) {
  return obfHashStr(name, obfHashStr(salt, OBF_PARTS[2])).toString(16).padStart(8, '0') +
    obfHashStr(name + '~', obfHashStr(salt, OBF_PARTS[5])).toString(16).padStart(8, '0');
}

// Chiffre / déchiffre sur place (XOR avec le flux : la même opération dans les deux sens)
export function obfXor(bytes, salt) {
  let [a, b, c, d] = obfSeed(salt);
  const n = bytes.length;
  for (let i = 0; i < n; i += 4) {
    const r = Math.imul(((Math.imul(b, 5) << 7) | (Math.imul(b, 5) >>> 25)), 9) >>> 0;
    const t = b << 9;
    c ^= a; d ^= b; b ^= c; a ^= d; c ^= t; d = (d << 11) | (d >>> 21);
    bytes[i] ^= r & 255;
    if (i + 1 < n) bytes[i + 1] ^= (r >>> 8) & 255;
    if (i + 2 < n) bytes[i + 2] ^= (r >>> 16) & 255;
    if (i + 3 < n) bytes[i + 3] ^= r >>> 24;
  }
  return bytes;
}

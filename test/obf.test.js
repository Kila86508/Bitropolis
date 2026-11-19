import { test } from 'node:test';
import assert from 'node:assert/strict';
import { obfXor, obfName } from '../src/core/obf.js';

test('brouillage des modèles : aller-retour exact, données méconnaissables', () => {
  const src = new Uint8Array(1000).map((_, i) => (i * 7) & 255);
  const enc = obfXor(src.slice(), 'sel-de-test');
  assert.notDeepEqual(enc, src);
  assert.ok(enc.filter((v, i) => v === src[i]).length < 30, 'presque aucun octet inchangé');
  assert.deepEqual(obfXor(enc, 'sel-de-test'), src);
  assert.notDeepEqual(obfXor(src.slice(), 'autre-sel'), enc);
});

test('noms de modèles masqués, stables pour un même sel', () => {
  assert.equal(obfName('Townhall_N8', 'a'), obfName('Townhall_N8', 'a'));
  assert.notEqual(obfName('Townhall_N8', 'a'), obfName('Townhall_N8', 'b'));
  assert.match(obfName('Townhall_N8', 'a'), /^[0-9a-f]{16}$/);
});

test('encodage des modèles : aller-retour exact (écarts + plans d\'octets)', async () => {
  const { encode16 } = await import('../scripts/assets.js');
  const { asDecode16 } = await import('../src/viewer/assets.js');
  const P = new Int16Array(3000), I = new Uint16Array(4000);
  for (let k = 0; k < P.length; k++) P[k] = ((k * 7919) % 65536) - 32768;
  for (let k = 0; k < I.length; k++) I[k] = (k * 104729) % 65536;
  for (const [src, stride, Ctor] of [[P, 3, Int16Array], [I, 1, Uint16Array]]) {
    const enc = encode16(src, stride);
    const buf = new ArrayBuffer(enc.length + 8); new Uint8Array(buf, 8).set(enc);
    assert.deepEqual(asDecode16(buf, 8, src.length, stride, Ctor), src);
  }
});

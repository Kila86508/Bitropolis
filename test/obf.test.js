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

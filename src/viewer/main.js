// Bitropolis — point d'entrée du visualiseur.
import { CityRenderer } from './render.js';
import { CityUI } from './ui.js';
import { assetsReady } from './assets.js';
import { t, applyI18n } from './i18n.js';

function bootBitropolis() {
  assetsReady(); // décompression des modèles en arrière-plan dès l'ouverture
  const readJSON = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch { return null; }
  };
  window.__BITROPOLIS_DEMO__ = readJSON('bitropolis-demo');
  const data = readJSON('bitropolis-data');
  let engine;
  try {
    engine = new CityRenderer(document.getElementById('city'));
  } catch (err) {
    applyI18n();
    document.getElementById('welcome').querySelector('.lead').textContent = t('webgl');
    throw err;
  }
  const ui = new CityUI(engine);
  // accès de débogage seulement avec ?dev dans l'adresse
  if (new URLSearchParams(location.search).has('dev')) window.bitropolis = { engine, ui };
  if (data && data.files) ui.load(data);
  else if (!window.__BITROPOLIS_DEMO__) document.getElementById('welcome-demo').hidden = true;
}
bootBitropolis();

// Bitropolis — interface : panneaux, recherche, légende, ouverture de dossier locale.
import { KINDS, HEALTH, analyzeProjectAsync } from '../core/analyze.js';
import { shouldSkipDir, shouldSkipFile, shouldReadContent, makeIgnoreMatcher, selectFiles, SCAN_LIMIT } from '../core/rules.js';
import { UPCOMING_THEMES, availableThemes, defaultThemeId } from './themes/index.js';
import { hasLandscapeAssets } from './landscape.js';
import { assetsReady } from './assets.js';
import { growthSnapshot, growthDiff } from '../core/catalog.js';
import { gifPalette, GifEncoder, videoFormat, downloadBlob } from './export.js';
import { t, tp, fmtNum, fmtBytes, kindLabel, kindRole, famName, modelName, applyI18n, getLang, setLang, UI_LANGS } from './i18n.js';

const $ = (sel) => document.querySelector(sel);
// Tracés SVG (grille de 24) du HUD : types de bâtiments, compteurs ; couleurs des bâtiments sur la mini-carte
const UI_KIND_ICON = {
  townhall: 'M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M3 10l9-6 9 6z',
  tower: 'M6 21V4h12v17M4 21h16M9.5 8h1M13.5 8h1M9.5 12h1M13.5 12h1M10.5 21v-4h3v4',
  shop: 'M3 9l2-5h14l2 5M3 9a3 3 0 0 0 6 0a3 3 0 0 0 6 0a3 3 0 0 0 6 0M5 12v8h14v-8M10 20v-4h4v4',
  bank: 'M4 5h16v13H4zM7 18v2M17 18v2M9 11.5a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 10v3',
  police: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4',
  fire: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z',
  hospital: 'M5 4h14v16H5zM12 8v8M8 12h8',
  library: 'M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v14',
  factory: 'M3 21V11l6 3.5V11l6 3.5V5h4v16H3z',
  power: 'M13 2L5 13h6l-1 9 8-11h-6z',
  warehouse: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8',
  park: 'M12 21v-7M7.5 14a4.5 4.5 0 0 1-1-8.5 5.5 5.5 0 0 1 11 0 4.5 4.5 0 0 1-1 8.5z'
};
const UI_STAT_ICON = {
  buildings: 'M4 21V8l6-4v17M10 21V11h10v10M3 21h18M14 14h2M14 17h2M6.5 11h1M6.5 14h1M6.5 17h1',
  lines: 'M4 6h16M4 10h10M4 14h13M4 18h8',
  districts: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  roads: 'M7 21L9 3M17 21L15 3M12 5v3M12 11v3M12 17v3',
  monuments: 'M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.4 6.7 19.1l1-5.8L3.5 9.2l5.9-.9z',
  links: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'
};
const UI_MINI_COLOR = { townhall: '#F5C95B', tower: '#5BA7E8', shop: '#F29BB2', bank: '#4CC2B0', police: '#3D6FD1', fire: '#E8644A', hospital: '#F3E6C8', library: '#B48AE0', factory: '#9AA7B5', power: '#F0B429', warehouse: '#C9A27A', park: '#3F9B57' };
const uiSvg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"></path></svg>`;
function uiEsc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const uiNum = fmtNum, uiBytes = fmtBytes;
function uiStars(t) { return '★'.repeat(t) + '☆'.repeat(5 - t); }
// Graine de campagne choisie avec 🎲, mémorisée par projet dans ce navigateur (jamais envoyée).
function uiLandKey(name) { return 'bitropolis.land:' + name; }
function uiLoadLandSeed(name) { try { return localStorage.getItem(uiLandKey(name)); } catch { return null; } }
function uiSaveLandSeed(name, seed) { try { if (seed) localStorage.setItem(uiLandKey(name), seed); else localStorage.removeItem(uiLandKey(name)); } catch {} }
// Dernier état connu de chaque bâtiment (pour animer ce qui a grandi depuis la dernière visite).
function uiLoadSnap(name) { try { return JSON.parse(localStorage.getItem('bitropolis.snap:' + name) || 'null'); } catch { return null; } }
function uiSaveSnap(name, snap) { try { localStorage.setItem('bitropolis.snap:' + name, JSON.stringify(snap)); } catch {} }
function uiTierName(f) { return f.kind === 'tower' ? t('tier.tower')[f.tier - 1] : t('tier.level', { n: f.tier }); }

// ---- Lecture locale d'un dossier dans le navigateur (aucun envoi réseau)
// Rend la main au navigateur (barre de progression, page réactive)
const uiYield = () => new Promise((r) => setTimeout(r, 0));

async function uiReadFiles(entries, rootName, onProgress) {
  // entries : [{ path, file }] ; onProgress(clé de texte, variables, fraction 0–1)
  const gi = entries.find((e) => e.path === '.gitignore');
  const ignored = makeIgnoreMatcher(gi ? await gi.file.text() : '');
  // tri des fichiers (.gitignore, dossiers ignorés) : la décision de chaque dossier est mémorisée,
  // et on rend la main régulièrement (près de 100 000 fichiers pour le noyau Linux)
  const dirOk = new Map();
  const okDir = (dir) => {
    if (!dir) return true;
    let v = dirOk.get(dir);
    if (v === undefined) {
      const i = dir.lastIndexOf('/');
      v = okDir(i < 0 ? '' : dir.slice(0, i)) && !shouldSkipDir(dir.slice(i + 1)) && !ignored(dir, true);
      dirOk.set(dir, v);
    }
    return v;
  };
  const kept = [];
  let t0 = performance.now();
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i], j = e.path.lastIndexOf('/');
    if (okDir(j < 0 ? '' : e.path.slice(0, j)) && !shouldSkipFile(e.path.slice(j + 1)) && !ignored(e.path, false)) kept.push(e);
    if (performance.now() - t0 > 40) { onProgress('load.filter', { i: uiNum(i), n: uiNum(entries.length) }, 0.05 + 0.1 * (i / entries.length)); await uiYield(); t0 = performance.now(); }
  }
  // gros projets : on choisit les fichiers représentatifs avant de les lire (voir selectFiles)
  const chosen = selectFiles(kept.map((e) => ({ path: e.path, size: e.file.size, file: e.file })));
  const out = [];
  let i = 0;
  for (const e of chosen) {
    let content = null;
    if (shouldReadContent(e.path, e.file.size)) {
      try {
        const txt = await e.file.text();
        if (!txt.slice(0, 8000).includes('\u0000')) content = txt;
      } catch {}
    }
    out.push({ path: e.path, size: e.file.size, content });
    if (++i % 50 === 0) { onProgress('load.read', { i: uiNum(i), n: uiNum(chosen.length) }, 0.15 + 0.45 * (i / chosen.length)); await uiYield(); }
  }
  return analyzeProjectAsync(out, { name: rootName, skipped: kept.length - chosen.length }, (p) => {
    const f = p.n ? p.i / p.n : 0;
    if (p.step === 'metrics') onProgress('load.metrics', { i: uiNum(p.i), n: uiNum(p.n) }, 0.6 + 0.25 * f);
    else onProgress('load.links', { i: uiNum(p.i), n: uiNum(p.n) }, 0.85 + 0.08 * f);
  });
}

function uiFromFileList(list) {
  const arr = [...list];
  if (!arr.length) return { entries: [], root: 'projet' };
  const root = (arr[0].webkitRelativePath || arr[0].name).split('/')[0];
  return {
    root,
    entries: arr.map((f) => ({ path: (f.webkitRelativePath || f.name).split('/').slice(1).join('/') || f.name, file: f }))
  };
}

async function uiFromDrop(items, onCount) {
  const entries = [];
  let root = 'projet';
  const roots = [...items].map((it) => it.webkitGetAsEntry && it.webkitGetAsEntry()).filter(Boolean);
  const readAll = (reader) => new Promise((res) => {
    const acc = [];
    const next = () => reader.readEntries((batch) => { if (!batch.length) res(acc); else { acc.push(...batch); next(); } }, () => res(acc));
    next();
  });
  let last = 0;
  const fileOf = (entry) => new Promise((res, rej) => entry.file(res, rej)).catch(() => null);
  // les fichiers d'un même dossier sont demandés en parallèle (beaucoup plus rapide sur un gros projet)
  const walkDir = async (children, prefix) => {
    if (entries.length > SCAN_LIMIT) return;
    const files = children.filter((c) => c.isFile);
    const got = await Promise.all(files.map(fileOf));
    got.forEach((file, i) => { if (file) entries.push({ path: prefix + files[i].name, file }); });
    if (onCount && entries.length - last >= 500) { last = entries.length; onCount(entries.length); }
    for (const d of children) {
      if (!d.isDirectory || shouldSkipDir(d.name)) continue;
      await walkDir(await readAll(d.createReader()), prefix + d.name + '/');
    }
  };
  if (roots.length === 1 && roots[0].isDirectory) {
    root = roots[0].name;
    await walkDir(await readAll(roots[0].createReader()), '');
  } else {
    await walkDir(roots, '');
  }
  return { root, entries };
}

export class CityUI {
  constructor(engine) {
    this.engine = engine;
    this.analysis = null;
    this.themeId = defaultThemeId();
    applyI18n();
    this._hudFit();
    window.addEventListener('resize', () => this._hudFit());
    this._help();
    this._bind();
    setInterval(() => this._miniDraw(), 120);
    this._themes();
    this._langs();
  }

  _themes() {
    const sel = $('#theme');
    const fill = () => {
      sel.innerHTML = availableThemes().map((th) => `<option value="${th.id}"${th.id === this.themeId ? ' selected' : ''}>${uiEsc(t('theme.' + th.id))}</option>`).join('') +
        UPCOMING_THEMES.map((th) => `<option disabled>${uiEsc(t('theme.soon', { name: t('theme.' + th.id) }))}</option>`).join('');
    };
    fill();
    this._fillThemes = fill;
    sel.addEventListener('change', () => { this.themeId = sel.value; if (this.analysis) this.load(this.analysis); });
  }

  // Sélecteur de langue : traduit l'interface et reconstruit la ville (légende, étiquettes 3D)
  _langs() {
    const sel = $('#lang');
    if (!sel) return;
    sel.innerHTML = UI_LANGS.map((l) => `<option value="${l.code}"${l.code === getLang() ? ' selected' : ''}>${uiEsc(l.name)}</option>`).join('');
    sel.addEventListener('change', () => {
      setLang(sel.value);
      applyI18n();
      this._help();
      this._fillThemes();
      if (this.analysis) { this._noEvolution = true; this.load(this.analysis); }
    });
  }

  _bind() {
    const e = this.engine, canvas = e.canvas;
    const toggle = (btn, fn) => {
      btn.addEventListener('click', () => { const on = !btn.classList.contains('on'); btn.classList.toggle('on', on); fn(on); });
    };
    // jour / nuit : deux boutons, que le cycle automatique met à jour
    const dayNight = (on) => {
      $('#btn-night').classList.toggle('on', on); $('#btn-night').setAttribute('aria-pressed', String(on));
      $('#btn-day').classList.toggle('on', !on); $('#btn-day').setAttribute('aria-pressed', String(!on));
    };
    $('#btn-night').addEventListener('click', () => { e.setNight(true); dayNight(true); });
    $('#btn-day').addEventListener('click', () => { e.setNight(false); dayNight(false); });
    e.onNightChange = dayNight;
    dayNight(false);
    toggle($('#btn-deps'), (on) => e.setDeps(on));
    toggle($('#btn-traffic'), (on) => e.setTraffic(on));
    toggle($('#btn-labels'), (on) => e.setLabels(on));
    // santé du code : icônes dans la ville + rapport dans le panneau
    toggle($('#btn-health'), (on) => { e.setHealth(on); if (on) this._healthReport(); else if (this._healthOpen) this.select(null); });
    $('#btn-home').addEventListener('click', () => e.resetView());
    const landBtn = $('#btn-land');
    if (!hasLandscapeAssets()) landBtn.hidden = true;
    landBtn.addEventListener('click', (ev) => {
      const name = this.analysis?.name;
      if (!name) return;
      const seed = ev.shiftKey ? name : name + '#' + Math.random().toString(36).slice(2, 8);
      const plan = e.setLandSeed(seed);
      uiSaveLandSeed(name, ev.shiftKey ? null : seed);
      if (plan) this.toast(ev.shiftKey ? t('toast.land.orig') : t('toast.land.new', { n: uiNum(plan.stats.objects) }));
    });
    // export : menu image / GIF / vidéo
    const menu = $('#export-menu');
    $('#btn-shot').addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (!menu.hidden) { menu.hidden = true; return; }
      const r = $('#btn-shot').getBoundingClientRect();
      // le bouton est en bas à droite : le menu s'ouvre au-dessus
      menu.style.left = `${Math.max(8, Math.min(window.innerWidth - 284, r.right - 260))}px`;
      menu.style.top = '';
      menu.style.bottom = `${window.innerHeight - r.top + 12}px`;
      menu.hidden = false;
    });
    document.addEventListener('click', (ev) => { if (!ev.target.closest('#export-menu')) menu.hidden = true; });
    menu.addEventListener('click', (ev) => { const b = ev.target.closest('[data-export]'); if (!b) return; menu.hidden = true; this._export(b.dataset.export); });
    // effets : qualité des shaders, météo, nuages — mémorisés d'une visite à l'autre
    const fxMenu = $('#fx-menu'), fx = { quality: 'std', weather: 'clear', clouds: true };
    try { Object.assign(fx, JSON.parse(localStorage.getItem('bitropolis.fx') || '{}')); } catch {}
    const fxApply = (save) => {
      const got = e.setQuality(fx.quality);
      if (got !== fx.quality) { fx.quality = got; if (save) this.toast(t('fx.nohigh')); }
      fx.weather = e.setWeather(fx.weather);
      e.setClouds(fx.clouds);
      for (const b of fxMenu.querySelectorAll('[data-fx]')) b.classList.toggle('on', b.dataset.fx === 'clouds' ? !!fx.clouds : fx[b.dataset.fx] === b.dataset.v);
      $('#btn-fx').classList.toggle('on', fx.quality !== 'std' || fx.weather !== 'clear');
      if (save) try { localStorage.setItem('bitropolis.fx', JSON.stringify(fx)); } catch {}
    };
    fxApply(false);
    $('#btn-fx').addEventListener('click', (ev) => {
      ev.stopPropagation();
      menu.hidden = true;
      if (!fxMenu.hidden) { fxMenu.hidden = true; return; }
      const r = $('#btn-fx').getBoundingClientRect();
      // le bouton est dans la colonne de droite : le menu s'ouvre à sa gauche
      fxMenu.style.left = `${Math.max(8, r.left - 296)}px`;
      fxMenu.style.bottom = '';
      fxMenu.style.top = `${Math.max(8, Math.min(window.innerHeight - 300, r.top - 110))}px`;
      fxMenu.hidden = false;
    });
    document.addEventListener('click', (ev) => { if (!ev.target.closest('#fx-menu')) fxMenu.hidden = true; });
    fxMenu.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-fx]');
      if (!b) return;
      if (b.dataset.fx === 'clouds') fx.clouds = !fx.clouds; else fx[b.dataset.fx] = b.dataset.v;
      fxApply(true);
    });
    $('#btn-open').addEventListener('click', () => $('#folder-input').click());
    $('#welcome-open').addEventListener('click', () => $('#folder-input').click());
    $('#folder-input').addEventListener('change', async (ev) => {
      const { root, entries } = uiFromFileList(ev.target.files);
      ev.target.value = '';
      if (entries.length) this._ingest(root, entries);
    });
    $('#welcome-demo').addEventListener('click', () => { const d = window.__BITROPOLIS_DEMO__; if (d) this.load(d); });
    // guide « stades et routes », types de bâtiments, mini-carte
    const guide = $('#guide'), guideBtn = $('#legend-toggle');
    guideBtn.addEventListener('click', (ev) => { ev.stopPropagation(); guide.hidden = !guide.hidden; guideBtn.setAttribute('aria-expanded', String(!guide.hidden)); });
    document.addEventListener('click', (ev) => { if (!ev.target.closest('#guide')) { guide.hidden = true; guideBtn.setAttribute('aria-expanded', 'false'); } });
    $('#legend-items').addEventListener('click', (ev) => { const b = ev.target.closest('[data-kind]'); if (b) this._pickKind(b.dataset.kind); });
    const mini = $('#minimap-canvas');
    mini.addEventListener('pointerdown', (ev) => { mini.setPointerCapture(ev.pointerId); this._miniGo(ev); });
    mini.addEventListener('pointermove', (ev) => { if (ev.buttons & 1) this._miniGo(ev); });
    $('#panel-close').addEventListener('click', () => this.select(null));

    // glisser-déposer un dossier n'importe où
    let dragDepth = 0;
    window.addEventListener('dragenter', (ev) => { ev.preventDefault(); dragDepth++; document.body.classList.add('dragging'); });
    window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dragging'); } });
    window.addEventListener('dragover', (ev) => ev.preventDefault());
    window.addEventListener('drop', async (ev) => {
      ev.preventDefault(); dragDepth = 0; document.body.classList.remove('dragging');
      if (!ev.dataTransfer?.items?.length) return;
      this._loading(t('load.list', { n: 0 }), null);
      const { root, entries } = await uiFromDrop(ev.dataTransfer.items, (n) => this._loading(t('load.list', { n: uiNum(n) }), null));
      if (entries.length) this._ingest(root, entries); else this._loading(null);
    });

    // survol / clic
    let raf = 0, last = null;
    canvas.addEventListener('pointermove', (ev) => {
      last = ev;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (e.controls.pointers.size) { this._tooltip(null); return; }
        const hit = e.pick(last.clientX, last.clientY);
        e.hover(hit);
        this._tooltip(hit, last.clientX, last.clientY);
        canvas.style.cursor = hit ? 'pointer' : 'grab';
      });
    });
    canvas.addEventListener('pointerleave', () => { e.hover(null); this._tooltip(null); });
    canvas.addEventListener('pointerup', (ev) => {
      if (e.controls.moved > 6 || ev.button !== 0) return;
      const hit = e.pick(ev.clientX, ev.clientY);
      if (!hit) { this.select(null); return; }
      if (hit.type === 'file') this.select(hit.id);
      else this._showRoundabout(hit.index);
    });
    canvas.addEventListener('dblclick', (ev) => {
      const hit = e.pick(ev.clientX, ev.clientY);
      if (hit?.type === 'file') e.focus(hit.id);
      else if (hit?.type === 'roundabout') { const r = e.roundabouts[hit.index]; e.focusPoint(r.x, r.z, 26); }
    });
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') { this.select(null); $('#search').blur(); }
      if (ev.key === '/' && document.activeElement !== $('#search')) { ev.preventDefault(); $('#search').focus(); }
    });

    // recherche
    const input = $('#search'), list = $('#search-results');
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q || !this.analysis) { list.innerHTML = ''; list.hidden = true; return; }
      const res = this.analysis.files.filter((f) => f.path.toLowerCase().includes(q))
        .sort((a, b) => (a.name.toLowerCase().startsWith(q) ? -1 : 0) - (b.name.toLowerCase().startsWith(q) ? -1 : 0) || a.rank - b.rank)
        .slice(0, 12);
      list.innerHTML = res.map((f) => `<button data-id="${f.id}"><span>${KINDS[f.kind].icon}</span><b>${uiEsc(f.name)}</b><small>${uiEsc(f.dir || '/')}</small></button>`).join('') || `<div class="empty">${uiEsc(t('search.none'))}</div>`;
      list.hidden = false;
    });
    input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') list.querySelector('button')?.click(); });
    list.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-id]');
      if (!b) return;
      const id = +b.dataset.id;
      this.select(id); e.focus(id);
      list.hidden = true; input.value = ''; input.blur();
    });
    document.addEventListener('click', (ev) => { if (!ev.target.closest('.search')) list.hidden = true; });
    $('#panel').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-goto]');
      if (b) { const id = +b.dataset.goto; this.select(id); e.focus(id); }
    });
  }

  async _ingest(root, entries) {
    this._loading(t('load.analyze', { name: root }), 0.03);
    await uiYield();
    try {
      const analysis = await uiReadFiles(entries, root, (key, vars, frac) => this._loading(t(key, vars), frac));
      if (!analysis.files.length) { this._loading(null); this.toast(t('toast.nofiles')); return; }
      this.load(analysis);
    } catch (err) {
      console.error(err);
      this._loading(null);
      this.toast(t('toast.analyzeErr', { msg: err.message }));
    }
  }

  // Écran de chargement : texte et barre (frac 0–1 ; null = progression inconnue, barre animée)
  _loading(text, frac = null) {
    const el = $('#loading');
    if (!text) { el.hidden = true; return; }
    el.hidden = false; el.querySelector('span').textContent = text;
    const bar = el.querySelector('.bar');
    bar.classList.toggle('indeterminate', frac == null);
    if (frac != null) bar.querySelector('em').style.width = `${Math.round(Math.min(1, Math.max(0, frac)) * 100)}%`;
  }

  load(analysis) {
    this._loading(t('load.build'), 0.95);
    setTimeout(async () => {
      try {
        await assetsReady();
        this.analysis = analysis;
        this.engine.landSeed = uiLoadLandSeed(analysis.name);
        this.engine.landSeedFor = analysis.name;
        const city = this.engine.load(analysis, this.themeId);
        $('#welcome').hidden = true;
        document.body.classList.add('has-city');
        this._stats(analysis, city);
        this._legend(analysis);
        this._miniBuild();
        this.select(null);
        if (this._noEvolution) this._noEvolution = false; else this._evolution(analysis);
        document.title = `${analysis.name} — Bitropolis`;
        if (analysis.truncated) this.toast(t('toast.truncated', { n: uiNum(analysis.truncated) }));
      } catch (err) {
        console.error(err);
        this.toast(t('toast.buildErr', { msg: err.message }));
      }
      this._loading(null);
    }, 30);
  }

  // Compare avec le scan précédent (intégré par la CLI, sinon mémorisé par ce navigateur) et anime les changements.
  _evolution(a) {
    this.evolution = null;
    const cur = growthSnapshot(a.files, a.generatedAt);
    const prev = (a.previous && a.previous.files ? a.previous : null) || uiLoadSnap(a.name);
    uiSaveSnap(a.name, cur);
    if (!prev || prev.at === cur.at) return;
    const { grown, added, removed } = growthDiff(prev, cur);
    const byPath = new Map(a.files.map((f) => [f.path, f]));
    const fam = (m) => m.replace(/_[NL]\d+$/, '');
    const stage = (m) => (/_[NL](\d+)$/.exec(m) || [])[1] || '';
    const events = [
      ...grown.map((g) => ({
        id: byPath.get(g.path).id, type: 'grown',
        label: fam(g.from) === fam(g.to) ? `${modelName(g.from)} → N${stage(g.to)}` : `${modelName(g.from)} → ${modelName(g.to)}`
      })),
      ...added.map((p) => ({ id: byPath.get(p).id, type: 'new', label: '🆕 ' + byPath.get(p).name }))
    ];
    this.evolution = { grown: grown.length, added: added.length, removed: removed.length, labels: new Map(events.map((e) => [e.id, e.label])) };
    if (events.length) this.engine.animateGrowth(events);
    const parts = [];
    if (grown.length) parts.push(tp('evo.grown', grown.length));
    if (added.length) parts.push(tp('evo.added', added.length));
    if (removed.length) parts.push(tp('evo.removed', removed.length));
    if (parts.length) setTimeout(() => this.toast(parts.join(' · ') + t('evo.since')), 900);
  }

  _stats(a, city) {
    const name = $('#project-name');
    name.textContent = a.name; name.title = a.name;
    const rows = [
      ['buildings', uiNum(a.stats.files), t('stat.buildings')], ['lines', uiNum(a.stats.loc), t('stat.lines')],
      ['districts', uiNum(city.districts.length), t('stat.districts')], ['roads', uiNum(city.roads.length), t('stat.roads')],
      ['monuments', uiNum(city.roundabouts.length), t(city.grid ? 'stat.monuments' : 'stat.roundabouts')], ['links', uiNum(a.stats.edges), t('stat.links')]
    ];
    $('#stats').innerHTML = rows.map(([i, v, l]) => `<div class="counter" title="${uiEsc(v + ' ' + l)}">${uiSvg(UI_STAT_ICON[i])}<span><b>${v}</b><small>${uiEsc(l)}</small></span></div>`).join('');
  }

  // Barre du bas : un bouton par type de bâtiment présent dans la ville, et le guide « stades et routes »
  _legend(a) {
    const counts = a.stats.kinds, kinds = Object.keys(KINDS).filter((k) => counts[k]);
    $('#legend-items').innerHTML = kinds.map((k) => `<button type="button" class="type" data-kind="${k}" title="${uiEsc(kindRole(k))}">${uiSvg(UI_KIND_ICON[k] || UI_KIND_ICON.tower)}<span class="nm">${uiEsc(kindLabel(k))}</span><em>${uiNum(counts[k])}</em></button>`).join('');
    this._pickKind(kinds.includes(this._kind) ? this._kind : kinds.slice().sort((x, y) => counts[y] - counts[x])[0]);
    const grid = this.engine.city && this.engine.city.grid;
    const part = (key, bars) => `<div><h4>${uiEsc(t(key + '.t'))}</h4>${bars ? `<div class="bars" aria-hidden="true">${[10, 15, 20, 25, 30, 35, 40, 46].map((h) => `<i style="height:${h}px"></i>`).join('')}</div>` : ''}<p>${uiEsc(t(key + '.d'))}</p></div>`;
    $('#guide').innerHTML = grid ? part('lg.stages', true) + part('lg.roads') + part('lg.monuments') : part('lg.levels', true) + part('lg.rb');
    $('#legend-toggle span:last-child').textContent = grid ? t('hud.guide') : `${t('lg.levels.t')} · ${t('lg.rb.t')}`;
  }

  // ---- HUD
  // Le HUD est dessiné pour 1920 × 1080 : on le met à l'échelle de la fenêtre, puis on masque ce qui ne tient plus.
  _hudFit() {
    const w = window.innerWidth, h = window.innerHeight, z = Math.max(0.5, Math.min(1.25, w / 1920, h / 1000));
    document.documentElement.style.setProperty('--hud-zoom', z.toFixed(3));
    const vw = w / z, vh = h / z, c = document.body.classList;
    c.toggle('hud-mid', vw < 1900);     // compteurs sans libellé
    c.toggle('hud-narrow', vw < 1640);  // plus de compteurs
    c.toggle('hud-compact', vw < 1240); // téléphone : ni mini-carte ni aide, barre défilante
    c.toggle('hud-short', vh < 1000);
  }

  // Aide des gestes : « Glisser : tourner · … » → un mot-clé en gras par geste
  _help() {
    $('#help').innerHTML = t('help').split(' · ').map((s) => {
      const i = s.search(/[:：]/);
      return i < 0 ? `<span>${uiEsc(s)}</span>` : `<span><b>${uiEsc(s.slice(0, i).trim())}</b> ${uiEsc(s.slice(i + 1).trim())}</span>`;
    }).join('');
  }

  // Type de bâtiment mis en avant dans la barre du bas
  _pickKind(k) {
    if (!k || !this.analysis) return;
    this._kind = k;
    const n = this.analysis.stats.kinds[k] || 0;
    for (const b of document.querySelectorAll('#legend-items .type')) {
      const on = b.dataset.kind === k;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    }
    $('#sel-path').setAttribute('d', UI_KIND_ICON[k] || UI_KIND_ICON.tower);
    $('#sel-name').textContent = kindLabel(k);
    $('#sel-desc').textContent = kindRole(k);
    $('#sel-count').textContent = `${uiNum(n)} ${t(n > 1 ? 'stat.buildings' : 'hud.b1')}`;
  }

  // Mini-carte : la ville vue du dessus (nord en haut), dessinée une fois par ville…
  _miniBuild() {
    const c = this.engine.city, cv = $('#minimap-canvas');
    this._mini = null;
    if (!c || !cv || !this.analysis) return;
    const S = cv.width, base = document.createElement('canvas');
    base.width = base.height = S;
    const g = base.getContext('2d'), half = Math.max(20, (c.size || 100) / 2 + (c.ring || 0) + 6), k = S / (2 * half);
    const X = (x) => S / 2 + x * k, Y = (z) => S / 2 + z * k;
    g.fillStyle = '#A6D785'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#8CC8E8';
    for (const w of c.water || []) g.fillRect(X(w.x) - 2.1 * k, Y(w.z) - 2.1 * k, 4.2 * k, 4.2 * k);
    g.strokeStyle = '#EDF1F4'; g.lineCap = 'round';
    for (const r of c.roads || []) {
      if (r.x1 === undefined) continue;
      g.lineWidth = Math.max(2, (r.w || 1.6) * k * 1.5);
      g.beginPath(); g.moveTo(X(r.x1), Y(r.z1)); g.lineTo(X(r.x2), Y(r.z2)); g.stroke();
    }
    for (const f of this.analysis.files) {
      const lot = c.lots[f.id];
      if (!lot || lot.x === undefined) continue;
      const s = Math.max(4, (lot.size || 3) * k * 0.86);
      g.fillStyle = UI_MINI_COLOR[f.kind] || '#F3E6C8';
      g.beginPath();
      if (g.roundRect) g.roundRect(X(lot.x) - s / 2, Y(lot.z) - s / 2, s, s, Math.min(3, s / 3)); else g.rect(X(lot.x) - s / 2, Y(lot.z) - s / 2, s, s);
      g.fill();
    }
    this._mini = { base, half, k, S };
    this._miniDraw();
  }
  // … puis, plusieurs fois par seconde, le champ de vision : là où les quatre coins de l'écran touchent le sol
  _miniDraw() {
    const m = this._mini;
    if (!m || !document.body.classList.contains('has-city') || document.body.classList.contains('hud-compact')) return;
    const g = $('#minimap-canvas').getContext('2d'), e = this.engine, cam = e.camera, S = m.S;
    g.drawImage(m.base, 0, 0);
    const reach = e.controls.radius * 3 + 60;
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => {
      const d = new THREE.Vector3(x, y, 0.5).unproject(cam).sub(cam.position).normalize();
      const far = Math.min(d.y < -0.01 ? -cam.position.y / d.y : Infinity, reach);
      return [S / 2 + (cam.position.x + d.x * far) * m.k, S / 2 + (cam.position.z + d.z * far) * m.k];
    });
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fillStyle = 'rgba(255, 255, 255, 0.22)'; g.fill();
    g.lineWidth = 5; g.lineJoin = 'round'; g.strokeStyle = '#fff'; g.stroke();
  }
  // un clic (ou un glissé) sur la mini-carte y amène la vue
  _miniGo(ev) {
    const m = this._mini;
    if (!m) return;
    const r = $('#minimap-canvas').getBoundingClientRect(), b = 6 / 196; // bordure blanche
    const u = ((ev.clientX - r.left) / r.width - b) / (1 - 2 * b), v = ((ev.clientY - r.top) / r.height - b) / (1 - 2 * b);
    const c = this.engine.controls;
    c.goal.target.set((u - 0.5) * 2 * m.half, 0, (v - 0.5) * 2 * m.half);
    c.clampTarget();
    c.autoRotate = false;
  }

  _tooltip(hit, x, y) {
    const tip = $('#tooltip');
    if (!hit) { tip.hidden = true; return; }
    if (hit.type === 'file') {
      const f = this.analysis.files[hit.id];
      const lot = this.engine.city.lots[f.id];
      const level = lot && lot.model ? `${uiEsc(famName(lot.family, lot.familyName))} · ${t('tip.stage', { s: lot.stage, n: lot.stages })}` : `${uiTierName(f)} <i>${uiStars(f.tier)}</i>`;
      tip.innerHTML = `<b>${KINDS[f.kind].icon} ${uiEsc(f.name)}</b><span>${uiEsc(kindLabel(f.kind))} · ${level}</span><small>${uiEsc(f.dir || '/')} · ${t('tip.lines', { n: uiNum(f.loc) })}</small>`;
    } else if (this.engine.city.grid) {
      const r = this.engine.roundabouts[hit.index];
      tip.innerHTML = `<b>${t('tip.mon.t')}</b><span>${t('tip.mon.d', { n: uiNum(r.traffic) })}</span><small>${uiEsc(r.labels[0])} ⇄ ${uiEsc(r.labels[1])}</small>`;
    } else {
      const r = this.engine.roundabouts[hit.index];
      tip.innerHTML = `<b>${t('tip.rb.t')}</b><span>${t('tip.rb.d', { n: uiNum(r.traffic) })}</span><small>${uiEsc(r.labels[0])} ⇄ ${uiEsc(r.labels[1])}</small>`;
    }
    tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(window.innerWidth - w - 10, x + 16) + 'px';
    tip.style.top = Math.min(window.innerHeight - h - 10, y + 16) + 'px';
  }

  select(id) {
    this.engine.select(id);
    const panel = $('#panel');
    if (id == null) { panel.classList.remove('open'); return; }
    this._healthOpen = false;
    const a = this.analysis, f = a.files[id], k = KINDS[f.kind];
    const link = (j) => this._fileLink(j);
    const metrics = [
      [t('m.loc'), uiNum(f.loc)], [t('m.size'), uiBytes(f.size)], [t('m.funcs'), uiNum(f.funcs)],
      [t('m.classes'), uiNum(f.classes)], [t('m.branches'), uiNum(f.branches)], [t('m.todos'), uiNum(f.todos)],
      [t('m.lang'), uiEsc(f.lang === 'Fichier' ? t('lang.file') : f.lang === 'Texte' ? t('lang.text') : f.lang)], [t('m.rank'), `#${f.rank} / ${a.files.length}`], [t('m.external'), uiNum(f.external)]
    ];
    $('#panel-body').innerHTML = `
      <div class="kind">${k.icon} ${uiEsc(kindLabel(f.kind))}<small>${uiEsc(kindRole(f.kind))}</small></div>
      <h2>${uiEsc(f.name)}</h2>
      <div class="path">${uiEsc(f.path)}</div>
      ${this._growthHTML(f)}
      ${this._warnHTML(f)}
      <div class="metrics">${metrics.map(([l, v]) => `<div><small>${l}</small><b>${v}</b></div>`).join('')}</div>
      <h3><i class="dot out"></i>${t('p.uses')} <em>${f.imports.length}</em></h3>
      <div class="deps">${f.imports.map(link).join('') || `<p class="none">${uiEsc(t('p.noDeps'))}</p>`}</div>
      <h3><i class="dot in"></i>${t('p.usedBy')} <em>${f.importedBy.length}</em></h3>
      <div class="deps">${f.importedBy.map(link).join('') || `<p class="none">${uiEsc(t('p.noUsers'))}</p>`}</div>`;
    panel.classList.add('open');
  }

  _fileLink(j) {
    const g = this.analysis.files[j];
    return `<button class="dep" data-goto="${j}"><span>${KINDS[g.kind].icon}</span>${uiEsc(g.name)}<small>${uiEsc(g.dir || '/')}</small></button>`;
  }

  // Alertes de santé d'un fichier (fiche du bâtiment)
  _warnHTML(f) {
    if (!f.h) return '';
    const w = [];
    if (f.h & HEALTH.HUGE) w.push(`🔥 ${t('w.huge', { n: uiNum(f.loc) })}`);
    if (f.h & HEALTH.CYCLE) w.push(`🔄 ${t('w.cycle')}`);
    if (f.h & HEALTH.COMPLEX) w.push(`🌀 ${t('w.complex', { n: uiNum(f.branches) })}`);
    if (f.h & HEALTH.TODO) w.push(`🚧 ${t('w.todo', { n: uiNum(f.todos) })}`);
    if (f.h & HEALTH.ORPHAN) w.push(`👻 ${t('w.orphan')}`);
    return `<div class="warn">${w.map((x) => `<span>${uiEsc(x)}</span>`).join('')}</div>`;
  }

  // Rapport « santé du code » : ce qui mérite un coup d'œil, avec des liens vers les bâtiments
  _healthReport() {
    const a = this.analysis, H = a && a.health;
    if (!H) return;
    this.engine.select(null);
    const files = a.files;
    const top = (bit, key) => files.filter((f) => f.h & bit).sort((x, y) => y[key] - x[key]);
    const section = (icon, label, list) => {
      if (!list.length) return '';
      const more = list.length > 6 ? `<p class="health-more">${uiEsc(t('health.more', { n: uiNum(list.length - 6) }))}</p>` : '';
      return `<h3>${icon} ${uiEsc(t(label))} <em>${uiNum(list.length)}</em></h3><div class="deps">${list.slice(0, 6).map((f) => this._fileLink(f.id)).join('')}</div>${more}`;
    };
    let cycles = '';
    if (H.cycleGroups) {
      cycles = `<h3>🔄 ${uiEsc(t('health.cycle'))} <em>${uiNum(H.cycleGroups)}</em></h3>` +
        H.cycles.slice(0, 3).map((g) => `<p class="health-more">${uiEsc(t('health.loop', { n: uiNum(g.length) }))}</p><div class="deps">${g.slice(0, 5).map((j) => this._fileLink(j)).join('')}</div>`).join('');
    }
    const body = section('🔥', 'health.huge', top(HEALTH.HUGE, 'loc')) + cycles +
      section('🌀', 'health.complex', top(HEALTH.COMPLEX, 'branches')) + section('🚧', 'health.todo', top(HEALTH.TODO, 'todos')) +
      section('👻', 'health.orphan', top(HEALTH.ORPHAN, 'loc'));
    $('#panel-body').innerHTML = `
      <div class="kind">${t('health.title')}<small>${uiEsc(t('health.sub'))}</small></div>
      ${body || `<p class="none">${uiEsc(t('health.none'))}</p>`}`;
    $('#panel').classList.add('open');
    this._healthOpen = true;
  }

  // --- Export : image PNG, GIF animé (tour complet), vidéo timelapse de la construction
  async _export(kind) {
    if (!this.analysis || this._exporting) return;
    const name = (this.analysis.name || 'ville').replace(/[^\w-]+/g, '_');
    if (kind === 'png') { downloadBlob(await (await fetch(this.engine.screenshot())).blob(), `bitropolis-${name}.png`); return; }
    this._exporting = true;
    try {
      if (kind === 'gif') await this._exportGif(name);
      else await this._exportVideo(name);
    } catch (err) {
      console.error(err);
      this.toast(t('export.fail', { msg: err.message }));
    }
    this._exporting = false;
    this._loading(null);
  }
  // Signature discrète en bas à gauche des exports
  _stamp(ctx, W, H, extra = '') {
    const text = `🏙️ Bitropolis · ${this.analysis.name}${extra}`;
    ctx.font = `600 ${Math.round(H * 0.035)}px system-ui, sans-serif`;
    const w = ctx.measureText(text).width + H * 0.05, h = H * 0.065;
    ctx.fillStyle = 'rgba(16,22,38,0.72)';
    ctx.beginPath(); ctx.roundRect(H * 0.03, H - h - H * 0.03, w, h, h / 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle';
    ctx.fillText(text, H * 0.055, H - H * 0.03 - h / 2);
  }
  async _exportGif(name) {
    const e = this.engine, c = e.controls, W = 512, H = 288, N = 40;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const auto = c.autoRotate, theta0 = c.goal.theta, frames = [];
    c.autoRotate = false;
    for (let i = 0; i < N; i++) {
      c.theta = c.goal.theta = theta0 + (2 * Math.PI * i) / N;
      c.update(0.016);
      e.drawView(ctx, W, H);
      this._stamp(ctx, W, H);
      frames.push(ctx.getImageData(0, 0, W, H).data);
      this._loading(t('export.gifFrames', { i: i + 1, n: N }), ((i + 1) / N) * 0.6);
      await uiYield();
    }
    c.theta = c.goal.theta = theta0; c.autoRotate = auto;
    this._loading(t('export.gifEncode'), 0.62);
    await uiYield();
    const samples = [];
    for (let f = 0; f < N; f += 4) for (let i = 0; i < frames[f].length; i += 4 * 53) samples.push(frames[f][i], frames[f][i + 1], frames[f][i + 2]);
    const enc = new GifEncoder(W, H, gifPalette(Uint8Array.from(samples)), 8);
    for (let i = 0; i < N; i++) {
      enc.addFrame(frames[i]);
      if (i % 4 === 3) { this._loading(t('export.gifEncode'), 0.62 + (0.38 * (i + 1)) / N); await uiYield(); }
    }
    const file = `bitropolis-${name}.gif`;
    downloadBlob(new Blob([enc.finish()], { type: 'image/gif' }), file);
    this.toast(t('export.done', { file }));
  }
  async _exportVideo(name) {
    const fmt = videoFormat();
    if (!fmt) { this.toast(t('export.noVideo')); return; }
    const e = this.engine, c = e.controls, W = 1280, H = 720, DUR = 10, TAIL = 2.5;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const rec = new MediaRecorder(cv.captureStream(30), { mimeType: fmt.type, videoBitsPerSecond: 5e6 });
    const chunks = [];
    rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
    const total = e.startTimelapse(DUR);
    const auto = c.autoRotate;
    c.autoRotate = false;
    e.drawView(ctx, W, H);
    rec.start(250);
    const t0 = performance.now();
    await new Promise((resolve) => {
      const step = () => {
        const s = (performance.now() - t0) / 1000;
        c.goal.theta += 0.0035; // la caméra tourne doucement autour de la ville
        e.timelapseAt(s);
        e.drawView(ctx, W, H);
        this._stamp(ctx, W, H, ` · ${uiNum(Math.min(total, e.timelapseBuilt()))} / ${uiNum(total)} 🏢`);
        this._loading(t('export.recording', { s: Math.max(0, Math.ceil(DUR + TAIL - s)) }), Math.min(1, s / (DUR + TAIL)));
        if (s < DUR + TAIL) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
    await new Promise((r) => { rec.onstop = r; rec.stop(); });
    c.autoRotate = auto;
    const file = `bitropolis-${name}-timelapse.${fmt.ext}`;
    downloadBlob(new Blob(chunks, { type: fmt.type.split(';')[0] }), file);
    this.toast(t('export.done', { file }));
  }

  _growthHTML(f) {
    const lot = this.engine.city && this.engine.city.lots[f.id];
    if (!lot || !lot.model) return `<div class="tier"><span>${uiStars(f.tier)}</span> ${uiTierName(f)}</div>`;
    const span = lot.next ? lot.next - lot.start : 1;
    const pct = lot.next ? Math.round((100 * (lot.points - lot.start)) / Math.max(1, span)) : 100;
    const ev = this.evolution && this.evolution.labels.get(f.id);
    return `<div class="growth">
      <div class="g-head"><b>🏗️ ${uiEsc(famName(lot.family, lot.familyName))}</b><span>${t('g.stage', { s: lot.stage, n: lot.stages })}</span></div>
      <div class="g-bar"><i style="width:${Math.max(3, Math.min(100, pct))}%"></i></div>
      <small>${lot.next ? t('g.progress', { p: uiNum(lot.points), next: uiNum(lot.next), left: uiNum(lot.next - lot.points) }) : t('g.max')}</small>
      ${ev ? `<em class="g-ev">${t('g.since', { ev: uiEsc(ev) })}</em>` : ''}
    </div>`;
  }

  _showRoundabout(i) {
    this.engine.select(null);
    this._healthOpen = false;
    const r = this.engine.roundabouts[i];
    if (this.engine.city.grid) {
      $('#panel-body').innerHTML = `
      <div class="kind">${t('mon.kind')}<small>${t('mon.sub')}</small></div>
      <h2>${tp('links', r.traffic)}</h2>
      <p class="rb">${t('mon.text', { n: uiNum(r.traffic), a: uiEsc(r.labels[0]), b: uiEsc(r.labels[1]) })}</p>`;
      $('#panel').classList.add('open');
      return;
    }
    $('#panel-body').innerHTML = `
      <div class="kind">${t('rb.kind')}<small>${t('rb.sub')}</small></div>
      <h2>${tp('links', r.traffic)}</h2>
      <p class="rb">${t('rb.text', { n: uiNum(r.traffic), a: uiEsc(r.labels[0]), b: uiEsc(r.labels[1]) })}</p>`;
    $('#panel').classList.add('open');
  }

  toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => (el.hidden = true), 4200);
  }
}

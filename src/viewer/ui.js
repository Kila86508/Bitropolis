// Bitropolis — interface : panneaux, recherche, légende, ouverture de dossier locale.
import { KINDS, analyzeProjectAsync } from '../core/analyze.js';
import { shouldSkipDir, shouldSkipFile, shouldReadContent, makeIgnoreMatcher, selectFiles, SCAN_LIMIT } from '../core/rules.js';
import { UPCOMING_THEMES, availableThemes, defaultThemeId } from './themes/index.js';
import { hasLandscapeAssets } from './landscape.js';
import { assetsReady } from './assets.js';
import { growthSnapshot, growthDiff } from '../core/catalog.js';
import { t, tp, fmtNum, fmtBytes, kindLabel, kindRole, famName, modelName, applyI18n, getLang, setLang, UI_LANGS } from './i18n.js';

const $ = (sel) => document.querySelector(sel);
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
    this._bind();
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
      this._fillThemes();
      if (this.analysis) { this._noEvolution = true; this.load(this.analysis); }
    });
  }

  _bind() {
    const e = this.engine, canvas = e.canvas;
    const toggle = (btn, fn) => {
      btn.addEventListener('click', () => { const on = !btn.classList.contains('on'); btn.classList.toggle('on', on); fn(on); });
    };
    toggle($('#btn-night'), (on) => e.setNight(on));
    e.onNightChange = (on) => $('#btn-night').classList.toggle('on', on); // le cycle automatique met le bouton à jour
    toggle($('#btn-deps'), (on) => e.setDeps(on));
    toggle($('#btn-traffic'), (on) => e.setTraffic(on));
    toggle($('#btn-labels'), (on) => e.setLabels(on));
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
    $('#btn-shot').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = e.screenshot();
      a.download = `bitropolis-${(this.analysis?.name || 'ville').replace(/[^\w-]+/g, '_')}.png`;
      a.click();
    });
    $('#btn-open').addEventListener('click', () => $('#folder-input').click());
    $('#welcome-open').addEventListener('click', () => $('#folder-input').click());
    $('#folder-input').addEventListener('change', async (ev) => {
      const { root, entries } = uiFromFileList(ev.target.files);
      ev.target.value = '';
      if (entries.length) this._ingest(root, entries);
    });
    $('#welcome-demo').addEventListener('click', () => { const d = window.__BITROPOLIS_DEMO__; if (d) this.load(d); });
    $('#legend-toggle').addEventListener('click', () => $('#legend').classList.toggle('collapsed'));
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
    $('#project-name').textContent = a.name;
    const chips = [
      ['🏢', uiNum(a.stats.files), t('stat.buildings')],
      ['📝', uiNum(a.stats.loc), t('stat.lines')],
      ['🏘️', uiNum(city.districts.length), t('stat.districts')],
      ['🛣️', uiNum(city.roads.length), t('stat.roads')],
      city.grid ? ['🗿', uiNum(city.roundabouts.length), t('stat.monuments')] : ['⭕', uiNum(city.roundabouts.length), t('stat.roundabouts')],
      ['🔗', uiNum(a.stats.edges), t('stat.links')]
    ];
    $('#stats').innerHTML = chips.map(([i, v, l]) => `<span class="chip" title="${l}">${i} <b>${v}</b> ${l}</span>`).join('');
  }

  _legend(a) {
    const counts = a.stats.kinds;
    const item = (ic, key, sep) => `<li${sep ? ' class="sep"' : ''}><span class="ic">${ic}</span><span><b>${uiEsc(t(key + '.t'))}</b><small>${uiEsc(t(key + '.d'))}</small></span></li>`;
    $('#legend-items').innerHTML = Object.entries(KINDS)
      .filter(([k]) => counts[k])
      .map(([k, v]) => `<li><span class="ic">${v.icon}</span><span><b>${uiEsc(kindLabel(k))}</b><small>${uiEsc(kindRole(k))}</small></span><em>${counts[k]}</em></li>`).join('') +
      (this.engine.city && this.engine.city.grid
        ? item('🏗️', 'lg.stages', true) + item('🛣️', 'lg.roads') + item('🗿', 'lg.monuments')
        : item('⭐', 'lg.levels', true) + item('⭕', 'lg.rb'));
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
    const a = this.analysis, f = a.files[id], k = KINDS[f.kind];
    const link = (j) => { const g = a.files[j]; return `<button class="dep" data-goto="${j}"><span>${KINDS[g.kind].icon}</span>${uiEsc(g.name)}<small>${uiEsc(g.dir || '/')}</small></button>`; };
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
      <div class="metrics">${metrics.map(([l, v]) => `<div><small>${l}</small><b>${v}</b></div>`).join('')}</div>
      <h3><i class="dot out"></i>${t('p.uses')} <em>${f.imports.length}</em></h3>
      <div class="deps">${f.imports.map(link).join('') || `<p class="none">${uiEsc(t('p.noDeps'))}</p>`}</div>
      <h3><i class="dot in"></i>${t('p.usedBy')} <em>${f.importedBy.length}</em></h3>
      <div class="deps">${f.importedBy.map(link).join('') || `<p class="none">${uiEsc(t('p.noUsers'))}</p>`}</div>`;
    panel.classList.add('open');
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

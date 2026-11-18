// Bitropolis — interface : panneaux, recherche, légende, ouverture de dossier locale.
import { KINDS, TIER_NAMES, analyzeProject } from '../core/analyze.js';
import { shouldSkipDir, shouldSkipFile, shouldReadContent, makeIgnoreMatcher, MAX_FILES } from '../core/rules.js';
import { UPCOMING_THEMES, availableThemes, defaultThemeId } from './themes/index.js';
import { hasLandscapeAssets } from './landscape.js';
import { assetsReady } from './assets.js';
import { modelLabel, growthSnapshot, growthDiff } from '../core/catalog.js';

const $ = (sel) => document.querySelector(sel);
function uiEsc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function uiNum(n) { return Number(n || 0).toLocaleString('fr-FR'); }
function uiBytes(n) { return n < 1024 ? n + ' o' : n < 1048576 ? (n / 1024).toFixed(1) + ' Ko' : (n / 1048576).toFixed(1) + ' Mo'; }
function uiStars(t) { return '★'.repeat(t) + '☆'.repeat(5 - t); }
// Graine de campagne choisie avec 🎲, mémorisée par projet dans ce navigateur (jamais envoyée).
function uiLandKey(name) { return 'bitropolis.land:' + name; }
function uiLoadLandSeed(name) { try { return localStorage.getItem(uiLandKey(name)); } catch { return null; } }
function uiSaveLandSeed(name, seed) { try { if (seed) localStorage.setItem(uiLandKey(name), seed); else localStorage.removeItem(uiLandKey(name)); } catch {} }
// Dernier état connu de chaque bâtiment (pour animer ce qui a grandi depuis la dernière visite).
function uiLoadSnap(name) { try { return JSON.parse(localStorage.getItem('bitropolis.snap:' + name) || 'null'); } catch { return null; } }
function uiSaveSnap(name, snap) { try { localStorage.setItem('bitropolis.snap:' + name, JSON.stringify(snap)); } catch {} }
function uiTierName(f) { return (f.kind === 'tower' ? TIER_NAMES.tower : TIER_NAMES.default)[f.tier - 1]; }

// ---- Lecture locale d'un dossier dans le navigateur (aucun envoi réseau)
async function uiReadFiles(entries, rootName, onProgress) {
  // entries : [{ path, file }]
  const gi = entries.find((e) => e.path === '.gitignore');
  const ignored = makeIgnoreMatcher(gi ? await gi.file.text() : '');
  const kept = entries.filter((e) => {
    const segs = e.path.split('/');
    for (let i = 0; i < segs.length - 1; i++) {
      if (shouldSkipDir(segs[i]) || ignored(segs.slice(0, i + 1).join('/'), true)) return false;
    }
    return !shouldSkipFile(segs[segs.length - 1]) && !ignored(e.path, false);
  }).slice(0, MAX_FILES * 3);
  const out = [];
  let i = 0;
  for (const e of kept) {
    let content = null;
    if (shouldReadContent(e.path, e.file.size)) {
      try {
        const txt = await e.file.text();
        if (!txt.slice(0, 8000).includes('\u0000')) content = txt;
      } catch {}
    }
    out.push({ path: e.path, size: e.file.size, content });
    if (++i % 100 === 0) { onProgress && onProgress(i, kept.length); await new Promise((r) => setTimeout(r)); }
  }
  return analyzeProject(out, { name: rootName });
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

async function uiFromDrop(items) {
  const entries = [];
  let root = 'projet';
  const roots = [...items].map((it) => it.webkitGetAsEntry && it.webkitGetAsEntry()).filter(Boolean);
  const readAll = (reader) => new Promise((res) => {
    const acc = [];
    const next = () => reader.readEntries((batch) => { if (!batch.length) res(acc); else { acc.push(...batch); next(); } }, () => res(acc));
    next();
  });
  const walk = async (entry, prefix) => {
    if (entries.length > MAX_FILES * 3) return;
    if (entry.isFile) {
      const file = await new Promise((res, rej) => entry.file(res, rej)).catch(() => null);
      if (file) entries.push({ path: prefix + entry.name, file });
    } else if (entry.isDirectory) {
      if (prefix && shouldSkipDir(entry.name)) return;
      for (const child of await readAll(entry.createReader())) await walk(child, prefix + (prefix || roots.length > 1 ? '' : '') + entry.name + '/');
    }
  };
  if (roots.length === 1 && roots[0].isDirectory) {
    root = roots[0].name;
    for (const child of await readAll(roots[0].createReader())) {
      if (child.isDirectory && shouldSkipDir(child.name)) continue;
      await walk(child, '');
    }
  } else {
    for (const r of roots) await walk(r, '');
  }
  return { root, entries };
}

export class CityUI {
  constructor(engine) {
    this.engine = engine;
    this.analysis = null;
    this.themeId = defaultThemeId();
    this._bind();
    this._themes();
  }

  _themes() {
    const sel = $('#theme');
    sel.innerHTML = availableThemes().map((t) => `<option value="${t.id}"${t.id === this.themeId ? ' selected' : ''}>${uiEsc(t.name)}</option>`).join('') +
      UPCOMING_THEMES.map((t) => `<option disabled>${uiEsc(t.name)} — bientôt</option>`).join('');
    sel.addEventListener('change', () => { this.themeId = sel.value; if (this.analysis) this.load(this.analysis); });
  }

  _bind() {
    const e = this.engine, canvas = e.canvas;
    const toggle = (btn, fn) => {
      btn.addEventListener('click', () => { const on = !btn.classList.contains('on'); btn.classList.toggle('on', on); fn(on); });
    };
    toggle($('#btn-night'), (on) => e.setNight(on));
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
      if (plan) this.toast(ev.shiftKey ? "Carte d'origine du projet" : `Nouvelle campagne : ${uiNum(plan.stats.objects)} arbres, buissons et rochers`);
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
      const { root, entries } = await uiFromDrop(ev.dataTransfer.items);
      if (entries.length) this._ingest(root, entries);
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
      list.innerHTML = res.map((f) => `<button data-id="${f.id}"><span>${KINDS[f.kind].icon}</span><b>${uiEsc(f.name)}</b><small>${uiEsc(f.dir || '/')}</small></button>`).join('') || '<div class="empty">Aucun bâtiment trouvé</div>';
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
    this._loading(`Analyse de « ${root} »…`);
    try {
      const analysis = await uiReadFiles(entries, root, (i, n) => this._loading(`Lecture des fichiers… ${i}/${n}`));
      if (!analysis.files.length) { this._loading(null); this.toast('Aucun fichier exploitable dans ce dossier.'); return; }
      this.load(analysis);
    } catch (err) {
      console.error(err);
      this._loading(null);
      this.toast("Impossible d'analyser ce dossier : " + err.message);
    }
  }

  _loading(text) {
    const el = $('#loading');
    if (!text) { el.hidden = true; return; }
    el.hidden = false; el.querySelector('span').textContent = text;
  }

  load(analysis) {
    this._loading('Construction de la ville…');
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
        this._evolution(analysis);
        document.title = `${analysis.name} — Bitropolis`;
        if (analysis.truncated) this.toast(`Projet géant : ${uiNum(analysis.truncated)} fichiers mineurs non affichés.`);
      } catch (err) {
        console.error(err);
        this.toast('Erreur pendant la construction : ' + err.message);
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
    const fam = (m) => m.replace(/_N\d+$/, '');
    const stage = (m) => (/_N(\d+)$/.exec(m) || [])[1] || '';
    const events = [
      ...grown.map((g) => ({
        id: byPath.get(g.path).id, type: 'grown',
        label: fam(g.from) === fam(g.to) ? `${modelLabel(g.from)} → N${stage(g.to)}` : `${modelLabel(g.from)} → ${modelLabel(g.to)}`
      })),
      ...added.map((p) => ({ id: byPath.get(p).id, type: 'new', label: '🆕 ' + byPath.get(p).name }))
    ];
    this.evolution = { grown: grown.length, added: added.length, removed: removed.length, labels: new Map(events.map((e) => [e.id, e.label])) };
    if (events.length) this.engine.animateGrowth(events);
    const parts = [];
    if (grown.length) parts.push(`📈 ${uiNum(grown.length)} bâtiment${grown.length > 1 ? 's ont' : ' a'} grandi`);
    if (added.length) parts.push(`🆕 ${uiNum(added.length)} nouveau${added.length > 1 ? 'x' : ''}`);
    if (removed.length) parts.push(`🏚️ ${uiNum(removed.length)} démoli${removed.length > 1 ? 's' : ''}`);
    if (parts.length) setTimeout(() => this.toast(parts.join(' · ') + ' depuis la dernière visite'), 900);
  }

  _stats(a, city) {
    $('#project-name').textContent = a.name;
    const chips = [
      ['🏢', uiNum(a.stats.files), 'bâtiments'],
      ['📝', uiNum(a.stats.loc), 'lignes'],
      ['🏘️', uiNum(city.districts.length), 'quartiers'],
      ['🛣️', uiNum(city.roads.length), 'routes'],
      city.grid ? ['🗿', uiNum(city.roundabouts.length), 'monuments'] : ['⭕', uiNum(city.roundabouts.length), 'rond-points'],
      ['🔗', uiNum(a.stats.edges), 'liaisons']
    ];
    $('#stats').innerHTML = chips.map(([i, v, l]) => `<span class="chip" title="${l}">${i} <b>${v}</b> ${l}</span>`).join('');
  }

  _legend(a) {
    const counts = a.stats.kinds;
    $('#legend-items').innerHTML = Object.entries(KINDS)
      .filter(([k]) => counts[k])
      .map(([k, v]) => `<li><span class="ic">${v.icon}</span><span><b>${v.label}</b><small>${v.role}</small></span><em>${counts[k]}</em></li>`).join('') +
      (this.engine.city && this.engine.city.grid
        ? `<li class="sep"><span class="ic">🏗️</span><span><b>Stades N1 → N8</b><small>Chaque bâtiment monte d'un stade quand son fichier grandit (lignes, fichiers qui l'importent, complexité) : cabane → tour, éolienne → centrale nucléaire.</small></span></li>` +
          `<li><span class="ic">🛣️</span><span><b>Routes</b><small>Les dépendances circulent par les routes : plus il en passe, plus l'avenue monte en gamme (N1 → N8).</small></span></li>` +
          `<li><span class="ic">🗿</span><span><b>Monuments</b><small>Sur les places au bord des avenues les plus fréquentées.</small></span></li>`
        : `<li class="sep"><span class="ic">⭐</span><span><b>Niveaux</b><small>Plus un fichier est important (taille, fichiers qui en dépendent, complexité), plus son bâtiment grandit : maison → gratte-ciel.</small></span></li>` +
          `<li><span class="ic">⭕</span><span><b>Rond-points</b><small>Carrefours où passent le plus de dépendances entre quartiers.</small></span></li>`);
  }

  _tooltip(hit, x, y) {
    const tip = $('#tooltip');
    if (!hit) { tip.hidden = true; return; }
    if (hit.type === 'file') {
      const f = this.analysis.files[hit.id];
      const lot = this.engine.city.lots[f.id];
      const level = lot && lot.model ? `${uiEsc(lot.familyName)} · stade ${lot.stage}/${lot.stages}` : `${uiTierName(f)} <i>${uiStars(f.tier)}</i>`;
      tip.innerHTML = `<b>${KINDS[f.kind].icon} ${uiEsc(f.name)}</b><span>${uiEsc(KINDS[f.kind].label)} · ${level}</span><small>${uiEsc(f.dir || '/')} · ${uiNum(f.loc)} lignes</small>`;
    } else if (this.engine.city.grid) {
      const r = this.engine.roundabouts[hit.index];
      tip.innerHTML = `<b>🗿 Monument</b><span>${uiNum(r.traffic)} dépendances passent devant</span><small>${uiEsc(r.labels[0])} ⇄ ${uiEsc(r.labels[1])}</small>`;
    } else {
      const r = this.engine.roundabouts[hit.index];
      tip.innerHTML = `<b>⭕ Rond-point</b><span>${uiNum(r.traffic)} dépendances se croisent ici</span><small>${uiEsc(r.labels[0])} ⇄ ${uiEsc(r.labels[1])}</small>`;
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
      ['Lignes de code', uiNum(f.loc)], ['Taille', uiBytes(f.size)], ['Fonctions', uiNum(f.funcs)],
      ['Classes', uiNum(f.classes)], ['Branches', uiNum(f.branches)], ['TODO / FIXME', uiNum(f.todos)],
      ['Langage', uiEsc(f.lang)], ['Importance', `#${f.rank} / ${a.files.length}`], ['Paquets externes', uiNum(f.external)]
    ];
    $('#panel-body').innerHTML = `
      <div class="kind">${k.icon} ${uiEsc(k.label)}<small>${uiEsc(k.role)}</small></div>
      <h2>${uiEsc(f.name)}</h2>
      <div class="path">${uiEsc(f.path)}</div>
      ${this._growthHTML(f)}
      <div class="metrics">${metrics.map(([l, v]) => `<div><small>${l}</small><b>${v}</b></div>`).join('')}</div>
      <h3><i class="dot out"></i>Utilise <em>${f.imports.length}</em></h3>
      <div class="deps">${f.imports.map(link).join('') || '<p class="none">Aucune dépendance interne.</p>'}</div>
      <h3><i class="dot in"></i>Utilisé par <em>${f.importedBy.length}</em></h3>
      <div class="deps">${f.importedBy.map(link).join('') || '<p class="none">Personne ne l\'importe (encore).</p>'}</div>`;
    panel.classList.add('open');
  }

  _growthHTML(f) {
    const lot = this.engine.city && this.engine.city.lots[f.id];
    if (!lot || !lot.model) return `<div class="tier"><span>${uiStars(f.tier)}</span> ${uiTierName(f)}</div>`;
    const span = lot.next ? lot.next - lot.start : 1;
    const pct = lot.next ? Math.round((100 * (lot.points - lot.start)) / Math.max(1, span)) : 100;
    const ev = this.evolution && this.evolution.labels.get(f.id);
    return `<div class="growth">
      <div class="g-head"><b>🏗️ ${uiEsc(lot.familyName)}</b><span>stade ${lot.stage} / ${lot.stages}</span></div>
      <div class="g-bar"><i style="width:${Math.max(3, Math.min(100, pct))}%"></i></div>
      <small>${lot.next ? `${uiNum(lot.points)} / ${uiNum(lot.next)} points : encore ~${uiNum(lot.next - lot.points)} pour le stade suivant (1 ligne = 1 point, 15 par fichier qui l'importe).` : 'Stade maximum atteint 🎉'}</small>
      ${ev ? `<em class="g-ev">📈 Depuis la dernière visite : ${uiEsc(ev)}</em>` : ''}
    </div>`;
  }

  _showRoundabout(i) {
    this.engine.select(null);
    const r = this.engine.roundabouts[i];
    if (this.engine.city.grid) {
      $('#panel-body').innerHTML = `
      <div class="kind">🗿 Monument<small>Place d'une avenue très fréquentée</small></div>
      <h2>${uiNum(r.traffic)} liaisons</h2>
      <p class="rb">${uiNum(r.traffic)} dépendances passent devant ce monument, surtout entre <b>${uiEsc(r.labels[0])}</b> et <b>${uiEsc(r.labels[1])}</b>.</p>`;
      $('#panel').classList.add('open');
      return;
    }
    $('#panel-body').innerHTML = `
      <div class="kind">⭕ Rond-point<small>Carrefour de dépendances</small></div>
      <h2>${uiNum(r.traffic)} liaisons</h2>
      <p class="rb">Ce rond-point relie <b>${uiEsc(r.labels[0])}</b> et <b>${uiEsc(r.labels[1])}</b> : ${uiNum(r.traffic)} imports traversent la route qui les sépare.</p>`;
    $('#panel').classList.add('open');
  }

  toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => (t.hidden = true), 4200);
  }
}

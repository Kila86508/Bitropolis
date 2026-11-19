<div align="center">

[Français](README.md) · [English](README.en.md) · [Español](README.es.md) · **Deutsch**

# 🏙️ BITROPOLIS

### Dein Code wird zu einer Stadt, die mit ihm wächst.

Jeder Ordner ist ein Viertel, jede Datei ein Gebäude, jede Abhängigkeit eine Straße.
Je größer eine Datei wird, desto weiter steigt ihr Gebäude auf.

[![Live-Demo](https://img.shields.io/badge/▶_live-demo-ff7a59?style=for-the-badge)](https://kila86508.github.io/Bitropolis/dist/bitropolis.html)
[![100 % lokal](https://img.shields.io/badge/100_%25-lokal-2a9d8f?style=for-the-badge)](#-100--lokal-wirklich)
[![Node ≥ 18](https://img.shields.io/badge/node-%E2%89%A5_18-457b9d?style=for-the-badge)](https://nodejs.org)
[![npm](https://img.shields.io/npm/v/bitropolis?style=for-the-badge&color=cb3837)](https://www.npmjs.com/package/bitropolis)
[![MIT-Lizenz](https://img.shields.io/badge/code-MIT-6d7178?style=for-the-badge)](LICENSE)

![Bitropolis: eine 3D-Stadt, erzeugt aus einem Code-Projekt](docs/hero.jpg)

</div>

## ✨ Auf einen Blick

- 🏗️ **Eine lebendige Stadt**: Low-Poly-Gebäude mit 8 Ausbaustufen, Straßen in 8 Stufen, Verkehr mit Ampeln und Staus, Tag und Nacht.
- 📈 **Sie entwickelt sich mit deinem Code**: Bei jeder neuen Generierung steigen die Gebäude der gewachsenen Dateien vor deinen Augen auf.
- 🌄 **Eine eigene Karte pro Projekt**: prozedurale Landschaft (Hügel, Seen, Wälder) auf einem Diorama-Sockel.
- 🔒 **100 % lokal**: eine einzige HTML-Datei, keine Netzwerkanfragen, keine einzige Zeile deines Codes kopiert.

## 🗺️ Das Prinzip

| In deinem Code | In der Stadt |
|---|---|
| 📁 Ordner | 🏘️ Viertel, mit Schild |
| 📄 Datei | 🏢 Gebäude, mit der Fassade zur Straße |
| 📏 Größe und Rolle der Datei | 🏗️ Ausbaustufe: von N1 (Hütte) bis N8 (Turm) |
| 🔗 Imports zwischen Dateien | 🛣️ Straßen und Verkehr: die meistbefahrenen Alleen werden ausgebaut |
| 🚀 Einstiegspunkt (`main`, `index`, `app`…) | 🏛️ Rathaus, nur eines |

### 🏛️ Ein Gebäudetyp pro Rolle

| Gebäude | Dateien |
|---|---|
| 🏛️ **Rathaus** | Der Haupteinstiegspunkt |
| 🏢 **Wohnhäuser, Büros** | Der Kern-Quellcode |
| 🛍️ **Läden, Theater** | Die Oberfläche: Komponenten, Views, Seiten, CSS |
| 🏦 **Büros, Forschungszentren** | Die Daten: Modelle, Schemas, Stores, Typen |
| 🚓 **Polizeiwache** | Tests und Sicherheit |
| 🚒 **Feuerwache, Busbahnhof** | CI/CD, Docker, Skripte, Deployment |
| 🏥 **Klinik → Krankenhaus** | Fehler, Logs, Monitoring |
| 📚 **Bibliothek, Schule, Uhrturm** | Die Dokumentation |
| 🏭 **Werkstatt → Fabrik → Industriekomplex** | Konfiguration und Werkzeuge |
| ⚡ **Wind → Solar → Kohle → Atom** | Die Abhängigkeiten (`package.json`, `Cargo.toml`…) |
| 💧 **Wasserturm → Kläranlage** | Rohdaten: SQL, CSV, Migrationen |
| 🌳 **Park, Brunnen, Denkmal** | Die Assets: Bilder, Sounds, Schriften |

## 📸 Galerie

<table>
  <tr>
    <td width="50%"><img src="docs/traffic.jpg" alt="Verkehr: Ampeln, Warteschlangen, Denkmal"><br><sub><b>🚦 Verkehr</b>: Autos fahren rechts, halten Abstand und stoppen bei Rot.</sub></td>
    <td width="50%"><img src="docs/night.jpg" alt="Die Stadt bei Nacht"><br><sub><b>🌙 Nacht</b>: Straßenlaternen gehen an, Fenster schalten sich Stockwerk für Stockwerk ein und aus.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/evolution.jpg" alt="Entwicklung: Beschriftungen wie Résidence N2 → N3"><br><sub><b>📈 Entwicklung</b>: Was seit der letzten Generierung gewachsen ist, steigt mit seiner neuen Stufe aus dem Boden.</sub></td>
    <td width="50%"><img src="docs/focus.jpg" alt="Eine ausgewählte Datei und ihre Abhängigkeiten"><br><sub><b>🔗 Abhängigkeiten</b>: Klicke auf ein Gebäude, um zu sehen, was es nutzt (orange) und wer es nutzt (blau).</sub></td>
  </tr>
</table>

![Das ganze Diorama: die Stadt in der Mitte, die Landschaft, Seen und Fluss](docs/diorama.jpg)
<p align="center"><sub><b>🌄 Das Diorama</b>: Jedes Projekt bekommt seine eigene Landschaft, abgeleitet aus seinem Namen. Der Knopf 🎲 würfelt eine neue.</sub></p>

## 🏗️ Eine Stadt, die mit deinem Code wächst

- **Stufen N1 → N8.** Jede Datei folgt einer Kette von Gebäuden, die unterwegs die Familie wechseln kann (*Klinik → Krankenhaus*, *Windrad → Atomkraftwerk*…). Die Stufe ist **absolut**: 1 Zeile = 1 Punkt, +15 pro Datei, die sie importiert, plus Komplexität. Eine Datei schrumpft also nie, nur weil andere wachsen. Die Gebäudekarte zeigt den Fortschritt zur nächsten Stufe.
- **Entwicklung.** Bei jeder Generierung vergleicht Bitropolis mit der vorherigen: Die CLI liest die alte `index.html`, der Browser merkt sich deinen letzten Besuch. Gewachsene Gebäude und neue Dateien steigen aus dem Boden, mit einer Beschriftung wie „Résidence N3 → N4“.
- **Straßen N1 → N8.** Jede Abhängigkeit zwischen zwei Vierteln wird über den kürzesten Straßenweg geführt. Die meistbefahrenen Alleen werden zu beleuchteten Boulevards, und auf ihren Plätzen entstehen Denkmäler.
- **Vielfalt.** Mehrere Familien und Farbvarianten pro Dateityp, umgefärbte Paletten, gespiegelte Gebäude, Gärten, kleine Plätze und Parkplätze: Keine zwei Projekte sehen gleich aus.
- **Leben.** Ampeln und Rechts-vor-links, drehende Windräder, rauchende Schornsteine, sprudelnde Brunnen.

## 🚀 Verwendung

### Option 1: ohne Installation

Öffne die **[Live-Demo](https://kila86508.github.io/Bitropolis/dist/bitropolis.html)** oder lokal [`dist/bitropolis.html`](dist/bitropolis.html) (Doppelklick), dann **ziehe deinen Ordner hinein** oder klicke auf „📁 Code-Ordner öffnen“. Alles passiert in deinem Browser: Nichts wird hochgeladen.

### Option 2: Kommandozeile (Node.js ≥ 18)

```bash
npx bitropolis ~/code/mein-projekt
```

Oder aus dem Quellcode:

```bash
git clone https://github.com/Kila86508/Bitropolis.git
cd Bitropolis
npm install
node bin/bitropolis.js ~/code/mein-projekt
```

Die Stadt wird nach `bitropolis-city/index.html` geschrieben und öffnet sich automatisch. Führe nach dem Programmieren denselben Befehl erneut aus: Die gewachsenen Gebäude erwachen zum Leben.

```text
bitropolis [ordner] [optionen]
  -o, --out <datei>     Zu erzeugende HTML-Datei (Standard: ./bitropolis-city/index.html)
  -n, --name <name>     Name der Stadt
      --json            Exportiert zusätzlich die Rohanalyse (.city.json)
      --no-open         Browser nicht öffnen
  -l, --lang <xx>       Sprache: en, fr, de, it, es, zh, ru
```

Die erzeugte Datei ist **eigenständig**: Schick sie einem Freund, sie öffnet sich ohne Server und ohne Internet.

### 🎮 Steuerung

| Aktion | Maus / Tastatur |
|---|---|
| Drehen | Ziehen (Linksklick) |
| Verschieben | Rechtsklick oder `WASD` / `ZQSD` / Pfeiltasten |
| Zoomen | Mausrad, `+` / `-` |
| Gebäudeinfo | Klick |
| Hinfliegen | Doppelklick |
| Datei suchen | `/` |
| Auswahl aufheben | `Esc` |

Werkzeugleiste: 🌙 Tag / Nacht · 🔗 alle Abhängigkeiten · 🚗 Verkehr · 🏷️ Viertel · 🎯 zentrieren · 🎲 neue Landschaft · 📸 Screenshot · Thema · Sprache.

> 🌐 Oberfläche und CLI sprechen **Deutsch, Englisch, Französisch, Italienisch, Spanisch, Chinesisch und Russisch**: Die Sprache des Browsers (bzw. des Systems) wird automatisch gewählt, über das Sprachmenü in der Werkzeugleiste lässt sie sich ändern.

## 🏙️ Und bei einem richtig großen Projekt?

![Die Stadt der three.js-Quellen](docs/threejs.jpg)
<p align="center"><sub>Die Quellen von three.js: 374 Gebäude, in unter einer Sekunde gebaut.</sub></p>

## 🔒 100 % lokal, wirklich

- Keine Netzwerkanfragen: three.js und die 3D-Modelle sind in die HTML-Datei **eingebettet**. Kein CDN, keine Analytics.
- Die erzeugte Datei enthält **keinen Code von dir**: nur Dateipfade und Zahlen (Zeilen, Verknüpfungen, Stufen).
- `node_modules`, `.git`, `dist`, `build`, versteckte Ordner und alles, was in deiner `.gitignore` steht, werden übersprungen.

## 🧠 Unterstützte Sprachen

Verknüpfungen zwischen Dateien werden erkannt für **JavaScript / TypeScript** (ESM, CommonJS, `@/`-Aliase), **Python**, **Go**, **Rust**, **Java / Kotlin / Scala**, **C / C++**, **C#**, **PHP**, **Ruby**, **Dart**, **Lua**, **CSS / SCSS / Less**, **HTML** und **Vue / Svelte / Astro**. Alle anderen Dateien werden trotzdem zu Gebäuden.

## 🎨 Themen

| Thema | Status |
|---|---|
| 🏙️ 3D-Stadt (Raster, wachsende Gebäude, Verkehr) | ✅ Standard |
| 🔺 Low Poly (prozedurale Gebäude) | ✅ verfügbar |
| 🏰 Mittelalter · 👾 Pixel-Art · 🌃 Cyberpunk · ⛩️ Japan | 🔜 demnächst |

<p align="center"><img src="docs/lowpoly.jpg" width="70%" alt="Das Low-Poly-Thema"><br><sub>Das Low-Poly-Thema.</sub></p>

Ein Thema verändert weder die Analyse noch den Stadtplan: Es beschreibt nur, wie die Gebäude aussehen. Siehe [`docs/THEMES.md`](docs/THEMES.md), um eines zu erstellen.

## 🗂️ Architektur

```text
bin/bitropolis.js          CLI: scannt einen Ordner → eigenständige HTML-Datei
src/core/analyze.js        Metriken, Imports, Wichtigkeit, Gebäudetyp
src/core/catalog.js        Gebäudeketten, Stufen N1→N8, Entwicklung zwischen zwei Scans
src/core/grid.js           Rasterstadtplanung: Blöcke, Straßenkacheln, Verkehrsrouten, Stadtmöbel
src/core/layout.js         Stadtplanung des Low-Poly-Themas
src/core/terrain.js        prozedurale Landschaft: Relief, Wasser, Vegetation
src/core/obf.js            Verschlüsselung der eingebetteten Modelle
src/viewer/render.js       3D-Engine (three.js), Nacht, Animationen, Entwicklung
src/viewer/traffic.js      Verkehr: Fahrspuren, Abstände, Ampeln, Rechts-vor-links
src/viewer/citypack.js     Darstellung der Stadt (InstancedMesh, Paletten, Lichter)
src/viewer/landscape.js    Darstellung von Landschaft und Diorama-Sockel
src/viewer/ui.js           Oberfläche, Suche, Drag-and-Drop
scripts/assets.js          wandelt Modelle (.glb, .obj) in kompakte verschlüsselte Daten um
scripts/build.js           baut dist/bitropolis.html
```

Der Kern (`src/core`) hat keine Abhängigkeiten und läuft sowohl in Node als auch im Browser.

```bash
npm test         # Tests (Stadtplanung, Wachstum, Verkehr…)
npm run build    # baut dist/bitropolis.html neu
```

> 🔐 Die Original-3D-Modelle werden nicht veröffentlicht: Nur ihre verschlüsselte Fassung ist in `dist/bitropolis.html` eingebettet und wird ausschließlich im Speicher entschlüsselt. Fehlen die Modelle, übernimmt `npm run build` das bereits in `dist/` vorhandene verschlüsselte Paket. So kann jeder Bitropolis bauen und seine Stadt erstellen.

## 🛣️ Roadmap

- [x] Rasterstadt mit wachsenden Gebäuden und gestuften Straßen
- [x] Verkehr, Ampeln, Rechts-vor-links
- [x] Animierte Entwicklung zwischen zwei Generierungen
- [ ] Git-Historie: zusehen, wie die Stadt Commit für Commit entsteht
- [ ] Ego-Perspektive zum „Spazierengehen“
- [ ] Wetter je nach Projektzustand (TODOs, fehlschlagende Tests…)
- [ ] Themen Mittelalter, Pixel-Art und Cyberpunk

## 📄 Lizenz

Der **Code** steht unter der [MIT](LICENSE)-Lizenz: Mach damit, was du willst, und zeig uns deine Stadt!
Die eingebetteten **3D-Modelle** bleiben Eigentum ihres Urhebers und fallen nicht unter diese Lizenz.

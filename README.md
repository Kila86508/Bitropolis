<div align="center">

**Français** · [English](README.en.md) · [Español](README.es.md) · [Deutsch](README.de.md)

# 🏙️ BITROPOLIS

### Ton code devient une ville qui grandit avec lui.

Chaque dossier est un quartier, chaque fichier un bâtiment, chaque dépendance une route.
Plus un fichier grossit, plus son bâtiment monte en gamme.

[![Démo en ligne](https://img.shields.io/badge/▶_démo-en_ligne-ff7a59?style=for-the-badge)](https://kila86508.github.io/Bitropolis/dist/bitropolis.html)
[![100 % local](https://img.shields.io/badge/100_%25-local-2a9d8f?style=for-the-badge)](#-100--local-vraiment)
[![Node ≥ 18](https://img.shields.io/badge/node-%E2%89%A5_18-457b9d?style=for-the-badge)](https://nodejs.org)
[![npm](https://img.shields.io/npm/v/bitropolis?style=for-the-badge&color=cb3837)](https://www.npmjs.com/package/bitropolis)
[![Licence MIT](https://img.shields.io/badge/code-MIT-6d7178?style=for-the-badge)](LICENSE)

![Bitropolis : une ville 3D générée à partir d'un projet de code](docs/hero.jpg)

</div>

## ✨ En bref

- 🏗️ **Une ville vivante** : bâtiments low poly à 8 stades, routes à 8 niveaux, circulation avec feux et bouchons, jour et nuit.
- 📈 **Elle évolue avec ton code** : à chaque nouvelle génération, les fichiers qui ont grandi font monter leur bâtiment, sous tes yeux.
- 🌄 **Une carte unique par projet** : campagne procédurale (collines, lacs, forêts) posée sur un socle de diorama.
- 🔒 **100 % local** : un seul fichier HTML, aucune requête réseau, pas une ligne de ton code copiée.

## 🗺️ Le principe

| Dans ton code | Dans la ville |
|---|---|
| 📁 Dossier | 🏘️ Quartier, avec son panneau |
| 📄 Fichier | 🏢 Bâtiment, façade tournée vers la rue |
| 📏 Taille et usage du fichier | 🏗️ Stade du bâtiment : de N1 (cabane) à N8 (tour) |
| 🔗 Imports entre fichiers | 🛣️ Routes et trafic : les avenues les plus empruntées montent en gamme |
| 🚀 Point d'entrée (`main`, `index`, `app`…) | 🏛️ Hôtel de ville, unique |

### 🏛️ Un type de bâtiment par rôle

| Bâtiment | Fichiers concernés |
|---|---|
| 🏛️ **Hôtel de ville** | Le point d'entrée principal |
| 🏢 **Résidences, bureaux** | Le code source « métier » |
| 🛍️ **Commerces, théâtres** | L'interface : composants, vues, pages, CSS |
| 🏦 **Bureaux, centres de recherche** | Les données : modèles, schémas, store, types |
| 🚓 **Commissariat** | Les tests et la sécurité |
| 🚒 **Caserne, gare routière** | CI/CD, Docker, scripts, déploiement |
| 🏥 **Clinique → hôpital** | Erreurs, logs, monitoring |
| 📚 **Bibliothèque, école, tour de l'horloge** | La documentation |
| 🏭 **Atelier → usine → complexe industriel** | La configuration et l'outillage |
| ⚡ **Éolienne → solaire → charbon → nucléaire** | Les dépendances (`package.json`, `Cargo.toml`…) |
| 💧 **Château d'eau → station d'épuration** | Données brutes : SQL, CSV, migrations |
| 🌳 **Parc, fontaine, mémorial** | Les assets : images, sons, polices |

## 📸 Galerie

<table>
  <tr>
    <td width="50%"><img src="docs/traffic.jpg" alt="Circulation : feux, files d'attente, monument"><br><sub><b>🚦 Circulation</b> : les voitures roulent à droite, gardent leurs distances et s'arrêtent aux feux.</sub></td>
    <td width="50%"><img src="docs/night.jpg" alt="La ville de nuit"><br><sub><b>🌙 La nuit</b> : les lampadaires s'allument, les fenêtres s'allument et s'éteignent étage par étage.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/evolution.jpg" alt="Évolution : étiquettes Résidence N2 → N3"><br><sub><b>📈 Évolution</b> : ce qui a grandi depuis la dernière génération sort de terre, avec son nouveau stade.</sub></td>
    <td width="50%"><img src="docs/focus.jpg" alt="Un fichier sélectionné et ses dépendances"><br><sub><b>🔗 Dépendances</b> : clique un bâtiment pour voir ce qu'il utilise (orange) et qui l'utilise (bleu).</sub></td>
  </tr>
</table>

![Le diorama entier : la ville au centre, la campagne, les lacs et la rivière](docs/diorama.jpg)
<p align="center"><sub><b>🌄 Le diorama</b> : chaque projet a sa propre campagne, tirée de son nom. Le bouton 🎲 en tire une autre.</sub></p>

## 🏗️ Une ville qui grandit avec ton code

- **Stades N1 → N8.** Chaque fichier suit une chaîne de bâtiments, qui peut changer de famille en route (*clinique → hôpital*, *éolienne → centrale nucléaire*…). Le stade est **absolu** : 1 ligne = 1 point, +15 par fichier qui l'importe, plus la complexité. Un fichier ne rétrécit donc jamais parce que d'autres grossissent. La fiche du bâtiment affiche la progression vers le stade suivant.
- **Évolution.** À chaque génération, Bitropolis compare avec la précédente : la CLI relit l'ancien `index.html`, le navigateur se souvient de ta dernière visite. Les bâtiments qui ont grandi et les nouveaux fichiers sortent de terre, avec une étiquette « Résidence N3 → N4 ».
- **Routes N1 → N8.** Chaque dépendance entre deux quartiers est acheminée par le plus court chemin routier. Les avenues les plus chargées deviennent des boulevards éclairés, et des monuments s'installent sur leurs places.
- **Variété.** Plusieurs familles et variantes de couleurs par type de fichier, palettes recolorées, bâtiments inversés en miroir, jardins, placettes et parkings : deux projets ne se ressemblent jamais.
- **Vie.** Feux tricolores et priorité à droite, éoliennes qui tournent, cheminées qui fument, fontaines qui jaillissent.

## 🚀 Utilisation

### Option 1 : sans rien installer

Ouvre la **[démo en ligne](https://kila86508.github.io/Bitropolis/dist/bitropolis.html)**, ou [`dist/bitropolis.html`](dist/bitropolis.html) en local (double-clic), puis **glisse-dépose ton dossier** ou clique sur « 📁 Ouvrir un dossier de code ». Tout se passe dans ton navigateur : rien n'est envoyé.

### Option 2 : en ligne de commande (Node.js ≥ 18)

```bash
npx bitropolis ~/code/mon-projet
```

Ou depuis les sources :

```bash
git clone https://github.com/Kila86508/Bitropolis.git
cd Bitropolis
npm install
node bin/bitropolis.js ~/code/mon-projet
```

La ville est générée dans `bitropolis-city/index.html` et s'ouvre toute seule. Relance la même commande après avoir codé : les bâtiments qui ont grandi s'animent.

```text
bitropolis [dossier] [options]
  -o, --out <fichier>   Fichier HTML à créer (défaut : ./bitropolis-city/index.html)
  -n, --name <nom>      Nom de la ville
      --json            Exporte aussi l'analyse brute (.city.json)
      --no-open         Ne pas ouvrir le navigateur
  -l, --lang <xx>       Langue : en, fr, de, it, es, zh, ru
```

Le fichier généré est **autonome** : envoie-le à un ami, il s'ouvre sans serveur ni Internet.

### 🎮 Commandes

| Action | Souris / clavier |
|---|---|
| Tourner | Glisser (clic gauche) |
| Se déplacer | Clic droit, ou `ZQSD` / `WASD` / flèches |
| Zoomer | Molette, `+` / `-` |
| Infos d'un bâtiment | Clic |
| S'approcher | Double-clic |
| Chercher un fichier | `/` |
| Désélectionner | `Échap` |

Barre d'outils : 🌙 jour / nuit · 🔗 toutes les liaisons · 🚗 trafic · 🏷️ quartiers · 🎯 recentrer · 🎲 nouvelle campagne · 📸 capture · thème · langue.

> 🌐 L'interface et la CLI parlent **français, anglais, allemand, italien, espagnol, chinois et russe** : la langue du navigateur (ou du système) est choisie automatiquement, et le menu de langue de la barre d'outils permet d'en changer.

## 🏙️ Et sur un vrai gros projet ?

![La ville des sources de three.js](docs/threejs.jpg)
<p align="center"><sub>Les sources de three.js : 374 bâtiments, construits en moins d'une seconde.</sub></p>

## 🔒 100 % local, vraiment

- Aucune requête réseau : three.js et les modèles 3D sont **embarqués** dans le HTML. Pas de CDN, pas d'analytics.
- Le fichier généré ne contient **aucune ligne de ton code** : seulement les chemins des fichiers et des chiffres (lignes, liens, stades).
- `node_modules`, `.git`, `dist`, `build`, les dossiers cachés et ce que liste ton `.gitignore` sont ignorés.

## 🧠 Langages compris

Les liens entre fichiers sont détectés pour **JavaScript / TypeScript** (ESM, CommonJS, alias `@/`), **Python**, **Go**, **Rust**, **Java / Kotlin / Scala**, **C / C++**, **C#**, **PHP**, **Ruby**, **Dart**, **Lua**, **CSS / SCSS / Less**, **HTML** et **Vue / Svelte / Astro**. Tous les autres fichiers deviennent quand même des bâtiments.

## 🎨 Thèmes

| Thème | État |
|---|---|
| 🏙️ Ville 3D (grille, bâtiments à stades, circulation) | ✅ par défaut |
| 🔺 Low poly (bâtiments procéduraux) | ✅ disponible |
| 🏰 Médiéval · 👾 Pixel art · 🌃 Cyberpunk · ⛩️ Japon | 🔜 bientôt |

<p align="center"><img src="docs/lowpoly.jpg" width="70%" alt="Le thème low poly"><br><sub>Le thème low poly.</sub></p>

Un thème ne touche ni à l'analyse ni au plan de la ville : il décrit seulement à quoi ressemblent les bâtiments. Voir [`docs/THEMES.md`](docs/THEMES.md) pour en créer un.

## 🗂️ Architecture

```text
bin/bitropolis.js          CLI : scanne un dossier → HTML autonome
src/core/analyze.js        métriques, imports, importance, type de bâtiment
src/core/catalog.js        chaînes de bâtiments, stades N1→N8, évolution entre deux scans
src/core/grid.js           urbanisme en grille : îlots, routes en tuiles, trafic routé, mobilier
src/core/layout.js         urbanisme du thème low poly
src/core/terrain.js        campagne procédurale : relief, eau, végétation
src/core/obf.js            brouillage des modèles embarqués
src/viewer/render.js       moteur 3D (three.js), nuit, animations, évolution
src/viewer/traffic.js      circulation : voies, distances, feux, priorité à droite
src/viewer/citypack.js     affichage de la ville (InstancedMesh, palettes, lumières)
src/viewer/landscape.js    affichage de la campagne et du socle
src/viewer/ui.js           interface, recherche, glisser-déposer
scripts/assets.js          conversion des modèles (.glb, .obj) en données compactes chiffrées
scripts/build.js           construit dist/bitropolis.html
```

Le cœur (`src/core`) n'a aucune dépendance et tourne aussi bien dans Node que dans le navigateur.

```bash
npm test         # tests (urbanisme, croissance, circulation…)
npm run build    # régénère dist/bitropolis.html
```

> 🔐 Les modèles 3D d'origine ne sont pas publiés : seule leur version chiffrée est embarquée dans `dist/bitropolis.html`, et elle n'est déchiffrée qu'en mémoire. Si les modèles sont absents, `npm run build` reprend le pack chiffré déjà présent dans `dist/` : tout le monde peut donc construire Bitropolis et créer sa ville.

## 🛣️ Feuille de route

- [x] Ville en grille avec bâtiments à stades et routes à niveaux
- [x] Circulation, feux tricolores, priorité à droite
- [x] Évolution animée entre deux générations
- [ ] Historique Git : voir la ville se construire commit après commit
- [ ] Mode « visite » à la première personne
- [ ] Météo selon l'état du projet (TODO, tests qui échouent…)
- [ ] Thèmes médiéval, pixel art, cyberpunk

## 📄 Licence

Le **code** est sous licence [MIT](LICENSE) : fais-en ce que tu veux, et montre-nous ta ville !
Les **modèles 3D** embarqués restent la propriété de leur auteur et ne sont pas couverts par cette licence.

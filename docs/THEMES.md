# 🎨 Créer un thème Bitropolis

Un thème décrit **l'apparence** de la ville. L'analyse du code et le plan (quartiers, routes,
rond-points) restent identiques : seul le look change.

## Le contrat

Un thème est un objet JavaScript (voir `src/viewer/themes/lowpoly.js`) :

```js
export const MedievalTheme = {
  id: 'medieval',
  name: 'Médiéval',
  sky: { day: '#cfe3f0', night: '#101828', fogDay: '#dfe8ee', fogNight: '#101828' },
  ground: { grass, asphalt, ring, sidewalk, marking, curb, park },   // couleurs du sol
  districtTints: ['#…', …],      // une teinte par quartier
  centerTint: '#…',              // fichiers à la racine
  building(file, lot, rng) { return [/* pièces */]; },
  tree(rng, x, z, scale) { return [/* pièces */]; },
  roundabout(rb, rng) { return [/* pièces */]; }
};
```

### Les pièces

Le thème ne crée pas d'objets three.js : il renvoie une liste de **pièces**, que le moteur fusionne
en quelques maillages (c'est ce qui permet d'afficher des milliers de bâtiments).

```js
[forme, x, y, z, largeur, hauteur, profondeur, couleur, rotationY, matériau]
```

- **formes** : `box`, `cyl`, `cyl6`, `cone`, `cone4` (pyramide), `ico`, `dome`, `prism` (toit à deux pans), `tcyl` (tour de refroidissement). Toutes posées sur `y = 0`.
- **matériau** : `0` = mat, `1` = vitre / lumière (s'allume la nuit).
- **repère** : centré sur la parcelle, la façade regarde vers `+z` (le moteur tourne le bâtiment vers la rue).

### Ce que reçoit `building(file, lot, rng)`

- `file.kind` : `townhall`, `tower`, `shop`, `bank`, `police`, `fire`, `hospital`, `library`, `factory`, `power`, `warehouse`, `park`
- `file.tier` : niveau de 1 à 5
- `file.loc`, `file.name`, `file.lang`, `file.importedBy.length`… pour varier les détails
- `lot.size` : côté de la parcelle
- `rng()` : aléatoire déterministe (même fichier ⇒ même bâtiment)

## Enregistrer le thème

1. Crée `src/viewer/themes/medieval.js`.
2. Importe-le et ajoute-le à `THEMES` dans `src/viewer/themes/index.js`.
3. Ajoute le chemin dans la liste `MODULES` de `scripts/bundle.js` (avant `themes/index.js`).
4. `npm run build` — le thème apparaît dans le menu.

> Astuce : préfixe tes fonctions internes (ex. `mdTower`) — les modules sont concaténés dans un seul
> fichier, deux fonctions de même nom dans deux thèmes entreraient en conflit.

## Idées pour les thèmes à venir

- **Médiéval** : maisons à colombages, donjon pour l'hôtel de ville, remparts pour le périphérique, marché couvert, forge (CI/CD), moulin (dépendances).
- **Pixel art** : voxels, couleurs saturées, une seule forme `box`, éclairage plat.
- **Cyberpunk** : néons (matériau 1 partout), tours très hautes, nuit par défaut.

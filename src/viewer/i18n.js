// Bitropolis — traductions de l'interface (français, anglais, allemand, italien, espagnol, chinois, russe).
// Langue : choix mémorisé dans ce navigateur, sinon celle du navigateur, sinon l'anglais.
// Pluriels : Intl.PluralRules (clés « .one », « .few », « .many », « .other »).

export const UI_LANGS = [
  { code: 'en', name: 'English' }, { code: 'fr', name: 'Français' }, { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' }, { code: 'es', name: 'Español' }, { code: 'zh', name: '中文' }, { code: 'ru', name: 'Русский' }
];
const I18N_LOCALE = { en: 'en-US', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', es: 'es-ES', zh: 'zh-CN', ru: 'ru-RU' };

const I18N_D = {};

I18N_D.en = {
  'btn.health.t': 'Code health: huge files, import cycles, dead code…', 'btn.health.l': ' Health', 'export.png': 'Image (PNG)', 'export.gif': 'Animated GIF (full turn)', 'export.video': 'Timelapse video (construction)', 'export.gifFrames': 'GIF: frame {i}/{n}', 'export.gifEncode': 'Encoding the GIF…', 'export.recording': 'Recording the timelapse… {s} s', 'export.done': 'Saved: {file}', 'export.noVideo': 'This browser can’t record video.', 'export.fail': 'Export failed: {msg}', 'health.title': '🩺 Code health', 'health.sub': 'What deserves a look', 'health.huge': 'Huge files (≥ 1,000 lines)', 'health.cycle': 'Import cycles', 'health.complex': 'Very complex (≥ 150 branches)', 'health.todo': 'Piled-up TODO / FIXME (≥ 5)', 'health.orphan': 'Never imported (dead code?)', 'health.none': 'Nothing to report 🎉', 'health.loop': 'Loop of {n} files', 'health.more': '…and {n} more', 'w.huge': 'Huge file: {n} lines', 'w.cycle': 'Part of an import cycle', 'w.complex': 'Very complex: {n} branches', 'w.todo': '{n} TODO / FIXME', 'w.orphan': 'Never imported (dead code?)',
  'search.ph': 'Search a file…  ( / )', 'lang.title': 'Language', 'theme.title': 'Theme',
  'btn.night.t': 'Day / night (automatic cycle: 2 min each)', 'btn.night.l': ' Night', 'btn.deps.t': 'Show all dependencies', 'btn.deps.l': ' Links',
  'btn.fx.t': "Effects: shaders, weather, clouds", 'btn.fx.l': " Effects", 'fx.shaders': "Shaders", 'fx.q.std': "Simple", 'fx.q.high': "Beautiful", 'fx.weather': "Weather", 'fx.w.clear': "Clear", 'fx.w.rain': "Rain", 'fx.w.storm': "Storm", 'fx.sky': "Sky", 'fx.clouds': "Clouds", 'fx.nohigh': "Beautiful shaders are not available on this device.",
  'btn.traffic.t': 'Traffic', 'btn.traffic.l': ' Traffic', 'btn.labels.t': 'District names', 'btn.labels.l': ' Districts',
  'btn.home.t': 'Recenter the view', 'btn.land.t': "New countryside: hills, lakes, forests (Shift+click: the project's original map)", 'btn.land.l': ' Map',
  'btn.shot.t': 'Export: image, animated GIF, timelapse video', 'btn.open.t': 'Open another folder', 'btn.open.l': ' Open',
  'legend.title': '🗺️ Legend', 'panel.close': 'Close',
  'help': 'Drag: rotate · Right click: pan · Wheel: zoom · Double-click: fly to',
  'welcome.lead': 'Your code becomes a city. Every folder is a district, every file a building.',
  'welcome.open': '📁 Open a code folder', 'welcome.demo': '🏙️ Visit the demo city',
  'welcome.note': 'You can also <b>drag and drop</b> a folder here. <b>100% local</b>: nothing leaves your computer, no data is sent.<br>From the command line: <code>npx bitropolis ./my-project</code>',
  'drop': 'Drop your folder to build the city 🏗️', 'loading': 'Loading…',
  'webgl': 'WebGL is not available in this browser: the city cannot be drawn.',
  'theme.city': '3D City', 'theme.lowpoly': 'Low poly', 'theme.medieval': 'Medieval', 'theme.pixel': 'Pixel art', 'theme.cyberpunk': 'Cyberpunk', 'theme.japan': 'Japan',
  'theme.soon': '{name} — coming soon',
  'toast.land.orig': "The project's original map", 'toast.land.new': 'New countryside: {n} trees, bushes and rocks',
  'lang.file': 'File', 'lang.text': 'Text', 'search.none': 'No building found',
  'load.analyze': 'Analyzing “{name}”…', 'load.read': 'Reading files… {i}/{n}', 'load.list': 'Listing files… {n}', 'load.filter': 'Sorting files… {i}/{n}', 'load.metrics': 'Measuring the code… {i}/{n}', 'load.links': 'Linking files… {i}/{n}', 'load.build': 'Building the city…',
  'toast.nofiles': 'No usable files in this folder.', 'toast.analyzeErr': 'Could not analyze this folder: {msg}',
  'toast.truncated': 'Huge project: {n} minor files not shown.', 'toast.buildErr': 'Error while building: {msg}',
  'evo.grown.one': '📈 {n} building grew', 'evo.grown.other': '📈 {n} buildings grew',
  'evo.added.one': '🆕 {n} new', 'evo.added.other': '🆕 {n} new',
  'evo.removed.one': '🏚️ {n} demolished', 'evo.removed.other': '🏚️ {n} demolished', 'evo.since': ' since your last visit',
  'stat.buildings': 'buildings', 'stat.lines': 'lines', 'stat.districts': 'districts', 'stat.roads': 'roads',
  'stat.monuments': 'monuments', 'stat.roundabouts': 'roundabouts', 'stat.links': 'links',
  'lg.stages.t': 'Stages N1 → N8', 'lg.stages.d': 'A building moves up a stage when its file grows (lines, files importing it, complexity): shack → tower, wind turbine → nuclear plant.',
  'lg.roads.t': 'Roads', 'lg.roads.d': 'Dependencies travel along the roads: the more of them, the higher the avenue climbs (N1 → N8).',
  'lg.monuments.t': 'Monuments', 'lg.monuments.d': 'On the squares along the busiest avenues.',
  'lg.levels.t': 'Levels', 'lg.levels.d': 'The more important a file (size, files depending on it, complexity), the taller its building: house → skyscraper.',
  'lg.rb.t': 'Roundabouts', 'lg.rb.d': 'Crossroads where the most dependencies between districts meet.',
  'tip.stage': 'stage {s}/{n}', 'tip.lines': '{n} lines', 'tip.mon.t': '🗿 Monument', 'tip.mon.d': '{n} dependencies pass by',
  'tip.rb.t': '⭕ Roundabout', 'tip.rb.d': '{n} dependencies cross here',
  'm.loc': 'Lines of code', 'm.size': 'Size', 'm.funcs': 'Functions', 'm.classes': 'Classes', 'm.branches': 'Branches',
  'm.todos': 'TODO / FIXME', 'm.lang': 'Language', 'm.rank': 'Importance', 'm.external': 'External packages',
  'p.uses': 'Uses', 'p.usedBy': 'Used by', 'p.noDeps': 'No internal dependency.', 'p.noUsers': 'Nobody imports it (yet).',
  'g.stage': 'stage {s} / {n}', 'g.progress': '{p} / {next} points: about {left} more for the next stage (1 line = 1 point, 15 per file importing it).',
  'g.max': 'Maximum stage reached 🎉', 'g.since': '📈 Since your last visit: {ev}',
  'mon.kind': '🗿 Monument', 'mon.sub': 'Square on a busy avenue', 'links.one': '{n} link', 'links.other': '{n} links',
  'mon.text': '{n} dependencies pass in front of this monument, mostly between <b>{a}</b> and <b>{b}</b>.',
  'rb.kind': '⭕ Roundabout', 'rb.sub': 'Dependency crossroads', 'rb.text': 'This roundabout links <b>{a}</b> and <b>{b}</b>: {n} imports cross the road between them.',
  'files.one': '{n} file', 'files.other': '{n} files', 'bytes': ['B', 'KB', 'MB'],
  'tier.tower': ['House', 'Small building', 'Building', 'Tower', 'Skyscraper'], 'tier.level': 'Level {n}',
  'k.townhall': 'City hall', 'k.townhall.r': 'Main entry point of the project', 'k.tower': 'Building', 'k.tower.r': 'Source code',
  'k.shop': 'Shops', 'k.shop.r': 'Interface: components, views, styles', 'k.bank': 'Bank', 'k.bank.r': 'Data: models, schemas, state',
  'k.police': 'Police station', 'k.police.r': 'Tests & security', 'k.fire': 'Fire station', 'k.fire.r': 'CI/CD, Docker, scripts, deployment',
  'k.hospital': 'Hospital', 'k.hospital.r': 'Errors, logs, monitoring', 'k.library': 'Library', 'k.library.r': 'Documentation',
  'k.factory': 'Factory', 'k.factory.r': 'Configuration & tooling', 'k.power': 'Power plant', 'k.power.r': 'Dependencies & manifests',
  'k.warehouse': 'Warehouse', 'k.warehouse.r': 'Raw data, SQL, migrations', 'k.park': 'Park', 'k.park.r': 'Assets: images, sounds, fonts',
  'f.townhall': 'City hall', 'f.residential': 'Residence', 'f.commercial': 'Shop', 'f.office': 'Offices', 'f.police': 'Police station',
  'f.fire': 'Fire station', 'f.clinic': 'Clinic', 'f.hospital': 'Hospital', 'f.library': 'Library', 'f.university': 'University',
  'f.workshop': 'Workshop', 'f.factory': 'Factory', 'f.industrial': 'Industrial complex', 'f.wind': 'Wind turbine', 'f.solar': 'Solar farm',
  'f.coal': 'Coal plant', 'f.nuclear': 'Nuclear plant', 'f.water': 'Water tower', 'f.wastewater': 'Treatment plant', 'f.recycling': 'Recycling center',
  'f.park': 'Park', 'f.grove': 'Grove', 'f.garden': 'Garden', 'f.block': 'Residential block', 'f.theater': 'Theater', 'f.opera': 'Opera house',
  'f.research': 'Research center', 'f.prison': 'Prison', 'f.transit': 'Bus station', 'f.school': 'School', 'f.artisan': 'Craft zone',
  'f.solarplant': 'Solar power plant', 'f.clocktower': 'Clock tower', 'f.fountain': 'Fountain', 'f.memorial': 'Memorial',
  'f.playground': 'Playground', 'f.castle': 'Castle', 'f.museum': 'Museum', 'f.observatory': 'Observatory', 'f.pool': 'Swimming pool', 'f.stadium': 'Stadium', 'f.bank': 'Bank', 'f.powerplant': 'Power plant', 'f.cinema': 'Cinema', 'f.church': 'Church', 'f.station': 'Train station', 'f.hotel': 'Hotel', 'f.parking': 'Car park', 'f.restaurant': 'Restaurant', 'f.skyscraper': 'Skyscraper', 'f.steelworks': 'Steelworks', 'f.sawmill': 'Sawmill', 'f.chemical': 'Chemical plant', 'f.techfactory': 'Tech factory', 'f.textile': 'Textile mill'
};

I18N_D.fr = {
  'btn.health.t': 'Santé du code : fichiers géants, boucles d\’imports, code mort…', 'btn.health.l': ' Santé', 'export.png': 'Image (PNG)', 'export.gif': 'GIF animé (tour complet)', 'export.video': 'Vidéo timelapse (construction)', 'export.gifFrames': 'GIF : image {i}/{n}', 'export.gifEncode': 'Encodage du GIF…', 'export.recording': 'Enregistrement du timelapse… {s} s', 'export.done': 'Enregistré : {file}', 'export.noVideo': 'Ce navigateur ne sait pas enregistrer de vidéo.', 'export.fail': 'Échec de l\’export : {msg}', 'health.title': '🩺 Santé du code', 'health.sub': 'Ce qui mérite un coup d\’œil', 'health.huge': 'Fichiers géants (≥ 1 000 lignes)', 'health.cycle': 'Dépendances circulaires', 'health.complex': 'Très complexes (≥ 150 branches)', 'health.todo': 'TODO / FIXME accumulés (≥ 5)', 'health.orphan': 'Jamais importés (code mort ?)', 'health.none': 'Rien à signaler 🎉', 'health.loop': 'Boucle de {n} fichiers', 'health.more': '… et {n} autres', 'w.huge': 'Fichier géant : {n} lignes', 'w.cycle': 'Fait partie d\’une boucle d\’imports', 'w.complex': 'Très complexe : {n} branches', 'w.todo': '{n} TODO / FIXME', 'w.orphan': 'Jamais importé (code mort ?)',
  'search.ph': 'Chercher un fichier…  ( / )', 'lang.title': 'Langue', 'theme.title': 'Thème',
  'btn.night.t': 'Jour / nuit (cycle automatique de 2 min chacun)', 'btn.night.l': ' Nuit', 'btn.deps.t': 'Afficher toutes les dépendances', 'btn.deps.l': ' Liens',
  'btn.fx.t': "Effets : shaders, météo, nuages", 'btn.fx.l': " Effets", 'fx.shaders': "Shaders", 'fx.q.std': "Simples", 'fx.q.high': "Beaux", 'fx.weather': "Météo", 'fx.w.clear': "Clair", 'fx.w.rain': "Pluie", 'fx.w.storm': "Orage", 'fx.sky': "Ciel", 'fx.clouds': "Nuages", 'fx.nohigh': "Les beaux shaders ne sont pas disponibles sur cet appareil.",
  'btn.traffic.t': 'Circulation', 'btn.traffic.l': ' Trafic', 'btn.labels.t': 'Noms des quartiers', 'btn.labels.l': ' Quartiers',
  'btn.home.t': 'Recentrer la vue', 'btn.land.t': "Nouvelle campagne : relief, lacs, forêts (Maj+clic : carte d'origine du projet)", 'btn.land.l': ' Carte',
  'btn.shot.t': 'Exporter : image, GIF animé, vidéo timelapse', 'btn.open.t': 'Ouvrir un autre dossier', 'btn.open.l': ' Ouvrir',
  'legend.title': '🗺️ Légende', 'panel.close': 'Fermer',
  'help': "Glisser : tourner · Clic droit : déplacer · Molette : zoom · Double-clic : s'approcher",
  'welcome.lead': 'Ton code devient une ville. Chaque dossier est un quartier, chaque fichier un bâtiment.',
  'welcome.open': '📁 Ouvrir un dossier de code', 'welcome.demo': '🏙️ Visiter la ville démo',
  'welcome.note': "Tu peux aussi <b>glisser-déposer</b> un dossier ici. <b>100 % local</b> : rien ne quitte ton ordinateur, aucune donnée n'est envoyée.<br>En ligne de commande : <code>npx bitropolis ./mon-projet</code>",
  'drop': 'Lâche ton dossier pour bâtir la ville 🏗️', 'loading': 'Chargement…',
  'webgl': "WebGL n'est pas disponible dans ce navigateur : impossible de dessiner la ville.",
  'theme.city': 'Ville 3D', 'theme.lowpoly': 'Low poly', 'theme.medieval': 'Médiéval', 'theme.pixel': 'Pixel art', 'theme.cyberpunk': 'Cyberpunk', 'theme.japan': 'Japon',
  'theme.soon': '{name} — bientôt',
  'toast.land.orig': "Carte d'origine du projet", 'toast.land.new': 'Nouvelle campagne : {n} arbres, buissons et rochers',
  'lang.file': 'Fichier', 'lang.text': 'Texte', 'search.none': 'Aucun bâtiment trouvé',
  'load.analyze': 'Analyse de « {name} »…', 'load.read': 'Lecture des fichiers… {i}/{n}', 'load.list': 'Liste des fichiers… {n}', 'load.filter': 'Tri des fichiers… {i}/{n}', 'load.metrics': 'Mesure du code… {i}/{n}', 'load.links': 'Liens entre fichiers… {i}/{n}', 'load.build': 'Construction de la ville…',
  'toast.nofiles': 'Aucun fichier exploitable dans ce dossier.', 'toast.analyzeErr': "Impossible d'analyser ce dossier : {msg}",
  'toast.truncated': 'Projet géant : {n} fichiers mineurs non affichés.', 'toast.buildErr': 'Erreur pendant la construction : {msg}',
  'evo.grown.one': '📈 {n} bâtiment a grandi', 'evo.grown.other': '📈 {n} bâtiments ont grandi',
  'evo.added.one': '🆕 {n} nouveau', 'evo.added.other': '🆕 {n} nouveaux',
  'evo.removed.one': '🏚️ {n} démoli', 'evo.removed.other': '🏚️ {n} démolis', 'evo.since': ' depuis la dernière visite',
  'stat.buildings': 'bâtiments', 'stat.lines': 'lignes', 'stat.districts': 'quartiers', 'stat.roads': 'routes',
  'stat.monuments': 'monuments', 'stat.roundabouts': 'rond-points', 'stat.links': 'liaisons',
  'lg.stages.t': 'Stades N1 → N8', 'lg.stages.d': "Chaque bâtiment monte d'un stade quand son fichier grandit (lignes, fichiers qui l'importent, complexité) : cabane → tour, éolienne → centrale nucléaire.",
  'lg.roads.t': 'Routes', 'lg.roads.d': "Les dépendances circulent par les routes : plus il en passe, plus l'avenue monte en gamme (N1 → N8).",
  'lg.monuments.t': 'Monuments', 'lg.monuments.d': 'Sur les places au bord des avenues les plus fréquentées.',
  'lg.levels.t': 'Niveaux', 'lg.levels.d': 'Plus un fichier est important (taille, fichiers qui en dépendent, complexité), plus son bâtiment grandit : maison → gratte-ciel.',
  'lg.rb.t': 'Rond-points', 'lg.rb.d': 'Carrefours où passent le plus de dépendances entre quartiers.',
  'tip.stage': 'stade {s}/{n}', 'tip.lines': '{n} lignes', 'tip.mon.t': '🗿 Monument', 'tip.mon.d': '{n} dépendances passent devant',
  'tip.rb.t': '⭕ Rond-point', 'tip.rb.d': '{n} dépendances se croisent ici',
  'm.loc': 'Lignes de code', 'm.size': 'Taille', 'm.funcs': 'Fonctions', 'm.classes': 'Classes', 'm.branches': 'Branches',
  'm.todos': 'TODO / FIXME', 'm.lang': 'Langage', 'm.rank': 'Importance', 'm.external': 'Paquets externes',
  'p.uses': 'Utilise', 'p.usedBy': 'Utilisé par', 'p.noDeps': 'Aucune dépendance interne.', 'p.noUsers': "Personne ne l'importe (encore).",
  'g.stage': 'stade {s} / {n}', 'g.progress': "{p} / {next} points : encore ~{left} pour le stade suivant (1 ligne = 1 point, 15 par fichier qui l'importe).",
  'g.max': 'Stade maximum atteint 🎉', 'g.since': '📈 Depuis la dernière visite : {ev}',
  'mon.kind': '🗿 Monument', 'mon.sub': "Place d'une avenue très fréquentée", 'links.one': '{n} liaison', 'links.other': '{n} liaisons',
  'mon.text': '{n} dépendances passent devant ce monument, surtout entre <b>{a}</b> et <b>{b}</b>.',
  'rb.kind': '⭕ Rond-point', 'rb.sub': 'Carrefour de dépendances', 'rb.text': 'Ce rond-point relie <b>{a}</b> et <b>{b}</b> : {n} imports traversent la route qui les sépare.',
  'files.one': '{n} fichier', 'files.other': '{n} fichiers', 'bytes': ['o', 'Ko', 'Mo'],
  'tier.tower': ['Maison', 'Petit immeuble', 'Immeuble', 'Tour', 'Gratte-ciel'], 'tier.level': 'Niveau {n}',
  'k.townhall': 'Hôtel de ville', 'k.townhall.r': "Point d'entrée principal du projet", 'k.tower': 'Immeuble', 'k.tower.r': 'Code source',
  'k.shop': 'Commerces', 'k.shop.r': 'Interface : composants, vues, styles', 'k.bank': 'Banque', 'k.bank.r': 'Données : modèles, schémas, état',
  'k.police': 'Commissariat', 'k.police.r': 'Tests & sécurité', 'k.fire': 'Caserne de pompiers', 'k.fire.r': 'CI/CD, Docker, scripts, déploiement',
  'k.hospital': 'Hôpital', 'k.hospital.r': 'Erreurs, logs, monitoring', 'k.library': 'Bibliothèque', 'k.library.r': 'Documentation',
  'k.factory': 'Usine', 'k.factory.r': 'Configuration & outillage', 'k.power': 'Centrale électrique', 'k.power.r': 'Dépendances & manifestes',
  'k.warehouse': 'Entrepôt', 'k.warehouse.r': 'Données brutes, SQL, migrations', 'k.park': 'Parc', 'k.park.r': 'Assets : images, sons, polices',
  'f.townhall': 'Hôtel de ville', 'f.residential': 'Résidence', 'f.commercial': 'Commerce', 'f.office': 'Bureaux', 'f.police': 'Commissariat',
  'f.fire': 'Caserne', 'f.clinic': 'Clinique', 'f.hospital': 'Hôpital', 'f.library': 'Bibliothèque', 'f.university': 'Université',
  'f.workshop': 'Atelier', 'f.factory': 'Usine', 'f.industrial': 'Complexe industriel', 'f.wind': 'Éolienne', 'f.solar': 'Ferme solaire',
  'f.coal': 'Centrale à charbon', 'f.nuclear': 'Centrale nucléaire', 'f.water': "Château d'eau", 'f.wastewater': "Station d'épuration", 'f.recycling': 'Centre de recyclage',
  'f.park': 'Parc', 'f.grove': 'Bosquet', 'f.garden': 'Jardin', 'f.block': 'Îlot résidentiel', 'f.theater': 'Théâtre', 'f.opera': 'Opéra',
  'f.research': 'Centre de recherche', 'f.prison': 'Prison', 'f.transit': 'Gare routière', 'f.school': 'École', 'f.artisan': 'Zone artisanale',
  'f.solarplant': 'Centrale solaire', 'f.clocktower': "Tour de l'horloge", 'f.fountain': 'Fontaine', 'f.memorial': 'Mémorial',
  'f.playground': 'Aire de jeux', 'f.castle': 'Château', 'f.museum': 'Musée', 'f.observatory': 'Observatoire', 'f.pool': 'Piscine', 'f.stadium': 'Stade', 'f.bank': 'Banque', 'f.powerplant': 'Centrale électrique', 'f.cinema': 'Cinéma', 'f.church': 'Église', 'f.station': 'Gare', 'f.hotel': 'Hôtel', 'f.parking': 'Parking', 'f.restaurant': 'Restaurant', 'f.skyscraper': 'Gratte-ciel', 'f.steelworks': 'Aciérie', 'f.sawmill': 'Scierie', 'f.chemical': 'Usine chimique', 'f.techfactory': 'Usine high-tech', 'f.textile': 'Usine textile'
};

I18N_D.de = {
  'btn.health.t': 'Code-Gesundheit: riesige Dateien, Import-Zyklen, toter Code…', 'btn.health.l': ' Gesundheit', 'export.png': 'Bild (PNG)', 'export.gif': 'Animiertes GIF (volle Runde)', 'export.video': 'Zeitraffer-Video (Bau)', 'export.gifFrames': 'GIF: Bild {i}/{n}', 'export.gifEncode': 'GIF wird kodiert…', 'export.recording': 'Zeitraffer wird aufgenommen… {s} s', 'export.done': 'Gespeichert: {file}', 'export.noVideo': 'Dieser Browser kann kein Video aufnehmen.', 'export.fail': 'Export fehlgeschlagen: {msg}', 'health.title': '🩺 Code-Gesundheit', 'health.sub': 'Was einen Blick verdient', 'health.huge': 'Riesige Dateien (≥ 1.000 Zeilen)', 'health.cycle': 'Zirkuläre Abhängigkeiten', 'health.complex': 'Sehr komplex (≥ 150 Verzweigungen)', 'health.todo': 'Angehäufte TODO / FIXME (≥ 5)', 'health.orphan': 'Nie importiert (toter Code?)', 'health.none': 'Nichts zu melden 🎉', 'health.loop': 'Zyklus aus {n} Dateien', 'health.more': '… und {n} weitere', 'w.huge': 'Riesige Datei: {n} Zeilen', 'w.cycle': 'Teil eines Import-Zyklus', 'w.complex': 'Sehr komplex: {n} Verzweigungen', 'w.todo': '{n} TODO / FIXME', 'w.orphan': 'Nie importiert (toter Code?)',
  'search.ph': 'Datei suchen…  ( / )', 'lang.title': 'Sprache', 'theme.title': 'Thema',
  'btn.night.t': 'Tag / Nacht (automatischer Wechsel alle 2 Min.)', 'btn.night.l': ' Nacht', 'btn.deps.t': 'Alle Abhängigkeiten anzeigen', 'btn.deps.l': ' Links',
  'btn.fx.t': "Effekte: Shader, Wetter, Wolken", 'btn.fx.l': " Effekte", 'fx.shaders': "Shader", 'fx.q.std': "Einfach", 'fx.q.high': "Schön", 'fx.weather': "Wetter", 'fx.w.clear': "Klar", 'fx.w.rain': "Regen", 'fx.w.storm': "Gewitter", 'fx.sky': "Himmel", 'fx.clouds': "Wolken", 'fx.nohigh': "Schöne Shader sind auf diesem Gerät nicht verfügbar.",
  'btn.traffic.t': 'Verkehr', 'btn.traffic.l': ' Verkehr', 'btn.labels.t': 'Namen der Viertel', 'btn.labels.l': ' Viertel',
  'btn.home.t': 'Ansicht zentrieren', 'btn.land.t': 'Neue Landschaft: Hügel, Seen, Wälder (Umschalt+Klick: ursprüngliche Karte des Projekts)', 'btn.land.l': ' Karte',
  'btn.shot.t': 'Export: Bild, animiertes GIF, Zeitraffer-Video', 'btn.open.t': 'Anderen Ordner öffnen', 'btn.open.l': ' Öffnen',
  'legend.title': '🗺️ Legende', 'panel.close': 'Schließen',
  'help': 'Ziehen: drehen · Rechtsklick: verschieben · Mausrad: zoomen · Doppelklick: hinfliegen',
  'welcome.lead': 'Dein Code wird zur Stadt. Jeder Ordner ist ein Viertel, jede Datei ein Gebäude.',
  'welcome.open': '📁 Code-Ordner öffnen', 'welcome.demo': '🏙️ Demo-Stadt besuchen',
  'welcome.note': 'Du kannst auch einen Ordner hierher <b>ziehen</b>. <b>100 % lokal</b>: Nichts verlässt deinen Computer, es werden keine Daten gesendet.<br>Über die Kommandozeile: <code>npx bitropolis ./mein-projekt</code>',
  'drop': 'Ordner loslassen, um die Stadt zu bauen 🏗️', 'loading': 'Wird geladen…',
  'webgl': 'WebGL ist in diesem Browser nicht verfügbar: Die Stadt kann nicht gezeichnet werden.',
  'theme.city': '3D-Stadt', 'theme.lowpoly': 'Low Poly', 'theme.medieval': 'Mittelalter', 'theme.pixel': 'Pixel-Art', 'theme.cyberpunk': 'Cyberpunk', 'theme.japan': 'Japan',
  'theme.soon': '{name} — demnächst',
  'toast.land.orig': 'Ursprüngliche Karte des Projekts', 'toast.land.new': 'Neue Landschaft: {n} Bäume, Büsche und Felsen',
  'lang.file': 'Datei', 'lang.text': 'Text', 'search.none': 'Kein Gebäude gefunden',
  'load.analyze': '„{name}“ wird analysiert…', 'load.read': 'Dateien werden gelesen… {i}/{n}', 'load.list': 'Dateien werden aufgelistet… {n}', 'load.filter': 'Dateien werden sortiert… {i}/{n}', 'load.metrics': 'Code wird vermessen… {i}/{n}', 'load.links': 'Dateien werden verknüpft… {i}/{n}', 'load.build': 'Die Stadt wird gebaut…',
  'toast.nofiles': 'Keine verwertbaren Dateien in diesem Ordner.', 'toast.analyzeErr': 'Dieser Ordner konnte nicht analysiert werden: {msg}',
  'toast.truncated': 'Riesiges Projekt: {n} unwichtige Dateien werden nicht angezeigt.', 'toast.buildErr': 'Fehler beim Bauen: {msg}',
  'evo.grown.one': '📈 {n} Gebäude ist gewachsen', 'evo.grown.other': '📈 {n} Gebäude sind gewachsen',
  'evo.added.one': '🆕 {n} neu', 'evo.added.other': '🆕 {n} neu',
  'evo.removed.one': '🏚️ {n} abgerissen', 'evo.removed.other': '🏚️ {n} abgerissen', 'evo.since': ' seit deinem letzten Besuch',
  'stat.buildings': 'Gebäude', 'stat.lines': 'Zeilen', 'stat.districts': 'Viertel', 'stat.roads': 'Straßen',
  'stat.monuments': 'Denkmäler', 'stat.roundabouts': 'Kreisverkehre', 'stat.links': 'Verknüpfungen',
  'lg.stages.t': 'Stufen N1 → N8', 'lg.stages.d': 'Ein Gebäude steigt eine Stufe auf, wenn seine Datei wächst (Zeilen, importierende Dateien, Komplexität): Hütte → Turm, Windrad → Atomkraftwerk.',
  'lg.roads.t': 'Straßen', 'lg.roads.d': 'Abhängigkeiten fließen über die Straßen: Je mehr es sind, desto höher steigt die Allee auf (N1 → N8).',
  'lg.monuments.t': 'Denkmäler', 'lg.monuments.d': 'Auf den Plätzen an den meistbefahrenen Alleen.',
  'lg.levels.t': 'Stufen', 'lg.levels.d': 'Je wichtiger eine Datei (Größe, abhängige Dateien, Komplexität), desto höher ihr Gebäude: Haus → Wolkenkratzer.',
  'lg.rb.t': 'Kreisverkehre', 'lg.rb.d': 'Kreuzungen, an denen sich die meisten Abhängigkeiten zwischen Vierteln treffen.',
  'tip.stage': 'Stufe {s}/{n}', 'tip.lines': '{n} Zeilen', 'tip.mon.t': '🗿 Denkmal', 'tip.mon.d': '{n} Abhängigkeiten führen vorbei',
  'tip.rb.t': '⭕ Kreisverkehr', 'tip.rb.d': '{n} Abhängigkeiten kreuzen sich hier',
  'm.loc': 'Codezeilen', 'm.size': 'Größe', 'm.funcs': 'Funktionen', 'm.classes': 'Klassen', 'm.branches': 'Verzweigungen',
  'm.todos': 'TODO / FIXME', 'm.lang': 'Sprache', 'm.rank': 'Wichtigkeit', 'm.external': 'Externe Pakete',
  'p.uses': 'Nutzt', 'p.usedBy': 'Genutzt von', 'p.noDeps': 'Keine interne Abhängigkeit.', 'p.noUsers': 'Niemand importiert sie (noch).',
  'g.stage': 'Stufe {s} / {n}', 'g.progress': '{p} / {next} Punkte: noch etwa {left} bis zur nächsten Stufe (1 Zeile = 1 Punkt, 15 pro importierender Datei).',
  'g.max': 'Höchste Stufe erreicht 🎉', 'g.since': '📈 Seit deinem letzten Besuch: {ev}',
  'mon.kind': '🗿 Denkmal', 'mon.sub': 'Platz an einer belebten Allee', 'links.one': '{n} Verknüpfung', 'links.other': '{n} Verknüpfungen',
  'mon.text': '{n} Abhängigkeiten führen an diesem Denkmal vorbei, vor allem zwischen <b>{a}</b> und <b>{b}</b>.',
  'rb.kind': '⭕ Kreisverkehr', 'rb.sub': 'Kreuzung der Abhängigkeiten', 'rb.text': 'Dieser Kreisverkehr verbindet <b>{a}</b> und <b>{b}</b>: {n} Imports überqueren die Straße dazwischen.',
  'files.one': '{n} Datei', 'files.other': '{n} Dateien', 'bytes': ['B', 'KB', 'MB'],
  'tier.tower': ['Haus', 'Kleines Gebäude', 'Gebäude', 'Turm', 'Wolkenkratzer'], 'tier.level': 'Stufe {n}',
  'k.townhall': 'Rathaus', 'k.townhall.r': 'Haupteinstiegspunkt des Projekts', 'k.tower': 'Gebäude', 'k.tower.r': 'Quellcode',
  'k.shop': 'Läden', 'k.shop.r': 'Oberfläche: Komponenten, Views, Styles', 'k.bank': 'Bank', 'k.bank.r': 'Daten: Modelle, Schemas, Zustand',
  'k.police': 'Polizeiwache', 'k.police.r': 'Tests & Sicherheit', 'k.fire': 'Feuerwache', 'k.fire.r': 'CI/CD, Docker, Skripte, Deployment',
  'k.hospital': 'Krankenhaus', 'k.hospital.r': 'Fehler, Logs, Monitoring', 'k.library': 'Bibliothek', 'k.library.r': 'Dokumentation',
  'k.factory': 'Fabrik', 'k.factory.r': 'Konfiguration & Werkzeuge', 'k.power': 'Kraftwerk', 'k.power.r': 'Abhängigkeiten & Manifeste',
  'k.warehouse': 'Lagerhaus', 'k.warehouse.r': 'Rohdaten, SQL, Migrationen', 'k.park': 'Park', 'k.park.r': 'Assets: Bilder, Sounds, Schriften',
  'f.townhall': 'Rathaus', 'f.residential': 'Wohnhaus', 'f.commercial': 'Laden', 'f.office': 'Büros', 'f.police': 'Polizeiwache',
  'f.fire': 'Feuerwache', 'f.clinic': 'Klinik', 'f.hospital': 'Krankenhaus', 'f.library': 'Bibliothek', 'f.university': 'Universität',
  'f.workshop': 'Werkstatt', 'f.factory': 'Fabrik', 'f.industrial': 'Industriekomplex', 'f.wind': 'Windrad', 'f.solar': 'Solarpark',
  'f.coal': 'Kohlekraftwerk', 'f.nuclear': 'Atomkraftwerk', 'f.water': 'Wasserturm', 'f.wastewater': 'Kläranlage', 'f.recycling': 'Recyclinghof',
  'f.park': 'Park', 'f.grove': 'Wäldchen', 'f.garden': 'Garten', 'f.block': 'Wohnblock', 'f.theater': 'Theater', 'f.opera': 'Oper',
  'f.research': 'Forschungszentrum', 'f.prison': 'Gefängnis', 'f.transit': 'Busbahnhof', 'f.school': 'Schule', 'f.artisan': 'Gewerbegebiet',
  'f.solarplant': 'Solarkraftwerk', 'f.clocktower': 'Uhrturm', 'f.fountain': 'Brunnen', 'f.memorial': 'Denkmal',
  'f.playground': 'Spielplatz', 'f.castle': 'Schloss', 'f.museum': 'Museum', 'f.observatory': 'Sternwarte', 'f.pool': 'Schwimmbad', 'f.stadium': 'Stadion', 'f.bank': 'Bank', 'f.powerplant': 'Kraftwerk', 'f.cinema': 'Kino', 'f.church': 'Kirche', 'f.station': 'Bahnhof', 'f.hotel': 'Hotel', 'f.parking': 'Parkhaus', 'f.restaurant': 'Restaurant', 'f.skyscraper': 'Wolkenkratzer', 'f.steelworks': 'Stahlwerk', 'f.sawmill': 'Sägewerk', 'f.chemical': 'Chemiewerk', 'f.techfactory': 'Technikfabrik', 'f.textile': 'Textilfabrik'
};

I18N_D.it = {
  'btn.health.t': 'Salute del codice: file enormi, cicli di import, codice morto…', 'btn.health.l': ' Salute', 'export.png': 'Immagine (PNG)', 'export.gif': 'GIF animata (giro completo)', 'export.video': 'Video timelapse (costruzione)', 'export.gifFrames': 'GIF: fotogramma {i}/{n}', 'export.gifEncode': 'Codifica della GIF…', 'export.recording': 'Registrazione del timelapse… {s} s', 'export.done': 'Salvato: {file}', 'export.noVideo': 'Questo browser non può registrare video.', 'export.fail': 'Esportazione non riuscita: {msg}', 'health.title': '🩺 Salute del codice', 'health.sub': 'Cosa merita uno sguardo', 'health.huge': 'File enormi (≥ 1.000 righe)', 'health.cycle': 'Dipendenze circolari', 'health.complex': 'Molto complessi (≥ 150 ramificazioni)', 'health.todo': 'TODO / FIXME accumulati (≥ 5)', 'health.orphan': 'Mai importati (codice morto?)', 'health.none': 'Niente da segnalare 🎉', 'health.loop': 'Ciclo di {n} file', 'health.more': '… e altri {n}', 'w.huge': 'File enorme: {n} righe', 'w.cycle': 'Fa parte di un ciclo di import', 'w.complex': 'Molto complesso: {n} ramificazioni', 'w.todo': '{n} TODO / FIXME', 'w.orphan': 'Mai importato (codice morto?)',
  'search.ph': 'Cerca un file…  ( / )', 'lang.title': 'Lingua', 'theme.title': 'Tema',
  'btn.night.t': 'Giorno / notte (ciclo automatico di 2 min ciascuno)', 'btn.night.l': ' Notte', 'btn.deps.t': 'Mostra tutte le dipendenze', 'btn.deps.l': ' Link',
  'btn.fx.t': "Effetti: shader, meteo, nuvole", 'btn.fx.l': " Effetti", 'fx.shaders': "Shader", 'fx.q.std': "Semplici", 'fx.q.high': "Belli", 'fx.weather': "Meteo", 'fx.w.clear': "Sereno", 'fx.w.rain': "Pioggia", 'fx.w.storm': "Temporale", 'fx.sky': "Cielo", 'fx.clouds': "Nuvole", 'fx.nohigh': "Gli shader belli non sono disponibili su questo dispositivo.",
  'btn.traffic.t': 'Traffico', 'btn.traffic.l': ' Traffico', 'btn.labels.t': 'Nomi dei quartieri', 'btn.labels.l': ' Quartieri',
  'btn.home.t': 'Ricentra la vista', 'btn.land.t': 'Nuova campagna: colline, laghi, foreste (Maiusc+clic: mappa originale del progetto)', 'btn.land.l': ' Mappa',
  'btn.shot.t': 'Esporta: immagine, GIF animata, video timelapse', 'btn.open.t': "Apri un'altra cartella", 'btn.open.l': ' Apri',
  'legend.title': '🗺️ Legenda', 'panel.close': 'Chiudi',
  'help': 'Trascina: ruota · Clic destro: sposta · Rotellina: zoom · Doppio clic: avvicinati',
  'welcome.lead': 'Il tuo codice diventa una città. Ogni cartella è un quartiere, ogni file un edificio.',
  'welcome.open': '📁 Apri una cartella di codice', 'welcome.demo': '🏙️ Visita la città demo',
  'welcome.note': 'Puoi anche <b>trascinare</b> qui una cartella. <b>100% locale</b>: nulla lascia il tuo computer, nessun dato viene inviato.<br>Da riga di comando: <code>npx bitropolis ./mio-progetto</code>',
  'drop': 'Rilascia la cartella per costruire la città 🏗️', 'loading': 'Caricamento…',
  'webgl': 'WebGL non è disponibile in questo browser: impossibile disegnare la città.',
  'theme.city': 'Città 3D', 'theme.lowpoly': 'Low poly', 'theme.medieval': 'Medievale', 'theme.pixel': 'Pixel art', 'theme.cyberpunk': 'Cyberpunk', 'theme.japan': 'Giappone',
  'theme.soon': '{name} — in arrivo',
  'toast.land.orig': 'Mappa originale del progetto', 'toast.land.new': 'Nuova campagna: {n} alberi, cespugli e rocce',
  'lang.file': 'File', 'lang.text': 'Testo', 'search.none': 'Nessun edificio trovato',
  'load.analyze': 'Analisi di «{name}»…', 'load.read': 'Lettura dei file… {i}/{n}', 'load.list': 'Elenco dei file… {n}', 'load.filter': 'Ordinamento dei file… {i}/{n}', 'load.metrics': 'Misura del codice… {i}/{n}', 'load.links': 'Collegamenti tra file… {i}/{n}', 'load.build': 'Costruzione della città…',
  'toast.nofiles': 'Nessun file utilizzabile in questa cartella.', 'toast.analyzeErr': 'Impossibile analizzare questa cartella: {msg}',
  'toast.truncated': 'Progetto enorme: {n} file minori non mostrati.', 'toast.buildErr': 'Errore durante la costruzione: {msg}',
  'evo.grown.one': '📈 {n} edificio è cresciuto', 'evo.grown.other': '📈 {n} edifici sono cresciuti',
  'evo.added.one': '🆕 {n} nuovo', 'evo.added.other': '🆕 {n} nuovi',
  'evo.removed.one': '🏚️ {n} demolito', 'evo.removed.other': '🏚️ {n} demoliti', 'evo.since': " dall'ultima visita",
  'stat.buildings': 'edifici', 'stat.lines': 'righe', 'stat.districts': 'quartieri', 'stat.roads': 'strade',
  'stat.monuments': 'monumenti', 'stat.roundabouts': 'rotonde', 'stat.links': 'collegamenti',
  'lg.stages.t': 'Livelli N1 → N8', 'lg.stages.d': 'Un edificio sale di livello quando il suo file cresce (righe, file che lo importano, complessità): baracca → torre, pala eolica → centrale nucleare.',
  'lg.roads.t': 'Strade', 'lg.roads.d': 'Le dipendenze viaggiano lungo le strade: più ne passano, più il viale sale di categoria (N1 → N8).',
  'lg.monuments.t': 'Monumenti', 'lg.monuments.d': 'Nelle piazze lungo i viali più trafficati.',
  'lg.levels.t': 'Livelli', 'lg.levels.d': "Più un file è importante (dimensione, file che ne dipendono, complessità), più l'edificio è alto: casa → grattacielo.",
  'lg.rb.t': 'Rotonde', 'lg.rb.d': 'Incroci dove passano più dipendenze tra quartieri.',
  'tip.stage': 'livello {s}/{n}', 'tip.lines': '{n} righe', 'tip.mon.t': '🗿 Monumento', 'tip.mon.d': '{n} dipendenze passano davanti',
  'tip.rb.t': '⭕ Rotonda', 'tip.rb.d': '{n} dipendenze si incrociano qui',
  'm.loc': 'Righe di codice', 'm.size': 'Dimensione', 'm.funcs': 'Funzioni', 'm.classes': 'Classi', 'm.branches': 'Ramificazioni',
  'm.todos': 'TODO / FIXME', 'm.lang': 'Linguaggio', 'm.rank': 'Importanza', 'm.external': 'Pacchetti esterni',
  'p.uses': 'Usa', 'p.usedBy': 'Usato da', 'p.noDeps': 'Nessuna dipendenza interna.', 'p.noUsers': 'Nessuno lo importa (ancora).',
  'g.stage': 'livello {s} / {n}', 'g.progress': '{p} / {next} punti: ancora circa {left} per il livello successivo (1 riga = 1 punto, 15 per ogni file che lo importa).',
  'g.max': 'Livello massimo raggiunto 🎉', 'g.since': "📈 Dall'ultima visita: {ev}",
  'mon.kind': '🗿 Monumento', 'mon.sub': 'Piazza su un viale trafficato', 'links.one': '{n} collegamento', 'links.other': '{n} collegamenti',
  'mon.text': '{n} dipendenze passano davanti a questo monumento, soprattutto tra <b>{a}</b> e <b>{b}</b>.',
  'rb.kind': '⭕ Rotonda', 'rb.sub': 'Incrocio di dipendenze', 'rb.text': 'Questa rotonda collega <b>{a}</b> e <b>{b}</b>: {n} import attraversano la strada che li separa.',
  'files.one': '{n} file', 'files.other': '{n} file', 'bytes': ['B', 'KB', 'MB'],
  'tier.tower': ['Casa', 'Palazzina', 'Palazzo', 'Torre', 'Grattacielo'], 'tier.level': 'Livello {n}',
  'k.townhall': 'Municipio', 'k.townhall.r': 'Punto di ingresso principale del progetto', 'k.tower': 'Palazzo', 'k.tower.r': 'Codice sorgente',
  'k.shop': 'Negozi', 'k.shop.r': 'Interfaccia: componenti, viste, stili', 'k.bank': 'Banca', 'k.bank.r': 'Dati: modelli, schemi, stato',
  'k.police': 'Commissariato', 'k.police.r': 'Test e sicurezza', 'k.fire': 'Caserma dei pompieri', 'k.fire.r': 'CI/CD, Docker, script, deploy',
  'k.hospital': 'Ospedale', 'k.hospital.r': 'Errori, log, monitoraggio', 'k.library': 'Biblioteca', 'k.library.r': 'Documentazione',
  'k.factory': 'Fabbrica', 'k.factory.r': 'Configurazione e strumenti', 'k.power': 'Centrale elettrica', 'k.power.r': 'Dipendenze e manifest',
  'k.warehouse': 'Magazzino', 'k.warehouse.r': 'Dati grezzi, SQL, migrazioni', 'k.park': 'Parco', 'k.park.r': 'Asset: immagini, suoni, font',
  'f.townhall': 'Municipio', 'f.residential': 'Residenza', 'f.commercial': 'Negozio', 'f.office': 'Uffici', 'f.police': 'Commissariato',
  'f.fire': 'Caserma', 'f.clinic': 'Clinica', 'f.hospital': 'Ospedale', 'f.library': 'Biblioteca', 'f.university': 'Università',
  'f.workshop': 'Laboratorio', 'f.factory': 'Fabbrica', 'f.industrial': 'Complesso industriale', 'f.wind': 'Pala eolica', 'f.solar': 'Parco solare',
  'f.coal': 'Centrale a carbone', 'f.nuclear': 'Centrale nucleare', 'f.water': 'Torre idrica', 'f.wastewater': 'Depuratore', 'f.recycling': 'Centro di riciclo',
  'f.park': 'Parco', 'f.grove': 'Boschetto', 'f.garden': 'Giardino', 'f.block': 'Isolato residenziale', 'f.theater': 'Teatro', 'f.opera': 'Teatro lirico',
  'f.research': 'Centro di ricerca', 'f.prison': 'Prigione', 'f.transit': 'Stazione degli autobus', 'f.school': 'Scuola', 'f.artisan': 'Zona artigianale',
  'f.solarplant': 'Centrale solare', 'f.clocktower': "Torre dell'orologio", 'f.fountain': 'Fontana', 'f.memorial': 'Memoriale',
  'f.playground': 'Parco giochi', 'f.castle': 'Castello', 'f.museum': 'Museo', 'f.observatory': 'Osservatorio', 'f.pool': 'Piscina', 'f.stadium': 'Stadio', 'f.bank': 'Banca', 'f.powerplant': 'Centrale elettrica', 'f.cinema': 'Cinema', 'f.church': 'Chiesa', 'f.station': 'Stazione', 'f.hotel': 'Hotel', 'f.parking': 'Parcheggio', 'f.restaurant': 'Ristorante', 'f.skyscraper': 'Grattacielo', 'f.steelworks': 'Acciaieria', 'f.sawmill': 'Segheria', 'f.chemical': 'Impianto chimico', 'f.techfactory': 'Fabbrica high-tech', 'f.textile': 'Fabbrica tessile'
};

I18N_D.es = {
  'btn.health.t': 'Salud del código: archivos enormes, ciclos de imports, código muerto…', 'btn.health.l': ' Salud', 'export.png': 'Imagen (PNG)', 'export.gif': 'GIF animado (vuelta completa)', 'export.video': 'Vídeo timelapse (construcción)', 'export.gifFrames': 'GIF: fotograma {i}/{n}', 'export.gifEncode': 'Codificando el GIF…', 'export.recording': 'Grabando el timelapse… {s} s', 'export.done': 'Guardado: {file}', 'export.noVideo': 'Este navegador no puede grabar vídeo.', 'export.fail': 'Error al exportar: {msg}', 'health.title': '🩺 Salud del código', 'health.sub': 'Lo que merece un vistazo', 'health.huge': 'Archivos enormes (≥ 1000 líneas)', 'health.cycle': 'Dependencias circulares', 'health.complex': 'Muy complejos (≥ 150 ramificaciones)', 'health.todo': 'TODO / FIXME acumulados (≥ 5)', 'health.orphan': 'Nunca importados (¿código muerto?)', 'health.none': 'Nada que señalar 🎉', 'health.loop': 'Ciclo de {n} archivos', 'health.more': '… y {n} más', 'w.huge': 'Archivo enorme: {n} líneas', 'w.cycle': 'Forma parte de un ciclo de imports', 'w.complex': 'Muy complejo: {n} ramificaciones', 'w.todo': '{n} TODO / FIXME', 'w.orphan': 'Nunca importado (¿código muerto?)',
  'search.ph': 'Buscar un archivo…  ( / )', 'lang.title': 'Idioma', 'theme.title': 'Tema',
  'btn.night.t': 'Día / noche (ciclo automático de 2 min cada uno)', 'btn.night.l': ' Noche', 'btn.deps.t': 'Mostrar todas las dependencias', 'btn.deps.l': ' Enlaces',
  'btn.fx.t': "Efectos: shaders, clima, nubes", 'btn.fx.l': " Efectos", 'fx.shaders': "Shaders", 'fx.q.std': "Simples", 'fx.q.high': "Bonitos", 'fx.weather': "Clima", 'fx.w.clear': "Despejado", 'fx.w.rain': "Lluvia", 'fx.w.storm': "Tormenta", 'fx.sky': "Cielo", 'fx.clouds': "Nubes", 'fx.nohigh': "Los shaders bonitos no están disponibles en este dispositivo.",
  'btn.traffic.t': 'Tráfico', 'btn.traffic.l': ' Tráfico', 'btn.labels.t': 'Nombres de los barrios', 'btn.labels.l': ' Barrios',
  'btn.home.t': 'Recentrar la vista', 'btn.land.t': 'Nuevo campo: colinas, lagos, bosques (Mayús+clic: mapa original del proyecto)', 'btn.land.l': ' Mapa',
  'btn.shot.t': 'Exportar: imagen, GIF animado, vídeo timelapse', 'btn.open.t': 'Abrir otra carpeta', 'btn.open.l': ' Abrir',
  'legend.title': '🗺️ Leyenda', 'panel.close': 'Cerrar',
  'help': 'Arrastrar: girar · Clic derecho: desplazar · Rueda: zoom · Doble clic: acercarse',
  'welcome.lead': 'Tu código se convierte en una ciudad. Cada carpeta es un barrio, cada archivo un edificio.',
  'welcome.open': '📁 Abrir una carpeta de código', 'welcome.demo': '🏙️ Visitar la ciudad de demostración',
  'welcome.note': 'También puedes <b>arrastrar</b> una carpeta aquí. <b>100 % local</b>: nada sale de tu ordenador, no se envía ningún dato.<br>Desde la línea de comandos: <code>npx bitropolis ./mi-proyecto</code>',
  'drop': 'Suelta tu carpeta para construir la ciudad 🏗️', 'loading': 'Cargando…',
  'webgl': 'WebGL no está disponible en este navegador: no se puede dibujar la ciudad.',
  'theme.city': 'Ciudad 3D', 'theme.lowpoly': 'Low poly', 'theme.medieval': 'Medieval', 'theme.pixel': 'Pixel art', 'theme.cyberpunk': 'Cyberpunk', 'theme.japan': 'Japón',
  'theme.soon': '{name} — próximamente',
  'toast.land.orig': 'Mapa original del proyecto', 'toast.land.new': 'Nuevo campo: {n} árboles, arbustos y rocas',
  'lang.file': 'Archivo', 'lang.text': 'Texto', 'search.none': 'No se encontró ningún edificio',
  'load.analyze': 'Analizando «{name}»…', 'load.read': 'Leyendo archivos… {i}/{n}', 'load.list': 'Listando archivos… {n}', 'load.filter': 'Ordenando archivos… {i}/{n}', 'load.metrics': 'Midiendo el código… {i}/{n}', 'load.links': 'Enlazando archivos… {i}/{n}', 'load.build': 'Construyendo la ciudad…',
  'toast.nofiles': 'No hay archivos utilizables en esta carpeta.', 'toast.analyzeErr': 'No se pudo analizar esta carpeta: {msg}',
  'toast.truncated': 'Proyecto enorme: {n} archivos menores no se muestran.', 'toast.buildErr': 'Error durante la construcción: {msg}',
  'evo.grown.one': '📈 {n} edificio ha crecido', 'evo.grown.other': '📈 {n} edificios han crecido',
  'evo.added.one': '🆕 {n} nuevo', 'evo.added.other': '🆕 {n} nuevos',
  'evo.removed.one': '🏚️ {n} demolido', 'evo.removed.other': '🏚️ {n} demolidos', 'evo.since': ' desde tu última visita',
  'stat.buildings': 'edificios', 'stat.lines': 'líneas', 'stat.districts': 'barrios', 'stat.roads': 'calles',
  'stat.monuments': 'monumentos', 'stat.roundabouts': 'rotondas', 'stat.links': 'enlaces',
  'lg.stages.t': 'Etapas N1 → N8', 'lg.stages.d': 'Un edificio sube de etapa cuando su archivo crece (líneas, archivos que lo importan, complejidad): cabaña → torre, aerogenerador → central nuclear.',
  'lg.roads.t': 'Calles', 'lg.roads.d': 'Las dependencias circulan por las calles: cuantas más pasan, más sube de categoría la avenida (N1 → N8).',
  'lg.monuments.t': 'Monumentos', 'lg.monuments.d': 'En las plazas junto a las avenidas más transitadas.',
  'lg.levels.t': 'Niveles', 'lg.levels.d': 'Cuanto más importante es un archivo (tamaño, archivos que dependen de él, complejidad), más alto es su edificio: casa → rascacielos.',
  'lg.rb.t': 'Rotondas', 'lg.rb.d': 'Cruces por donde pasan más dependencias entre barrios.',
  'tip.stage': 'etapa {s}/{n}', 'tip.lines': '{n} líneas', 'tip.mon.t': '🗿 Monumento', 'tip.mon.d': '{n} dependencias pasan por delante',
  'tip.rb.t': '⭕ Rotonda', 'tip.rb.d': '{n} dependencias se cruzan aquí',
  'm.loc': 'Líneas de código', 'm.size': 'Tamaño', 'm.funcs': 'Funciones', 'm.classes': 'Clases', 'm.branches': 'Ramificaciones',
  'm.todos': 'TODO / FIXME', 'm.lang': 'Lenguaje', 'm.rank': 'Importancia', 'm.external': 'Paquetes externos',
  'p.uses': 'Usa', 'p.usedBy': 'Usado por', 'p.noDeps': 'Ninguna dependencia interna.', 'p.noUsers': 'Nadie lo importa (todavía).',
  'g.stage': 'etapa {s} / {n}', 'g.progress': '{p} / {next} puntos: faltan unos {left} para la siguiente etapa (1 línea = 1 punto, 15 por cada archivo que lo importa).',
  'g.max': 'Etapa máxima alcanzada 🎉', 'g.since': '📈 Desde tu última visita: {ev}',
  'mon.kind': '🗿 Monumento', 'mon.sub': 'Plaza en una avenida concurrida', 'links.one': '{n} enlace', 'links.other': '{n} enlaces',
  'mon.text': '{n} dependencias pasan delante de este monumento, sobre todo entre <b>{a}</b> y <b>{b}</b>.',
  'rb.kind': '⭕ Rotonda', 'rb.sub': 'Cruce de dependencias', 'rb.text': 'Esta rotonda une <b>{a}</b> y <b>{b}</b>: {n} imports cruzan la calle que los separa.',
  'files.one': '{n} archivo', 'files.other': '{n} archivos', 'bytes': ['B', 'KB', 'MB'],
  'tier.tower': ['Casa', 'Edificio pequeño', 'Edificio', 'Torre', 'Rascacielos'], 'tier.level': 'Nivel {n}',
  'k.townhall': 'Ayuntamiento', 'k.townhall.r': 'Punto de entrada principal del proyecto', 'k.tower': 'Edificio', 'k.tower.r': 'Código fuente',
  'k.shop': 'Comercios', 'k.shop.r': 'Interfaz: componentes, vistas, estilos', 'k.bank': 'Banco', 'k.bank.r': 'Datos: modelos, esquemas, estado',
  'k.police': 'Comisaría', 'k.police.r': 'Tests y seguridad', 'k.fire': 'Parque de bomberos', 'k.fire.r': 'CI/CD, Docker, scripts, despliegue',
  'k.hospital': 'Hospital', 'k.hospital.r': 'Errores, logs, monitorización', 'k.library': 'Biblioteca', 'k.library.r': 'Documentación',
  'k.factory': 'Fábrica', 'k.factory.r': 'Configuración y herramientas', 'k.power': 'Central eléctrica', 'k.power.r': 'Dependencias y manifiestos',
  'k.warehouse': 'Almacén', 'k.warehouse.r': 'Datos en bruto, SQL, migraciones', 'k.park': 'Parque', 'k.park.r': 'Assets: imágenes, sonidos, fuentes',
  'f.townhall': 'Ayuntamiento', 'f.residential': 'Residencia', 'f.commercial': 'Comercio', 'f.office': 'Oficinas', 'f.police': 'Comisaría',
  'f.fire': 'Bomberos', 'f.clinic': 'Clínica', 'f.hospital': 'Hospital', 'f.library': 'Biblioteca', 'f.university': 'Universidad',
  'f.workshop': 'Taller', 'f.factory': 'Fábrica', 'f.industrial': 'Complejo industrial', 'f.wind': 'Aerogenerador', 'f.solar': 'Granja solar',
  'f.coal': 'Central de carbón', 'f.nuclear': 'Central nuclear', 'f.water': 'Depósito de agua', 'f.wastewater': 'Depuradora', 'f.recycling': 'Centro de reciclaje',
  'f.park': 'Parque', 'f.grove': 'Arboleda', 'f.garden': 'Jardín', 'f.block': 'Manzana residencial', 'f.theater': 'Teatro', 'f.opera': 'Ópera',
  'f.research': 'Centro de investigación', 'f.prison': 'Prisión', 'f.transit': 'Estación de autobuses', 'f.school': 'Escuela', 'f.artisan': 'Zona artesanal',
  'f.solarplant': 'Central solar', 'f.clocktower': 'Torre del reloj', 'f.fountain': 'Fuente', 'f.memorial': 'Memorial',
  'f.playground': 'Parque infantil', 'f.castle': 'Castillo', 'f.museum': 'Museo', 'f.observatory': 'Observatorio', 'f.pool': 'Piscina', 'f.stadium': 'Estadio', 'f.bank': 'Banco', 'f.powerplant': 'Central eléctrica', 'f.cinema': 'Cine', 'f.church': 'Iglesia', 'f.station': 'Estación de tren', 'f.hotel': 'Hotel', 'f.parking': 'Aparcamiento', 'f.restaurant': 'Restaurante', 'f.skyscraper': 'Rascacielos', 'f.steelworks': 'Acería', 'f.sawmill': 'Aserradero', 'f.chemical': 'Planta química', 'f.techfactory': 'Fábrica tecnológica', 'f.textile': 'Fábrica textil'
};

I18N_D.zh = {
  'btn.health.t': '代码健康：超大文件、循环依赖、死代码…', 'btn.health.l': ' 健康', 'export.png': '图片（PNG）', 'export.gif': 'GIF 动图（环绕一周）', 'export.video': '延时视频（建造过程）', 'export.gifFrames': 'GIF：第 {i}/{n} 帧', 'export.gifEncode': '正在编码 GIF…', 'export.recording': '正在录制延时视频… {s} 秒', 'export.done': '已保存：{file}', 'export.noVideo': '此浏览器无法录制视频。', 'export.fail': '导出失败：{msg}', 'health.title': '🩺 代码健康', 'health.sub': '值得一看的地方', 'health.huge': '超大文件（≥ 1000 行）', 'health.cycle': '循环依赖', 'health.complex': '非常复杂（≥ 150 个分支）', 'health.todo': '堆积的 TODO / FIXME（≥ 5）', 'health.orphan': '从未被导入（死代码？）', 'health.none': '一切正常 🎉', 'health.loop': '{n} 个文件组成的循环', 'health.more': '…还有 {n} 个', 'w.huge': '超大文件：{n} 行', 'w.cycle': '属于一个循环依赖', 'w.complex': '非常复杂：{n} 个分支', 'w.todo': '{n} 个 TODO / FIXME', 'w.orphan': '从未被导入（死代码？）',
  'search.ph': '搜索文件…  ( / )', 'lang.title': '语言', 'theme.title': '主题',
  'btn.night.t': '白天 / 夜晚（自动循环，各 2 分钟）', 'btn.night.l': ' 夜晚', 'btn.deps.t': '显示所有依赖', 'btn.deps.l': ' 依赖',
  'btn.fx.t': "效果：着色器、天气、云", 'btn.fx.l': " 效果", 'fx.shaders': "着色器", 'fx.q.std': "简单", 'fx.q.high': "精美", 'fx.weather': "天气", 'fx.w.clear': "晴朗", 'fx.w.rain': "下雨", 'fx.w.storm': "雷暴", 'fx.sky': "天空", 'fx.clouds': "云", 'fx.nohigh': "此设备不支持精美着色器。",
  'btn.traffic.t': '交通', 'btn.traffic.l': ' 交通', 'btn.labels.t': '街区名称', 'btn.labels.l': ' 街区',
  'btn.home.t': '重置视角', 'btn.land.t': '新的郊野：山丘、湖泊、森林（Shift+点击：恢复项目原始地图）', 'btn.land.l': ' 地图',
  'btn.shot.t': '导出：图片、GIF 动图、延时视频', 'btn.open.t': '打开其他文件夹', 'btn.open.l': ' 打开',
  'legend.title': '🗺️ 图例', 'panel.close': '关闭',
  'help': '拖动：旋转 · 右键：平移 · 滚轮：缩放 · 双击：飞近',
  'welcome.lead': '你的代码变成一座城市。每个文件夹是一个街区，每个文件是一栋建筑。',
  'welcome.open': '📁 打开代码文件夹', 'welcome.demo': '🏙️ 参观示例城市',
  'welcome.note': '你也可以把文件夹<b>拖放</b>到这里。<b>100% 本地</b>：任何内容都不会离开你的电脑，也不会发送任何数据。<br>命令行：<code>npx bitropolis ./my-project</code>',
  'drop': '松开文件夹，开始建造城市 🏗️', 'loading': '加载中…',
  'webgl': '此浏览器不支持 WebGL：无法绘制城市。',
  'theme.city': '3D 城市', 'theme.lowpoly': '低多边形', 'theme.medieval': '中世纪', 'theme.pixel': '像素风', 'theme.cyberpunk': '赛博朋克', 'theme.japan': '日式',
  'theme.soon': '{name} — 即将推出',
  'toast.land.orig': '项目的原始地图', 'toast.land.new': '新的郊野：{n} 棵树、灌木和岩石',
  'lang.file': '文件', 'lang.text': '文本', 'search.none': '未找到建筑',
  'load.analyze': '正在分析“{name}”…', 'load.read': '正在读取文件… {i}/{n}', 'load.list': '正在列出文件… {n}', 'load.filter': '正在筛选文件… {i}/{n}', 'load.metrics': '正在度量代码… {i}/{n}', 'load.links': '正在关联文件… {i}/{n}', 'load.build': '正在建造城市…',
  'toast.nofiles': '此文件夹中没有可用的文件。', 'toast.analyzeErr': '无法分析此文件夹：{msg}',
  'toast.truncated': '超大项目：{n} 个次要文件未显示。', 'toast.buildErr': '建造时出错：{msg}',
  'evo.grown.other': '📈 {n} 栋建筑长高了', 'evo.added.other': '🆕 {n} 个新文件', 'evo.removed.other': '🏚️ {n} 个被拆除',
  'evo.since': '（自上次访问以来）',
  'stat.buildings': '建筑', 'stat.lines': '行', 'stat.districts': '街区', 'stat.roads': '道路',
  'stat.monuments': '纪念碑', 'stat.roundabouts': '环岛', 'stat.links': '依赖',
  'lg.stages.t': '阶段 N1 → N8', 'lg.stages.d': '文件变大时（行数、导入它的文件、复杂度），建筑就会升级：小屋 → 高楼，风车 → 核电站。',
  'lg.roads.t': '道路', 'lg.roads.d': '依赖沿着道路流动：经过的越多，大道的等级越高（N1 → N8）。',
  'lg.monuments.t': '纪念碑', 'lg.monuments.d': '位于最繁忙大道旁的广场上。',
  'lg.levels.t': '等级', 'lg.levels.d': '文件越重要（大小、依赖它的文件、复杂度），建筑越高：住宅 → 摩天楼。',
  'lg.rb.t': '环岛', 'lg.rb.d': '街区之间依赖最集中的路口。',
  'tip.stage': '阶段 {s}/{n}', 'tip.lines': '{n} 行', 'tip.mon.t': '🗿 纪念碑', 'tip.mon.d': '{n} 条依赖从这里经过',
  'tip.rb.t': '⭕ 环岛', 'tip.rb.d': '{n} 条依赖在此交汇',
  'm.loc': '代码行数', 'm.size': '大小', 'm.funcs': '函数', 'm.classes': '类', 'm.branches': '分支',
  'm.todos': 'TODO / FIXME', 'm.lang': '语言', 'm.rank': '重要性', 'm.external': '外部包',
  'p.uses': '使用', 'p.usedBy': '被使用', 'p.noDeps': '没有内部依赖。', 'p.noUsers': '还没有文件导入它。',
  'g.stage': '阶段 {s} / {n}', 'g.progress': '{p} / {next} 分：距离下一阶段还差约 {left} 分（1 行 = 1 分，每个导入它的文件 15 分）。',
  'g.max': '已达到最高阶段 🎉', 'g.since': '📈 自上次访问以来：{ev}',
  'mon.kind': '🗿 纪念碑', 'mon.sub': '繁忙大道旁的广场', 'links.other': '{n} 条依赖',
  'mon.text': '{n} 条依赖从这座纪念碑前经过，主要在 <b>{a}</b> 和 <b>{b}</b> 之间。',
  'rb.kind': '⭕ 环岛', 'rb.sub': '依赖的交汇点', 'rb.text': '这个环岛连接 <b>{a}</b> 和 <b>{b}</b>：{n} 个导入穿过它们之间的道路。',
  'files.other': '{n} 个文件', 'bytes': ['B', 'KB', 'MB'],
  'tier.tower': ['住宅', '小楼', '楼房', '高楼', '摩天楼'], 'tier.level': '等级 {n}',
  'k.townhall': '市政厅', 'k.townhall.r': '项目的主入口', 'k.tower': '楼房', 'k.tower.r': '源代码',
  'k.shop': '商店', 'k.shop.r': '界面：组件、视图、样式', 'k.bank': '银行', 'k.bank.r': '数据：模型、模式、状态',
  'k.police': '警察局', 'k.police.r': '测试与安全', 'k.fire': '消防站', 'k.fire.r': 'CI/CD、Docker、脚本、部署',
  'k.hospital': '医院', 'k.hospital.r': '错误、日志、监控', 'k.library': '图书馆', 'k.library.r': '文档',
  'k.factory': '工厂', 'k.factory.r': '配置与工具', 'k.power': '发电厂', 'k.power.r': '依赖与清单文件',
  'k.warehouse': '仓库', 'k.warehouse.r': '原始数据、SQL、迁移', 'k.park': '公园', 'k.park.r': '资源：图片、音频、字体',
  'f.townhall': '市政厅', 'f.residential': '住宅', 'f.commercial': '商店', 'f.office': '办公楼', 'f.police': '警察局',
  'f.fire': '消防站', 'f.clinic': '诊所', 'f.hospital': '医院', 'f.library': '图书馆', 'f.university': '大学',
  'f.workshop': '作坊', 'f.factory': '工厂', 'f.industrial': '工业园区', 'f.wind': '风力发电机', 'f.solar': '太阳能农场',
  'f.coal': '燃煤电厂', 'f.nuclear': '核电站', 'f.water': '水塔', 'f.wastewater': '污水处理厂', 'f.recycling': '回收中心',
  'f.park': '公园', 'f.grove': '小树林', 'f.garden': '花园', 'f.block': '住宅街区', 'f.theater': '剧院', 'f.opera': '歌剧院',
  'f.research': '研究中心', 'f.prison': '监狱', 'f.transit': '公交站', 'f.school': '学校', 'f.artisan': '手工业区',
  'f.solarplant': '太阳能电站', 'f.clocktower': '钟楼', 'f.fountain': '喷泉', 'f.memorial': '纪念馆',
  'f.playground': '游乐场', 'f.castle': '城堡', 'f.museum': '博物馆', 'f.observatory': '天文台', 'f.pool': '游泳池', 'f.stadium': '体育场', 'f.bank': '银行', 'f.powerplant': '发电厂', 'f.cinema': '电影院', 'f.church': '教堂', 'f.station': '火车站', 'f.hotel': '酒店', 'f.parking': '停车场', 'f.restaurant': '餐厅', 'f.skyscraper': '摩天楼', 'f.steelworks': '钢铁厂', 'f.sawmill': '锯木厂', 'f.chemical': '化工厂', 'f.techfactory': '科技工厂', 'f.textile': '纺织厂'
};

I18N_D.ru = {
  'btn.health.t': 'Здоровье кода: огромные файлы, циклы импортов, мёртвый код…', 'btn.health.l': ' Здоровье', 'export.png': 'Изображение (PNG)', 'export.gif': 'Анимированный GIF (полный оборот)', 'export.video': 'Таймлапс-видео (строительство)', 'export.gifFrames': 'GIF: кадр {i}/{n}', 'export.gifEncode': 'Кодирование GIF…', 'export.recording': 'Запись таймлапса… {s} с', 'export.done': 'Сохранено: {file}', 'export.noVideo': 'Этот браузер не умеет записывать видео.', 'export.fail': 'Ошибка экспорта: {msg}', 'health.title': '🩺 Здоровье кода', 'health.sub': 'На что стоит взглянуть', 'health.huge': 'Огромные файлы (≥ 1000 строк)', 'health.cycle': 'Циклические зависимости', 'health.complex': 'Очень сложные (≥ 150 ветвлений)', 'health.todo': 'Накопившиеся TODO / FIXME (≥ 5)', 'health.orphan': 'Никогда не импортируются (мёртвый код?)', 'health.none': 'Всё в порядке 🎉', 'health.loop': 'Цикл из {n} файлов', 'health.more': '… и ещё {n}', 'w.huge': 'Огромный файл: строк {n}', 'w.cycle': 'Входит в цикл импортов', 'w.complex': 'Очень сложный: ветвлений {n}', 'w.todo': 'TODO / FIXME: {n}', 'w.orphan': 'Никогда не импортируется (мёртвый код?)',
  'search.ph': 'Найти файл…  ( / )', 'lang.title': 'Язык', 'theme.title': 'Тема',
  'btn.night.t': 'День / ночь (автоматическая смена каждые 2 мин)', 'btn.night.l': ' Ночь', 'btn.deps.t': 'Показать все зависимости', 'btn.deps.l': ' Связи',
  'btn.fx.t': "Эффекты: шейдеры, погода, облака", 'btn.fx.l': " Эффекты", 'fx.shaders': "Шейдеры", 'fx.q.std': "Простые", 'fx.q.high': "Красивые", 'fx.weather': "Погода", 'fx.w.clear': "Ясно", 'fx.w.rain': "Дождь", 'fx.w.storm': "Гроза", 'fx.sky': "Небо", 'fx.clouds': "Облака", 'fx.nohigh': "Красивые шейдеры недоступны на этом устройстве.",
  'btn.traffic.t': 'Движение', 'btn.traffic.l': ' Движение', 'btn.labels.t': 'Названия районов', 'btn.labels.l': ' Районы',
  'btn.home.t': 'Вернуть вид', 'btn.land.t': 'Новая местность: холмы, озёра, леса (Shift+клик: исходная карта проекта)', 'btn.land.l': ' Карта',
  'btn.shot.t': 'Экспорт: изображение, GIF, таймлапс-видео', 'btn.open.t': 'Открыть другую папку', 'btn.open.l': ' Открыть',
  'legend.title': '🗺️ Легенда', 'panel.close': 'Закрыть',
  'help': 'Перетаскивание: вращение · Правая кнопка: сдвиг · Колесо: масштаб · Двойной клик: приблизиться',
  'welcome.lead': 'Твой код становится городом. Каждая папка — район, каждый файл — здание.',
  'welcome.open': '📁 Открыть папку с кодом', 'welcome.demo': '🏙️ Посетить демо-город',
  'welcome.note': 'Можно также <b>перетащить</b> папку сюда. <b>100 % локально</b>: ничего не покидает твой компьютер, никакие данные не отправляются.<br>Из командной строки: <code>npx bitropolis ./my-project</code>',
  'drop': 'Отпусти папку, чтобы построить город 🏗️', 'loading': 'Загрузка…',
  'webgl': 'В этом браузере нет WebGL: нарисовать город невозможно.',
  'theme.city': '3D-город', 'theme.lowpoly': 'Low poly', 'theme.medieval': 'Средневековье', 'theme.pixel': 'Пиксель-арт', 'theme.cyberpunk': 'Киберпанк', 'theme.japan': 'Япония',
  'theme.soon': '{name} — скоро',
  'toast.land.orig': 'Исходная карта проекта', 'toast.land.new': 'Новая местность: {n} деревьев, кустов и камней',
  'lang.file': 'Файл', 'lang.text': 'Текст', 'search.none': 'Здание не найдено',
  'load.analyze': 'Анализ «{name}»…', 'load.read': 'Чтение файлов… {i}/{n}', 'load.list': 'Список файлов… {n}', 'load.filter': 'Отбор файлов… {i}/{n}', 'load.metrics': 'Измерение кода… {i}/{n}', 'load.links': 'Связи между файлами… {i}/{n}', 'load.build': 'Строим город…',
  'toast.nofiles': 'В этой папке нет подходящих файлов.', 'toast.analyzeErr': 'Не удалось проанализировать папку: {msg}',
  'toast.truncated': 'Огромный проект: {n} второстепенных файлов не показано.', 'toast.buildErr': 'Ошибка при строительстве: {msg}',
  'evo.grown.one': '📈 {n} здание выросло', 'evo.grown.few': '📈 {n} здания выросли', 'evo.grown.many': '📈 {n} зданий выросло', 'evo.grown.other': '📈 {n} здания выросло',
  'evo.added.one': '🆕 {n} новое', 'evo.added.few': '🆕 {n} новых', 'evo.added.many': '🆕 {n} новых', 'evo.added.other': '🆕 {n} новых',
  'evo.removed.one': '🏚️ {n} снесено', 'evo.removed.few': '🏚️ {n} снесено', 'evo.removed.many': '🏚️ {n} снесено', 'evo.removed.other': '🏚️ {n} снесено',
  'evo.since': ' с прошлого визита',
  'stat.buildings': 'зданий', 'stat.lines': 'строк', 'stat.districts': 'районов', 'stat.roads': 'дорог',
  'stat.monuments': 'памятников', 'stat.roundabouts': 'развязок', 'stat.links': 'связей',
  'lg.stages.t': 'Уровни N1 → N8', 'lg.stages.d': 'Здание поднимается на уровень, когда его файл растёт (строки, импортирующие файлы, сложность): хижина → башня, ветряк → АЭС.',
  'lg.roads.t': 'Дороги', 'lg.roads.d': 'Зависимости едут по дорогам: чем их больше, тем выше класс проспекта (N1 → N8).',
  'lg.monuments.t': 'Памятники', 'lg.monuments.d': 'На площадях у самых оживлённых проспектов.',
  'lg.levels.t': 'Уровни', 'lg.levels.d': 'Чем важнее файл (размер, зависящие файлы, сложность), тем выше здание: дом → небоскрёб.',
  'lg.rb.t': 'Развязки', 'lg.rb.d': 'Перекрёстки, где сходится больше всего зависимостей между районами.',
  'tip.stage': 'уровень {s}/{n}', 'tip.lines': 'строк: {n}', 'tip.mon.t': '🗿 Памятник', 'tip.mon.d': 'зависимостей мимо: {n}',
  'tip.rb.t': '⭕ Развязка', 'tip.rb.d': 'зависимостей пересекается: {n}',
  'm.loc': 'Строк кода', 'm.size': 'Размер', 'm.funcs': 'Функции', 'm.classes': 'Классы', 'm.branches': 'Ветвления',
  'm.todos': 'TODO / FIXME', 'm.lang': 'Язык', 'm.rank': 'Важность', 'm.external': 'Внешние пакеты',
  'p.uses': 'Использует', 'p.usedBy': 'Используется в', 'p.noDeps': 'Нет внутренних зависимостей.', 'p.noUsers': 'Его пока никто не импортирует.',
  'g.stage': 'уровень {s} / {n}', 'g.progress': '{p} / {next} очков: ещё около {left} до следующего уровня (1 строка = 1 очко, 15 за каждый импортирующий файл).',
  'g.max': 'Достигнут максимальный уровень 🎉', 'g.since': '📈 С прошлого визита: {ev}',
  'mon.kind': '🗿 Памятник', 'mon.sub': 'Площадь на оживлённом проспекте',
  'links.one': '{n} связь', 'links.few': '{n} связи', 'links.many': '{n} связей', 'links.other': '{n} связи',
  'mon.text': 'Мимо этого памятника проходит зависимостей: {n}, в основном между <b>{a}</b> и <b>{b}</b>.',
  'rb.kind': '⭕ Развязка', 'rb.sub': 'Перекрёсток зависимостей', 'rb.text': 'Эта развязка соединяет <b>{a}</b> и <b>{b}</b>: через дорогу между ними проходит импортов: {n}.',
  'files.one': '{n} файл', 'files.few': '{n} файла', 'files.many': '{n} файлов', 'files.other': '{n} файла', 'bytes': ['Б', 'КБ', 'МБ'],
  'tier.tower': ['Дом', 'Небольшое здание', 'Здание', 'Башня', 'Небоскрёб'], 'tier.level': 'Уровень {n}',
  'k.townhall': 'Мэрия', 'k.townhall.r': 'Главная точка входа проекта', 'k.tower': 'Здание', 'k.tower.r': 'Исходный код',
  'k.shop': 'Магазины', 'k.shop.r': 'Интерфейс: компоненты, представления, стили', 'k.bank': 'Банк', 'k.bank.r': 'Данные: модели, схемы, состояние',
  'k.police': 'Полиция', 'k.police.r': 'Тесты и безопасность', 'k.fire': 'Пожарная часть', 'k.fire.r': 'CI/CD, Docker, скрипты, развёртывание',
  'k.hospital': 'Больница', 'k.hospital.r': 'Ошибки, логи, мониторинг', 'k.library': 'Библиотека', 'k.library.r': 'Документация',
  'k.factory': 'Завод', 'k.factory.r': 'Конфигурация и инструменты', 'k.power': 'Электростанция', 'k.power.r': 'Зависимости и манифесты',
  'k.warehouse': 'Склад', 'k.warehouse.r': 'Сырые данные, SQL, миграции', 'k.park': 'Парк', 'k.park.r': 'Ресурсы: изображения, звуки, шрифты',
  'f.townhall': 'Мэрия', 'f.residential': 'Жилой дом', 'f.commercial': 'Магазин', 'f.office': 'Офисы', 'f.police': 'Полиция',
  'f.fire': 'Пожарная часть', 'f.clinic': 'Клиника', 'f.hospital': 'Больница', 'f.library': 'Библиотека', 'f.university': 'Университет',
  'f.workshop': 'Мастерская', 'f.factory': 'Завод', 'f.industrial': 'Промышленный комплекс', 'f.wind': 'Ветряк', 'f.solar': 'Солнечная ферма',
  'f.coal': 'Угольная ТЭС', 'f.nuclear': 'АЭС', 'f.water': 'Водонапорная башня', 'f.wastewater': 'Очистные сооружения', 'f.recycling': 'Центр переработки',
  'f.park': 'Парк', 'f.grove': 'Роща', 'f.garden': 'Сад', 'f.block': 'Жилой квартал', 'f.theater': 'Театр', 'f.opera': 'Опера',
  'f.research': 'Исследовательский центр', 'f.prison': 'Тюрьма', 'f.transit': 'Автовокзал', 'f.school': 'Школа', 'f.artisan': 'Ремесленная зона',
  'f.solarplant': 'Солнечная электростанция', 'f.clocktower': 'Часовая башня', 'f.fountain': 'Фонтан', 'f.memorial': 'Мемориал',
  'f.playground': 'Детская площадка', 'f.castle': 'Замок', 'f.museum': 'Музей', 'f.observatory': 'Обсерватория', 'f.pool': 'Бассейн', 'f.stadium': 'Стадион', 'f.bank': 'Банк', 'f.powerplant': 'Электростанция', 'f.cinema': 'Кинотеатр', 'f.church': 'Церковь', 'f.station': 'Вокзал', 'f.hotel': 'Отель', 'f.parking': 'Парковка', 'f.restaurant': 'Ресторан', 'f.skyscraper': 'Небоскрёб', 'f.steelworks': 'Сталелитейный завод', 'f.sawmill': 'Лесопилка', 'f.chemical': 'Химический завод', 'f.techfactory': 'Высокотехнологичный завод', 'f.textile': 'Текстильная фабрика'
};

// Messages de la ligne de commande (npx bitropolis)
Object.assign(I18N_D.en, {
  'cli.tagline': 'your code becomes a city', 'cli.usage': 'Usage', 'cli.options': 'Options', 'cli.examples': 'Examples',
  'cli.o.out': 'HTML file to create (default: ./bitropolis-city/index.html)', 'cli.o.name': 'City name (default: folder name)',
  'cli.o.json': 'Also write the raw analysis (city.json) next to the HTML', 'cli.o.noopen': "Don't open the browser",
  'cli.o.lang': 'Language: en, fr, de, it, es, zh, ru', 'cli.o.version': 'Version', 'cli.o.help': 'Help',
  'cli.ex.cwd': "the current folder's city", 'cli.arg.dir': 'folder', 'cli.arg.file': 'file', 'cli.arg.name': 'name',
  'cli.unknown': 'Unknown option: {a}', 'cli.notfound': 'Folder not found: {dir}', 'cli.building': 'Bitropolis — building “{name}”',
  'cli.reading': '{n} files found…', 'cli.nofiles': 'No usable files in this folder.',
  'cli.summary': '{files} buildings · 📝 {loc} lines · 🔗 {edges} links', 'cli.truncated': '{n} minor files skipped (huge project)',
  'cli.ready': 'City ready in {s} s → {out}', 'cli.local': '100% local: no source code is copied, nothing is sent.',
  'cli.openit': 'Open this file in your browser: {url}'
});
Object.assign(I18N_D.fr, {
  'cli.tagline': 'ton code devient une ville', 'cli.usage': 'Utilisation', 'cli.options': 'Options', 'cli.examples': 'Exemples',
  'cli.o.out': 'Fichier HTML à créer (défaut : ./bitropolis-city/index.html)', 'cli.o.name': 'Nom de la ville (défaut : nom du dossier)',
  'cli.o.json': "Écrit aussi l'analyse brute (city.json) à côté du HTML", 'cli.o.noopen': 'Ne pas ouvrir le navigateur',
  'cli.o.lang': 'Langue : en, fr, de, it, es, zh, ru', 'cli.o.version': 'Version', 'cli.o.help': 'Aide',
  'cli.ex.cwd': 'la ville du dossier courant', 'cli.arg.dir': 'dossier', 'cli.arg.file': 'fichier', 'cli.arg.name': 'nom',
  'cli.unknown': 'Option inconnue : {a}', 'cli.notfound': 'Dossier introuvable : {dir}', 'cli.building': 'Bitropolis — construction de « {name} »',
  'cli.reading': '{n} fichiers trouvés…', 'cli.nofiles': 'Aucun fichier exploitable dans ce dossier.',
  'cli.summary': '{files} bâtiments · 📝 {loc} lignes · 🔗 {edges} liaisons', 'cli.truncated': '{n} fichiers mineurs ignorés (projet géant)',
  'cli.ready': 'Ville prête en {s} s → {out}', 'cli.local': "100 % local : aucun code source n'est copié, rien n'est envoyé.",
  'cli.openit': 'Ouvre ce fichier dans ton navigateur : {url}'
});
Object.assign(I18N_D.de, {
  'cli.tagline': 'dein Code wird zur Stadt', 'cli.usage': 'Verwendung', 'cli.options': 'Optionen', 'cli.examples': 'Beispiele',
  'cli.o.out': 'Zu erstellende HTML-Datei (Standard: ./bitropolis-city/index.html)', 'cli.o.name': 'Name der Stadt (Standard: Ordnername)',
  'cli.o.json': 'Schreibt zusätzlich die Rohanalyse (city.json) neben das HTML', 'cli.o.noopen': 'Browser nicht öffnen',
  'cli.o.lang': 'Sprache: en, fr, de, it, es, zh, ru', 'cli.o.version': 'Version', 'cli.o.help': 'Hilfe',
  'cli.ex.cwd': 'die Stadt des aktuellen Ordners', 'cli.arg.dir': 'ordner', 'cli.arg.file': 'datei', 'cli.arg.name': 'name',
  'cli.unknown': 'Unbekannte Option: {a}', 'cli.notfound': 'Ordner nicht gefunden: {dir}', 'cli.building': 'Bitropolis — „{name}“ wird gebaut',
  'cli.reading': '{n} Dateien gefunden…', 'cli.nofiles': 'Keine verwertbaren Dateien in diesem Ordner.',
  'cli.summary': '{files} Gebäude · 📝 {loc} Zeilen · 🔗 {edges} Verknüpfungen', 'cli.truncated': '{n} unwichtige Dateien übersprungen (riesiges Projekt)',
  'cli.ready': 'Stadt fertig in {s} s → {out}', 'cli.local': '100 % lokal: Kein Quellcode wird kopiert, nichts wird gesendet.',
  'cli.openit': 'Öffne diese Datei in deinem Browser: {url}'
});
Object.assign(I18N_D.it, {
  'cli.tagline': 'il tuo codice diventa una città', 'cli.usage': 'Uso', 'cli.options': 'Opzioni', 'cli.examples': 'Esempi',
  'cli.o.out': 'File HTML da creare (predefinito: ./bitropolis-city/index.html)', 'cli.o.name': 'Nome della città (predefinito: nome della cartella)',
  'cli.o.json': "Scrive anche l'analisi grezza (city.json) accanto all'HTML", 'cli.o.noopen': 'Non aprire il browser',
  'cli.o.lang': 'Lingua: en, fr, de, it, es, zh, ru', 'cli.o.version': 'Versione', 'cli.o.help': 'Aiuto',
  'cli.ex.cwd': 'la città della cartella corrente', 'cli.arg.dir': 'cartella', 'cli.arg.file': 'file', 'cli.arg.name': 'nome',
  'cli.unknown': 'Opzione sconosciuta: {a}', 'cli.notfound': 'Cartella non trovata: {dir}', 'cli.building': 'Bitropolis — costruzione di «{name}»',
  'cli.reading': '{n} file trovati…', 'cli.nofiles': 'Nessun file utilizzabile in questa cartella.',
  'cli.summary': '{files} edifici · 📝 {loc} righe · 🔗 {edges} collegamenti', 'cli.truncated': '{n} file minori ignorati (progetto enorme)',
  'cli.ready': 'Città pronta in {s} s → {out}', 'cli.local': '100% locale: nessun codice sorgente viene copiato, nulla viene inviato.',
  'cli.openit': 'Apri questo file nel browser: {url}'
});
Object.assign(I18N_D.es, {
  'cli.tagline': 'tu código se convierte en una ciudad', 'cli.usage': 'Uso', 'cli.options': 'Opciones', 'cli.examples': 'Ejemplos',
  'cli.o.out': 'Archivo HTML que crear (por defecto: ./bitropolis-city/index.html)', 'cli.o.name': 'Nombre de la ciudad (por defecto: nombre de la carpeta)',
  'cli.o.json': 'Escribe también el análisis en bruto (city.json) junto al HTML', 'cli.o.noopen': 'No abrir el navegador',
  'cli.o.lang': 'Idioma: en, fr, de, it, es, zh, ru', 'cli.o.version': 'Versión', 'cli.o.help': 'Ayuda',
  'cli.ex.cwd': 'la ciudad de la carpeta actual', 'cli.arg.dir': 'carpeta', 'cli.arg.file': 'archivo', 'cli.arg.name': 'nombre',
  'cli.unknown': 'Opción desconocida: {a}', 'cli.notfound': 'Carpeta no encontrada: {dir}', 'cli.building': 'Bitropolis — construyendo «{name}»',
  'cli.reading': '{n} archivos encontrados…', 'cli.nofiles': 'No hay archivos utilizables en esta carpeta.',
  'cli.summary': '{files} edificios · 📝 {loc} líneas · 🔗 {edges} enlaces', 'cli.truncated': '{n} archivos menores omitidos (proyecto enorme)',
  'cli.ready': 'Ciudad lista en {s} s → {out}', 'cli.local': '100 % local: no se copia código fuente, no se envía nada.',
  'cli.openit': 'Abre este archivo en tu navegador: {url}'
});
Object.assign(I18N_D.zh, {
  'cli.tagline': '你的代码变成一座城市', 'cli.usage': '用法', 'cli.options': '选项', 'cli.examples': '示例',
  'cli.o.out': '要生成的 HTML 文件（默认：./bitropolis-city/index.html）', 'cli.o.name': '城市名称（默认：文件夹名）',
  'cli.o.json': '同时在 HTML 旁写出原始分析（city.json）', 'cli.o.noopen': '不打开浏览器',
  'cli.o.lang': '语言：en, fr, de, it, es, zh, ru', 'cli.o.version': '版本', 'cli.o.help': '帮助',
  'cli.ex.cwd': '当前文件夹的城市', 'cli.arg.dir': '文件夹', 'cli.arg.file': '文件', 'cli.arg.name': '名称',
  'cli.unknown': '未知选项：{a}', 'cli.notfound': '找不到文件夹：{dir}', 'cli.building': 'Bitropolis — 正在建造“{name}”',
  'cli.reading': '已找到 {n} 个文件…', 'cli.nofiles': '此文件夹中没有可用的文件。',
  'cli.summary': '{files} 栋建筑 · 📝 {loc} 行 · 🔗 {edges} 条依赖', 'cli.truncated': '已跳过 {n} 个次要文件（超大项目）',
  'cli.ready': '城市已在 {s} 秒内建好 → {out}', 'cli.local': '100% 本地：不复制任何源代码，不发送任何内容。',
  'cli.openit': '请在浏览器中打开此文件：{url}'
});
Object.assign(I18N_D.ru, {
  'cli.tagline': 'твой код становится городом', 'cli.usage': 'Использование', 'cli.options': 'Параметры', 'cli.examples': 'Примеры',
  'cli.o.out': 'Создаваемый HTML-файл (по умолчанию: ./bitropolis-city/index.html)', 'cli.o.name': 'Название города (по умолчанию: имя папки)',
  'cli.o.json': 'Также записать сырой анализ (city.json) рядом с HTML', 'cli.o.noopen': 'Не открывать браузер',
  'cli.o.lang': 'Язык: en, fr, de, it, es, zh, ru', 'cli.o.version': 'Версия', 'cli.o.help': 'Справка',
  'cli.ex.cwd': 'город текущей папки', 'cli.arg.dir': 'папка', 'cli.arg.file': 'файл', 'cli.arg.name': 'имя',
  'cli.unknown': 'Неизвестный параметр: {a}', 'cli.notfound': 'Папка не найдена: {dir}', 'cli.building': 'Bitropolis — строим «{name}»',
  'cli.reading': 'Найдено файлов: {n}…', 'cli.nofiles': 'В этой папке нет подходящих файлов.',
  'cli.summary': 'зданий: {files} · 📝 строк: {loc} · 🔗 связей: {edges}', 'cli.truncated': 'Пропущено второстепенных файлов: {n} (огромный проект)',
  'cli.ready': 'Город готов за {s} с → {out}', 'cli.local': '100 % локально: исходный код не копируется, ничего не отправляется.',
  'cli.openit': 'Открой этот файл в браузере: {url}'
});

// Famille de modèle du catalogue → clé de traduction
const I18N_FAMILY = {
  Townhall: 'townhall', TownHall_L: 'townhall', Residential: 'residential', Residential_L: 'residential', Commercial: 'commercial',
  Commercial_L: 'commercial', Office: 'office', Office_L: 'office', Police: 'police', Fire: 'fire', FireStation_L: 'fire',
  Clinic: 'clinic', Hospital: 'hospital', Hospital_L: 'hospital', Library: 'library', University: 'university',
  Light_Industry: 'workshop', Heavy_Industry: 'factory', Industrial_Complex: 'industrial', Wind: 'wind', Solar: 'solar',
  Coal: 'coal', Nuclear: 'nuclear', Water: 'water', Wastewater: 'wastewater', Recycling: 'recycling', Park: 'park',
  '@grove': 'grove', '@grove2': 'garden', Residential_Block: 'block', Theater: 'theater', Opera: 'opera', Research: 'research',
  Prison: 'prison', Transit: 'transit', School: 'school', Light_Industrial_Complex: 'artisan', Solar_Complex: 'solarplant',
  ClockTower_L: 'clocktower', Fountain_L: 'fountain', Memorial_L: 'memorial',
  Parc_L: 'park', Jardin_L: 'garden', AireJeux_L: 'playground',
  Chateau_L: 'castle', Musee_L: 'museum', Observatoire_L: 'observatory', Piscine_L: 'pool', Stade_L: 'stadium',
  Banque_L: 'bank', Centrale_L: 'powerplant', Cinema_L: 'cinema', Ecole_L: 'school', Eglise_L: 'church', Gare_L: 'station', Hotel_L: 'hotel',
  ParkingA_L: 'parking', ParkingB_L: 'parking', ParkingC_L: 'parking', Police_L: 'police', Restaurant_L: 'restaurant',
  Usine_Acier_L: 'steelworks', Usine_Bois_L: 'sawmill', Usine_Chimie_L: 'chemical', Usine_Tech_L: 'techfactory', Usine_Textile_L: 'textile',
  TourAiguille_L: 'skyscraper', TourArche_L: 'skyscraper', TourBoucle_L: 'skyscraper', TourDeco_L: 'skyscraper', TourEclat_L: 'skyscraper', TourHyper_L: 'skyscraper', TourJumelles_L: 'skyscraper', TourOeuf_L: 'skyscraper', TourPagode_L: 'skyscraper', TourTorsade_L: 'skyscraper', TourTubes_L: 'skyscraper'
};

let i18nLang = 'en';
const I18N_KEY = 'bitropolis.lang';

function i18nDetect() {
  if (typeof window !== 'undefined') try { const saved = localStorage.getItem(I18N_KEY); if (saved && I18N_D[saved]) return saved; } catch {}
  const prefs = [...((typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [])];
  // Node (CLI) : variables d'environnement, puis la langue du système
  if (typeof process !== 'undefined' && process.env) prefs.push(process.env.LC_ALL, process.env.LC_MESSAGES, process.env.LANG);
  try { prefs.push(Intl.DateTimeFormat().resolvedOptions().locale); } catch {}
  for (const p of prefs) { const c = String(p || '').slice(0, 2).toLowerCase(); if (I18N_D[c]) return c; }
  return 'en';
}
i18nLang = i18nDetect();

export function getLang() { return i18nLang; }
export function setLang(code) {
  if (!I18N_D[code]) return;
  i18nLang = code;
  if (typeof window !== 'undefined') try { localStorage.setItem(I18N_KEY, code); } catch {}
}
export function locale() { return I18N_LOCALE[i18nLang] || 'en-US'; }

function i18nRaw(key) {
  const v = I18N_D[i18nLang][key];
  return v !== undefined ? v : I18N_D.en[key];
}
// Texte traduit, avec remplacement de {variables}
export function t(key, vars) {
  let s = i18nRaw(key);
  if (s === undefined) return key;
  if (typeof s !== 'string') return s;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}
// Pluriel : choisit « key.one / .few / .many / .other » selon la langue
export function tp(key, n, vars = {}) {
  const rule = new Intl.PluralRules(locale()).select(n);
  const base = I18N_D[i18nLang][`${key}.${rule}`] !== undefined ? `${key}.${rule}` : `${key}.other`;
  return t(base, { n: fmtNum(n), ...vars });
}
export function fmtNum(n) { return Number(n || 0).toLocaleString(locale()); }
export function fmtBytes(n) {
  const [b, kb, mb] = t('bytes');
  return n < 1024 ? `${n} ${b}` : n < 1048576 ? `${(n / 1024).toLocaleString(locale(), { maximumFractionDigits: 1 })} ${kb}` : `${(n / 1048576).toLocaleString(locale(), { maximumFractionDigits: 1 })} ${mb}`;
}
export function kindLabel(kind) { return t('k.' + kind); }
export function kindRole(kind) { return t('k.' + kind + '.r'); }
// Nom d'une famille de bâtiments (« Residential_L » → « Résidence » / « Residence » / « 住宅 »…)
export function famName(family, fallback = family) {
  const k = I18N_FAMILY[family];
  return k ? t('f.' + k) : fallback;
}
// Nom d'un modèle avec son stade : « Résidence N3 »
export function modelName(model) {
  const fam = model.startsWith('@') ? model : model.replace(/_N\d+$/, '').replace(/_L\d+$/, '_L');
  const m = /_[NL](\d+)$/.exec(model);
  return m ? `${famName(fam)} N${m[1]}` : famName(fam);
}

// Applique les traductions aux éléments marqués data-i18n / data-i18n-title / data-i18n-ph / data-i18n-html
export function applyI18n(root = document) {
  root.documentElement && (root.documentElement.lang = i18nLang);
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of root.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
  for (const el of root.querySelectorAll('[data-i18n-ph]')) el.placeholder = t(el.dataset.i18nPh);
}

// Registre des thèmes. Ajouter un thème = l'importer ici et l'enregistrer.
import { LowPolyTheme } from './lowpoly.js';
import { hasPack } from '../assets.js';

// Thème « Ville 3D » : urbanisme en grille et modèles du pack de ville (présent seulement si le pack est embarqué).
export const CityPackTheme = { ...LowPolyTheme, id: 'city', name: 'Ville 3D (pack)', pack: true };

// Thème « Cyberpunk » : même ville, modèles néon (pack « cyber » superposé au pack de ville), toujours de nuit,
// fenêtres et néons dans leurs propres couleurs, ciel violet.
export const CyberTheme = {
  ...CityPackTheme, id: 'cyberpunk', name: 'Cyberpunk', overlay: 'cyber', night: true, winTint: 0.85,
  sky: { day: '#4b4168', night: '#3a3354', fogDay: '#4b4168', fogNight: '#3a3354' },
  nightLight: { sun: 0.7, sunColor: '#a493ff', hemi: 0.95, hemiSky: '#9a8cff', hemiGround: '#3b2f63', ambient: 0.3 },
  districtTints: ['#29e7ff', '#ff4fd8', '#ffd23f', '#7cff6b', '#b46bff', '#ff7a3d']
};

export const THEMES = { city: CityPackTheme, cyberpunk: CyberTheme, lowpoly: LowPolyTheme };
export const UPCOMING_THEMES = [
  { id: 'medieval', name: 'Médiéval' },
  { id: 'pixel', name: 'Pixel art' },
  { id: 'japan', name: 'Japon' }
];
export function availableThemes() { return Object.values(THEMES).filter((t) => (!t.pack || hasPack('city')) && (!t.overlay || hasPack(t.overlay))); }
export function defaultThemeId() { return hasPack('city') ? 'city' : 'lowpoly'; }
export function getTheme(id) { return THEMES[id] || LowPolyTheme; }

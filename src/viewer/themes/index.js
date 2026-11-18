// Registre des thèmes. Ajouter un thème = l'importer ici et l'enregistrer.
import { LowPolyTheme } from './lowpoly.js';
import { hasPack } from '../assets.js';

// Thème « Ville 3D » : urbanisme en grille et modèles du pack de ville (présent seulement si le pack est embarqué).
export const CityPackTheme = { ...LowPolyTheme, id: 'city', name: 'Ville 3D (pack)', pack: true };

export const THEMES = { city: CityPackTheme, lowpoly: LowPolyTheme };
export const UPCOMING_THEMES = [
  { id: 'medieval', name: 'Médiéval' },
  { id: 'pixel', name: 'Pixel art' },
  { id: 'cyberpunk', name: 'Cyberpunk' },
  { id: 'japan', name: 'Japon' }
];
export function availableThemes() { return Object.values(THEMES).filter((t) => !t.pack || hasPack('city')); }
export function defaultThemeId() { return hasPack('city') ? 'city' : 'lowpoly'; }
export function getTheme(id) { return THEMES[id] || LowPolyTheme; }

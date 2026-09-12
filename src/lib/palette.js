// Paletas de color opcionales para el acento de la app (botones activos,
// acordes, tema del switch). Cada una trae sus propios tonos para modo
// oscuro y modo claro, elegidos a mano para mantener buen contraste en
// los dos, en vez de derivarlos con una fórmula genérica.
export const PALETTES = [
  {
    id: 'violeta', label: 'Violeta', swatch: '#7c6af7',
    dark: { accent: '#7c6af7', accent2: '#a695ff', accentBg: '#1e1a3a', chordColor: '#a695ff', chordBg: 'rgba(126,106,247,0.13)' },
    light: { accent: '#7c6af7', accent2: '#6a57e8', accentBg: '#ece8ff', chordColor: '#6a57e8', chordBg: 'rgba(124,106,247,0.12)' },
  },
  {
    id: 'azul', label: 'Azul', swatch: '#5b8cf7',
    dark: { accent: '#5b8cf7', accent2: '#7ea6ff', accentBg: '#16233f', chordColor: '#7ea6ff', chordBg: 'rgba(91,140,247,0.14)' },
    light: { accent: '#3f6fe0', accent2: '#2f5bcf', accentBg: '#e5edff', chordColor: '#2f5bcf', chordBg: 'rgba(63,111,224,0.12)' },
  },
  {
    id: 'verde', label: 'Verde', swatch: '#4fbf7d',
    dark: { accent: '#4fbf7d', accent2: '#7fe0a6', accentBg: '#163827', chordColor: '#7fe0a6', chordBg: 'rgba(79,191,125,0.14)' },
    light: { accent: '#2f9e5c', accent2: '#22824a', accentBg: '#e3f7ec', chordColor: '#22824a', chordBg: 'rgba(47,158,92,0.12)' },
  },
  {
    id: 'rosa', label: 'Rosa', swatch: '#ef6ea8',
    dark: { accent: '#ef6ea8', accent2: '#f79cc4', accentBg: '#3a1729', chordColor: '#f79cc4', chordBg: 'rgba(239,110,168,0.14)' },
    light: { accent: '#dd4d8d', accent2: '#c23876', accentBg: '#fbe6f0', chordColor: '#c23876', chordBg: 'rgba(221,77,141,0.12)' },
  },
  {
    id: 'naranja', label: 'Naranja', swatch: '#f2924a',
    dark: { accent: '#f2924a', accent2: '#f7b174', accentBg: '#3a2210', chordColor: '#f7b174', chordBg: 'rgba(242,146,74,0.14)' },
    light: { accent: '#d9711f', accent2: '#b85c17', accentBg: '#fdece1', chordColor: '#b85c17', chordBg: 'rgba(217,113,31,0.12)' },
  },
  {
    id: 'rojo', label: 'Rojo', swatch: '#ef5b5b',
    dark: { accent: '#ef5b5b', accent2: '#f68b8b', accentBg: '#3a1616', chordColor: '#f68b8b', chordBg: 'rgba(239,91,91,0.14)' },
    light: { accent: '#d93a3a', accent2: '#b82929', accentBg: '#fde5e5', chordColor: '#b82929', chordBg: 'rgba(217,58,58,0.12)' },
  },
];

const DEFAULT_PALETTE_ID = 'violeta';
const PALETTE_KEY = 'acordes_palette';

export function getPaletteId() {
  return localStorage.getItem(PALETTE_KEY) || DEFAULT_PALETTE_ID;
}
export function setPaletteId(id) {
  localStorage.setItem(PALETTE_KEY, id);
}

// Pisa las variables de acento sobre <body> (inline, así gana por
// especificidad a las reglas ":root" / "body.light" de index.css) con los
// tonos de la paleta elegida para el tema activo.
export function applyPalette(paletteId, theme) {
  const palette = PALETTES.find(p => p.id === paletteId) || PALETTES[0];
  const c = theme === 'light' ? palette.light : palette.dark;
  const style = document.body.style;
  style.setProperty('--accent', c.accent);
  style.setProperty('--accent2', c.accent2);
  style.setProperty('--accent-bg', c.accentBg);
  style.setProperty('--chord-color', c.chordColor);
  style.setProperty('--chord-bg', c.chordBg);
}

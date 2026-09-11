// Diagramas de digitación de guitarra. Usamos la base de @tombatossals/chords-db
// (la misma data que usan react-chords / vue-chords) en vez de tipear
// digitaciones a mano: son datos ya revisados, cubren cejillas y variantes,
// y evitan mostrarle al usuario un diagrama mal armado.
import guitarDb from '@tombatossals/chords-db/lib/guitar.json';
import { parseChordToken } from './chords';

const ROOT_TO_KEY = {
  C: 'C', 'C#': 'Csharp', D: 'D', 'D#': 'Eb', E: 'E', F: 'F',
  'F#': 'Fsharp', G: 'G', 'G#': 'Ab', A: 'A', 'A#': 'Bb', B: 'B',
};

// Mapea la "calidad" que devuelve parseChordToken (texto tal cual aparece
// pegado a la raíz, ej. "m7", "sus4", "add9") al sufijo que usa la base de
// datos para esa misma calidad.
const QUALITY_TO_SUFFIX = {
  '': 'major', M: 'major',
  m: 'minor', min: 'minor',
  '6': '6', m6: 'm6',
  '7': '7', m7: 'm7', min7: 'm7',
  maj7: 'maj7', M7: 'maj7',
  '9': '9', m9: 'm9', '69': '69',
  add9: 'add9', madd9: 'madd9',
  sus2: 'sus2', sus4: 'sus4', sus: 'sus4',
  dim: 'dim', dim7: 'dim7',
  aug: 'aug',
};

// Busca las digitaciones para un token de acorde (ya transpuesto si aplica).
// Devuelve { root, suffix, bass, positions } o null si no hay match.
// Los acordes con bajo especificado (C/E) muestran la forma del acorde base
// nomás (no la variante exacta con esa nota grave): cubrir cada bajo posible
// multiplicaría muchísimo la tabla de sufijos por muy poco beneficio real,
// la digitación de la forma base ya le sirve al usuario para tocarlo.
export function getChordDiagram(token) {
  const parsed = parseChordToken(token);
  if (!parsed) return null;
  const dbKey = ROOT_TO_KEY[parsed.root];
  const suffix = QUALITY_TO_SUFFIX[parsed.quality];
  if (!dbKey || !suffix) return null;
  const entry = guitarDb.chords[dbKey]?.find(c => c.suffix === suffix);
  if (!entry?.positions?.length) return null;
  return {
    root: parsed.root,
    suffix,
    bass: parsed.bass,
    positions: entry.positions,
  };
}

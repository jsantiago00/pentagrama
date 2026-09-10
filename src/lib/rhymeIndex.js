import { isChordLine } from './chords';

// Detección de idioma bien liviana: cuenta palabras funcionales típicas de
// cada idioma ("que/de/la" vs "the/and/you") y compara. No hace falta nada
// más sofisticado para separar letras en español de letras en inglés, y es
// automático: no depende de mantener una lista de artistas a mano, así que
// sigue funcionando con cualquier canción que se agregue después (propia,
// importada o bajada con el buscador).
const SPANISH_STOPWORDS = new Set([
  'que', 'de', 'la', 'el', 'en', 'y', 'los', 'del', 'las', 'un', 'una', 'con',
  'por', 'para', 'no', 'se', 'su', 'al', 'es', 'lo', 'como', 'más', 'pero',
  'sus', 'le', 'ya', 'esta', 'este', 'entre', 'cuando', 'muy', 'sin', 'sobre',
  'también', 'me', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo', 'nos',
  'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'mí', 'porque', 'qué',
  'yo', 'tu', 'tú', 'mi', 'soy', 'eres', 'somos', 'son', 'está', 'están',
  'fue', 'era', 'ser', 'estar', 'todos', 'así', 'nada', 'siempre', 'vos',
]);
const ENGLISH_STOPWORDS = new Set([
  'the', 'and', 'you', 'i', 'to', 'a', 'of', 'in', 'is', 'it', 'that', 'was',
  'for', 'on', 'are', 'with', 'as', 'his', 'they', 'be', 'at', 'this',
  'have', 'from', 'or', 'one', 'had', 'by', 'but', 'not', 'what', 'all',
  'were', 'we', 'when', 'your', 'can', 'there', 'an', 'she', 'do', 'how',
  'their', 'if', 'will', 'up', 'my', 'me', 'so', 'her', 'would', 'like',
  'him', 'into', 'time', 'has', 'now', 'don', 'know', 'just', 'get', 'oh',
]);

const WORD_RE = /[a-záéíóúñü]+/g;

function isSpanish(text) {
  const lower = text.toLowerCase();
  const words = lower.match(WORD_RE) || [];
  let es = 0, en = 0;
  for (const w of words) {
    if (SPANISH_STOPWORDS.has(w)) es++;
    else if (ENGLISH_STOPWORDS.has(w)) en++;
  }
  if (es === 0 && en === 0) return true; // sin señal clara (letra muy corta): la dejamos pasar
  return es >= 3 && es > en * 1.5;
}

const MIN_WORD_LEN = 3;

// Arma el vocabulario a partir de las canciones guardadas (bundleadas +
// propias + importadas), descartando líneas de acordes/tablatura y
// canciones que no parezcan español.
export function buildWordIndex(songs) {
  const freq = new Map();
  for (const song of songs) {
    if (!song.text || !isSpanish(song.text)) continue;
    for (const line of song.text.split('\n')) {
      if (isChordLine(line)) continue;
      const words = line.toLowerCase().match(WORD_RE) || [];
      for (const w of words) {
        if (w.length < MIN_WORD_LEN) continue;
        freq.set(w, (freq.get(w) || 0) + 1);
      }
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .map(([word]) => word);
}

const DIACRITICS_RE = new RegExp('[\\u0300-\\u036f]', 'g');
function stripAccents(s) {
  return s.normalize('NFD').replace(DIACRITICS_RE, '');
}

export function searchWords(index, query, mode, limit = 80) {
  const q = stripAccents(query.trim().toLowerCase());
  if (!q) return [];
  const matches = [];
  for (const word of index) {
    const w = stripAccents(word);
    const hit = mode === 'ends' ? w.endsWith(q) : mode === 'starts' ? w.startsWith(q) : w.includes(q);
    if (hit) {
      matches.push(word);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

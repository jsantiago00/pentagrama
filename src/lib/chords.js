// Motor de detección y transposición de acordes (portado 1:1 del transcriptor original)
const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const ENHARMONIC = { Db:'C#', Eb:'D#', Fb:'E', Gb:'F#', Ab:'G#', Bb:'A#', Cb:'B', 'E#':'F', 'B#':'C' };
const ES_TO_EN = { Do:'C', Re:'D', Mi:'E', Fa:'F', Sol:'G', La:'A', Si:'B' };
const EN_ROOTS = new Set(['A','B','C','D','E','F','G']);
const ES_ROOTS = new Set(['Do','Re','Mi','Fa','Sol','La','Si']);

function normalizeRoot(r) {
  if (ES_TO_EN[r]) return ES_TO_EN[r];
  if (ENHARMONIC[r]) return ENHARMONIC[r];
  return r;
}

function transposeRoot(root, st) {
  const norm = normalizeRoot(root);
  const idx = CHROMATIC.indexOf(norm);
  if (idx === -1) return root;
  return CHROMATIC[((idx + st) % 12 + 12) % 12];
}

const CHORD_TOKEN_RE = /^(Do|Re|Mi|Fa|Sol|La|Si|[A-G])(#|b)?(maj|min|m|M|aug|dim|sus|add)?(\d*)?(\(\d+\))?(°|º|\+)?(\/([A-G](?:#|b)?))?$/;

export function isSingleChord(t) {
  if (!t) return false;
  const m = t.match(CHORD_TOKEN_RE);
  if (!m) return false;
  return EN_ROOTS.has(m[1]) || ES_ROOTS.has(m[1]);
}

// Descompone un token ya identificado como acorde (raíz, calidad, bajo) para
// que quien necesite datos estructurados (p.ej. el buscador de diagramas de
// digitación) no tenga que reimplementar el regex de arriba.
export function parseChordToken(t) {
  if (!t) return null;
  const single = t.includes('-') ? t.split('-')[0] : t;
  const m = single.match(CHORD_TOKEN_RE);
  if (!m) return null;
  if (!EN_ROOTS.has(m[1]) && !ES_ROOTS.has(m[1])) return null;
  const root = normalizeRoot(m[1] + (m[2] || ''));
  let quality = (m[3] || '') + (m[4] || '');
  if (!quality) {
    if (m[6] === '°' || m[6] === 'º') quality = 'dim';
    else if (m[6] === '+') quality = 'aug';
  }
  const bass = m[8] ? normalizeRoot(m[8]) : null;
  return { root, quality, bass };
}

export function isChordToken(t) {
  if (!t) return false;
  if (t.includes('-')) {
    const parts = t.split('-');
    return parts.length > 1 && parts.every(p => isSingleChord(p));
  }
  return isSingleChord(t);
}

function transposeSingle(chord, st) {
  if (st === 0) return chord;
  return chord.replace(/^(Do|Re|Mi|Fa|Sol|La|Si|[A-G])(#|b)?/, (_, root, acc) =>
    transposeRoot(root + (acc || ''), st));
}

export function transposeToken(token, st) {
  if (st === 0) return token;
  if (token.includes('-'))
    return token.split('-').map(p => isSingleChord(p) ? transposeSingle(p, st) : p).join('-');
  return transposeSingle(token, st);
}

export function isChordLine(line) {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  const n = tokens.filter(isChordToken).length;
  return n > 0 && n / tokens.length >= 0.55;
}

export function getTransposedPlain(rawText, semitones) {
  if (semitones === 0) return rawText;
  return rawText.split('\n').map(line => {
    if (!isChordLine(line)) return line;
    return line.replace(/(\S+)/g, t => isChordToken(t) ? transposeToken(t, semitones) : t);
  }).join('\n');
}

export function countUniqueChords(rawText) {
  const uniqueChords = new Set();
  rawText.split('\n').forEach(line => {
    if (isChordLine(line))
      line.trim().split(/\s+/).filter(isChordToken).forEach(t => uniqueChords.add(t));
  });
  return uniqueChords.size;
}

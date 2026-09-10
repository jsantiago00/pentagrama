import { isChordLine } from './chords';

// Lleva una columna al inicio de la "palabra" (racha sin espacios) que la
// contiene, para que el acorde quede alineado con el comienzo de la
// sílaba/palabra tocada, no con el caracter exacto del click.
export function wordStartColumn(line, column) {
  let c = Math.min(Math.max(column, 0), line.length);
  while (c > 0 && line[c - 1] !== ' ') c--;
  return c;
}

// Escribe `token` en `line` a partir de la columna dada, ESCRIBIENDO ENCIMA
// (no insertando) para no desalinear los demás acordes que ya estén más a
// la derecha en esa misma línea. Si la columna cae en medio de un token ya
// existente, se retrocede a su inicio (lo reemplaza en vez de partirlo). Si
// el final del token nuevo choca con el arranque de otro, se abre apenas el
// espacio de separación necesario corriendo ese y lo que venga después.
export function insertTokenAtColumn(line, column, token) {
  let col = column;
  if (col > 0 && col < line.length && line[col - 1] !== ' ' && line[col] !== ' ') {
    while (col > 0 && line[col - 1] !== ' ') col--;
  }
  const chars = line.split('');
  const endCol = col + token.length;
  while (chars.length < endCol) chars.push(' ');
  if (chars[endCol] !== undefined && chars[endCol] !== ' ') {
    chars.splice(endCol, 0, ' ');
  }
  for (let i = 0; i < token.length; i++) chars[col + i] = token[i];
  return chars.join('');
}

// Inserta un acorde alineado sobre la línea `lineIndex` en la columna dada.
// Si la línea de arriba ya es una línea de acordes (o está vacía), lo agrega
// ahí; si no, crea una línea nueva para ese acorde.
export function insertChordAbove(rawText, lineIndex, column, chordStr) {
  const lines = rawText.split('\n');
  if (lineIndex < 0 || lineIndex >= lines.length) return rawText;
  const aboveIndex = lineIndex - 1;
  const aboveLine = aboveIndex >= 0 ? lines[aboveIndex] : null;
  const canReuseAbove = aboveLine !== null && (isChordLine(aboveLine) || aboveLine.trim() === '');

  if (canReuseAbove) {
    lines[aboveIndex] = insertTokenAtColumn(aboveLine, column, chordStr);
  } else {
    lines.splice(lineIndex, 0, insertTokenAtColumn('', column, chordStr));
  }
  return lines.join('\n');
}

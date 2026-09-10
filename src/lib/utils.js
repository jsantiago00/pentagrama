export function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Los distintos scrapers no siempre generan la misma URL "source" para la
// misma canción (p.ej. barras dobles de más). Normalizamos antes de comparar
// para no duplicar canciones que ya están guardadas.
export function normalizeSource(url) {
  if (!url) return url;
  return url.toLowerCase().replace(/([^:])\/{2,}/g, '$1/').replace(/\/$/, '');
}

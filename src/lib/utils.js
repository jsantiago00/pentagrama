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

// Nombre corto del sitio de origen de una canción importada, a partir de su
// URL "source". Se usa para distinguir versiones repetidas de un mismo tema
// que se bajaron de lacuerda.net y de cifraclub.com a la vez.
export function getSourceLabel(url) {
  if (!url) return null;
  if (/lacuerda\.net/i.test(url)) return 'lacuerda.net';
  if (/cifraclub\.com/i.test(url)) return 'cifraclub.com';
  return null;
}

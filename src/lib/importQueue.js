import { getSongs, putSongs } from './storage';
import { normalizeSource } from './utils';

// Otras apps del mismo dominio (por ahora SoltArte) dejan canciones acá para
// importarlas directo al abrir Pentagrama, sin pasar por el flujo manual de
// "Importar" con un archivo .json. Mismo origen = mismo localStorage.
const QUEUE_KEY = 'pentagrama_import_queue';

export async function runImportQueue() {
  let incoming = [];
  try {
    const raw = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (Array.isArray(raw)) incoming = raw;
  } catch (err) {
    console.error('Error leyendo la cola de importación', err);
  }
  if (!incoming.length) return null;
  localStorage.removeItem(QUEUE_KEY);

  const existing = await getSongs();
  const existingKeys = new Set(existing.map((s) => normalizeSource(s.source) || s.id));
  const nuevas = incoming.filter((s) => !existingKeys.has(normalizeSource(s.source) || s.id));
  if (nuevas.length) await putSongs(nuevas);

  return { total: incoming.length, imported: nuevas, skipped: incoming.length - nuevas.length };
}

// Cliente del mini-backend (Cloudflare Worker) que corre la lógica de
// scraper_acordes.js / scraper_acordes_v2.js del lado del servidor.
// La app nunca scrapea directo desde el navegador (CORS + no tiene sentido
// bajar todo eso a un celu); solo orquesta la descarga por tandas.

export async function fetchArtistList(workerUrl, query) {
  const res = await fetch(`${workerUrl.replace(/\/$/, '')}/list?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data; // { site, artist, songs: [{href,title}], batchLimit }
}

export async function fetchSongsBatch(workerUrl, site, artist, items) {
  const res = await fetch(`${workerUrl.replace(/\/$/, '')}/songs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site, artist, items }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data; // { results: [...song], errors: [{title,error}] }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Descarga todas las canciones de la lista en tandas, informando progreso.
// onProgress({ done, total, failed }). shouldAbort() para cancelar entre tandas.
export async function fetchAllSongs(workerUrl, { site, artist, songs, batchLimit }, onProgress, shouldAbort) {
  const batches = chunk(songs, batchLimit || 15);
  const results = [];
  const errors = [];
  let done = 0;
  for (const batch of batches) {
    if (shouldAbort && shouldAbort()) break;
    const { results: batchResults, errors: batchErrors } = await fetchSongsBatch(workerUrl, site, artist, batch);
    results.push(...batchResults);
    errors.push(...batchErrors);
    done += batch.length;
    onProgress?.({ done, total: songs.length, failed: errors.length });
  }
  return { results, errors };
}

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

// Descarga en tandas. Cada tanda se entrega a onBatchResults y se espera a
// que se guarde antes de seguir, así la biblioteca queda disponible mientras
// las tandas siguientes todavía se están descargando.
export async function fetchAllSongs(
  workerUrl,
  { site, artist, songs, batchLimit },
  onProgress,
  shouldAbort,
  onBatchResults
) {
  const batches = chunk(songs, batchLimit || 15);
  const results = [];
  const errors = [];
  let done = 0;

  for (const batch of batches) {
    if (shouldAbort && shouldAbort()) break;

    const { results: batchResults, errors: batchErrors } =
      await fetchSongsBatch(workerUrl, site, artist, batch);

    results.push(...batchResults);
    errors.push(...batchErrors);

    // Persistir esta tanda antes de informar que está completamente lista.
    if (batchResults.length && onBatchResults) {
      await onBatchResults(batchResults);
    }

    done += batch.length;
    onProgress?.({ done, total: songs.length, failed: errors.length });
  }

  return { results, errors };
}

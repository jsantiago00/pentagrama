import { useRef, useState } from 'react';
import { fetchArtistList, fetchAllSongs } from '../lib/scraperClient';
import { getScraperUrl, putSongs } from '../lib/storage';
import { normalizeSource } from '../lib/utils';

function songKey(site, href) { return `${site}::${href}`; }

// Maneja todo el ciclo "buscar artista -> elegir canciones -> descargar e
// importar". Vive en App para que la descarga continúe en segundo plano.
// Cada tanda se guarda en IndexedDB en cuanto llega, sin esperar a que termine
// toda la discografía: la biblioteca se actualiza gracias a subscribeSongs.
export function useSongDownload(showToast) {
  const [phase, setPhase] = useState('idle'); // idle | searching | confirm | fetching | error
  const [listResult, setListResult] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [query, setQuery] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [errorMsg, setErrorMsg] = useState('');
  const abortRef = useRef(false);

  function reset() {
    setPhase('idle');
    setListResult(null);
    setSelected(new Set());
    setErrorMsg('');
    setProgress({ done: 0, total: 0, failed: 0 });
  }

  async function search(q) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setPhase('searching');
    setErrorMsg('');
    try {
      const data = await fetchArtistList(getScraperUrl(), trimmed);
      const allKeys = new Set();
      for (const source of data.sources) for (const s of source.songs) allKeys.add(songKey(source.site, s.href));
      setListResult(data);
      setSelected(allKeys);
      setPhase('confirm');
    } catch (e) {
      setErrorMsg(e.message);
      setPhase('error');
    }
  }

  function toggleSong(site, href) {
    setSelected(prev => {
      const key = songKey(site, href);
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function selectAll(value) {
    if (!listResult) return;
    if (!value) { setSelected(new Set()); return; }
    const allKeys = new Set();
    for (const source of listResult.sources) for (const s of source.songs) allKeys.add(songKey(source.site, s.href));
    setSelected(allKeys);
  }

  function backToSearch() {
    setPhase('idle');
    setListResult(null);
    setSelected(new Set());
  }

  async function confirmDownload(existingSongs) {
    if (!listResult) return;
    const sourcesFiltered = listResult.sources
      .map(source => ({ ...source, songs: source.songs.filter(s => selected.has(songKey(source.site, s.href))) }))
      .filter(source => source.songs.length);
    if (!sourcesFiltered.length) { showToast('⚠️ Elegí al menos una canción'); return; }

    setPhase('fetching');
    abortRef.current = false;
    const totalAll = sourcesFiltered.reduce((acc, s) => acc + s.songs.length, 0);
    setProgress({ done: 0, total: totalAll, failed: 0 });

    // La clave de origen evita duplicados entre tandas y también contra la
    // biblioteca que ya existía al comenzar la descarga.
    const seenKeys = new Set(existingSongs.map(s => normalizeSource(s.source) || s.id));
    const searchedArtist = query.trim();
    let importedCount = 0;
    let alreadyExistedCount = 0;
    let doneBase = 0;
    let failedBase = 0;

    try {
      const allErrors = [];
      for (const source of sourcesFiltered) {
        if (abortRef.current) break;
        const { errors } = await fetchAllSongs(
          getScraperUrl(),
          source,
          p => setProgress({ done: doneBase + p.done, total: totalAll, failed: failedBase + p.failed }),
          () => abortRef.current,
          async batchResults => {
            // Guardar cada tanda apenas llega. La lista de canciones se
            // refresca inmediatamente, incluso si la descarga sigue activa.
            const nuevas = [];
            for (const song of batchResults) {
              song.artist = searchedArtist;
              const key = normalizeSource(song.source) || song.id;
              if (seenKeys.has(key)) {
                alreadyExistedCount++;
              } else {
                seenKeys.add(key);
                nuevas.push(song);
              }
            }
            if (nuevas.length) {
              await putSongs(nuevas);
              importedCount += nuevas.length;
            }
          }
        );
        allErrors.push(...errors);
        doneBase += source.songs.length;
        failedBase += errors.length;
      }

      const parts = [`✅ ${importedCount} importadas`];
      if (alreadyExistedCount) parts.push(`${alreadyExistedCount} ya existían`);
      if (allErrors.length) parts.push(`⚠️ ${allErrors.length} fallaron`);
      if (abortRef.current) parts.push('descarga detenida; se conservaron las canciones descargadas');
      showToast(parts.join(' — '));
      reset();
    } catch (e) {
      setErrorMsg(e.message);
      setPhase('error');
      showToast('⚠️ La descarga se interrumpió; las canciones ya guardadas se conservaron');
    }
  }

  function cancelFetch() {
    abortRef.current = true;
  }

  return {
    phase, listResult, selected, query, progress, errorMsg,
    search, toggleSong, selectAll, backToSearch, confirmDownload, cancelFetch, reset,
  };
}

import { useRef, useState } from 'react';
import { fetchArtistList, fetchAllSongs } from '../lib/scraperClient';
import { getScraperUrl, putSongs } from '../lib/storage';
import { normalizeSource } from '../lib/utils';

function songKey(site, href) { return `${site}::${href}`; }

// Maneja todo el ciclo "buscar artista -> elegir canciones -> descargar e
// importar". Vive en App (no dentro del modal), así que si el usuario cierra
// la pantalla de "Obtener canciones" mientras se está descargando, la
// descarga sigue corriendo en segundo plano en vez de cortarse.
export function useSongDownload(showToast) {
  const [phase, setPhase] = useState('idle'); // idle | searching | confirm | fetching | error
  const [listResult, setListResult] = useState(null); // { sources: [{site, artist, songs, batchLimit}] }
  const [selected, setSelected] = useState(new Set()); // claves site::href elegidas
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
    try {
      const allResults = [];
      const allErrors = [];
      let doneBase = 0, failedBase = 0;
      for (const source of sourcesFiltered) {
        if (abortRef.current) break;
        const { results, errors } = await fetchAllSongs(
          getScraperUrl(),
          source,
          p => setProgress({ done: doneBase + p.done, total: totalAll, failed: failedBase + p.failed }),
          () => abortRef.current
        );
        allResults.push(...results);
        allErrors.push(...errors);
        doneBase += source.songs.length;
        failedBase += errors.length;
      }
      // El backend arma "artist" a partir del slug de la URL (con guiones/
      // guiones bajos), no del nombre real; lo pisamos con lo que la
      // persona tipeó para que la carpeta quede con el nombre buscado.
      const searchedArtist = query.trim();
      for (const s of allResults) s.artist = searchedArtist;
      const existingKeys = new Set(existingSongs.map(s => normalizeSource(s.source) || s.id));
      const nuevas = allResults.filter(s => !existingKeys.has(normalizeSource(s.source)));
      const yaExistian = allResults.length - nuevas.length;
      if (nuevas.length) await putSongs(nuevas);
      const parts = [`✅ ${nuevas.length} importadas`];
      if (yaExistian) parts.push(`${yaExistian} ya existían`);
      if (allErrors.length) parts.push(`⚠️ ${allErrors.length} fallaron`);
      showToast(parts.join(' — '));
      reset();
    } catch (e) {
      setErrorMsg(e.message);
      setPhase('error');
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

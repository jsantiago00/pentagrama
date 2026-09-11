import { useRef, useState } from 'react';
import { fetchArtistList, fetchAllSongs } from '../lib/scraperClient';
import { getScraperUrl, setScraperUrl, putSongs } from '../lib/storage';
import { normalizeSource } from '../lib/utils';

export default function FetchSongsModal({ onClose, showToast, existingSongs }) {
  const [workerUrl, setWorkerUrl] = useState(getScraperUrl());
  const [editingUrl, setEditingUrl] = useState(!getScraperUrl());
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | searching | confirm | fetching | error
  const [listResult, setListResult] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [errorMsg, setErrorMsg] = useState('');
  const abortRef = useRef(false);

  function saveUrl() {
    const trimmed = workerUrl.trim();
    if (!trimmed) return;
    setScraperUrl(trimmed);
    setEditingUrl(false);
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setPhase('searching');
    setErrorMsg('');
    try {
      const data = await fetchArtistList(getScraperUrl(), query.trim());
      setListResult(data);
      setPhase('confirm');
    } catch (e) {
      setErrorMsg(e.message);
      setPhase('error');
    }
  }

  async function handleConfirmDownload() {
    setPhase('fetching');
    abortRef.current = false;
    const totalAll = listResult.sources.reduce((acc, s) => acc + s.songs.length, 0);
    setProgress({ done: 0, total: totalAll, failed: 0 });
    try {
      const allResults = [];
      const allErrors = [];
      let doneBase = 0, failedBase = 0;
      for (const source of listResult.sources) {
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
      const existingKeys = new Set(existingSongs.map(s => normalizeSource(s.source) || s.id));
      const nuevas = allResults.filter(s => !existingKeys.has(normalizeSource(s.source)));
      const yaExistian = allResults.length - nuevas.length;
      if (nuevas.length) await putSongs(nuevas);
      const parts = [`✅ ${nuevas.length} importadas`];
      if (yaExistian) parts.push(`${yaExistian} ya existían`);
      if (allErrors.length) parts.push(`⚠️ ${allErrors.length} fallaron`);
      showToast(parts.join(' — '));
      onClose();
    } catch (e) {
      setErrorMsg(e.message);
      setPhase('error');
    }
  }

  function handleCancelFetch() {
    abortRef.current = true;
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Obtener canciones</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {editingUrl ? (
          <>
            <p style={{ fontSize: 12, color: 'var(--text2)' }}>
              Pegá acá la URL de tu Worker de Cloudflare (la que te dio <code>wrangler deploy</code>), una sola vez.
            </p>
            <input
              className="modal-input"
              placeholder="https://acordes-scraper.tu-usuario.workers.dev"
              value={workerUrl}
              onChange={e => setWorkerUrl(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn-small primary" onClick={saveUrl}>Guardar</button>
            </div>
          </>
        ) : (
          <>
            {phase !== 'fetching' && (
              <button
                className="btn-back"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => setEditingUrl(true)}
              >⚙️ cambiar URL del backend</button>
            )}

            {(phase === 'idle' || phase === 'searching' || phase === 'error') && (
              <>
                <input
                  className="modal-input"
                  placeholder="Nombre del artista (ej: Pink Floyd)"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                {phase === 'error' && <p style={{ fontSize: 12, color: 'var(--red)' }}>{errorMsg}</p>}
                <div className="modal-actions">
                  <button className="btn-small" onClick={onClose}>Cancelar</button>
                  <button className="btn-small primary" disabled={phase === 'searching'} onClick={handleSearch}>
                    {phase === 'searching' ? 'Buscando…' : '🔎 Buscar'}
                  </button>
                </div>
              </>
            )}

            {phase === 'confirm' && listResult && (
              <>
                <p style={{ fontSize: 13 }}>
                  Se encontraron{' '}
                  <strong>{listResult.sources.reduce((acc, s) => acc + s.songs.length, 0)}</strong> canciones:{' '}
                  {listResult.sources.map((s, i) => (
                    <span key={s.site}>
                      {i > 0 ? ' y ' : ''}
                      <strong>{s.songs.length}</strong> en {s.site === 'v1' ? 'lacuerda.net' : 'cifraclub.com'}
                    </span>
                  ))}.
                </p>
                <p style={{ fontSize: 12, color: 'var(--text2)' }}>Las que ya tengas guardadas no se van a duplicar; si una misma canción aparece en las dos fuentes, se importan ambas y se distinguen por su origen.</p>
                <div className="modal-actions">
                  <button className="btn-small" onClick={() => setPhase('idle')}>Volver</button>
                  <button className="btn-small primary" onClick={handleConfirmDownload}>📥 Descargar e importar</button>
                </div>
              </>
            )}

            {phase === 'fetching' && (
              <>
                <p style={{ fontSize: 13 }}>Descargando {progress.done}/{progress.total}…</p>
                <div style={{ background: 'var(--bg3)', borderRadius: 8, overflow: 'hidden', height: 8 }}>
                  <div style={{
                    width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                    background: 'var(--accent)', height: '100%', transition: 'width .2s',
                  }} />
                </div>
                {progress.failed > 0 && <p style={{ fontSize: 12, color: 'var(--text2)' }}>{progress.failed} fallaron hasta ahora</p>}
                <div className="modal-actions">
                  <button className="btn-small" onClick={handleCancelFetch}>Detener e importar lo bajado</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

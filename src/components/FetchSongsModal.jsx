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
    setProgress({ done: 0, total: listResult.songs.length, failed: 0 });
    try {
      const { results, errors } = await fetchAllSongs(
        getScraperUrl(),
        listResult,
        p => setProgress(p),
        () => abortRef.current
      );
      const existingKeys = new Set(existingSongs.map(s => normalizeSource(s.source) || s.id));
      const nuevas = results.filter(s => !existingKeys.has(normalizeSource(s.source)));
      const yaExistian = results.length - nuevas.length;
      if (nuevas.length) await putSongs(nuevas);
      const parts = [`✅ ${nuevas.length} importadas`];
      if (yaExistian) parts.push(`${yaExistian} ya existían`);
      if (errors.length) parts.push(`⚠️ ${errors.length} fallaron`);
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
                  Se encontraron <strong>{listResult.songs.length}</strong> canciones de <strong>{listResult.artist}</strong> ({listResult.site === 'v1' ? 'lacuerda.net' : 'cifraclub.com'}).
                </p>
                <p style={{ fontSize: 12, color: 'var(--text2)' }}>Las que ya tengas guardadas no se van a duplicar.</p>
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

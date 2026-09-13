import { useState } from 'react';
import { getScraperUrl, setScraperUrl } from '../lib/storage';

export default function FetchSongsModal({ open, onClose, download, existingSongs }) {
  const [workerUrl, setWorkerUrl] = useState(getScraperUrl());
  const [editingUrl, setEditingUrl] = useState(!getScraperUrl());
  const [query, setQuery] = useState('');

  const { phase, listResult, selected, progress, errorMsg } = download;

  if (!open) return null;

  function saveUrl() {
    const trimmed = workerUrl.trim();
    if (!trimmed) return;
    setScraperUrl(trimmed);
    setEditingUrl(false);
  }

  function handleSearch() {
    download.search(query);
  }

  function handleCancelFetch() {
    download.cancelFetch();
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  const totalFound = listResult?.sources.reduce((acc, s) => acc + s.songs.length, 0) || 0;

  return (
    <div className="modal-overlay open" onClick={handleOverlayClick}>
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
                  Se encontraron <strong>{totalFound}</strong> canciones. Elegí cuáles importar:
                </p>
                <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
                  <button className="btn-small" onClick={() => download.selectAll(true)}>Todas</button>
                  <button className="btn-small" onClick={() => download.selectAll(false)}>Ninguna</button>
                  <span style={{ fontSize: 12, color: 'var(--text2)', alignSelf: 'center' }}>
                    {selected.size} seleccionada{selected.size !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="fetch-song-list">
                  {listResult.sources.map(source => (
                    <div key={source.site}>
                      <p className="fetch-song-source">{source.site === 'v1' ? 'lacuerda.net' : 'cifraclub.com'}</p>
                      <div className="song-list">
                        {source.songs.map(s => {
                          const key = `${source.site}::${s.href}`;
                          const isChecked = selected.has(key);
                          return (
                            <div
                              key={key}
                              className={`song-card${isChecked ? ' checked' : ''}`}
                              onClick={() => download.toggleSong(source.site, s.href)}
                            >
                              <span className="sc-checkbox">✓</span>
                              <div className="sc-info">
                                <div className="sc-title">{s.title}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)' }}>Las que ya tengas guardadas no se van a duplicar.</p>
                <div className="modal-actions">
                  <button className="btn-small" onClick={download.backToSearch}>Volver</button>
                  <button className="btn-small primary" disabled={!selected.size} onClick={() => download.confirmDownload(existingSongs)}>
                    📥 Descargar e importar ({selected.size})
                  </button>
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
                <p style={{ fontSize: 12, color: 'var(--text2)' }}>Podés cerrar esta pantalla: la descarga sigue en segundo plano.</p>
                <div className="modal-actions">
                  <button className="btn-small" onClick={onClose}>Seguir en 2° plano</button>
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

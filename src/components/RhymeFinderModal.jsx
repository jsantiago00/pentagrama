import { useMemo, useState } from 'react';
import { useSongs } from '../hooks/useSongs';
import { buildWordIndex, searchWords } from '../lib/rhymeIndex';

const MODES = [
  { v: 'ends', label: 'Termina en' },
  { v: 'starts', label: 'Empieza con' },
  { v: 'has', label: 'Contiene' },
];

export default function RhymeFinderModal({ open, onClose }) {
  const songs = useSongs();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('ends');

  const wordIndex = useMemo(() => buildWordIndex(songs), [songs]);
  const results = useMemo(() => searchWords(wordIndex, query, mode), [wordIndex, query, mode]);

  if (!open) return null;

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-overlay open" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">🔤 Buscador de rimas</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="artists-toolbar" style={{ justifyContent: 'center' }}>
          {MODES.map(m => (
            <button
              key={m.v}
              className={`view-toggle-btn${mode === m.v ? ' active' : ''}`}
              style={{ width: 'auto', padding: '0 10px', fontSize: 11 }}
              onClick={() => setMode(m.v)}
            >{m.label}</button>
          ))}
        </div>

        <input
          className="search-input"
          placeholder={mode === 'ends' ? 'Ej: ida, ur, ando…' : mode === 'starts' ? 'Ej: cora…' : 'Ej: az…'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />

        <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
          Vocabulario sacado de tus {songs.length} canciones guardadas (solo las que están en español)
        </p>

        <div className="rhyme-results">
          {!query.trim() && <div className="empty-state">✍️ Escribí una terminación para buscar rimas</div>}
          {query.trim() && !results.length && <div className="empty-state">🔍 Sin resultados</div>}
          {results.map(w => <span key={w} className="rhyme-chip">{w}</span>)}
        </div>
      </div>
    </div>
  );
}

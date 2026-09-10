import { useEffect, useRef, useState } from 'react';

export default function SaveModal({ open, initialTitle, initialArtist, artistOptions, onClose, onConfirm }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const titleRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle || '');
      setArtist(initialArtist || '');
      setTimeout(() => titleRef.current?.focus(), 80);
    }
  }, [open, initialTitle, initialArtist]);

  if (!open) return null;

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-overlay open" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Guardar canción</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <input
          ref={titleRef}
          className="modal-input"
          placeholder="Título de la canción"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <input
          className="modal-input"
          placeholder="Artista (opcional)"
          list="artistDatalist"
          value={artist}
          onChange={e => setArtist(e.target.value)}
        />
        <datalist id="artistDatalist">
          {artistOptions.map(a => <option key={a} value={a} />)}
        </datalist>
        <div className="modal-actions">
          <button className="btn-small" onClick={onClose}>Cancelar</button>
          <button className="btn-small primary" onClick={() => onConfirm(title, artist)}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

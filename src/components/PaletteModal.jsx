import { PALETTES } from '../lib/palette';

export default function PaletteModal({ open, paletteId, onPick, onClose }) {
  if (!open) return null;

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-overlay open" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">🎨 Paleta de colores</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text2)' }}>Elegí el color de acento de la app.</p>

        <div className="palette-grid">
          {PALETTES.map(p => (
            <button
              key={p.id}
              className={`palette-swatch${p.id === paletteId ? ' active' : ''}`}
              title={p.label}
              onClick={() => onPick(p.id)}
            >
              <span className="palette-dot" style={{ background: p.swatch }}>
                {p.id === paletteId ? '✓' : ''}
              </span>
              <span className="palette-label">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

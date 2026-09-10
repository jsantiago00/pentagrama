export default function BottomBar({ chordCount, semitones, onNew, onSave }) {
  const toneLabel = semitones === 0 ? 'Original' : (semitones > 0 ? '▲' : '▼') + Math.abs(semitones) + ' st';
  return (
    <div className="bottom-bar">
      <span className="bottom-pill">{chordCount} acorde{chordCount !== 1 ? 's' : ''}</span>
      <span className={`bottom-pill${semitones !== 0 ? ' active' : ''}`}>{toneLabel}</span>
      <span className="bottom-spacer" />
      <button className="btn-small" onClick={onNew}>+ Nueva</button>
      <button className="btn-small primary" onClick={onSave}>💾 Guardar</button>
    </div>
  );
}

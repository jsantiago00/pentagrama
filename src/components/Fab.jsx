export default function Fab({
  scrolling, onToggleScroll, speed, onSpeedChange,
  semitones, onUp, onDown, onReset,
  fontSize, onFontUp, onFontDown,
  onCopy, onOpenSongs,
}) {
  return (
    <div className="fab">
      <button
        className={`fab-btn${scrolling ? ' playing' : ''}`}
        title="Autoscroll"
        onClick={onToggleScroll}
      >
        {scrolling ? '⏸' : '▶'}
      </button>
      <div className="speed-wrap">
        <span className="speed-label">vel</span>
        <input
          type="range"
          className="v-slider"
          min="1" max="10" step="1"
          value={speed}
          onChange={e => onSpeedChange(parseInt(e.target.value, 10))}
        />
        <span className="speed-val">{speed}</span>
      </div>

      <div className="fab-divider" />

      <button className="fab-btn" title="Subir semitono" onClick={onUp}>+</button>
      <div className="semi-display">{semitones === 0 ? '0' : (semitones > 0 ? '+' : '') + semitones}</div>
      <button className="fab-btn" title="Bajar semitono" onClick={onDown}>−</button>
      <button className="fab-btn" title="Resetear" style={{ fontSize: 13 }} onClick={onReset}>↺</button>

      <div className="fab-divider" />

      <button className="fab-btn" title="Agrandar letra" onClick={onFontUp} style={{ fontSize: 12, fontWeight: 700 }}>A+</button>
      <div className="semi-display" title="Tamaño de letra">{fontSize}</div>
      <button className="fab-btn" title="Achicar letra" onClick={onFontDown} style={{ fontSize: 12, fontWeight: 700 }}>A−</button>

      <div className="fab-divider" />

      <button className="fab-btn" title="Copiar" onClick={onCopy}>📋</button>
      <button className="fab-btn" data-tour="songs-btn" title="Canciones guardadas" onClick={onOpenSongs}>🗂️</button>
    </div>
  );
}

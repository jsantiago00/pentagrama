import { useEffect, useRef, useState } from 'react';
import ChordDiagram from './ChordDiagram';
import { getChordDiagram } from '../lib/chordShapes';

export default function ChordDiagramCard({ chord, x, y, onCancel }) {
  const [idx, setIdx] = useState(0);
  const popRef = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const diagram = getChordDiagram(chord);

  useEffect(() => {
    const el = popRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 10;
    let left = x - rect.width / 2;
    let top = y - rect.height - 24;
    if (top < pad) top = y + 24;
    left = Math.min(Math.max(left, pad), window.innerWidth - rect.width - pad);
    top = Math.min(Math.max(top, pad), window.innerHeight - rect.height - pad);
    setPos({ left, top });
    // Solo al montar: `diagram` es un objeto nuevo en cada render (lo
    // calcula getChordDiagram arriba sin memoizar), así que ponerlo en las
    // deps reposicionaría en cada render y terminaría en loop infinito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (popRef.current && !popRef.current.contains(e.target)) onCancel();
    }
    document.addEventListener('pointerdown', onDocClick);
    return () => document.removeEventListener('pointerdown', onDocClick);
  }, [onCancel]);

  const positions = diagram?.positions || [];
  const total = positions.length;
  const safeIdx = idx % Math.max(total, 1);

  return (
    <div className="chord-diagram-card" ref={popRef} style={{ left: pos.left, top: pos.top }} onClick={e => e.stopPropagation()}>
      <div className="cdc-title">
        {chord}
        {diagram?.bass && <span className="cdc-bass"> (bajo {diagram.bass})</span>}
      </div>

      {!diagram ? (
        <div className="cdc-empty">Sin diagrama para este acorde todavía.</div>
      ) : (
        <>
          <ChordDiagram position={positions[safeIdx]} />
          {total > 1 && (
            <div className="cdc-nav">
              <button onClick={() => setIdx(i => (i - 1 + total) % total)}>‹</button>
              <span>{safeIdx + 1}/{total}</span>
              <button onClick={() => setIdx(i => (i + 1) % total)}>›</button>
            </div>
          )}
        </>
      )}

      <button className="chord-picker-cancel" onClick={onCancel}>Cerrar</button>
    </div>
  );
}

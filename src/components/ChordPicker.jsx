import { useEffect, useRef, useState } from 'react';

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const QUALITIES = [
  { v: '', label: 'M' },
  { v: 'm', label: 'm' },
  { v: '7', label: '7' },
  { v: 'm7', label: 'm7' },
  { v: 'maj7', label: 'maj7' },
  { v: 'sus2', label: 'sus2' },
  { v: 'sus4', label: 'sus4' },
  { v: 'dim', label: 'dim' },
  { v: 'aug', label: 'aug' },
  { v: '6', label: '6' },
  { v: '9', label: '9' },
  { v: 'add9', label: 'add9' },
];

const WHEEL_R = 78; // radio de la rueda de notas, en px

export default function ChordPicker({ x, y, onPick, onCancel }) {
  const [root, setRoot] = useState(null);
  const popRef = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // Se acomoda para no salirse de la pantalla, centrado sobre el punto tocado.
  useEffect(() => {
    const el = popRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 10;
    let left = x - rect.width / 2;
    let top = y - rect.height - 24; // por default, arriba del dedo
    if (top < pad) top = y + 24; // si no entra arriba, va abajo
    left = Math.min(Math.max(left, pad), window.innerWidth - rect.width - pad);
    top = Math.min(Math.max(top, pad), window.innerHeight - rect.height - pad);
    setPos({ left, top });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (popRef.current && !popRef.current.contains(e.target)) onCancel();
    }
    document.addEventListener('pointerdown', onDocClick);
    return () => document.removeEventListener('pointerdown', onDocClick);
  }, [onCancel]);

  return (
    <div
      className="chord-picker"
      ref={popRef}
      style={{ left: pos.left, top: pos.top }}
      onClick={e => e.stopPropagation()}
    >
      <div className="chord-wheel" style={{ width: WHEEL_R * 2 + 40, height: WHEEL_R * 2 + 40 }}>
        <div className="chord-wheel-center">
          {root ?? '♪'}
        </div>
        {ROOTS.map((note, i) => {
          const angle = (i / ROOTS.length) * 2 * Math.PI - Math.PI / 2;
          const cx = Math.cos(angle) * WHEEL_R;
          const cy = Math.sin(angle) * WHEEL_R;
          return (
            <button
              key={note}
              className={`chord-wheel-note${root === note ? ' active' : ''}`}
              style={{ transform: `translate(-50%, -50%) translate(${cx}px, ${cy}px)` }}
              onClick={() => setRoot(note)}
            >{note}</button>
          );
        })}
      </div>

      <div className="chord-quality-row">
        {QUALITIES.map(q => (
          <button
            key={q.v}
            className="chord-quality-chip"
            disabled={!root}
            onClick={() => root && onPick(root + q.v)}
          >{q.label}</button>
        ))}
      </div>

      <button className="chord-picker-cancel" onClick={onCancel}>Cancelar</button>
    </div>
  );
}

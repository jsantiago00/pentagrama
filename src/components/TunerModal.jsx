import { useEffect, useRef, useState } from 'react';
import { startTuner, freqToNote, GUITAR_STRINGS } from '../lib/tunerEngine';

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

function tuneClass(cents) {
  const abs = Math.abs(cents);
  if (abs <= 5) return 'in-tune';
  if (abs <= 15) return 'close';
  return 'off';
}

export default function TunerModal({ open, onClose }) {
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState(null); // { name, octave, cents, freq }
  const [error, setError] = useState('');
  const stopRef = useRef(null);
  const historyRef = useRef([]);

  // Si se cierra el panel, soltamos el micrófono (a diferencia de la
  // batería, acá no tiene sentido seguir escuchando de fondo).
  useEffect(() => {
    if (!open && stopRef.current) {
      stopRef.current();
      stopRef.current = null;
      setListening(false);
      setNote(null);
    }
  }, [open]);

  useEffect(() => () => stopRef.current?.(), []);

  if (!open) return null;

  function handlePitch(freq) {
    if (freq == null) {
      historyRef.current = [];
      setNote(null);
      return;
    }
    const hist = historyRef.current;
    hist.push(freq);
    if (hist.length > 6) hist.shift();
    const sorted = [...hist].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    setNote(freqToNote(median));
  }

  async function handleStart() {
    setError('');
    try {
      const stop = await startTuner(handlePitch);
      stopRef.current = stop;
      setListening(true);
    } catch (e) {
      setError('No se pudo acceder al micrófono. Revisá los permisos del navegador.');
    }
  }

  function handleStop() {
    stopRef.current?.();
    stopRef.current = null;
    setListening(false);
    setNote(null);
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  const cents = note?.cents ?? 0;
  const cls = note ? tuneClass(cents) : '';

  return (
    <div className="modal-overlay open" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">🎯 Afinador</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <p style={{ fontSize: 12, color: 'var(--red)' }}>{error}</p>}

        <div className="tuner-display">
          <div className={`tuner-note ${cls}`}>{note ? `${note.name}${note.octave}` : '—'}</div>
          <div className="tuner-freq">{note ? `${note.freq.toFixed(1)} Hz` : listening ? 'Escuchando…' : 'Tocá una cuerda'}</div>
        </div>

        <div className="tuner-meter">
          <div className="tuner-meter-scale">
            <span>-50</span><span>0</span><span>+50</span>
          </div>
          <div className="tuner-meter-track">
            <div className="tuner-meter-mid" />
            {note && (
              <div
                className={`tuner-meter-needle ${cls}`}
                style={{ left: `${50 + clamp(cents, -50, 50) / 100 * 100}%` }}
              />
            )}
          </div>
        </div>

        <div className="tuner-strings">
          {GUITAR_STRINGS.map((s, i) => (
            <span
              key={i}
              className={`tuner-string-chip${note && note.name === s.name && note.octave === s.octave ? ' active' : ''}`}
            >{s.name}{s.octave}</span>
          ))}
        </div>

        <div className="drum-transport">
          {listening ? (
            <button className="btn-small primary playing" onClick={handleStop}>⏸ Detener</button>
          ) : (
            <button className="btn-small primary" onClick={handleStart}>🎤 Escuchar</button>
          )}
        </div>
      </div>
    </div>
  );
}

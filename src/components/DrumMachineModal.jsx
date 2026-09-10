import { useEffect, useRef, useState } from 'react';
import {
  createDrumScheduler, makeEmptyPattern, DRUM_STEPS, DRUM_TRACKS, DRUM_PRESETS,
} from '../lib/drumEngine';

const TRACK_LABELS = { kick: 'Bombo', snare: 'Redob.', hihat: 'Hi-hat' };
const BPM_KEY = 'acordes_drum_bpm';
const PATTERN_KEY = 'acordes_drum_pattern';

function loadSavedPattern() {
  try {
    const raw = localStorage.getItem(PATTERN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (DRUM_TRACKS.every(t => Array.isArray(parsed[t]) && parsed[t].length === DRUM_STEPS)) return parsed;
  } catch { /* ignore */ }
  return null;
}

export default function DrumMachineModal({ open, onClose }) {
  const schedulerRef = useRef(null);
  if (!schedulerRef.current) schedulerRef.current = createDrumScheduler();

  const [pattern, setPatternState] = useState(() => loadSavedPattern() || DRUM_PRESETS.basico.pattern);
  const [bpm, setBpmState] = useState(() => Number(localStorage.getItem(BPM_KEY)) || 100);
  const [playing, setPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);

  // El scheduler vive mientras exista este componente (nunca se desmonta,
  // ver App.jsx), así que el loop puede seguir sonando aunque se cierre el
  // panel — útil para tocar guitarra mientras el pulso sigue de fondo.
  useEffect(() => {
    const s = schedulerRef.current;
    s.setPattern(pattern);
    s.setBpm(bpm);
    s.setOnStepChange(step => setActiveStep(step));
    return () => s.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { schedulerRef.current.setPattern(pattern); }, [pattern]);
  useEffect(() => { schedulerRef.current.setBpm(bpm); }, [bpm]);

  if (!open) return null;

  function persist(nextPattern, nextBpm) {
    localStorage.setItem(PATTERN_KEY, JSON.stringify(nextPattern ?? pattern));
    localStorage.setItem(BPM_KEY, String(nextBpm ?? bpm));
  }

  function toggleStep(track, i) {
    const next = { ...pattern, [track]: pattern[track].map((v, idx) => idx === i ? !v : v) };
    setPatternState(next);
    persist(next, bpm);
  }

  function applyPreset(key) {
    const next = DRUM_PRESETS[key].pattern;
    setPatternState(next);
    persist(next, bpm);
  }

  function clearPattern() {
    const next = makeEmptyPattern();
    setPatternState(next);
    persist(next, bpm);
  }

  function handleBpmChange(v) {
    setBpmState(v);
    persist(pattern, v);
  }

  function togglePlay() {
    if (playing) {
      schedulerRef.current.stop();
      setPlaying(false);
    } else {
      schedulerRef.current.start();
      setPlaying(true);
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-overlay open" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">🥁 Batería</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="drum-bpm-row">
          <span className="drum-bpm-label">{bpm} BPM</span>
          <input
            type="range" min="40" max="220" value={bpm}
            className="drum-bpm-slider"
            onChange={e => handleBpmChange(Number(e.target.value))}
          />
        </div>

        <div className="drum-grid">
          {DRUM_TRACKS.map(track => (
            <div className="drum-row" key={track}>
              <span className="drum-row-label">{TRACK_LABELS[track]}</span>
              <div className="drum-steps">
                {pattern[track].map((on, i) => (
                  <button
                    key={i}
                    className={`drum-step${on ? ' on' : ''}${activeStep === i ? ' current' : ''}${i % 4 === 0 ? ' beat-start' : ''}`}
                    onClick={() => toggleStep(track, i)}
                    aria-label={`${TRACK_LABELS[track]} paso ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="drum-presets">
          {Object.entries(DRUM_PRESETS).map(([key, p]) => (
            <button key={key} className="btn-small" onClick={() => applyPreset(key)}>{p.label}</button>
          ))}
          <button className="btn-small" onClick={clearPattern}>Limpiar</button>
        </div>

        <div className="drum-transport">
          <button className={`btn-small primary${playing ? ' playing' : ''}`} onClick={togglePlay}>
            {playing ? '⏸ Detener' : '▶ Reproducir'}
          </button>
        </div>
      </div>
    </div>
  );
}

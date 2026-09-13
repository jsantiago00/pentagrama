import { useEffect, useRef, useState } from 'react';
import {
  createDrumScheduler, makeEmptyPattern, DRUM_TRACKS, DRUM_PRESETS,
  TIME_SIGNATURES, DEFAULT_TIME_SIG, stepsForTimeSig,
} from '../lib/drumEngine';

const TRACK_LABELS = { kick: 'Bombo', snare: 'Redob.', hihat: 'Hi-hat' };
const BPM_KEY = 'acordes_drum_bpm';
const SIG_KEY = 'acordes_drum_timesig';
const PATTERN_KEY_PREFIX = 'acordes_drum_pattern_';
// Antes de sumar compases, el patrón vivía en esta clave sin sufijo (siempre
// era 4/4). La leemos como fallback para no perder lo que la gente ya tenía
// guardado.
const LEGACY_PATTERN_KEY = 'acordes_drum_pattern';
const CUSTOM_PRESETS_KEY = 'acordes_drum_custom_presets';
const QUICK_BPMS = [60, 80, 100, 120];
const SIG_KEYS = Object.keys(TIME_SIGNATURES);

function loadSavedSig() {
  const raw = localStorage.getItem(SIG_KEY);
  return TIME_SIGNATURES[raw] ? raw : DEFAULT_TIME_SIG;
}

function readPatternKey(key, steps) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (DRUM_TRACKS.every(t => Array.isArray(parsed[t]) && parsed[t].length === steps)) return parsed;
  } catch { /* ignore */ }
  return null;
}

function loadSavedPattern(sigKey) {
  const steps = stepsForTimeSig(sigKey);
  const current = readPatternKey(PATTERN_KEY_PREFIX + sigKey, steps);
  if (current) return current;
  if (sigKey === DEFAULT_TIME_SIG) return readPatternKey(LEGACY_PATTERN_KEY, steps);
  return null;
}

// Primer patrón disponible para un compás: lo que el usuario tenía guardado,
// si no el primer preset de fábrica, y si no un patrón vacío.
function defaultPatternForSig(sigKey) {
  return loadSavedPattern(sigKey)
    || Object.values(DRUM_PRESETS[sigKey] || {})[0]?.pattern
    || makeEmptyPattern(stepsForTimeSig(sigKey));
}

function loadCustomPresets() {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveCustomPresets(list) {
  localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(list));
}

export default function DrumMachineModal({ open, onClose }) {
  const schedulerRef = useRef(null);
  if (!schedulerRef.current) schedulerRef.current = createDrumScheduler();

  const [sigKey, setSigKeyState] = useState(loadSavedSig);
  const [pattern, setPatternState] = useState(() => defaultPatternForSig(loadSavedSig()));
  const [bpm, setBpmState] = useState(() => Number(localStorage.getItem(BPM_KEY)) || 100);
  const [playing, setPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [customPresets, setCustomPresets] = useState(loadCustomPresets);

  const sig = TIME_SIGNATURES[sigKey];

  // El scheduler vive mientras exista este componente (nunca se desmonta,
  // ver App.jsx), así que el loop puede seguir sonando aunque se cierre el
  // panel — útil para tocar guitarra mientras el pulso sigue de fondo.
  useEffect(() => {
    const s = schedulerRef.current;
    s.setPattern(pattern);
    s.setBpm(bpm);
    s.setStepsPerBeat(sig.stepsPerBeat);
    s.setOnStepChange(step => setActiveStep(step));
    return () => s.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { schedulerRef.current.setPattern(pattern); }, [pattern]);
  useEffect(() => { schedulerRef.current.setBpm(bpm); }, [bpm]);
  useEffect(() => { schedulerRef.current.setStepsPerBeat(sig.stepsPerBeat); }, [sig.stepsPerBeat]);

  if (!open) return null;

  function persist(nextPattern, nextBpm, nextSig) {
    localStorage.setItem(PATTERN_KEY_PREFIX + (nextSig ?? sigKey), JSON.stringify(nextPattern ?? pattern));
    localStorage.setItem(BPM_KEY, String(nextBpm ?? bpm));
    localStorage.setItem(SIG_KEY, nextSig ?? sigKey);
  }

  function toggleStep(track, i) {
    const next = { ...pattern, [track]: pattern[track].map((v, idx) => idx === i ? !v : v) };
    setPatternState(next);
    persist(next, bpm);
  }

  function changeTimeSig(nextSigKey) {
    if (nextSigKey === sigKey) return;
    const nextPattern = defaultPatternForSig(nextSigKey);
    setSigKeyState(nextSigKey);
    setPatternState(nextPattern);
    persist(nextPattern, bpm, nextSigKey);
  }

  function applyPreset(key) {
    const next = DRUM_PRESETS[sigKey][key].pattern;
    setPatternState(next);
    persist(next, bpm);
  }

  function applyCustomPreset(p) {
    const presetSig = TIME_SIGNATURES[p.sig] ? p.sig : DEFAULT_TIME_SIG;
    setSigKeyState(presetSig);
    setPatternState(p.pattern);
    setBpmState(p.bpm);
    persist(p.pattern, p.bpm, presetSig);
  }

  function saveCurrentAsPreset() {
    const name = window.prompt('Nombre del preset:');
    const trimmed = name?.trim();
    if (!trimmed) return;
    const next = [...customPresets, { id: Date.now().toString(), name: trimmed, pattern, bpm, sig: sigKey }];
    setCustomPresets(next);
    saveCustomPresets(next);
  }

  function deleteCustomPreset(id) {
    const next = customPresets.filter(p => p.id !== id);
    setCustomPresets(next);
    saveCustomPresets(next);
  }

  function clearPattern() {
    const next = makeEmptyPattern(stepsForTimeSig(sigKey));
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

  const visibleCustomPresets = customPresets.filter(p => (p.sig || DEFAULT_TIME_SIG) === sigKey);

  return (
    <div className="modal-overlay open" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">🥁 Batería</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="drum-sig-row">
          {SIG_KEYS.map(k => (
            <button
              key={k}
              className={`drum-bpm-chip${sigKey === k ? ' active' : ''}`}
              onClick={() => changeTimeSig(k)}
            >{TIME_SIGNATURES[k].label}</button>
          ))}
        </div>

        <div className="drum-bpm-row">
          <span className="drum-bpm-label">{bpm} BPM</span>
          <input
            type="range" min="40" max="220" value={bpm}
            className="drum-bpm-slider"
            onChange={e => handleBpmChange(Number(e.target.value))}
          />
        </div>
        <p className="drum-bpm-hint">{sig.compound ? 'Pulso = negra con puntillo' : 'Pulso = negra'}</p>
        <div className="drum-bpm-quick">
          {QUICK_BPMS.map(v => (
            <button
              key={v}
              className={`drum-bpm-chip${bpm === v ? ' active' : ''}`}
              onClick={() => handleBpmChange(v)}
            >{v}</button>
          ))}
        </div>

        <div className="drum-grid">
          {DRUM_TRACKS.map(track => (
            <div className="drum-row" key={track}>
              <span className="drum-row-label">{TRACK_LABELS[track]}</span>
              <div className="drum-steps">
                {pattern[track].map((on, i) => (
                  <button
                    key={i}
                    className={`drum-step${on ? ' on' : ''}${activeStep === i ? ' current' : ''}${i % sig.stepsPerBeat === 0 && i !== 0 ? ' group-start' : ''}`}
                    onClick={() => toggleStep(track, i)}
                    aria-label={`${TRACK_LABELS[track]} paso ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="drum-presets">
          {Object.entries(DRUM_PRESETS[sigKey] || {}).map(([key, p]) => (
            <button key={key} className="btn-small" onClick={() => applyPreset(key)}>{p.label}</button>
          ))}
          {visibleCustomPresets.map(p => (
            <span className="drum-preset-chip" key={p.id}>
              <button className="btn-small" onClick={() => applyCustomPreset(p)}>{p.name}</button>
              <button className="drum-preset-del" title="Borrar preset" onClick={() => deleteCustomPreset(p.id)}>✕</button>
            </span>
          ))}
          <button className="btn-small" onClick={clearPattern}>Limpiar</button>
          <button className="btn-small" onClick={saveCurrentAsPreset}>💾 Guardar preset</button>
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

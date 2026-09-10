// Afinador: escucha el micrófono y detecta la altura por autocorrelación
// (ACF), la técnica clásica y liviana para esto — no hace falta ninguna
// librería. Basado en el algoritmo de referencia de Chris Wilson (pitchdetect).

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const GUITAR_STRINGS = [
  { name: 'E', octave: 2, freq: 82.41 },
  { name: 'A', octave: 2, freq: 110.00 },
  { name: 'D', octave: 3, freq: 146.83 },
  { name: 'G', octave: 3, freq: 196.00 },
  { name: 'B', octave: 3, freq: 246.94 },
  { name: 'E', octave: 4, freq: 329.63 },
];

export function freqToNote(freq) {
  const noteNum = 12 * Math.log2(freq / 440) + 69; // A4 = nota MIDI 69 = 440Hz
  const rounded = Math.round(noteNum);
  const cents = Math.round((noteNum - rounded) * 100);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return { name, octave, cents, freq };
}

// Autocorrelación sobre una ventana de audio en el dominio del tiempo.
// Devuelve la frecuencia fundamental estimada en Hz, o -1 si hay silencio.
export function autoCorrelate(buf, sampleRate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let r1 = 0, r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  }

  const trimmed = buf.slice(r1, r2);
  const n = trimmed.length;
  if (n < 8) return -1;

  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n - i; j++) sum += trimmed[j] * trimmed[j + i];
    c[i] = sum;
  }

  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < n; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  let T0 = maxpos;
  if (T0 <= 0) return -1;

  // interpolación parabólica para afinar la estimación entre muestras
  if (T0 > 0 && T0 < n - 1) {
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a !== 0) T0 = T0 - b / (2 * a);
  }

  return T0 > 0 ? sampleRate / T0 : -1;
}

// Pide el micrófono y arranca el loop de detección; llama a onPitch(freq|null)
// en cada frame. Devuelve una función stop() que libera el micrófono.
export async function startTuner(onPitch) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  let rafId = null;
  let stopped = false;

  function loop() {
    if (stopped) return;
    analyser.getFloatTimeDomainData(buf);
    const freq = autoCorrelate(buf, ctx.sampleRate);
    onPitch(freq > 0 ? freq : null);
    rafId = requestAnimationFrame(loop);
  }
  loop();

  return function stop() {
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    stream.getTracks().forEach(t => t.stop());
    ctx.close();
  };
}

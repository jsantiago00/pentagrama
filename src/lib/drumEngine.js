// Motor de audio de la caja de ritmos: todo sintetizado con Web Audio API
// (osciladores + ruido filtrado), sin archivos de sonido, para que funcione
// 100% offline. El scheduling usa el patrón estándar de "lookahead" para que
// el pulso no se desincronice con setTimeout/setInterval crudo.

export const DRUM_STEPS = 16;
export const DRUM_TRACKS = ['kick', 'snare', 'hihat'];

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;

export function makeEmptyPattern() {
  return {
    kick: Array(DRUM_STEPS).fill(false),
    snare: Array(DRUM_STEPS).fill(false),
    hihat: Array(DRUM_STEPS).fill(false),
  };
}

function patternFromBits(bits) {
  const p = {};
  for (const track of DRUM_TRACKS) p[track] = bits[track].map(Boolean);
  return p;
}

export const DRUM_PRESETS = {
  basico: {
    label: 'Básico',
    pattern: patternFromBits({
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    }),
  },
  cuatro: {
    label: 'Four on the floor',
    pattern: patternFromBits({
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    }),
  },
  balada: {
    label: 'Balada',
    pattern: patternFromBits({
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hihat: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    }),
  },
};

function createNoiseBuffer(ctx) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function playKick(ctx, dest, noiseBuffer, time) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
  gain.gain.setValueAtTime(1, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
  osc.connect(gain).connect(dest);
  osc.start(time);
  osc.stop(time + 0.3);
}

function playSnare(ctx, dest, noiseBuffer, time) {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 1000;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.9, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
  noise.connect(noiseFilter).connect(noiseGain).connect(dest);
  noise.start(time);
  noise.stop(time + 0.18);

  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180, time);
  oscGain.gain.setValueAtTime(0.6, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  osc.connect(oscGain).connect(dest);
  osc.start(time);
  osc.stop(time + 0.12);
}

function playHihat(ctx, dest, noiseBuffer, time) {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.45, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  noise.connect(filter).connect(gain).connect(dest);
  noise.start(time);
  noise.stop(time + 0.06);
}

const PLAYERS = { kick: playKick, snare: playSnare, hihat: playHihat };

// Instancia con estado propio (contexto de audio, scheduler). Se crea una
// sola vez por componente y se reusa entre aperturas/cierres del panel para
// que el loop pueda seguir sonando de fondo si el usuario cierra la pantalla.
export function createDrumScheduler() {
  let ctx = null;
  let masterGain = null;
  let noiseBuffer = null;
  let timerId = null;
  let rafId = null;
  let currentStep = 0;
  let nextStepTime = 0;
  let playing = false;
  let bpm = 100;
  let pattern = makeEmptyPattern();
  let notesInQueue = [];
  let onStepChange = null;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.9;
      masterGain.connect(ctx.destination);
      noiseBuffer = createNoiseBuffer(ctx);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function secondsPerStep() {
    return 60 / bpm / 4; // patrones de semicorcheas, 16 pasos por compás de 4/4
  }

  function scheduleStep(step, time) {
    notesInQueue.push({ step, time });
    for (const track of DRUM_TRACKS) {
      if (pattern[track][step]) PLAYERS[track](ctx, masterGain, noiseBuffer, time);
    }
  }

  function schedulerLoop() {
    while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
      scheduleStep(currentStep, nextStepTime);
      nextStepTime += secondsPerStep();
      currentStep = (currentStep + 1) % DRUM_STEPS;
    }
    timerId = setTimeout(schedulerLoop, LOOKAHEAD_MS);
  }

  function drawLoop() {
    if (!ctx) return;
    const t = ctx.currentTime;
    let display = null;
    while (notesInQueue.length && notesInQueue[0].time <= t) {
      display = notesInQueue.shift().step;
    }
    if (display !== null && onStepChange) onStepChange(display);
    rafId = requestAnimationFrame(drawLoop);
  }

  return {
    start() {
      if (playing) return;
      ensureCtx();
      playing = true;
      currentStep = 0;
      nextStepTime = ctx.currentTime + 0.05;
      notesInQueue = [];
      schedulerLoop();
      drawLoop();
    },
    stop() {
      playing = false;
      clearTimeout(timerId);
      cancelAnimationFrame(rafId);
      notesInQueue = [];
      if (onStepChange) onStepChange(-1);
    },
    isPlaying() { return playing; },
    setBpm(v) { bpm = v; },
    setPattern(p) { pattern = p; },
    setOnStepChange(cb) { onStepChange = cb; },
    destroy() {
      this.stop();
      if (ctx) { ctx.close(); ctx = null; }
    },
  };
}

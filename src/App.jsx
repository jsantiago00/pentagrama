import { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import Editor from './components/Editor';
import Fab from './components/Fab';
import BottomBar from './components/BottomBar';
import SaveModal from './components/SaveModal';
import SongsModal from './components/SongsModal';
import DrumMachineModal from './components/DrumMachineModal';
import TunerModal from './components/TunerModal';
import RhymeFinderModal from './components/RhymeFinderModal';
import PaletteModal from './components/PaletteModal';
import OnboardingTour from './components/OnboardingTour';
import Toast from './components/Toast';
import { useAutoscroll } from './hooks/useAutoscroll';
import { useSongs } from './hooks/useSongs';
import { useBackNav } from './hooks/useBackNav';
import { countUniqueChords, getTransposedPlain } from './lib/chords';
import { TOUR_STEPS } from './lib/tourSteps';
import { getPaletteId, setPaletteId as persistPaletteId, applyPalette } from './lib/palette';
import {
  putSong, getTheme, setTheme as persistTheme,
  getFontSize, setFontSize as persistFontSize,
  getOnboardingDone, setOnboardingDone,
} from './lib/storage';

const FONT_SIZE_MIN = 11, FONT_SIZE_MAX = 26, FONT_SIZE_STEP = 1;

export default function App() {
  const [rawText, setRawText] = useState('');
  const [semitones, setSemitones] = useState(0);
  const [songTitle, setSongTitle] = useState('');
  const [activeSongId, setActiveSongId] = useState(null);
  const [theme, setThemeState] = useState(getTheme());
  const [fontSize, setFontSizeState] = useState(getFontSize());
  const [modalSaveOpen, setModalSaveOpen] = useState(false);
  const [modalSongsOpen, setModalSongsOpen] = useState(false);
  const [drumOpen, setDrumOpen] = useState(false);
  const [tunerOpen, setTunerOpen] = useState(false);
  const [rhymeOpen, setRhymeOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteId, setPaletteIdState] = useState(getPaletteId());
  const [tourStep, setTourStep] = useState(() => (getOnboardingDone() ? null : 0));
  const [toast, setToast] = useState(null);
  // Arranca editable (documento en blanco, listo para escribir); al cargar
  // una canción pasa a solo-lectura para que deslizar/scrollear en el celu
  // no dispare el teclado por accidente.
  const [editMode, setEditMode] = useState(true);

  const editorWrapRef = useRef(null);
  const editorHandleRef = useRef(null);
  const toastTimer = useRef(null);
  const autoscroll = useAutoscroll(editorWrapRef);
  const songs = useSongs();
  const { pushNav, goBack } = useBackNav();

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
    applyPalette(paletteId, theme);
  }, [theme, paletteId]);

  // Si la canción activa se borró desde el modal, soltamos la referencia.
  useEffect(() => {
    if (activeSongId && !songs.some(s => s.id === activeSongId)) setActiveSongId(null);
  }, [songs, activeSongId]);

  // Cada paso del minitutorial deja la app mostrando la pantalla real que
  // describe (carpeta de canciones, afinador, caja de ritmos, etc.) en vez
  // de solo explicarla con texto. Usa los setters de estado directo (no
  // pushNav) para no ensuciar la pila de navegación del botón "atrás".
  useEffect(() => {
    if (tourStep === null) return;
    const id = TOUR_STEPS[tourStep].id;
    if (id === 'titulo' || id === 'letra' || id === 'acordes' || id === 'rimas' || id === 'canciones') {
      setModalSongsOpen(false); setTunerOpen(false); setDrumOpen(false);
      setEditMode(true);
      setSongTitle(id === 'titulo' ? 'Título de tu canción' : '');
      setRawText(id === 'letra' ? 'Acá escribís la letra de tu canción' : id === 'acordes' ? 'Do\nAcá escribís la letra de tu canción' : '');
    } else if (id === 'buscar' || id === 'leer') {
      setSongTitle(''); setRawText('');
      setTunerOpen(false); setDrumOpen(false);
      setModalSongsOpen(true);
    } else if (id === 'afinador') {
      setModalSongsOpen(false); setDrumOpen(false);
      setTunerOpen(true);
    } else if (id === 'ritmo') {
      setModalSongsOpen(false); setTunerOpen(false);
      setDrumOpen(true);
    } else if (id === 'extras') {
      setModalSongsOpen(false); setTunerOpen(false); setDrumOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStep]);

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo: null });
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const showUndoToast = useCallback((msg, restoreFn) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo: restoreFn });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  function handleUndo() {
    if (toast?.undo) toast.undo();
    clearTimeout(toastTimer.current);
    setToast(null);
    showToast('↩️ Restaurado');
  }

  function changeFontSize(delta) {
    setFontSizeState(s => {
      const next = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, s + delta));
      persistFontSize(next);
      return next;
    });
  }

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    persistTheme(next);
    setThemeState(next);
  }

  function toggleEditMode() {
    if (editMode) {
      editorHandleRef.current?.blur();
      setEditMode(false);
    } else {
      editorHandleRef.current?.enterEditSync();
      setEditMode(true);
    }
  }

  function handleNew() {
    if (rawText.trim() && !window.confirm('¿Descartás los cambios?')) return;
    setRawText('');
    setActiveSongId(null);
    setSongTitle('');
    setSemitones(0);
    autoscroll.stop();
    setEditMode(true);
    showToast('✨ Nueva canción');
  }

  function handleCopy() {
    const text = getTransposedPlain(rawText, semitones);
    if (!text.trim()) { showToast('⚠️ No hay texto'); return; }
    navigator.clipboard?.writeText(text).then(() => showToast('📋 Copiado')).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      showToast('📋 Copiado');
    });
  }

  async function handleSaveConfirm(title, artist) {
    const finalTitle = title.trim() || 'Sin título';
    const finalArtist = artist.trim();
    setSongTitle(finalTitle);
    const text = getTransposedPlain(rawText, semitones);
    const now = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const existing = activeSongId ? songs.find(s => s.id === activeSongId) : null;
    if (existing) {
      await putSong({ ...existing, title: finalTitle, artist: finalArtist, text, updated: now });
      goBack(1);
      showToast('✅ Actualizada');
      return;
    }
    const id = Date.now().toString();
    await putSong({ id, title: finalTitle, artist: finalArtist, text, created: now, updated: now });
    setActiveSongId(id);
    goBack(1);
    showToast('💾 Guardada');
  }

  function openSaveModal() {
    pushNav(() => setModalSaveOpen(false));
    setModalSaveOpen(true);
  }

  function openSongsModal() {
    pushNav(() => setModalSongsOpen(false));
    setModalSongsOpen(true);
  }

  function openDrumMachine() {
    pushNav(() => setDrumOpen(false));
    setDrumOpen(true);
  }

  function openTuner() {
    pushNav(() => setTunerOpen(false));
    setTunerOpen(true);
  }

  function openRhymeFinder() {
    pushNav(() => setRhymeOpen(false));
    setRhymeOpen(true);
  }

  function openPalette() {
    pushNav(() => setPaletteOpen(false));
    setPaletteOpen(true);
  }

  function pickPalette(id) {
    persistPaletteId(id);
    setPaletteIdState(id);
  }

  function endTour() {
    setOnboardingDone();
    setTourStep(null);
    setModalSongsOpen(false); setTunerOpen(false); setDrumOpen(false);
    setSongTitle(''); setRawText(''); setSemitones(0);
    setEditMode(true);
  }

  function nextTourStep() {
    if (tourStep < TOUR_STEPS.length - 1) setTourStep(s => s + 1);
    else endTour();
  }

  function loadSong(song) {
    setRawText(song.text);
    setSongTitle(song.title);
    setActiveSongId(song.id);
    setSemitones(0);
    autoscroll.stop();
    setEditMode(false);
    showToast(`🎵 "${song.title}" cargada`);
  }

  const existingArtistOptions = Array.from(new Set(songs.map(s => (s.artist || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
  const currentSongForSave = activeSongId ? songs.find(s => s.id === activeSongId) : null;

  return (
    <div className="app">
      <Header
        title={songTitle}
        onTitleChange={setSongTitle}
        saved={!!activeSongId}
        theme={theme}
        onToggleTheme={toggleTheme}
        editMode={editMode}
        onToggleEditMode={toggleEditMode}
        onOpenDrumMachine={openDrumMachine}
        onOpenTuner={openTuner}
        onOpenRhymeFinder={openRhymeFinder}
      />

      <div className="main" style={{ '--editor-font-size': `${fontSize}px` }}>
        <Editor
          ref={editorHandleRef}
          rawText={rawText}
          semitones={semitones}
          onChange={setRawText}
          wrapRef={editorWrapRef}
          onInteraction={autoscroll.stop}
          editable={editMode}
        />
        <Fab
          scrolling={autoscroll.scrolling}
          onToggleScroll={autoscroll.toggle}
          speed={autoscroll.speed}
          onSpeedChange={autoscroll.setSpeed}
          semitones={semitones}
          onUp={() => setSemitones(s => Math.max(-11, Math.min(11, s + 1)))}
          onDown={() => setSemitones(s => Math.max(-11, Math.min(11, s - 1)))}
          onReset={() => setSemitones(0)}
          fontSize={fontSize}
          onFontUp={() => changeFontSize(FONT_SIZE_STEP)}
          onFontDown={() => changeFontSize(-FONT_SIZE_STEP)}
          onCopy={handleCopy}
          onOpenSongs={openSongsModal}
        />
      </div>

      <BottomBar
        chordCount={countUniqueChords(rawText)}
        semitones={semitones}
        onNew={handleNew}
        onSave={openSaveModal}
        onOpenPalette={openPalette}
      />

      <SaveModal
        open={modalSaveOpen}
        initialTitle={songTitle}
        initialArtist={currentSongForSave?.artist || ''}
        artistOptions={existingArtistOptions}
        onClose={() => goBack(1)}
        onConfirm={handleSaveConfirm}
      />

      <SongsModal
        open={modalSongsOpen}
        activeSongId={activeSongId}
        onLoadSong={loadSong}
        showToast={showToast}
        showUndoToast={showUndoToast}
        pushNav={pushNav}
        goBack={goBack}
      />

      <DrumMachineModal open={drumOpen} onClose={() => goBack(1)} />
      <TunerModal open={tunerOpen} onClose={() => goBack(1)} />
      <RhymeFinderModal open={rhymeOpen} onClose={() => goBack(1)} />
      <PaletteModal open={paletteOpen} paletteId={paletteId} onPick={pickPalette} onClose={() => goBack(1)} />

      <Toast toast={toast} onUndo={handleUndo} />

      {tourStep !== null && (
        <OnboardingTour stepIndex={tourStep} onNext={nextTourStep} onSkip={endTour} />
      )}
    </div>
  );
}

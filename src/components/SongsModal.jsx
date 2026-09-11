import { useEffect, useMemo, useRef, useState } from 'react';
import {
  putSong, putSongs, deleteSongsByIds, replaceArtistOnSongs,
  getArtistMeta, saveArtistMeta,
  getArtistViewMode, setArtistViewMode as persistArtistViewMode,
} from '../lib/storage';
import { useSongs } from '../hooks/useSongs';
import FetchSongsModal from './FetchSongsModal';
import { normalizeSource, getSourceLabel } from '../lib/utils';

function groupByArtist(songs) {
  const map = {};
  for (const s of songs) {
    const key = (s.artist || '').trim() || '__none__';
    if (!map[key]) map[key] = [];
    map[key].push(s);
  }
  return map;
}

function artistEmoji(name) {
  const pool = ['🎸', '🎵', '🎤', '🎹', '🥁', '🎺', '🎻', '🪗', '🎷', '🪘'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return pool[h % pool.length];
}

export default function SongsModal({ open, activeSongId, onLoadSong, showToast, showUndoToast, pushNav, goBack }) {
  const songs = useSongs();
  const [metaTick, setMetaTick] = useState(0);
  const [view, setView] = useState('artists');
  const [currentArtist, setCurrentArtist] = useState(null);
  const [search, setSearch] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [artistViewMode, setArtistViewModeState] = useState(getArtistViewMode());
  const [openMenu, setOpenMenu] = useState(null);
  const [fetchOpen, setFetchOpen] = useState(false);
  const fileInputRef = useRef(null);

  const refreshMeta = () => setMetaTick(t => t + 1);
  const groups = useMemo(() => groupByArtist(songs), [songs]);
  const artistMeta = useMemo(() => getArtistMeta(), [metaTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Como la vista "songs" queda recordada de la sesión anterior, si el
  // modal se abre directo ahí hay que empujar un nivel extra a la pila de
  // navegación para que quede en sincro con lo que se ve (si no, "← artistas"
  // y el botón atrás del celu cerrarían el modal entero de un salto).
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current && view === 'songs') {
      pushNav(goToArtists);
    }
    wasOpenRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  // Cierra el modal entero de un salto, sin importar en qué vista se esté
  // (usa goBack para que el botón "atrás" del celu quede sincronizado).
  function closeAll() {
    goBack(view === 'songs' ? 2 : 1);
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) closeAll();
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function goToArtists() {
    setView('artists');
    setOpenMenu(null);
    exitSelectionMode();
  }

  function goToSongs(artist) {
    setCurrentArtist(artist);
    setSearch('');
    exitSelectionMode();
    pushNav(goToArtists);
    setView('songs');
  }

  function toggleArtistFav(name) {
    const meta = getArtistMeta();
    meta[name] = { ...(meta[name] || {}), fav: !(meta[name]?.fav) };
    saveArtistMeta(meta);
    refreshMeta();
  }

  function renameArtist(oldName) {
    const newName = window.prompt('Nuevo nombre del artista:', oldName);
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    const ids = songs.filter(s => (s.artist || '').trim() === oldName).map(s => s.id);
    replaceArtistOnSongs(ids, trimmed).then(() => {
      const meta = getArtistMeta();
      if (meta[oldName]) { meta[trimmed] = meta[oldName]; delete meta[oldName]; saveArtistMeta(meta); }
      refreshMeta();
      showToast(`✏️ Renombrado a "${trimmed}"`);
    });
  }

  function deleteArtist(name) {
    const toRemove = songs.filter(s => (s.artist || '').trim() === name);
    const n = toRemove.length;
    if (!window.confirm(`¿Eliminar a "${name}" y sus ${n} canción${n !== 1 ? 'es' : ''}? Esta acción no se puede deshacer.`)) return;
    deleteSongsByIds(toRemove.map(s => s.id)).then(() => {
      const meta = getArtistMeta();
      delete meta[name]; saveArtistMeta(meta);
      refreshMeta();
      showToast(`🗑️ "${name}" eliminado`);
    });
  }

  function setViewMode(mode) {
    setArtistViewModeState(mode);
    persistArtistViewMode(mode);
  }

  function toggleFav(song) {
    putSong({ ...song, fav: !song.fav });
  }

  function toggleSelected(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function deleteSong(song) {
    deleteSongsByIds([song.id]).then(() => {
      showUndoToast(`🗑️ "${song.title}" eliminada`, () => putSongs([song]));
    });
  }

  function deleteSelected() {
    if (!selectedIds.size) return;
    const ids = new Set(selectedIds);
    const removed = songs.filter(s => ids.has(s.id));
    exitSelectionMode();
    deleteSongsByIds([...ids]).then(() => {
      showUndoToast(`🗑️ ${removed.length} eliminadas`, () => putSongs(removed));
    });
  }

  function openFetchModal() {
    pushNav(() => setFetchOpen(false));
    setFetchOpen(true);
  }

  function importarCanciones() {
    fileInputRef.current?.click();
  }

  function handleFileChosen(e) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const incoming = JSON.parse(ev.target.result);
        if (!Array.isArray(incoming)) throw new Error('El archivo no es un array JSON válido');
        const existingKeys = new Set(songs.map(s => normalizeSource(s.source) || s.id));
        const nuevas = incoming.filter(s => !existingKeys.has(normalizeSource(s.source) || s.id));
        putSongs(nuevas).then(() => {
          showToast(`✅ ${nuevas.length} canciones importadas (${incoming.length - nuevas.length} ya existían)`);
        });
      } catch (err) {
        showToast('❌ Error: ' + err.message);
      }
    };
    reader.readAsText(f);
  }

  function exportarCanciones() {
    if (!songs.length) { showToast('⚠️ No hay canciones para exportar'); return; }
    const blob = new Blob([JSON.stringify(songs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fecha = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `canciones_acordes_${fecha}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`📤 ${songs.length} canciones exportadas`);
  }

  const artistKeys = Object.keys(groups).sort((a, b) => {
    if (a === '__none__') return 1;
    if (b === '__none__') return -1;
    const favA = artistMeta[a]?.fav ? 1 : 0, favB = artistMeta[b]?.fav ? 1 : 0;
    if (favA !== favB) return favB - favA;
    return a.localeCompare(b, 'es');
  });

  let songList = groups[currentArtist] || [];
  const filter = search.toLowerCase().trim();
  if (filter) songList = songList.filter(s => s.title.toLowerCase().includes(filter));
  songList = [...songList].sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0));

  // Si dos canciones del mismo artista comparten título (típicamente porque
  // se importaron de lacuerda.net y de cifraclub.com), mostramos de dónde
  // salió cada una para poder distinguirlas.
  const titleCounts = {};
  for (const s of songList) {
    const key = s.title.trim().toLowerCase();
    titleCounts[key] = (titleCounts[key] || 0) + 1;
  }

  const modalTitle = view === 'artists' ? 'Canciones' : (currentArtist === '__none__' ? 'Sin artista' : currentArtist);

  return (
    <div className="modal-overlay open" onClick={handleOverlayClick}>
      <div className="modal" onClick={() => openMenu && setOpenMenu(null)}>
        <div className="modal-header">
          <span className="modal-title">{modalTitle}</span>
          <button className="modal-close" onClick={closeAll}>✕</button>
        </div>

        {view === 'artists' && (
          <div id="viewArtists">
            <div className="artists-toolbar">
              <button className={`view-toggle-btn${artistViewMode === 'grid' ? ' active' : ''}`} title="Vista en cajas" onClick={() => setViewMode('grid')}>⊞</button>
              <button className={`view-toggle-btn${artistViewMode === 'list' ? ' active' : ''}`} title="Vista en lista" onClick={() => setViewMode('list')}>☰</button>
            </div>
            <div className={`artist-grid${artistViewMode === 'list' ? ' list-view' : ''}`}>
              {!songs.length && <div className="empty-state" style={{ gridColumn: '1/-1' }}>🗂️<br />No hay canciones guardadas.</div>}
              {artistKeys.map(key => {
                const label = key === '__none__' ? 'Sin artista' : key;
                const emoji = key === '__none__' ? '🗂️' : artistEmoji(key);
                const n = groups[key].length;
                const isFav = key !== '__none__' && artistMeta[key]?.fav;
                return (
                  <div className="artist-card" key={key} onClick={() => goToSongs(key)}>
                    {key !== '__none__' && (
                      <>
                        <button
                          className={`ac-star${isFav ? ' is-fav' : ''}`}
                          title={isFav ? 'Quitar de favoritos' : 'Marcar como favorito'}
                          onClick={e => { e.stopPropagation(); toggleArtistFav(key); }}
                        >{isFav ? '★' : '☆'}</button>
                        <button
                          className="ac-menu-btn"
                          title="Más opciones"
                          onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === key ? null : key); }}
                        >⋮</button>
                        <div className={`ac-menu${openMenu === key ? ' open' : ''}`}>
                          <button onClick={e => { e.stopPropagation(); setOpenMenu(null); renameArtist(key); }}>✏️ Renombrar</button>
                          <button className="danger" onClick={e => { e.stopPropagation(); setOpenMenu(null); deleteArtist(key); }}>🗑️ Eliminar artista</button>
                        </div>
                      </>
                    )}
                    <div className="ac-avatar">{emoji}</div>
                    <div className="ac-info">
                      <div className="ac-name">{label}</div>
                      <div className="ac-count">{n} canción{n !== 1 ? 'es' : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="io-icons">
              <button className="btn-io" title="Buscar e importar canciones de un artista" onClick={openFetchModal}>🔎 Obtener</button>
              <button className="btn-io" title="Importar canciones desde un archivo" onClick={importarCanciones}>📥 Importar</button>
              <button className="btn-io" title="Exportar todas mis canciones a un archivo" onClick={exportarCanciones}>📤 Exportar</button>
              <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChosen} />
            </div>
          </div>
        )}

        {fetchOpen && (
          <FetchSongsModal onClose={() => goBack(1)} showToast={showToast} existingSongs={songs} />
        )}

        {view === 'songs' && (
          <div id="viewSongs" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="songs-header">
              <button className="btn-back" onClick={() => goBack(1)}>← artistas</button>
              <span className="songs-artist-name">{currentArtist === '__none__' ? 'Sin artista' : currentArtist}</span>
              <span className="badge-count">{songList.length}</span>
              <button className="btn-select-mode" onClick={() => (selectionMode ? exitSelectionMode() : setSelectionMode(true))}>
                {selectionMode ? 'Cancelar' : 'Seleccionar'}
              </button>
            </div>
            <input
              className="search-input"
              placeholder="Buscar canción…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {selectionMode && (
              <div className="selection-bar open">
                <span className="sel-count">{selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}</span>
                <button className="btn-small" onClick={exitSelectionMode}>Cancelar</button>
                <button
                  className="btn-small primary"
                  style={{ background: 'var(--red)', borderColor: 'var(--red)', opacity: selectedIds.size ? 1 : 0.5 }}
                  disabled={!selectedIds.size}
                  onClick={deleteSelected}
                >🗑 Eliminar</button>
              </div>
            )}
            <div className="song-list">
              {!songList.length && <div className="empty-state">{filter ? '🔍 Sin resultados' : '🎵 Sin canciones'}</div>}
              {songList.map(s => (
                <div
                  key={s.id}
                  className={`song-card ${s.id === activeSongId ? 'cur' : ''} ${selectedIds.has(s.id) ? 'checked' : ''}`}
                  onClick={() => {
                    if (selectionMode) { toggleSelected(s.id); return; }
                    goBack(2);
                    onLoadSong(s);
                  }}
                >
                  {selectionMode && <span className="sc-checkbox">✓</span>}
                  <button
                    className={`sc-fav${s.fav ? ' is-fav' : ''}`}
                    title={s.fav ? 'Quitar de favoritas' : 'Marcar como favorita'}
                    onClick={e => { e.stopPropagation(); toggleFav(s); }}
                  >{s.fav ? '★' : '☆'}</button>
                  <div className="sc-info">
                    <div className="sc-title">{s.title}</div>
                    <div className="sc-meta">
                      {s.updated || s.created || ''}
                      {titleCounts[s.title.trim().toLowerCase()] > 1 && getSourceLabel(s.source) && (
                        <span className="sc-source"> · {getSourceLabel(s.source)}</span>
                      )}
                    </div>
                  </div>
                  {!selectionMode && (
                    <button className="sc-del" title="Eliminar" onClick={e => { e.stopPropagation(); deleteSong(s); }}>🗑</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

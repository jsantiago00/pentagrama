// Canciones: IndexedDB (localStorage se queda corto, ~5-10MB, contra las
// miles de canciones precargadas + las que agregue el usuario).
// Preferencias livianas (tema, vista, favoritos de artista): localStorage.

import { normalizeSource } from './utils';

const DB_NAME = 'acordes_db';
const DB_VERSION = 1;
const STORE = 'songs';

const ARTIST_META_KEY = 'acordes_artist_meta';
const SEED_FLAG_KEY = 'acordes_seed_v1_done';
const THEME_KEY = 'acordes_theme';
const FONT_SIZE_KEY = 'acordes_font_size';
const ARTIST_VIEW_KEY = 'acordes_artist_view';
const SCRAPER_URL_KEY = 'acordes_scraper_url';

let dbPromise = null;
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

const listeners = new Set();
function notify() { listeners.forEach(fn => fn()); }
export function subscribeSongs(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function getSongs() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function putSong(song) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(song);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  notify();
}

export async function putSongs(list) {
  if (!list.length) return;
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const s of list) store.put(s);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  notify();
}

export async function deleteSongsByIds(ids) {
  if (!ids.length) return;
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const id of ids) store.delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  notify();
}

export async function replaceArtistOnSongs(songIds, newArtist) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const id of songIds) {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (getReq.result) store.put({ ...getReq.result, artist: newArtist });
      };
    }
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  notify();
}

export function getArtistMeta() {
  try { return JSON.parse(localStorage.getItem(ARTIST_META_KEY) || '{}'); } catch { return {}; }
}
export function saveArtistMeta(meta) {
  localStorage.setItem(ARTIST_META_KEY, JSON.stringify(meta));
}

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}
export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

const DEFAULT_FONT_SIZE = 14;
export function getFontSize() {
  const v = parseInt(localStorage.getItem(FONT_SIZE_KEY), 10);
  return Number.isFinite(v) ? v : DEFAULT_FONT_SIZE;
}
export function setFontSize(size) {
  localStorage.setItem(FONT_SIZE_KEY, String(size));
}

export function getArtistViewMode() {
  return localStorage.getItem(ARTIST_VIEW_KEY) || 'grid';
}
export function setArtistViewMode(mode) {
  localStorage.setItem(ARTIST_VIEW_KEY, mode);
}

// Backend de scraping por defecto (Cloudflare Worker propio). Se puede
// pisar desde la pantalla de "Obtener canciones" si alguna vez se redeploya
// con otro nombre/cuenta.
const DEFAULT_SCRAPER_URL = 'https://acordes-scraper.acordes.workers.dev';

export function getScraperUrl() {
  return localStorage.getItem(SCRAPER_URL_KEY) || DEFAULT_SCRAPER_URL;
}
export function setScraperUrl(url) {
  localStorage.setItem(SCRAPER_URL_KEY, url.trim());
}

// Precarga (una única vez) el repertorio incluido de fábrica con la app.
export async function seedBundledSongsIfNeeded() {
  if (localStorage.getItem(SEED_FLAG_KEY)) return;
  try {
    const manifestRes = await fetch(`${import.meta.env.BASE_URL}data/manifest.json`);
    if (!manifestRes.ok) throw new Error('no manifest');
    const files = await manifestRes.json();
    const existing = await getSongs();
    const existingKeys = new Set(existing.map(s => normalizeSource(s.source) || s.id));
    const nuevas = [];
    for (const f of files) {
      const res = await fetch(`${import.meta.env.BASE_URL}data/${f}`);
      if (!res.ok) continue;
      const arr = await res.json();
      for (const s of arr) {
        const key = normalizeSource(s.source) || s.id;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        nuevas.push(s);
      }
    }
    if (nuevas.length) await putSongs(nuevas);
  } catch (e) {
    console.warn('No se pudo precargar el repertorio incluido:', e);
  } finally {
    localStorage.setItem(SEED_FLAG_KEY, '1');
  }
}

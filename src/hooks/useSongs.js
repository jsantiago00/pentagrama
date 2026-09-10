import { useEffect, useState } from 'react';
import { getSongs, subscribeSongs } from '../lib/storage';

// Lista de canciones reactiva: se refresca sola cada vez que cualquier
// parte de la app escribe en el storage (import, borrado, guardado, etc).
export function useSongs() {
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    let mounted = true;
    const load = () => getSongs().then(list => { if (mounted) setSongs(list); });
    load();
    const unsubscribe = subscribeSongs(load);
    return () => { mounted = false; unsubscribe(); };
  }, []);

  return songs;
}

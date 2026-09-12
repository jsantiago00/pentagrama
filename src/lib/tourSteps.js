export const TOUR_STEPS = [
  {
    id: 'titulo',
    target: '.song-title-input',
    title: 'Escribir canciones (1 de 3)',
    text: 'Acá podés escribir el nombre de tu canción.',
    example: 'Título de tu canción',
  },
  {
    id: 'letra',
    target: '#editor',
    title: 'Escribir canciones (2 de 3)',
    text: 'Acá escribís la letra de tu canción.',
    example: 'Acá escribís la letra de tu canción',
  },
  {
    id: 'acordes',
    target: '#editor',
    title: 'Escribir canciones (3 de 3)',
    text: 'Si dejás presionada una palabra, se abre un selector para ponerle un acorde arriba.',
    example: 'Do (Do mayor)',
  },
  {
    id: 'canciones',
    target: '[data-tour="songs-btn"]',
    title: 'Tus canciones',
    text: 'Acá están tus canciones guardadas.',
  },
  {
    id: 'buscar',
    target: '[data-tour="buscar-btn"]',
    title: 'Buscar canciones',
    text: 'Tocá acá y escribí el nombre de un artista: la app busca sus canciones y te deja importarlas.',
  },
  {
    id: 'leer',
    target: '[data-tour="artist-grid"]',
    title: 'Leer canciones',
    text: 'Acá vas a ver las carpetas de los artistas que fuiste guardando. Tocá una carpeta y elegí la canción que querés leer.',
  },
  {
    id: 'afinador',
    target: '[data-tour="tuner-btn"]',
    title: 'Afinador',
    text: 'Acá está el afinador: escucha por el micrófono y te dice qué tan afinada está cada cuerda.',
  },
  {
    id: 'ritmo',
    target: '[data-tour="drum-btn"]',
    title: 'Caja de ritmos',
    text: 'Acá está la caja de ritmos, para practicar con una base mientras tocás.',
  },
  {
    id: 'extras',
    target: '[data-tour="theme-switch"]',
    title: 'Un par de detalles más',
    text: 'Tenés modo oscuro y claro (tocá acá) y, al leer una canción, podés agrandar o achicar la letra y hacer que se desplace sola.',
  },
];

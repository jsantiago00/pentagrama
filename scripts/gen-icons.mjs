import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });

// Ícono de PentaGrama: nota musical vibrando (un puntito con ondas de
// sonido a los costados), sobre el mismo fondo degradado violeta que
// tenía el ícono anterior. El path viene 1:1 del SVG de 24x24 elegido
// para la marca; wrappeamos en un <g scale=...> para llevarlo al tamaño
// real del ícono sin tener que reescribir las coordenadas a mano.
function pentagramaIconSvg({ size, bgInset = 0, iconScale = 1 }) {
  const bg = bgInset > 0
    ? `<rect x="${bgInset}" y="${bgInset}" width="${size - bgInset * 2}" height="${size - bgInset * 2}" rx="${(size - bgInset * 2) * 0.22}" fill="url(#g)"/>`
    : `<rect width="${size}" height="${size}" fill="url(#g)"/>`;

  const s = size * iconScale;
  const off = (size - s) / 2;
  const zoom = s / 24;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7c6af7"/>
        <stop offset="1" stop-color="#4f3fc4"/>
      </linearGradient>
    </defs>
    ${bg}
    <g transform="translate(${off},${off}) scale(${zoom})" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="2.2"/>
      <path d="M12 3v6.5M9 4.3l1.6 5.3M15 4.3l-1.6 5.3"/>
      <path d="M6 12.5c1.5 3 2 5.5 1 8M18 12.5c-1.5 3-2 5.5-1 8"/>
    </g>
  </svg>`;
}

const targets = [
  { file: 'public/icons/icon-192.png', size: 192, iconScale: 1 },
  { file: 'public/icons/icon-512.png', size: 512, iconScale: 1 },
  { file: 'public/icons/maskable-512.png', size: 512, iconScale: 0.62 },
  { file: 'public/icons/apple-touch-icon.png', size: 180, iconScale: 0.86 },
];

for (const t of targets) {
  const svg = pentagramaIconSvg({ size: t.size, bgInset: 0, iconScale: t.iconScale });
  await sharp(Buffer.from(svg)).png().toFile(t.file);
  console.log('wrote', t.file);
}

// Favicon (SVG liviano, sin fondo redondeado, tal como pide el navegador)
const faviconSvg = pentagramaIconSvg({ size: 64, iconScale: 1 });
await sharp(Buffer.from(faviconSvg)).resize(64, 64).png().toFile('public/icons/favicon.png');
console.log('wrote public/icons/favicon.png');

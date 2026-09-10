import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });

// Ícono: diagrama de acorde estilizado (mástil + trastes + dedos) sobre fondo degradado violeta.
function chordDiagramSvg({ size, bgInset = 0, iconScale = 1 }) {
  const bg = bgInset > 0
    ? `<rect x="${bgInset}" y="${bgInset}" width="${size - bgInset * 2}" height="${size - bgInset * 2}" rx="${(size - bgInset * 2) * 0.22}" fill="url(#g)"/>`
    : `<rect width="${size}" height="${size}" fill="url(#g)"/>`;

  const s = size * iconScale;
  const off = (size - s) / 2;
  const strokeW = s * 0.045;
  const dotR = s * 0.052;
  // Coordenadas del diagrama de acorde en un cuadro s x s
  const left = s * 0.28, right = s * 0.72;
  const top = s * 0.22, bottom = s * 0.78;
  const stringXs = [left, left + (right - left) / 3, left + (right - left) * 2 / 3, right];
  const fretYs = [top, top + (bottom - top) / 3, top + (bottom - top) * 2 / 3, bottom];

  const strings = stringXs.map(x => `<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="white" stroke-width="${strokeW}" stroke-linecap="round"/>`).join('');
  const frets = fretYs.map((y, i) => `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="white" stroke-width="${i === 0 ? strokeW * 1.8 : strokeW}" stroke-linecap="round"/>`).join('');
  const dots = [
    [stringXs[0], (fretYs[0] + fretYs[1]) / 2],
    [stringXs[2], (fretYs[1] + fretYs[2]) / 2],
    [stringXs[3], (fretYs[0] + fretYs[1]) / 2],
  ].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${dotR}" fill="white"/>`).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7c6af7"/>
        <stop offset="1" stop-color="#4f3fc4"/>
      </linearGradient>
    </defs>
    ${bg}
    <g transform="translate(${off},${off})">${strings}${frets}${dots}</g>
  </svg>`;
}

const targets = [
  { file: 'public/icons/icon-192.png', size: 192, iconScale: 1 },
  { file: 'public/icons/icon-512.png', size: 512, iconScale: 1 },
  { file: 'public/icons/maskable-512.png', size: 512, iconScale: 0.62 },
  { file: 'public/icons/apple-touch-icon.png', size: 180, iconScale: 0.86 },
];

for (const t of targets) {
  const svg = chordDiagramSvg({ size: t.size, bgInset: 0, iconScale: t.iconScale });
  await sharp(Buffer.from(svg)).png().toFile(t.file);
  console.log('wrote', t.file);
}

// Favicon (SVG liviano, sin fondo redondeado, tal como pide el navegador)
const faviconSvg = chordDiagramSvg({ size: 64, iconScale: 1 });
await sharp(Buffer.from(faviconSvg)).resize(64, 64).png().toFile('public/icons/favicon.png');
console.log('wrote public/icons/favicon.png');

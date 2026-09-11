// Dibuja un diagrama de digitación (mástil + trastes + dedos) para UNA
// posición de acorde, en el mismo formato que expone chordShapes.js
// (frets/fingers/baseFret/barres, convención de @tombatossals/chords-db).
const STRINGS = 6;
const W = 130, H = 150;
const PAD_X = 18, TOP = 30, FRET_H = 22;

export default function ChordDiagram({ position }) {
  const { frets, fingers, baseFret, barres = [] } = position;
  const rows = Math.max(4, Math.max(0, ...frets.filter(f => f > 0)));
  const stringX = i => PAD_X + (i * (W - PAD_X * 2)) / (STRINGS - 1);
  const fretY = row => TOP + row * FRET_H;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="chord-diagram-svg">
      {/* cejuela (o número de traste si el diagrama no arranca en el 1) */}
      {baseFret === 1 ? (
        <rect x={stringX(0) - 2} y={TOP - 3} width={stringX(STRINGS - 1) - stringX(0) + 4} height={4} rx={1.5} className="cd-nut" />
      ) : (
        <line x1={stringX(0)} y1={TOP} x2={stringX(STRINGS - 1)} y2={TOP} className="cd-fretline" />
      )}
      {baseFret > 1 && (
        <text x={stringX(STRINGS - 1) + 10} y={fretY(1) + 5} className="cd-basefret">{baseFret}fr</text>
      )}

      {/* trastes */}
      {Array.from({ length: rows }).map((_, i) => (
        <line key={i} x1={stringX(0)} y1={fretY(i + 1)} x2={stringX(STRINGS - 1)} y2={fretY(i + 1)} className="cd-fretline" />
      ))}

      {/* cuerdas */}
      {Array.from({ length: STRINGS }).map((_, i) => (
        <line key={i} x1={stringX(i)} y1={TOP} x2={stringX(i)} y2={fretY(rows)} className="cd-string" />
      ))}

      {/* cejillas */}
      {barres.map((row, bi) => {
        let lo = STRINGS - 1, hi = 0;
        frets.forEach((f, i) => { if (f !== -1) { lo = Math.min(lo, i); hi = Math.max(hi, i); } });
        return (
          <rect
            key={bi}
            x={stringX(lo) - 7} y={fretY(row) - FRET_H / 2 - 7}
            width={stringX(hi) - stringX(lo) + 14} height={14}
            rx={7} className="cd-barre"
          />
        );
      })}

      {/* X / O y dedos por cuerda */}
      {frets.map((f, i) => {
        if (f === -1) return <text key={i} x={stringX(i)} y={TOP - 12} textAnchor="middle" className="cd-mute">✕</text>;
        if (f === 0) return <circle key={i} cx={stringX(i)} cy={TOP - 14} r={5} className="cd-open" />;
        const finger = fingers?.[i];
        return (
          <g key={i}>
            <circle cx={stringX(i)} cy={fretY(f) - FRET_H / 2} r={8} className="cd-dot" />
            {!!finger && <text x={stringX(i)} y={fretY(f) - FRET_H / 2 + 4} textAnchor="middle" className="cd-finger">{finger}</text>}
          </g>
        );
      })}
    </svg>
  );
}

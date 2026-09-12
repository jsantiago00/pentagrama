export default function Header({
  title, onTitleChange, saved, theme, onToggleTheme, editMode, onToggleEditMode,
  onOpenDrumMachine, onOpenTuner, onOpenRhymeFinder,
}) {
  return (
    <div className="header">
      <Logo className="logo-icon" />
      <input
        className="song-title-input"
        data-tour="title-input"
        placeholder="Sin título"
        autoComplete="off"
        spellCheck="false"
        value={title}
        onChange={e => onTitleChange(e.target.value)}
      />
      <span className="header-meta">{saved ? '● guardado' : ''}</span>
      <button className="header-icon-btn" data-tour="rhyme-btn" title="Buscador de rimas" onClick={onOpenRhymeFinder}>🔤</button>
      <button className="header-icon-btn" data-tour="tuner-btn" title="Afinador" onClick={onOpenTuner}><MetronomeIcon /></button>
      <button className="header-icon-btn" data-tour="drum-btn" title="Batería" onClick={onOpenDrumMachine}>🥁</button>
      <button
        className={`header-icon-btn${editMode ? ' active' : ''}`}
        title={editMode ? 'Salir de edición' : 'Editar'}
        onClick={onToggleEditMode}
      >{editMode ? '✓' : '✏️'}</button>
      <div className="theme-switch" data-tour="theme-switch" title="Cambiar tema" onClick={onToggleTheme}>
        <span className="knob">{theme === 'light' ? '☀' : '☾'}</span>
      </div>
    </div>
  );
}

function Logo({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 3v6.5M9 4.3l1.6 5.3M15 4.3l-1.6 5.3" />
      <path d="M6 12.5c1.5 3 2 5.5 1 8M18 12.5c-1.5 3-2 5.5-1 8" />
    </svg>
  );
}

function MetronomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 20h8l-2.6-14.5h-2.8z" />
      <path d="M11.5 8.5l3 8" />
      <circle cx="14.2" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
      <path d="M6 20h12" />
    </svg>
  );
}

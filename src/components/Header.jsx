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
      <button className="header-icon-btn" title="Buscador de rimas" onClick={onOpenRhymeFinder}>🔤</button>
      <button className="header-icon-btn" data-tour="tuner-btn" title="Afinador" onClick={onOpenTuner}>🎯</button>
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

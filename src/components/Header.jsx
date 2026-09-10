export default function Header({ title, onTitleChange, saved, theme, onToggleTheme, editMode, onToggleEditMode, onOpenDrumMachine }) {
  return (
    <div className="header">
      <span className="logo-icon">🎸</span>
      <input
        className="song-title-input"
        placeholder="Sin título"
        autoComplete="off"
        spellCheck="false"
        value={title}
        onChange={e => onTitleChange(e.target.value)}
      />
      <span className="header-meta">{saved ? '● guardado' : ''}</span>
      <button className="header-icon-btn" title="Batería" onClick={onOpenDrumMachine}>🥁</button>
      <button
        className={`header-icon-btn${editMode ? ' active' : ''}`}
        title={editMode ? 'Salir de edición' : 'Editar'}
        onClick={onToggleEditMode}
      >{editMode ? '✓' : '✏️'}</button>
      <div className="theme-switch" title="Cambiar tema" onClick={onToggleTheme}>
        <span className="knob">{theme === 'light' ? '☀' : '☾'}</span>
      </div>
    </div>
  );
}

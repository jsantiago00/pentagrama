export default function Header({ title, onTitleChange, saved, theme, onToggleTheme }) {
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
      <div className="theme-switch" title="Cambiar tema" onClick={onToggleTheme}>
        <span className="knob">{theme === 'light' ? '☀' : '☾'}</span>
      </div>
    </div>
  );
}

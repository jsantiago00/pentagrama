export default function Toast({ toast, onUndo }) {
  return (
    <div className={`toast${toast ? ' show' : ''}`}>
      {toast?.msg}
      {toast?.undo && <span className="toast-action" onClick={onUndo}>Deshacer</span>}
    </div>
  );
}

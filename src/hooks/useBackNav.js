import { useEffect, useRef } from 'react';

// Integra los modales con el botón/gesto "atrás" del celu: cada pantalla
// que se abre por encima del editor empuja una entrada al historial, así
// que volver primero navega adentro de la app en vez de cerrar la pestaña.
//
// pushNav(handler): registra "handler" como la función que restaura el
// estado anterior cuando se vuelve un nivel. goBack(n): retrocede n niveles
// de una sola vez (usado para cerrar del todo sin importar cuán adentro se
// esté), ejecutando solo el handler más externo de los que salta, para no
// disparar los pasos intermedios.
export function useBackNav() {
  const stackRef = useRef([]);

  useEffect(() => {
    function onPopState(e) {
      const targetDepth = e.state?.navDepth ?? 0;
      const removed = stackRef.current.splice(targetDepth);
      if (removed.length) removed[0]();
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function pushNav(handler) {
    const depth = stackRef.current.length + 1;
    window.history.pushState({ navDepth: depth }, '');
    stackRef.current.push(handler);
  }

  function goBack(steps = 1) {
    const n = Math.min(steps, stackRef.current.length);
    if (n <= 0) return;
    window.history.go(-n);
  }

  return { pushNav, goBack };
}

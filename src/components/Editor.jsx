import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { isChordLine, isChordToken, transposeToken } from '../lib/chords';
import { escHtml } from '../lib/utils';
import { insertChordAbove, wordStartColumn } from '../lib/chordInsert';
import ChordPicker from './ChordPicker';

const LONG_PRESS_MS = 480;
const LONG_PRESS_MOVE_TOLERANCE = 10;

function buildHTML(text, st) {
  if (!text) return '';
  const lines = text.split('\n').map(line => {
    if (!isChordLine(line)) return escHtml(line);
    return line.replace(/(\S+)/g, token => {
      if (isChordToken(token)) {
        const tr = transposeToken(token, st);
        return `<span class="chord">${escHtml(tr)}</span>`;
      }
      return escHtml(token);
    });
  });
  let html = lines.join('<br>');
  if (text.endsWith('\n')) {
    // Un solo <br> al final no alcanza: Chrome lo trata como el cierre de
    // la línea anterior y no como una línea nueva donde se pueda escribir.
    // Un segundo <br> "colchón" (que no cuenta como contenido real, ver
    // extractPlainText) hace que la línea vacía quede realmente editable.
    html += '<br data-pad="1">';
  }
  return html;
}

function extractPlainText(root) {
  let text = '';
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeName === 'BR') {
      if (!node.hasAttribute('data-pad')) text += '\n';
    } else if (node.nodeName === 'DIV' || node.nodeName === 'P') {
      if (text && !text.endsWith('\n')) text += '\n';
      node.childNodes.forEach(walk);
      if (!text.endsWith('\n')) text += '\n';
    } else {
      node.childNodes.forEach(walk);
    }
  }
  root.childNodes.forEach(walk);
  return text;
}

// Traduce una coordenada de pantalla (x,y) a (línea, columna) dentro del
// texto, reusando la misma lógica de extractPlainText para que cuente los
// caracteres exactamente igual que el resto del editor.
function getLineColumnAtPoint(root, x, y) {
  let startNode, startOffset;
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    if (!pos) return null;
    startNode = pos.offsetNode;
    startOffset = pos.offset;
  } else if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    if (!r) return null;
    startNode = r.startContainer;
    startOffset = r.startOffset;
  } else {
    return null;
  }
  if (!root.contains(startNode)) return null;

  const pre = document.createRange();
  pre.selectNodeContents(root);
  pre.setEnd(startNode, startOffset);
  const textBefore = extractPlainText(pre.cloneContents());
  const lastNL = textBefore.lastIndexOf('\n');
  return {
    line: textBefore.split('\n').length - 1,
    column: textBefore.length - lastNL - 1,
  };
}

function placeCaret(root, range) {
  try {
    root.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (e) { /* ignore */ }
}

function restoreCursor(root, offset) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node;
  while ((node = walker.nextNode())) {
    if (remaining <= node.length) {
      // ¿Queda más texto después de este nodo en todo el editor? El texto
      // puede estar anidado dentro de un <span class="chord">, así que hay
      // que preguntarle al walker (recorre todo el árbol), no mirar
      // node.nextSibling que solo ve hermanos dentro del mismo padre.
      const isLastTextNode = walker.nextNode() === null;
      const r = document.createRange();
      const padBr = root.lastChild?.nodeName === 'BR' && root.lastChild.hasAttribute('data-pad')
        ? root.lastChild : null;
      if (remaining === node.length && isLastTextNode && padBr) {
        // El editor termina en la línea vacía recién creada con Enter (con
        // su <br> "colchón" al final): el navegador solo reconoce esa línea
        // como editable si el cursor queda ANTES del colchón, no después.
        r.setStart(root, root.childNodes.length - 1);
      } else if (remaining === node.length && isLastTextNode) {
        // Último nodo de texto de todo el editor: le damos un nodo vacío
        // real después para que el próximo caracter tenga dónde anclarse.
        const anchor = document.createTextNode('');
        node.after(anchor);
        r.setStart(anchor, 0);
      } else {
        r.setStart(node, remaining);
      }
      r.collapse(true);
      placeCaret(root, r);
      return;
    }
    remaining -= node.length;
  }
  // No quedó texto suficiente para el offset pedido (p.ej. el editor
  // termina en un <br> sin nada después): dejamos el cursor al final.
  const r = document.createRange();
  r.selectNodeContents(root);
  r.collapse(false);
  placeCaret(root, r);
}

const Editor = forwardRef(function Editor({ rawText, semitones, onChange, wrapRef, onInteraction, editable }, ref) {
  const editorRef = useRef(null);
  const inputTimer = useRef(null);
  const longPressTimer = useRef(null);
  const longPressStart = useRef(null);
  const [chordPrompt, setChordPrompt] = useState(null); // { line, column, x, y }

  useImperativeHandle(ref, () => ({
    // Activa contentEditable y enfoca en el mismo tick del click para que
    // el navegador lo reconozca como gesto del usuario y abra el teclado
    // (si se hiciera vía estado de React, llegaría un render tarde).
    enterEditSync() {
      const el = editorRef.current;
      if (!el) return;
      el.contentEditable = 'true';
      el.focus();
    },
    blur() {
      editorRef.current?.blur();
    },
  }));

  function render() {
    const editor = editorRef.current;
    if (!editor) return;
    let cursorOffset = 0;
    if (document.activeElement === editor) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        try {
          const range = sel.getRangeAt(0);
          const pre = range.cloneRange();
          pre.selectNodeContents(editor);
          pre.setEnd(range.endContainer, range.endOffset);
          cursorOffset = pre.toString().length;
        } catch (e) { /* ignore */ }
      }
    }
    editor.innerHTML = buildHTML(rawText, semitones) || '';
    editor.classList.toggle('empty', !rawText);
    if (document.activeElement === editor) restoreCursor(editor, cursorOffset);
  }

  useEffect(() => {
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawText, semitones, editable]);

  function flush() {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(extractPlainText(editor));
  }

  function handleInput() {
    clearTimeout(inputTimer.current);
    inputTimer.current = setTimeout(flush, 120);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const br = document.createElement('br');
      range.insertNode(br);
      range.setStartAfter(br);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      flush();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const sel = window.getSelection();
    if (sel.rangeCount) {
      sel.getRangeAt(0).deleteContents();
      const node = document.createTextNode(text);
      sel.getRangeAt(0).insertNode(node);
      sel.getRangeAt(0).setStartAfter(node);
      sel.getRangeAt(0).collapse(true);
    }
    flush();
  }

  // ── Mantener presionado sobre una palabra → selector de acordes ──
  function cancelLongPress() {
    clearTimeout(longPressTimer.current);
    longPressStart.current = null;
  }

  function startLongPress(x, y) {
    if (!editable) return;
    longPressStart.current = { x, y };
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressStart.current = null;
      const editor = editorRef.current;
      if (!editor) return;
      const pos = getLineColumnAtPoint(editor, x, y);
      if (!pos) return;
      const line = rawText.split('\n')[pos.line] || '';
      const column = wordStartColumn(line, pos.column);
      setChordPrompt({ line: pos.line, column, x, y });
    }, LONG_PRESS_MS);
  }

  function moveLongPress(x, y) {
    if (!longPressStart.current) return;
    const dx = Math.abs(x - longPressStart.current.x);
    const dy = Math.abs(y - longPressStart.current.y);
    if (dx > LONG_PRESS_MOVE_TOLERANCE || dy > LONG_PRESS_MOVE_TOLERANCE) cancelLongPress();
  }

  function handleChordPick(chordStr) {
    if (!chordPrompt) return;
    onChange(insertChordAbove(rawText, chordPrompt.line, chordPrompt.column, chordStr));
    setChordPrompt(null);
  }

  return (
    <div className="editor-wrap" ref={wrapRef} onTouchStart={onInteraction} onWheel={onInteraction}>
      <div
        id="editor"
        ref={editorRef}
        className={editable ? undefined : 'readonly'}
        contentEditable={editable}
        spellCheck="false"
        data-placeholder="Pegá la letra con acordes..."
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onTouchStart={e => startLongPress(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={e => moveLongPress(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={cancelLongPress}
        onTouchCancel={cancelLongPress}
        onMouseDown={e => startLongPress(e.clientX, e.clientY)}
        onMouseMove={e => moveLongPress(e.clientX, e.clientY)}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onContextMenu={e => { if (chordPrompt || longPressStart.current) e.preventDefault(); }}
      />
      {chordPrompt && (
        <ChordPicker
          x={chordPrompt.x}
          y={chordPrompt.y}
          onPick={handleChordPick}
          onCancel={() => setChordPrompt(null)}
        />
      )}
    </div>
  );
});

export default Editor;

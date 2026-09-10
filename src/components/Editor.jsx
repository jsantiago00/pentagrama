import { useEffect, useRef } from 'react';
import { isChordLine, isChordToken, transposeToken } from '../lib/chords';
import { escHtml } from '../lib/utils';

function buildHTML(text, st) {
  if (!text) return '';
  return text.split('\n').map(line => {
    if (!isChordLine(line)) return escHtml(line);
    return line.replace(/(\S+)/g, token => {
      if (isChordToken(token)) {
        const tr = transposeToken(token, st);
        return `<span class="chord">${escHtml(tr)}</span>`;
      }
      return escHtml(token);
    });
  }).join('\n');
}

function extractPlainText(root) {
  let text = '';
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeName === 'BR') {
      text += '\n';
    } else if (node.nodeName === 'DIV' || node.nodeName === 'P') {
      if (text && !text.endsWith('\n')) text += '\n';
      node.childNodes.forEach(walk);
      if (!text.endsWith('\n')) text += '\n';
    } else {
      node.childNodes.forEach(walk);
    }
  }
  root.childNodes.forEach(walk);
  return text.replace(/\n$/, '');
}

function restoreCursor(root, offset) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node;
  while ((node = walker.nextNode())) {
    if (remaining <= node.length) {
      try {
        const r = document.createRange();
        r.setStart(node, remaining);
        r.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      } catch (e) { /* ignore */ }
      return;
    }
    remaining -= node.length;
  }
}

export default function Editor({ rawText, semitones, onChange, wrapRef, onInteraction }) {
  const editorRef = useRef(null);
  const inputTimer = useRef(null);

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
  }, [rawText, semitones]);

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
      const textNode = document.createTextNode('\n');
      range.insertNode(textNode);
      range.setStartAfter(textNode);
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

  return (
    <div className="editor-wrap" ref={wrapRef} onTouchStart={onInteraction} onWheel={onInteraction}>
      <div
        id="editor"
        ref={editorRef}
        className="empty"
        contentEditable="true"
        spellCheck="false"
        data-placeholder="Pegá la letra con acordes..."
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
    </div>
  );
}

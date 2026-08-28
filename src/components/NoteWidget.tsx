// One dock note: same `.now-card` chrome as Top 10 / Reddit, not a yellow
// sticky. Title plus mixed text / bullet / checklist lines.
// The body is one contenteditable (not per-line inputs) so a selection can
// span lines. Type changes via markdown prefixes or a floating icon bubble
// that appears above the caret after a short idle. The in-line checkbox
// only marks a to-do done; the bubble’s check icon changes the line kind.
// Native undo is useless here: we rebuild row chrome from React state, so
// Ctrl/Cmd+Z is a custom stack.
import { useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { useOverlayScroll } from '@/src/lib/overlayScroll';
import {
  applyLinePrefix,
  createNoteBlock,
  takeNoteFocus,
} from '@/src/lib/notes';
import type { Note, NoteBlock, NoteBlockKind } from '@/src/types';

// Delay before the type bubble shows. Most typing never needs it, so it
// stays hidden until the caret has been idle. Moving the caret restarts
// the wait instead of chasing the mouse or sitting on every focused line.
const TYPE_MENU_DELAY = 800;
const TYPE_MENU_H = 36;
const TYPE_MENU_W = 94;

type Props = {
  note: Note;
  onChange: (note: Note) => void;
  onDelete: () => void;
};

export function NoteWidget({ note, onChange, onDelete }: Props) {
  const titleRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const noteRef = useRef(note);
  noteRef.current = note;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const fromSelf = useRef(false);
  // Skip a full DOM rebuild when only text changed. Replacing rows would
  // dump the caret (and wipe the browser undo buffer).
  const paintedKey = useRef('');
  // Custom undo: each snap is blocks + caret. Native history cannot survive
  // replaceChildren / row chrome updates.
  const undoStack = useRef<HistorySnap[]>([]);
  const redoStack = useRef<HistorySnap[]>([]);
  const typing = useRef(false);
  const typingTimer = useRef(0);
  const skipHistory = useRef(false);
  // Ctrl+Z both calls our handler and then fires historyUndo; this flag
  // makes beforeinput skip the second undo.
  const nativeHistory = useRef(false);
  // After `[]` / `- ` converts the line kind, put the caret in `.note-text`
  // at 0. Otherwise it lands in the new checkbox / bullet.
  const pendingCaret = useRef<{ id: string; offset: number } | null>(null);
  const menuTimer = useRef(0);
  // Pointer is on the bubble: keep it up while reaching for an icon.
  const overMenu = useRef(false);
  // Kind changes rebuild the row and fire selectionchange; ignore that
  // so the bubble does not hide itself after a click.
  const ignoreCaret = useRef(false);
  const { scrolling, onScroll } = useOverlayScroll();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuBelow, setMenuBelow] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const activeId = menuId;

  const hideTypeMenu = () => {
    window.clearTimeout(menuTimer.current);
    menuTimer.current = 0;
    setMenuId(null);
  };

  const scheduleTypeMenu = () => {
    if (overMenu.current || ignoreCaret.current) return;
    window.clearTimeout(menuTimer.current);
    // Hide immediately on caret move so the bubble is not glued to an
    // old line while the user is still navigating or typing.
    setMenuId(null);
    const editor = editorRef.current;
    if (!editor || document.activeElement !== editor) return;
    if (!caretRow(editor)) return;
    menuTimer.current = window.setTimeout(() => {
      if (overMenu.current) return;
      const row = caretRow(editorRef.current);
      const id = row?.dataset.id;
      if (id && document.activeElement === editorRef.current) setMenuId(id);
    }, TYPE_MENU_DELAY);
  };

  useEffect(() => {
    // One-shot after "+ Note": focus the title, then clear so storage
    // echoes do not steal focus back.
    if (!takeNoteFocus(note.id)) return;
    titleRef.current?.focus();
  }, [note.id]);

  useEffect(() => () => window.clearTimeout(menuTimer.current), []);

  // Caret moves (arrows, click, Enter) all show up as selectionchange.
  // The bubble tracks that, not hover, so it sits on the text cursor.
  useEffect(() => {
    const onSel = () => scheduleTypeMenu();
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const key = chromeKey(note.blocks);
    if (fromSelf.current) {
      // We emitted this change from the editor. Sync bullets/checkboxes
      // without a full paint so typing does not jump the caret.
      fromSelf.current = false;
      paintedKey.current = `${note.id}:${key}`;
      syncRowChrome(editor, note.blocks, (id) => toggleDone(id));
      markEmpty(editor, note.blocks);
      const pending = pendingCaret.current;
      if (pending) {
        pendingCaret.current = null;
        restoreCaret(editor, pending);
      } else {
        snapCollapsedCaret(editor);
      }
      return;
    }
    if (paintedKey.current === `${note.id}:${key}`) return;
    paintedKey.current = `${note.id}:${key}`;
    const caret = pendingCaret.current ?? captureCaret(editor);
    pendingCaret.current = null;
    paintEditor(editor, note.blocks, (id) => toggleDone(id));
    markEmpty(editor, note.blocks);
    if (caret) restoreCaret(editor, caret);
    else snapCollapsedCaret(editor);
  }, [note]);

  useLayoutEffect(() => {
    if (!activeId) {
      setMenuPos(null);
      return;
    }
    const editor = editorRef.current;
    const card = cardRef.current;
    if (!editor || !card) {
      setMenuPos(null);
      return;
    }
    const place = () => {
      // Anchor to the caret, not the left of the row, so a mid-line
      // cursor still has the bubble above it.
      const caret = caretClientRect(editor);
      if (!caret) {
        setMenuPos(null);
        return;
      }
      const cardRect = card.getBoundingClientRect();
      let top = caret.top - TYPE_MENU_H - 6;
      let below = false;
      // Flip under the caret when there is no room above (title / card edge).
      if (top < cardRect.top + 4) {
        top = caret.bottom + 6;
        below = true;
      }
      const mid = caret.left + caret.width / 2;
      const left = Math.min(
        Math.max(mid - TYPE_MENU_W / 2, cardRect.left + 4),
        Math.max(cardRect.left + 4, cardRect.right - TYPE_MENU_W - 4),
      );
      setMenuBelow(below);
      setMenuPos({ top, left });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [activeId, note.blocks]);

  const emit = (blocks: NoteBlock[]) => {
    const next = blocks.length > 0 ? blocks : [createNoteBlock('text')];
    fromSelf.current = true;
    noteRef.current = { ...noteRef.current, blocks: next };
    onChangeRef.current(noteRef.current);
  };

  const pushHistory = () => {
    if (skipHistory.current) return;
    typing.current = false;
    window.clearTimeout(typingTimer.current);
    undoStack.current.push({
      blocks: noteRef.current.blocks.map((block) => ({ ...block })),
      caret: editorRef.current ? captureCaret(editorRef.current) : null,
    });
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  };

  const beginTypingHistory = () => {
    // Coalesce a burst of keystrokes into one undo step.
    if (skipHistory.current || typing.current) return;
    typing.current = true;
    undoStack.current.push({
      blocks: noteRef.current.blocks.map((block) => ({ ...block })),
      caret: editorRef.current ? captureCaret(editorRef.current) : null,
    });
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  };

  const applyHistory = (snap: HistorySnap) => {
    skipHistory.current = true;
    paintedKey.current = '';
    fromSelf.current = false;
    onChangeRef.current({ ...noteRef.current, blocks: snap.blocks.map((block) => ({ ...block })) });
    requestAnimationFrame(() => {
      skipHistory.current = false;
      const editor = editorRef.current;
      if (editor && snap.caret) restoreCaret(editor, snap.caret);
    });
  };

  const undo = () => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({
      blocks: noteRef.current.blocks.map((block) => ({ ...block })),
      caret: editorRef.current ? captureCaret(editorRef.current) : null,
    });
    applyHistory(prev);
  };

  const redo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({
      blocks: noteRef.current.blocks.map((block) => ({ ...block })),
      caret: editorRef.current ? captureCaret(editorRef.current) : null,
    });
    applyHistory(next);
  };

  const commit = (blocks: NoteBlock[], caretId: string, caretOff: number) => {
    paintedKey.current = '';
    emit(blocks);
    requestAnimationFrame(() => {
      const editor = editorRef.current;
      const fresh = editor?.querySelector<HTMLElement>(
        `.note-row[data-id="${cssEscape(caretId)}"]`,
      );
      if (fresh) placeCaret(fresh, caretOff);
      // Enter at the last visible line grows the body past 220px; the
      // browser will not scroll .note-body for us, so do it after layout.
      if (editor) scrollCaretIntoBody(editor);
    });
  };

  const toggleDone = (id: string) => {
    pushHistory();
    const next = noteRef.current.blocks.map((block) =>
      block.id === id && block.kind === 'check' ? { ...block, done: !block.done } : block,
    );
    emit(next);
  };

  const setKind = (id: string, kind: NoteBlockKind) => {
    const current = noteRef.current.blocks.find((block) => block.id === id);
    if (!current || current.kind === kind) return;
    pushHistory();
    ignoreCaret.current = true;
    const next: NoteBlock = { id: current.id, kind, text: current.text };
    if (kind === 'check') next.done = false;
    paintedKey.current = '';
    onChangeRef.current({
      ...noteRef.current,
      blocks: noteRef.current.blocks.map((block) => (block.id === id ? next : block)),
    });
    requestAnimationFrame(() => {
      ignoreCaret.current = false;
    });
  };

  const syncFromDom = () => {
    const editor = editorRef.current;
    if (!editor) return;
    beginTypingHistory();
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      typing.current = false;
    }, 400);
    const prev = noteRef.current.blocks;
    const blocks = readBlocks(editor).map((block) => applyLinePrefix(block, block.text));
    const converted = blocks.find((block, index) => {
      const before = prev[index];
      return Boolean(before && before.id === block.id && before.kind !== block.kind);
    });
    if (converted) pendingCaret.current = { id: converted.id, offset: 0 };
    // Kind / done changed: allow the layout effect to rebuild that row.
    if (chromeKey(blocks) !== chromeKey(prev)) {
      paintedKey.current = '';
    }
    emit(blocks);
    markEmpty(editor, blocks);
  };

  const rangeCut = (blocks: NoteBlock[]) => {
    const editor = editorRef.current;
    if (!editor) return null;
    const span = selectionSpan(editor);
    if (!span || span.collapsed) return null;
    const start = blocks.findIndex((block) => block.id === span.startRow.dataset.id);
    const end = blocks.findIndex((block) => block.id === span.endRow.dataset.id);
    if (start < 0 || end < 0) return null;
    return deleteBlockRange(blocks, start, span.startOff, end, span.endOff);
  };

  const onEditorKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      nativeHistory.current = true;
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      nativeHistory.current = true;
      redo();
      return;
    }

    const editor = editorRef.current;
    if (!editor) return;

    // Native Enter would split the contenteditable without our row model.
    if (event.key === 'Enter') {
      event.preventDefault();
      let blocks = readBlocks(editor);
      const cut = rangeCut(blocks);
      let index: number;
      let offset: number;
      if (cut) {
        blocks = cut.blocks;
        index = blocks.findIndex((block) => block.id === cut.caretId);
        offset = cut.caretOff;
      } else {
        const row = caretRow(editor);
        if (!row) return;
        index = blocks.findIndex((block) => block.id === row.dataset.id);
        offset = caretOffsetInRow(row);
      }
      const block = blocks[index];
      if (!block) return;
      // Empty list/check + Enter drops back to a plain text line (escape the list).
      if (!cut && (block.kind === 'bullet' || block.kind === 'check') && block.text === '') {
        setKind(block.id, 'text');
        return;
      }
      pushHistory();
      const before = block.text.slice(0, offset);
      const after = block.text.slice(offset);
      const inserted = createNoteBlock(block.kind, after);
      const next = blocks.slice();
      next[index] = { ...block, text: before };
      next.splice(index + 1, 0, inserted);
      commit(next, inserted.id, 0);
      return;
    }

    if (event.key !== 'Backspace' && event.key !== 'Delete') return;
    const spanned = selectionSpan(editor);
    if (spanned && !spanned.collapsed) return;

    if (event.key !== 'Backspace') return;
    const row = caretRow(editor);
    // At the start of a row, join with the previous line instead of deleting
    // the bullet/checkbox chrome as if it were text.
    if (!row || caretOffsetInRow(row) !== 0) return;
    const blocks = readBlocks(editor);
    const index = blocks.findIndex((block) => block.id === row.dataset.id);
    if (index <= 0 || blocks.length < 2) return;
    event.preventDefault();
    pushHistory();
    const prev = blocks[index - 1]!;
    const current = blocks[index]!;
    const joinAt = prev.text.length;
    const merged = { ...prev, text: prev.text + current.text };
    const next = blocks.filter((_, i) => i !== index);
    next[index - 1] = merged;
    commit(next, merged.id, joinAt);
  };

  const onEditorBeforeInput = (event: FormEvent<HTMLDivElement>) => {
    const input = event.nativeEvent as InputEvent;
    // Browser undo after our Ctrl+Z, or Edit menu undo. Always run our stack.
    if (input.inputType === 'historyUndo') {
      event.preventDefault();
      if (nativeHistory.current) {
        nativeHistory.current = false;
        return;
      }
      undo();
      return;
    }
    if (input.inputType === 'historyRedo') {
      event.preventDefault();
      if (nativeHistory.current) {
        nativeHistory.current = false;
        return;
      }
      redo();
      return;
    }
    const editor = editorRef.current;
    if (!editor) return;
    const span = selectionSpan(editor);
    if (!span || span.collapsed) return;
    // Cross-line select + type/delete: native edit would leave orphan rows.
    if (input.inputType !== 'insertText' && !input.inputType.startsWith('delete')) return;
    event.preventDefault();
    pushHistory();
    let blocks = readBlocks(editor);
    const cut = rangeCut(blocks);
    if (!cut) return;
    blocks = cut.blocks;
    if (input.inputType === 'insertText' && input.data) {
      const index = blocks.findIndex((block) => block.id === cut.caretId);
      const block = blocks[index];
      if (!block) return;
      const text = block.text.slice(0, cut.caretOff) + input.data + block.text.slice(cut.caretOff);
      const next = blocks.slice();
      next[index] = applyLinePrefix(block, text);
      commit(next, next[index]!.id, cut.caretOff + input.data.length);
      return;
    }
    commit(blocks, cut.caretId, cut.caretOff);
  };

  const onEditorPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    // Plain text only, one block per pasted line, same kind as the target row.
    event.preventDefault();
    const pasted = event.clipboardData.getData('text/plain');
    if (!pasted) return;
    const editor = editorRef.current;
    if (!editor) return;
    pushHistory();
    let blocks = readBlocks(editor);
    const cut = rangeCut(blocks);
    let index: number;
    let offset: number;
    if (cut) {
      blocks = cut.blocks;
      index = blocks.findIndex((block) => block.id === cut.caretId);
      offset = cut.caretOff;
    } else {
      const row = caretRow(editor);
      index = row ? blocks.findIndex((block) => block.id === row.dataset.id) : 0;
      offset = row ? caretOffsetInRow(row) : 0;
    }
    const block = blocks[index] ?? blocks[0];
    if (!block) return;
    const lines = pasted.replace(/\r\n/g, '\n').split('\n');
    const first = lines[0] ?? '';
    const last = lines[lines.length - 1] ?? '';
    if (lines.length === 1) {
      const text = block.text.slice(0, offset) + first + block.text.slice(offset);
      const next = blocks.slice();
      next[index] = applyLinePrefix(block, text);
      commit(next, next[index]!.id, offset + first.length);
      return;
    }
    const head = applyLinePrefix(block, block.text.slice(0, offset) + first);
    const tailText = last + block.text.slice(offset);
    const middle = lines.slice(1, -1).map((line) => createNoteBlock(block.kind, line));
    const tail = createNoteBlock(block.kind, tailText);
    const next = [...blocks.slice(0, index), head, ...middle, tail, ...blocks.slice(index + 1)];
    commit(next, tail.id, last.length);
  };

  return (
    <section ref={cardRef} className="now-card widget-card note-card">
      <div className="note-head">
        <input
          ref={titleRef}
          className="note-title widget-no-drag"
          value={note.title}
          placeholder="Title"
          aria-label="Note title"
          onChange={(event) => onChange({ ...note, title: event.target.value })}
        />
        <button
          type="button"
          className="note-delete widget-no-drag"
          aria-label="Delete note"
          onClick={onDelete}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div
        className={`note-body od-scroll widget-no-drag${scrolling ? ' is-scrolling' : ''}`}
        onScroll={onScroll}
      >
        <div
          ref={editorRef}
          className="note-editor"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Note"
          onInput={syncFromDom}
          onBeforeInput={onEditorBeforeInput}
          onKeyDown={onEditorKey}
          onPaste={onEditorPaste}
          onFocus={scheduleTypeMenu}
          onBlur={() => {
            // Clicks on the bubble preventDefault pointerdown so focus
            // stays here. A real blur (title, another card) hides it.
            if (overMenu.current) return;
            hideTypeMenu();
          }}
        />
      </div>
      {activeId && menuPos ? (
        <TypeMenu
          kind={note.blocks.find((block) => block.id === activeId)?.kind ?? 'text'}
          below={menuBelow}
          top={menuPos.top}
          left={menuPos.left}
          onKind={(kind) => setKind(activeId, kind)}
          onEnter={() => {
            overMenu.current = true;
            window.clearTimeout(menuTimer.current);
          }}
          onLeave={(event) => {
            overMenu.current = false;
            // Leaving back into the editor keeps the bubble; leaving the
            // card dismisses it until the caret idles again.
            const related = event.relatedTarget as HTMLElement | null;
            if (related?.closest('.note-editor')) return;
            hideTypeMenu();
          }}
        />
      ) : null}
    </section>
  );
}

function TypeMenu({
  kind,
  below,
  top,
  left,
  onKind,
  onEnter,
  onLeave,
}: {
  kind: NoteBlockKind;
  below: boolean;
  top: number;
  left: number;
  onKind: (kind: NoteBlockKind) => void;
  onEnter: () => void;
  onLeave: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`note-type-menu widget-no-drag${below ? ' is-below' : ''}`}
      style={{ top, left }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      // Keep the editor focused so the caret (and bubble target) stay put.
      onPointerDown={(event) => event.preventDefault()}
    >
      <button
        type="button"
        className={kind === 'text' ? 'is-on' : ''}
        aria-label="Text"
        aria-pressed={kind === 'text'}
        onClick={() => onKind('text')}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 6h14M12 6v12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        className={kind === 'bullet' ? 'is-on' : ''}
        aria-label="Bullets"
        aria-pressed={kind === 'bullet'}
        onClick={() => onKind('bullet')}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M9 7h10M9 12h10M9 17h10"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle cx="5" cy="7" r="1.2" fill="currentColor" />
          <circle cx="5" cy="12" r="1.2" fill="currentColor" />
          <circle cx="5" cy="17" r="1.2" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        className={kind === 'check' ? 'is-on' : ''}
        aria-label="Checklist"
        aria-pressed={kind === 'check'}
        onClick={() => onKind('check')}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="4.5" y="4.5" width="15" height="15" rx="3" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M8 12.5l2.4 2.4L16.5 9"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

type HistorySnap = {
  blocks: NoteBlock[];
  caret: { id: string; offset: number } | null;
};

function chromeKey(blocks: NoteBlock[]): string {
  // Id + kind + done only. Text is owned by the contenteditable; including
  // it here would rebuild chrome on every keystroke.
  return blocks.map((block) => `${block.id}:${block.kind}:${block.done ? 1 : 0}`).join('|');
}

function deleteBlockRange(
  blocks: NoteBlock[],
  startIndex: number,
  startOff: number,
  endIndex: number,
  endOff: number,
): { blocks: NoteBlock[]; caretId: string; caretOff: number } {
  let from = startIndex;
  let fromOff = startOff;
  let to = endIndex;
  let toOff = endOff;
  if (from > to || (from === to && fromOff > toOff)) {
    from = endIndex;
    fromOff = endOff;
    to = startIndex;
    toOff = startOff;
  }
  if (from === to) {
    const block = blocks[from]!;
    const next = blocks.slice();
    next[from] = { ...block, text: block.text.slice(0, fromOff) + block.text.slice(toOff) };
    return { blocks: next, caretId: block.id, caretOff: fromOff };
  }
  const start = blocks[from]!;
  const end = blocks[to]!;
  const merged = { ...start, text: start.text.slice(0, fromOff) + end.text.slice(toOff) };
  const next = [...blocks.slice(0, from), merged, ...blocks.slice(to + 1)];
  return {
    blocks: next.length > 0 ? next : [createNoteBlock('text')],
    caretId: merged.id,
    caretOff: fromOff,
  };
}

function closestRow(node: Node, editor: HTMLElement): HTMLElement | null {
  const el = node instanceof Element ? node : node.parentElement;
  const row = el?.closest('.note-row');
  if (row instanceof HTMLElement && editor.contains(row)) return row;
  return null;
}

function offsetAt(row: HTMLElement, container: Node, offset: number): number {
  const textEl = row.querySelector('.note-text') ?? row;
  const pre = document.createRange();
  try {
    pre.selectNodeContents(textEl);
    pre.setEnd(container, offset);
  } catch {
    return 0;
  }
  return pre.toString().length;
}

function selectionSpan(editor: HTMLElement): {
  collapsed: boolean;
  startRow: HTMLElement;
  endRow: HTMLElement;
  startOff: number;
  endOff: number;
} | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return null;
  const startRow = closestRow(range.startContainer, editor);
  const endRow = closestRow(range.endContainer, editor);
  if (!startRow || !endRow) return null;
  return {
    collapsed: range.collapsed,
    startRow,
    endRow,
    startOff: offsetAt(startRow, range.startContainer, range.startOffset),
    endOff: offsetAt(endRow, range.endContainer, range.endOffset),
  };
}

function cssEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function markEmpty(editor: HTMLElement, blocks: NoteBlock[]) {
  const empty = blocks.length === 1 && blocks[0]?.kind === 'text' && blocks[0].text === '';
  editor.classList.toggle('is-empty', empty);
}

function paintEditor(editor: HTMLElement, blocks: NoteBlock[], onToggle: (id: string) => void) {
  editor.replaceChildren(...blocks.map((block) => buildRow(block, onToggle)));
}

function syncRowChrome(editor: HTMLElement, blocks: NoteBlock[], onToggle: (id: string) => void) {
  const rows = [...editor.querySelectorAll<HTMLElement>(':scope > .note-row')];
  if (rows.length !== blocks.length) {
    paintEditor(editor, blocks, onToggle);
    return;
  }
  blocks.forEach((block, index) => {
    const row = rows[index];
    if (!row) return;
    // Text rows never get data-done. Treat missing as '' so we do not
    // replace every text row (that jumped the caret while typing).
    const done = block.kind === 'check' && block.done ? '1' : '';
    if (row.dataset.id !== block.id || row.dataset.kind !== block.kind || (row.dataset.done ?? '') !== done) {
      row.replaceWith(buildRow(block, onToggle));
    } else {
      row.classList.toggle('is-done', Boolean(block.kind === 'check' && block.done));
    }
  });
}

function buildRow(block: NoteBlock, onToggle: (id: string) => void): HTMLDivElement {
  const row = document.createElement('div');
  row.className = `note-row${block.kind === 'check' && block.done ? ' is-done' : ''}`;
  row.dataset.id = block.id;
  row.dataset.kind = block.kind;
  if (block.kind === 'check' && block.done) row.dataset.done = '1';

  if (block.kind === 'bullet') {
    const mark = document.createElement('span');
    mark.className = 'note-bullet';
    mark.contentEditable = 'false';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '•';
    row.append(mark);
  }

  if (block.kind === 'check') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `note-check${block.done ? ' is-on' : ''}`;
    btn.contentEditable = 'false';
    btn.tabIndex = -1;
    btn.setAttribute('role', 'checkbox');
    btn.setAttribute('aria-checked', block.done ? 'true' : 'false');
    btn.setAttribute('aria-label', block.done ? 'Mark not done' : 'Mark done');
    // Keep the text caret; a real mousedown would move focus into the button.
    btn.addEventListener('pointerdown', (event) => event.preventDefault());
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onToggle(block.id);
    });
    if (block.done) btn.append(checkGlyph());
    row.append(btn);
  }

  const text = document.createElement('span');
  text.className = 'note-text';
  if (block.text) text.textContent = block.text;
  // Empty contenteditable spans collapse; a <br> keeps the line height and caret.
  else text.append(document.createElement('br'));
  row.append(text);
  return row;
}

function checkGlyph(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M3.5 8.5l3 3 6-6');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}

function readBlocks(editor: HTMLElement): NoteBlock[] {
  const rows = [...editor.querySelectorAll<HTMLElement>(':scope > .note-row')];
  if (rows.length === 0) {
    // Browser sometimes flattens our rows; recover as plain text lines.
    const lines = (editor.innerText || '').replace(/\r/g, '').split('\n');
    const parts = lines.length > 0 ? lines : [''];
    return parts.map((line) => createNoteBlock('text', line));
  }
  return rows.map((row) => {
    const kind = (row.dataset.kind as NoteBlockKind | undefined) ?? 'text';
    const textEl = row.querySelector('.note-text');
    const fromText = textEl instanceof HTMLElement ? textEl.innerText : '';
    // One block per row; strip accidental newlines from innerText.
    const text = (fromText || row.innerText || '').replace(/\n/g, '');
    const block: NoteBlock = {
      id: row.dataset.id || crypto.randomUUID(),
      kind: kind === 'bullet' || kind === 'check' ? kind : 'text',
      text,
    };
    if (block.kind === 'check') block.done = row.dataset.done === '1';
    return block;
  });
}

function caretRow(editor: HTMLElement | null): HTMLElement | null {
  if (!editor) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const node = sel.focusNode;
  if (!node || !editor.contains(node)) return null;
  const el = node instanceof Element ? node : node.parentElement;
  const row = el?.closest('.note-row');
  return row instanceof HTMLElement ? row : null;
}

// Collapsed caret rect. focusNode (not anchor) is the blinking cursor
// when a range is selected. Empty client rects fall back to the row.
function caretClientRect(editor: HTMLElement): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.focusNode) return null;
  if (!editor.contains(sel.focusNode)) return null;
  const range = document.createRange();
  try {
    range.setStart(sel.focusNode, sel.focusOffset);
    range.collapse(true);
  } catch {
    return caretRow(editor)?.getBoundingClientRect() ?? null;
  }
  const rects = range.getClientRects();
  const rect = rects[rects.length - 1] ?? range.getBoundingClientRect();
  if (rect.height > 0 || rect.width > 0) return rect;
  const row = caretRow(editor);
  const text = row?.querySelector('.note-text') ?? row;
  return text?.getBoundingClientRect() ?? null;
}

function caretOffsetInRow(row: HTMLElement): number {
  const sel = window.getSelection();
  const textEl = row.querySelector('.note-text') ?? row;
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const pre = range.cloneRange();
  pre.selectNodeContents(textEl);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString().length;
}

function placeCaret(row: HTMLElement, offset: number) {
  const textEl = row.querySelector('.note-text') ?? row;
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  const walker = document.createTreeWalker(textEl, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  let left = offset;
  if (!node) {
    range.selectNodeContents(textEl);
    range.collapse(true);
  } else {
    while (node) {
      const len = node.textContent?.length ?? 0;
      if (left <= len) {
        range.setStart(node, left);
        range.collapse(true);
        break;
      }
      left -= len;
      const next = walker.nextNode();
      if (!next) {
        range.setStart(node, len);
        range.collapse(true);
        break;
      }
      node = next;
    }
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

function captureCaret(editor: HTMLElement): { id: string; offset: number } | null {
  const row = caretRow(editor);
  if (!row?.dataset.id) return null;
  return { id: row.dataset.id, offset: caretOffsetInRow(row) };
}

function restoreCaret(editor: HTMLElement, caret: { id: string; offset: number }) {
  const row = editor.querySelector<HTMLElement>(`.note-row[data-id="${cssEscape(caret.id)}"]`);
  if (row) placeCaret(row, caret.offset);
}

// Scroll only .note-body, not the dock or the page.
function scrollCaretIntoBody(editor: HTMLElement) {
  const scroller = editor.closest('.note-body');
  if (!(scroller instanceof HTMLElement)) return;
  const caret = caretClientRect(editor);
  const rect = caret ?? caretRow(editor)?.getBoundingClientRect();
  if (!rect) return;
  const box = scroller.getBoundingClientRect();
  const pad = 6;
  if (rect.bottom > box.bottom - pad) {
    scroller.scrollTop += rect.bottom - box.bottom + pad;
  } else if (rect.top < box.top + pad) {
    scroller.scrollTop -= box.top + pad - rect.top;
  }
}

function snapCollapsedCaret(editor: HTMLElement) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;
  const node = sel.anchorNode;
  if (!node || !editor.contains(node)) return;
  const el = node instanceof Element ? node : node.parentElement;
  if (el?.closest('.note-text')) return;
  const row = el?.closest('.note-row');
  if (row instanceof HTMLElement) placeCaret(row, 0);
}

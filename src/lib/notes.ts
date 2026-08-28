// Note cards in the dock. Slot ids are `note:{uuid}` so they can sit in
// widgetOrder next to the singleton widgets (clock, reddit, …). Notes are
// not a show/hide flag: each card is its own slot and can be reordered.
import {
  MAX_NOTES,
  type Note,
  type NoteBlock,
  type NoteBlockKind,
  type WidgetId,
} from '@/src/types';
import { normalizeWidgetOrder, noteSlotId } from '@/src/lib/widgets';

const KINDS = new Set<NoteBlockKind>(['text', 'bullet', 'check']);

// Set when a note is created; NoteWidget consumes it once on mount.
let pendingFocusId: string | null = null;

export function requestNoteFocus(id: string) {
  pendingFocusId = id;
}

export function takeNoteFocus(id: string): boolean {
  if (pendingFocusId !== id) return false;
  pendingFocusId = null;
  return true;
}

export function createNoteBlock(kind: NoteBlockKind = 'text', text = ''): NoteBlock {
  const block: NoteBlock = { id: crypto.randomUUID(), kind, text };
  if (kind === 'check') block.done = false;
  return block;
}

export function createNote(): Note {
  return {
    id: crypto.randomUUID(),
    title: '',
    blocks: [createNoteBlock('text')],
    createdAt: Date.now(),
  };
}

export function normalizeNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const next: Note[] = [];
  for (const item of raw) {
    if (next.length >= MAX_NOTES) break;
    const note = asNote(item);
    if (!note || seen.has(note.id)) continue;
    seen.add(note.id);
    next.push(note);
  }
  return next;
}

function asNote(value: unknown): Note | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<Note>;
  if (typeof row.id !== 'string' || row.id.length === 0) return null;
  const blocks = normalizeBlocks(row.blocks);
  return {
    id: row.id,
    title: typeof row.title === 'string' ? row.title : '',
    blocks,
    createdAt: typeof row.createdAt === 'number' ? row.createdAt : 0,
  };
}

function normalizeBlocks(raw: unknown): NoteBlock[] {
  // A note always has at least one text block.
  if (!Array.isArray(raw) || raw.length === 0) return [createNoteBlock('text')];
  const blocks: NoteBlock[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<NoteBlock>;
    const kind = KINDS.has(row.kind as NoteBlockKind) ? (row.kind as NoteBlockKind) : 'text';
    const id = typeof row.id === 'string' && row.id && !seen.has(row.id) ? row.id : crypto.randomUUID();
    seen.add(id);
    const block: NoteBlock = {
      id,
      kind,
      text: typeof row.text === 'string' ? row.text : '',
    };
    if (kind === 'check') block.done = Boolean(row.done);
    blocks.push(block);
  }
  return blocks.length > 0 ? blocks : [createNoteBlock('text')];
}

// `- ` / `* ` → bullet, `[]` / `[ ]` / `[]`+space → check. Only from a
// text line, so we do not re-parse an existing bullet that starts with `- `.
export function applyLinePrefix(block: NoteBlock, nextText: string): NoteBlock {
  if (block.kind !== 'text') return { ...block, text: nextText };
  if (nextText.startsWith('- ') || nextText.startsWith('* ')) {
    return { id: block.id, kind: 'bullet', text: nextText.slice(2) };
  }
  if (nextText.startsWith('[] ') || nextText.startsWith('[ ]')) {
    return { id: block.id, kind: 'check', text: nextText.slice(3), done: false };
  }
  // `[]` with no trailing space still converts (user often types that).
  if (nextText.startsWith('[]')) {
    return { id: block.id, kind: 'check', text: nextText.slice(2), done: false };
  }
  return { ...block, text: nextText };
}

export function addNoteToState(
  notes: Note[],
  order: WidgetId[],
): { notes: Note[]; order: WidgetId[]; note: Note } | null {
  if (notes.length >= MAX_NOTES) return null;
  const note = createNote();
  const nextNotes = [...notes, note];
  const ids = nextNotes.map((item) => item.id);
  const base = normalizeWidgetOrder(order, ids);
  const slot = noteSlotId(note.id);
  // New notes go at the end of the dock, after any leftover default slots.
  const nextOrder = base.includes(slot) ? base : [...base, slot];
  requestNoteFocus(note.id);
  return { notes: nextNotes, order: nextOrder, note };
}

export function removeNoteFromState(
  notes: Note[],
  order: WidgetId[],
  noteId: string,
): { notes: Note[]; order: WidgetId[] } {
  const nextNotes = notes.filter((item) => item.id !== noteId);
  const ids = nextNotes.map((item) => item.id);
  const stripped = order.filter((id) => id !== noteSlotId(noteId));
  return {
    notes: nextNotes,
    order: normalizeWidgetOrder(stripped, ids),
  };
}

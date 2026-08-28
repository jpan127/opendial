// Left dock of widget cards. Order is pointer-drag, same idea as dials.
//
// Visible cards follow `widgetOrder`. Hidden widgets stay in the saved
// list so turning one back on restores its slot. Any number of note cards
// use `note:{id}` slots. Drag the right edge to change dock width; cards
// stretch with it. The column scrolls; a ghost follows the cursor after
// an 8px move. Inner controls stop pointerdown so sort pills and similar
// stay clicks.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Clock } from '@/src/components/Clock';
import { NoteWidget } from '@/src/components/NoteWidget';
import { RecentlyClosed } from '@/src/components/RecentlyClosed';
import { Reddit } from '@/src/components/Reddit';
import { Top10 } from '@/src/components/Top10';
import { Weather } from '@/src/components/Weather';
import { addNoteToState, removeNoteFromState } from '@/src/lib/notes';
import { useOverlayScroll } from '@/src/lib/overlayScroll';
import {
  clampDockWidth,
  normalizeWidgetOrder,
  noteIdFromSlot,
  reorderVisibleWidgets,
  sameWidgetOrder,
} from '@/src/lib/widgets';
import { useDockWidth, useNotes, useWidgetOrder } from '@/src/lib/storage';
import { MAX_NOTES, type Dial, type Note, type TempUnit, type WidgetId } from '@/src/types';

const DRAG_THRESHOLD_PX = 8;
const AUTO_SCROLL_EDGE = 48;
const AUTO_SCROLL_SPEED = 14;

type Props = {
  dials: Dial[];
  showClock: boolean;
  showWeather: boolean;
  showTop10: boolean;
  showRecentlyClosed: boolean;
  showReddit: boolean;
  forecastDays: number;
  unit: TempUnit;
};

export function WidgetDock({
  dials,
  showClock,
  showWeather,
  showTop10,
  showRecentlyClosed,
  showReddit,
  forecastDays,
  unit,
}: Props) {
  const [notes, setNotes] = useNotes();
  const noteIds = useMemo(() => notes.map((item) => item.id), [notes]);
  const notesById = useMemo(() => {
    const map = new Map<string, Note>();
    for (const item of notes) map.set(item.id, item);
    return map;
  }, [notes]);

  const isOn = (id: WidgetId) => {
    if (id === 'clock') return showClock;
    if (id === 'weather') return showWeather;
    if (id === 'top10') return showTop10;
    if (id === 'closed') return showRecentlyClosed;
    if (id === 'reddit') return showReddit;
    // Notes have no show* toggle; the card is on iff the note still exists.
    const noteId = noteIdFromSlot(id);
    return Boolean(noteId && notesById.has(noteId));
  };

  const [storedOrder, setOrder] = useWidgetOrder();
  const order = useMemo(() => normalizeWidgetOrder(storedOrder, noteIds), [storedOrder, noteIds]);
  const visible = order.filter(isOn);

  const { scrolling, onScroll } = useOverlayScroll();
  const [, setDockWidth] = useDockWidth();
  const [resizing, setResizing] = useState(false);
  const [draggingId, setDraggingId] = useState<WidgetId | null>(null);
  const [draft, setDraft] = useState<WidgetId[] | null>(null);
  const [ghost, setGhost] = useState<WidgetId | null>(null);
  const draggingIdRef = useRef<WidgetId | null>(null);
  const draftRef = useRef<WidgetId[] | null>(null);
  const startRef = useRef<WidgetId[] | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const dockRef = useRef<HTMLElement | null>(null);
  const grabRef = useRef<{ offsetX: number; offsetY: number; x: number; y: number; width: number } | null>(
    null,
  );

  const shown = (draft ?? order).filter(isOn);

  const placeGhost = (x: number, y: number) => {
    const grab = grabRef.current;
    if (grab) {
      grab.x = x;
      grab.y = y;
    }
    const el = ghostRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.03)`;
  };

  useLayoutEffect(() => {
    const grab = grabRef.current;
    if (!ghost || !grab) return;
    const el = ghostRef.current;
    if (!el) return;
    el.style.width = `${grab.width}px`;
    placeGhost(grab.x, grab.y);
  }, [ghost]);

  if (visible.length === 0) return null;

  const renderCard = (id: WidgetId) => {
    if (id === 'clock') {
      return (
        <div className="now-card clock-card">
          <Clock />
        </div>
      );
    }
    if (id === 'weather') {
      return (
        <div className="now-card weather-card">
          <Weather unit={unit} forecastDays={forecastDays} />
        </div>
      );
    }
    if (id === 'top10') return <Top10 dials={dials} />;
    if (id === 'closed') return <RecentlyClosed />;
    if (id === 'reddit') return <Reddit />;
    const noteId = noteIdFromSlot(id);
    const note = noteId ? notesById.get(noteId) : undefined;
    if (!note) return null;
    return (
      <NoteWidget
        note={note}
        onChange={(next) => {
          setNotes((list) => list.map((item) => (item.id === next.id ? next : item)));
        }}
        onDelete={() => {
          const result = removeNoteFromState(notes, order, note.id);
          setNotes(result.notes);
          setOrder(result.order);
        }}
      />
    );
  };

  return (
    <>
      <aside
        ref={dockRef}
        className={`widget-dock od-scroll${scrolling ? ' is-scrolling' : ''}${
          draggingId ? ' is-reordering' : ''
        }${resizing ? ' is-resizing' : ''}`}
        onScroll={onScroll}
      >
        {shown.map((id) => (
          <WidgetSlot
            key={id}
            id={id}
            dragging={id === draggingId}
            onDragBegin={(widgetId, origin) => {
              draggingIdRef.current = widgetId;
              startRef.current = order;
              draftRef.current = order;
              grabRef.current = origin;
              setDraft(order);
              setDraggingId(widgetId);
              setGhost(widgetId);
            }}
            onDragMove={(clientX, clientY) => {
              const grab = grabRef.current;
              if (!grab) return;
              placeGhost(clientX - grab.offsetX, clientY - grab.offsetY);
              const dock = dockRef.current;
              if (!dock) return;
              const rect = dock.getBoundingClientRect();
              if (clientY < rect.top + AUTO_SCROLL_EDGE) {
                dock.scrollTop -= AUTO_SCROLL_SPEED;
              } else if (clientY > rect.bottom - AUTO_SCROLL_EDGE) {
                dock.scrollTop += AUTO_SCROLL_SPEED;
              }
            }}
            onDragOver={(clientX, clientY) => {
              const current = draftRef.current;
              const fromId = draggingIdRef.current;
              const dock = dockRef.current;
              if (!current || !fromId || !dock) return;
              const toId = dropTargetAt(dock, clientX, clientY, fromId);
              if (!toId) return;
              const vis = current.filter(isOn);
              const next = reorderVisibleWidgets(current, vis, fromId, toId);
              if (sameWidgetOrder(next, current)) return;
              draftRef.current = next;
              setDraft(next);
            }}
            onDragEnd={() => {
              const next = draftRef.current;
              const start = startRef.current;
              draggingIdRef.current = null;
              draftRef.current = null;
              startRef.current = null;
              grabRef.current = null;
              setDraft(null);
              setDraggingId(null);
              setGhost(null);
              if (next && start && !sameWidgetOrder(next, start)) setOrder(next);
            }}
          >
            {renderCard(id)}
          </WidgetSlot>
        ))}
        {/* Hidden at MAX_NOTES; widget-no-drag so this is not a dock drag handle. */}
        {notes.length < MAX_NOTES ? (
          <button
            type="button"
            className="note-add widget-no-drag"
            aria-label="Add note card"
            onClick={() => {
              const result = addNoteToState(notes, order);
              if (!result) return;
              setNotes(result.notes);
              setOrder(result.order);
            }}
          >
            + Note
          </button>
        ) : null}
        <div
          className="widget-dock-resize widget-no-drag"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize widget dock"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            setResizing(true);
            document.documentElement.classList.add('is-dock-resizing');
            const apply = (clientX: number) => {
              const next = clampDockWidth(clientX);
              document.documentElement.style.setProperty('--od-dock-width', `${next}px`);
              return next;
            };
            apply(event.clientX);

            const onMove = (moveEvent: PointerEvent) => {
              apply(moveEvent.clientX);
            };
            const onUp = (upEvent: PointerEvent) => {
              window.removeEventListener('pointermove', onMove);
              window.removeEventListener('pointerup', onUp);
              window.removeEventListener('pointercancel', onUp);
              document.documentElement.classList.remove('is-dock-resizing');
              setResizing(false);
              setDockWidth(apply(upEvent.clientX));
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
          }}
        >
          <span className="widget-dock-grip" aria-hidden />
        </div>
      </aside>
      {ghost && grabRef.current ? (
        <div
          ref={ghostRef}
          className="widget-ghost"
          style={{
            width: grabRef.current.width,
            transform: `translate3d(${grabRef.current.x}px, ${grabRef.current.y}px, 0) scale(1.03)`,
          }}
        >
          {renderCard(ghost)}
        </div>
      ) : null}
    </>
  );
}

type Origin = {
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
  width: number;
};

function WidgetSlot({
  id,
  dragging,
  onDragBegin,
  onDragMove,
  onDragOver,
  onDragEnd,
  children,
}: {
  id: WidgetId;
  dragging: boolean;
  onDragBegin: (id: WidgetId, origin: Origin) => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragOver: (clientX: number, clientY: number) => void;
  onDragEnd: () => void;
  children: ReactNode;
}) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const moving = useRef(false);
  const didDrag = useRef(false);
  const callbacks = useRef({ onDragBegin, onDragMove, onDragOver, onDragEnd });
  callbacks.current = { onDragBegin, onDragMove, onDragOver, onDragEnd };
  const stopWindowDrag = useRef<(() => void) | null>(null);

  useEffect(() => () => stopWindowDrag.current?.(), []);

  const finishDrag = () => {
    origin.current = null;
    stopWindowDrag.current?.();
    stopWindowDrag.current = null;
    if (!moving.current) return;
    moving.current = false;
    callbacks.current.onDragEnd();
  };

  return (
    <div
      ref={slotRef}
      className={`widget-slot${dragging ? ' is-dragging' : ''}`}
      data-widget-id={id}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        if ((event.target as HTMLElement).closest('.widget-no-drag')) return;
        stopWindowDrag.current?.();
        origin.current = { x: event.clientX, y: event.clientY };
        moving.current = false;
        didDrag.current = false;

        const onMove = (moveEvent: PointerEvent) => {
          if (!origin.current) return;
          const dx = moveEvent.clientX - origin.current.x;
          const dy = moveEvent.clientY - origin.current.y;
          if (!moving.current) {
            if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
            const node = slotRef.current;
            if (!node) return;
            moving.current = true;
            didDrag.current = true;
            const rect = node.getBoundingClientRect();
            callbacks.current.onDragBegin(id, {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              offsetX: moveEvent.clientX - rect.left,
              offsetY: moveEvent.clientY - rect.top,
            });
          }
          callbacks.current.onDragMove(moveEvent.clientX, moveEvent.clientY);
          callbacks.current.onDragOver(moveEvent.clientX, moveEvent.clientY);
        };

        const onUp = () => finishDrag();
        window.addEventListener('pointermove', onMove, { capture: true });
        window.addEventListener('pointerup', onUp, { capture: true });
        window.addEventListener('pointercancel', onUp, { capture: true });
        stopWindowDrag.current = () => {
          window.removeEventListener('pointermove', onMove, { capture: true });
          window.removeEventListener('pointerup', onUp, { capture: true });
          window.removeEventListener('pointercancel', onUp, { capture: true });
        };
      }}
      onClickCapture={(event) => {
        if (!didDrag.current) return;
        event.preventDefault();
        event.stopPropagation();
        didDrag.current = false;
      }}
    >
      {children}
    </div>
  );
}

function dropTargetAt(
  dock: HTMLElement,
  clientX: number,
  clientY: number,
  draggingId: WidgetId,
): WidgetId | null {
  const slots = dock.querySelectorAll<HTMLElement>('[data-widget-id]');
  const inflate = 16;
  let bestId: WidgetId | null = null;
  let bestDist = Infinity;

  for (const slot of slots) {
    const id = slot.dataset.widgetId as WidgetId | undefined;
    if (!id || id === draggingId) continue;
    const rect = slot.getBoundingClientRect();
    if (
      clientX < rect.left - inflate ||
      clientX >= rect.right + inflate ||
      clientY < rect.top - inflate ||
      clientY >= rect.bottom + inflate
    ) {
      continue;
    }
    const dy = clientY - (rect.top + rect.height / 2);
    const dist = dy * dy;
    if (dist >= bestDist) continue;
    bestDist = dist;
    bestId = id;
  }

  return bestId;
}

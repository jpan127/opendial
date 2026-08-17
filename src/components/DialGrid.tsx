import { useLayoutEffect, useRef, useState } from 'react';
import type { Dial, DialIcon } from '@/src/types';
import {
  createDial,
  moveDialToEnd,
  nextOrder,
  reorderDials,
  sameDialOrder,
  sortedDials,
} from '@/src/lib/dials';
import { DialTile, DialTileGhost, type DialDragOrigin } from '@/src/components/DialTile';
import { DialModal } from '@/src/components/DialModal';

type Props = {
  dials: Dial[];
  onChange: (dials: Dial[]) => void;
};

export function DialGrid({ dials, onChange }: Props) {
  const [editing, setEditing] = useState<Dial | 'new' | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Dial[] | null>(null);
  const [ghost, setGhost] = useState<{
    dial: Dial;
    src: string | null;
    broken: boolean;
  } | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const draftRef = useRef<Dial[] | null>(null);
  const startRef = useRef<Dial[] | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const grabRef = useRef<{ offsetX: number; offsetY: number; x: number; y: number; width: number } | null>(
    null,
  );
  const ordered = sortedDials(draft ?? dials);

  const placeGhost = (x: number, y: number) => {
    const grab = grabRef.current;
    if (grab) {
      grab.x = x;
      grab.y = y;
    }
    const el = ghostRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.06)`;
  };

  useLayoutEffect(() => {
    const grab = grabRef.current;
    if (!ghost || !grab) return;
    const el = ghostRef.current;
    if (!el) return;
    el.style.width = `${grab.width}px`;
    placeGhost(grab.x, grab.y);
  }, [ghost]);

  const save = (input: { name: string; url: string; icon: DialIcon }) => {
    if (editing && editing !== 'new') {
      onChange(
        dials.map((dial) =>
          dial.id === editing.id ? { ...dial, ...input } : dial,
        ),
      );
    } else {
      onChange([...dials, createDial({ ...input, order: nextOrder(dials) })]);
    }
    setEditing(null);
  };

  return (
    <>
      <div ref={gridRef} className={`dial-grid${draggingId ? ' is-reordering' : ''}`}>
        {ordered.map((dial) => (
          <DialTile
            key={dial.id}
            dial={dial}
            dragging={dial.id === draggingId}
            onOpen={(event, target) => {
              if (event.metaKey || event.ctrlKey) {
                event.preventDefault();
                window.open(target.url, '_blank', 'noopener');
                return;
              }
            }}
            onEdit={setEditing}
            onDragBegin={(id, origin: DialDragOrigin) => {
              const dragged = dials.find((dial) => dial.id === id);
              draggingIdRef.current = id;
              startRef.current = dials;
              draftRef.current = dials;
              grabRef.current = {
                offsetX: origin.offsetX,
                offsetY: origin.offsetY,
                x: origin.x,
                y: origin.y,
                width: origin.width,
              };
              setDraft(dials);
              setDraggingId(id);
              setGhost(dragged ? { dial: dragged, src: origin.src, broken: origin.broken } : null);
            }}
            onDragMove={(clientX, clientY) => {
              const grab = grabRef.current;
              if (!grab) return;
              placeGhost(clientX - grab.offsetX, clientY - grab.offsetY);
            }}
            onDragOver={(clientX, clientY) => {
              const current = draftRef.current;
              const fromId = draggingIdRef.current;
              const grid = gridRef.current;
              if (!current || !fromId || !grid) return;
              const toId = dropTargetAt(grid, clientX, clientY, fromId);
              if (!toId) return;
              const next =
                toId === 'end' ? moveDialToEnd(current, fromId) : reorderDials(current, fromId, toId);
              if (next === current) return;
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
              if (next && start && !sameDialOrder(next, start)) onChange(next);
            }}
          />
        ))}
        <button type="button" className="dial-tile add-tile" onClick={() => setEditing('new')}>
          <span className="dial-icon add-icon">+</span>
          <span className="dial-name">Add</span>
        </button>
      </div>
      {ghost && grabRef.current ? (
        <DialTileGhost
          dial={ghost.dial}
          src={ghost.src}
          broken={ghost.broken}
          ghostRef={ghostRef}
          width={grabRef.current.width}
          x={grabRef.current.x}
          y={grabRef.current.y}
        />
      ) : null}
      {editing ? (
        <DialModal
          initial={editing === 'new' ? null : editing}
          onSave={save}
          onDelete={
            editing === 'new'
              ? undefined
              : () => {
                  onChange(dials.filter((dial) => dial.id !== editing.id));
                  setEditing(null);
                }
          }
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function dropTargetAt(
  grid: HTMLElement,
  clientX: number,
  clientY: number,
  draggingId: string,
): string | 'end' | null {
  const slots = grid.querySelectorAll<HTMLElement>('[data-dial-id], .add-tile');
  const inflate = 11;
  let bestId: string | 'end' | null = null;
  let bestDist = Infinity;

  for (const slot of slots) {
    if (slot.dataset.dialId === draggingId) continue;
    const rect = slot.getBoundingClientRect();
    if (
      clientX < rect.left - inflate ||
      clientX >= rect.right + inflate ||
      clientY < rect.top - inflate ||
      clientY >= rect.bottom + inflate
    ) {
      continue;
    }
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const dist = dx * dx + dy * dy;
    if (dist >= bestDist) continue;
    bestDist = dist;
    bestId = slot.classList.contains('add-tile') ? 'end' : (slot.dataset.dialId ?? null);
  }

  return bestId;
}

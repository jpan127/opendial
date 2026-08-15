import { useState } from 'react';
import type { Dial, DialIcon } from '@/src/types';
import { createDial, nextOrder, reorderDials, sortedDials } from '@/src/lib/dials';
import { DialTile } from '@/src/components/DialTile';
import { DialModal } from '@/src/components/DialModal';

type Props = {
  dials: Dial[];
  onChange: (dials: Dial[]) => void;
};

export function DialGrid({ dials, onChange }: Props) {
  const [editing, setEditing] = useState<Dial | 'new' | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const ordered = sortedDials(dials);

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
      <div className="dial-grid">
        {ordered.map((dial) => (
          <DialTile
            key={dial.id}
            dial={dial}
            onOpen={(event, target) => {
              if (event.metaKey || event.ctrlKey) {
                event.preventDefault();
                window.open(target.url, '_blank', 'noopener');
                return;
              }
            }}
            onEdit={setEditing}
            onDragStart={setDraggingId}
            onDrop={(toId) => {
              if (draggingId) {
                onChange(reorderDials(dials, draggingId, toId));
              }
              setDraggingId(null);
            }}
          />
        ))}
        <button type="button" className="dial-tile add-tile" onClick={() => setEditing('new')}>
          <span className="dial-icon add-icon">+</span>
          <span className="dial-name">Add</span>
        </button>
      </div>
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

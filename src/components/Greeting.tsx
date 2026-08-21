// Editable “hello {name}” heading at the center of the page.
//
// This is the personal welcome, not a search or nav control. Click to edit
// both words; Enter or click-outside saves to storage. Escape cancels.
// An empty hello falls back to “hello”. An empty name shows a faint
// “add name” hint. Font size comes from the Greeting size slider (`--od-greeting-size`).
import { useEffect, useRef, useState } from 'react';
import type { Greeting } from '@/src/types';

type Props = {
  greeting: Greeting;
  onChange: (next: Greeting) => void;
};

export function Greeting({ greeting, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const helloRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (editing) helloRef.current?.select();
  }, [editing]);

  const commit = () => {
    onChange({
      hello: helloRef.current?.value.trim() || 'hello',
      name: nameRef.current?.value.trim() ?? '',
    });
    setEditing(false);
  };

  useEffect(() => {
    if (!editing) return;
    const onPointer = (event: MouseEvent) => {
      if (!formRef.current?.contains(event.target as Node)) {
        commit();
      }
    };
    window.addEventListener('mousedown', onPointer);
    return () => window.removeEventListener('mousedown', onPointer);
  }, [editing]);

  if (editing) {
    return (
      <form
        ref={formRef}
        className="greeting greeting-edit"
        onSubmit={(event) => {
          event.preventDefault();
          commit();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            setEditing(false);
          }
        }}
      >
        <input
          ref={helloRef}
          name="hello"
          defaultValue={greeting.hello}
          aria-label="Greeting"
        />
        <input
          ref={nameRef}
          name="name"
          defaultValue={greeting.name}
          placeholder="name"
          aria-label="Name"
        />
      </form>
    );
  }

  return (
    <button
      type="button"
      className="greeting"
      onClick={() => setEditing(true)}
      title="Edit greeting"
    >
      <span className="greeting-hello">{greeting.hello}</span>
      {greeting.name ? (
        <span className="greeting-name"> {greeting.name}</span>
      ) : (
        <span className="greeting-placeholder"> add name</span>
      )}
    </button>
  );
}

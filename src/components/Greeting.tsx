import { useEffect, useRef, useState } from 'react';
import type { Greeting } from '@/src/types';

type Props = {
  greeting: Greeting;
  onChange: (next: Greeting) => void;
};

export function Greeting({ greeting, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const helloRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) helloRef.current?.select();
  }, [editing]);

  if (editing) {
    return (
      <form
        className="greeting greeting-edit"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          onChange({
            hello: String(data.get('hello') ?? 'hello').trim() || 'hello',
            name: String(data.get('name') ?? '').trim(),
          });
          setEditing(false);
        }}
      >
        <input
          ref={helloRef}
          name="hello"
          defaultValue={greeting.hello}
          aria-label="Greeting"
        />
        <input
          name="name"
          defaultValue={greeting.name}
          placeholder="name"
          aria-label="Name"
        />
        <button type="submit" className="text-btn">
          Save
        </button>
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

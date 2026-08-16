import { useEffect, useRef, useState } from 'react';
import type { SearchEngine } from '@/src/types';
import { ENGINES, engineLabel, submitSearch } from '@/src/lib/search';

type Props = {
  engine: SearchEngine;
  onEngineChange: (engine: SearchEngine) => void;
};

export function SearchBar({ engine, onEngineChange }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // NTP stub (entrypoints/newtab) redirects here so this focus can stick.
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cycleEngine = (backward: boolean) => {
    const index = ENGINES.findIndex((item) => item.id === engine);
    const offset = backward ? -1 : 1;
    const next = ENGINES[(index + offset + ENGINES.length) % ENGINES.length];
    if (next) onEngineChange(next.id);
  };

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointer);
    return () => window.removeEventListener('mousedown', onPointer);
  }, []);

  return (
    <form
      ref={rootRef}
      className="search-pill"
      onSubmit={(event) => {
        event.preventDefault();
        void submitSearch(engine, query);
      }}
    >
      <div className="engine-wrap">
        <button
          type="button"
          className="engine-btn"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {engineLabel(engine)}
          <span className="chevron" aria-hidden>
            ▾
          </span>
        </button>
        {open && (
          <ul className="engine-menu" role="listbox">
            {ENGINES.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.id === engine ? 'active' : undefined}
                  onClick={() => {
                    onEngineChange(item.id);
                    setOpen(false);
                    inputRef.current?.focus();
                  }}
                >
                  {item.label}
                  {item.id === engine ? <span className="check">✓</span> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Tab' || event.metaKey || event.ctrlKey || event.altKey) {
            return;
          }
          event.preventDefault();
          cycleEngine(event.shiftKey);
        }}
        placeholder="Search the web…"
        aria-label="Search"
        autoComplete="off"
        autoFocus
      />
    </form>
  );
}

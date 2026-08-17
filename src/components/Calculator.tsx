import { useEffect, useRef, useState } from 'react';
import { evaluateExpression, groupDigits, groupExpression } from '@/src/lib/calculator';
import { useCalcHistory, useShowCalculator } from '@/src/lib/storage';
import type { CalcHistoryEntry } from '@/src/types';

const MAX_HISTORY = 80;

export function Calculator() {
  const [open, setOpen] = useShowCalculator();
  const [history, setHistory] = useCalcHistory();
  const [expr, setExpr] = useState('');
  const [submittedError, setSubmittedError] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = expr.trim() ? evaluateExpression(expr) : null;

  const toggle = () => {
    setOpen((value) => !value);
  };

  const commit = () => {
    const result = evaluateExpression(expr);
    if (!result.ok) {
      setSubmittedError(result.error);
      return;
    }
    setSubmittedError('');
    const entry: CalcHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      input: expr.trim(),
      output: result.formatted,
      at: Date.now(),
    };
    setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
    setExpr(result.formatted.replace(/,/g, ''));
  };

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.isComposing) return;

      if (event.altKey && (event.code === 'KeyC' || event.key === 'c' || event.key === 'C')) {
        event.preventDefault();
        event.stopPropagation();
        toggle();
        return;
      }

      if (!open || event.altKey) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointer);
    return () => window.removeEventListener('mousedown', onPointer);
  }, [open, setOpen]);

  const recall = (entry: CalcHistoryEntry) => {
    setExpr(entry.input);
    setSubmittedError('');
    inputRef.current?.focus();
  };

  const status = preview?.ok
    ? `= ${preview.formatted}`
    : submittedError
      ? submittedError
      : '\u00a0';

  return (
    <div className="calc-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`icon-btn${open ? ' is-on' : ''}`}
        onClick={toggle}
        title="Calculator (Alt+C)"
        aria-label="Calculator"
        aria-pressed={open}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="4"
            y="3"
            width="16"
            height="18"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <rect x="7" y="6" width="10" height="3.2" rx="0.8" fill="currentColor" opacity="0.9" />
          <circle cx="8.2" cy="13" r="1" fill="currentColor" />
          <circle cx="12" cy="13" r="1" fill="currentColor" />
          <circle cx="15.8" cy="13" r="1" fill="currentColor" />
          <circle cx="8.2" cy="17" r="1" fill="currentColor" />
          <circle cx="12" cy="17" r="1" fill="currentColor" />
          <circle cx="15.8" cy="17" r="1" fill="currentColor" />
        </svg>
      </button>
      {open ? (
        <div className="calc-panel" role="region" aria-label="Calculator">
          <form
            className="calc-main"
            onSubmit={(event) => {
              event.preventDefault();
              commit();
            }}
          >
            <input
              ref={inputRef}
              className="calc-input"
              value={expr}
              onChange={(event) => {
                setExpr(event.target.value);
                setSubmittedError('');
              }}
              placeholder="e.g. 12 * (3 + 4)"
              aria-label="Expression"
              autoComplete="off"
              spellCheck={false}
            />
            <p
              className={`calc-status${preview?.ok ? ' is-ok' : submittedError ? ' is-err' : ''}`}
              aria-live="polite"
            >
              {status}
            </p>
          </form>
          <div className="calc-history">
            <div className="calc-history-head">
              <span>History</span>
              {history.length > 0 ? (
                <button
                  type="button"
                  className="text-btn calc-history-clear"
                  onClick={() => setHistory([])}
                >
                  Clear
                </button>
              ) : null}
            </div>
            {history.length === 0 ? (
              <p className="calc-history-empty">Results show up here.</p>
            ) : (
              <ul className="calc-history-list">
                {history.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className="calc-history-item"
                      onClick={() => recall(entry)}
                      title="Edit this expression"
                    >
                      <span className="calc-history-in">{groupExpression(entry.input)}</span>
                      <span className="calc-history-out">
                        = {groupDigits(entry.output.replace(/,/g, ''))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

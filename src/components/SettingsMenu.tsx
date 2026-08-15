import { useEffect, useRef, useState } from 'react';
import { downloadBackup, exportBackup, importBackup } from '@/src/lib/backup';
import {
  useDialSize,
  useForecastDays,
  useGreetingSize,
  useShowClock,
  useShowWeather,
} from '@/src/lib/storage';
import type { BackupPayload } from '@/src/types';
import {
  MAX_DIAL_SIZE,
  MAX_FORECAST_DAYS,
  MAX_GREETING_SIZE,
  MIN_DIAL_SIZE,
  MIN_FORECAST_DAYS,
  MIN_GREETING_SIZE,
} from '@/src/types';

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [dialSize, setDialSize] = useDialSize();
  const [greetingSize, setGreetingSize] = useGreetingSize();
  const [showClock, setShowClock] = useShowClock();
  const [showWeather, setShowWeather] = useShowWeather();
  const [forecastDays, setForecastDays] = useForecastDays();
  const fileRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="settings-wrap" ref={wrapRef}>
      <button
        type="button"
        className="icon-btn"
        onClick={() => setOpen((value) => !value)}
        title="Settings"
        aria-label="Settings"
      >
        <svg viewBox="-1 -1 26 26" fill="none" aria-hidden>
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="12"
            r="3"
            stroke="currentColor"
            strokeWidth="1.75"
          />
        </svg>
      </button>
      {open ? (
        <div className="settings-menu">
          <p className="settings-heading">Widgets</p>
          <SwitchRow
            label="Clock"
            on={showClock}
            onToggle={() => setShowClock(!showClock)}
          />
          <SwitchRow
            label="Weather"
            on={showWeather}
            onToggle={() => setShowWeather(!showWeather)}
          />
          <div className={`seg-block${showWeather ? '' : ' is-disabled'}`}>
            <div className="seg-label">
              <span>Forecast</span>
              <span className="size-hint">
                {forecastDays === 0 ? 'Today only' : `Next ${forecastDays} days`}
              </span>
            </div>
            <div className="seg" role="radiogroup" aria-label="Forecast days">
              {Array.from({ length: MAX_FORECAST_DAYS - MIN_FORECAST_DAYS + 1 }, (_, index) => {
                const days = MIN_FORECAST_DAYS + index;
                return (
                  <button
                    key={days}
                    type="button"
                    role="radio"
                    aria-checked={forecastDays === days}
                    className={forecastDays === days ? 'is-on' : ''}
                    disabled={!showWeather}
                    onClick={() => setForecastDays(days)}
                  >
                    {days === 0 ? 'Today' : days}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="settings-heading">Layout</p>
          <label className="size-row">
            Welcome size
            <input
              type="range"
              min={MIN_GREETING_SIZE}
              max={MAX_GREETING_SIZE}
              value={greetingSize}
              onChange={(event) => setGreetingSize(Number(event.target.value))}
            />
          </label>
          <label className="size-row">
            Tile size
            <input
              type="range"
              min={MIN_DIAL_SIZE}
              max={MAX_DIAL_SIZE}
              value={dialSize}
              onChange={(event) => setDialSize(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            className="menu-action"
            onClick={async () => {
              const payload = await exportBackup();
              downloadBackup(payload);
              setOpen(false);
            }}
          >
            Export backup
          </button>
          <button type="button" className="menu-action" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              try {
                const parsed = JSON.parse(await file.text()) as BackupPayload;
                await importBackup(parsed);
                setOpen(false);
              } catch {
                window.alert('That file is not a valid OpenDial backup.');
              }
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function SwitchRow({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="switch-row">
      <span>{label}</span>
      <button
        type="button"
        className={`switch${on ? ' is-on' : ''}`}
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onToggle}
      >
        <span className="switch-knob" />
      </button>
    </div>
  );
}

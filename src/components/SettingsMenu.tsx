import { useRef, useState } from 'react';
import { downloadBackup, exportBackup, importBackup } from '@/src/lib/backup';
import { useDialSize } from '@/src/lib/storage';
import type { BackupPayload } from '@/src/types';
import { MAX_DIAL_SIZE, MIN_DIAL_SIZE } from '@/src/types';

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [dialSize, setDialSize] = useDialSize();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="settings-wrap">
      <button
        type="button"
        className="icon-btn"
        onClick={() => setOpen((value) => !value)}
        title="Settings"
        aria-label="Settings"
      >
        ⚙
      </button>
      {open ? (
        <div className="settings-menu">
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
            onClick={async () => {
              const payload = await exportBackup();
              downloadBackup(payload);
              setOpen(false);
            }}
          >
            Export backup
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
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

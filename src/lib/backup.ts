import type { BackupPayload, Dial, Greeting, SearchEngine, TempUnit, ThemeName } from '@/src/types';
import { DEFAULT_DIAL_SIZE } from '@/src/types';
import { DEFAULT_GREETING, STORAGE_KEYS, getLocal, setLocal } from '@/src/lib/storage';

export async function exportBackup(): Promise<BackupPayload> {
  const [theme, greeting, engine, dials, tempUnit, weatherCity, dialSize] = await Promise.all([
    getLocal<ThemeName>(STORAGE_KEYS.theme, 'dark'),
    getLocal<Greeting>(STORAGE_KEYS.greeting, DEFAULT_GREETING),
    getLocal<SearchEngine>(STORAGE_KEYS.engine, 'google'),
    getLocal<Dial[]>(STORAGE_KEYS.dials, []),
    getLocal<TempUnit>(STORAGE_KEYS.tempUnit, 'c'),
    getLocal<string>(STORAGE_KEYS.weatherCity, ''),
    getLocal<number>(STORAGE_KEYS.dialSize, DEFAULT_DIAL_SIZE),
  ]);

  return {
    version: 1,
    theme,
    greeting,
    engine,
    dials,
    tempUnit,
    weatherCity: weatherCity || undefined,
    dialSize,
  };
}

export async function importBackup(payload: BackupPayload): Promise<void> {
  if (payload.version !== 1) {
    throw new Error('Unsupported backup version');
  }
  await Promise.all([
    setLocal(STORAGE_KEYS.theme, payload.theme),
    setLocal(STORAGE_KEYS.greeting, payload.greeting),
    setLocal(STORAGE_KEYS.engine, payload.engine),
    setLocal(STORAGE_KEYS.dials, payload.dials ?? []),
    setLocal(STORAGE_KEYS.tempUnit, payload.tempUnit),
    setLocal(STORAGE_KEYS.weatherCity, payload.weatherCity ?? ''),
    setLocal(STORAGE_KEYS.dialSize, payload.dialSize ?? DEFAULT_DIAL_SIZE),
  ]);
}

export function downloadBackup(payload: BackupPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'opendial-backup.json';
  link.click();
  URL.revokeObjectURL(url);
}

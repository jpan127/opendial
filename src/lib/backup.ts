// User-facing JSON backup. Does not include weather cache, logo catalogs, or calc history.
import type { BackupPayload, Dial, Greeting, SearchEngine, TempUnit, ThemeName } from '@/src/types';
import {
  DEFAULT_DIAL_SIZE,
  DEFAULT_FORECAST_DAYS,
  DEFAULT_GREETING_SIZE,
} from '@/src/types';
import { DEFAULT_GREETING, STORAGE_KEYS, getLocal, setLocal } from '@/src/lib/storage';

export async function exportBackup(): Promise<BackupPayload> {
  const [
    theme,
    greeting,
    engine,
    dials,
    tempUnit,
    weatherCity,
    dialSize,
    greetingSize,
    showClock,
    showWeather,
    forecastDays,
    showTop10,
    showRecentlyClosed,
    showCalculator,
    showCalculatorWidget,
  ] = await Promise.all([
    getLocal<ThemeName>(STORAGE_KEYS.theme, 'dark'),
    getLocal<Greeting>(STORAGE_KEYS.greeting, DEFAULT_GREETING),
    getLocal<SearchEngine>(STORAGE_KEYS.engine, 'google'),
    getLocal<Dial[]>(STORAGE_KEYS.dials, []),
    getLocal<TempUnit>(STORAGE_KEYS.tempUnit, 'c'),
    getLocal<string>(STORAGE_KEYS.weatherCity, ''),
    getLocal<number>(STORAGE_KEYS.dialSize, DEFAULT_DIAL_SIZE),
    getLocal<number>(STORAGE_KEYS.greetingSize, DEFAULT_GREETING_SIZE),
    getLocal<boolean>(STORAGE_KEYS.showClock, true),
    getLocal<boolean>(STORAGE_KEYS.showWeather, true),
    getLocal<number>(STORAGE_KEYS.forecastDays, DEFAULT_FORECAST_DAYS),
    getLocal<boolean>(STORAGE_KEYS.showTop10, true),
    getLocal<boolean>(STORAGE_KEYS.showRecentlyClosed, true),
    getLocal<boolean>(STORAGE_KEYS.showCalculator, false),
    getLocal<boolean>(STORAGE_KEYS.showCalculatorWidget, true),
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
    greetingSize,
    showClock,
    showWeather,
    forecastDays,
    showTop10,
    showRecentlyClosed,
    showCalculator,
    showCalculatorWidget,
  };
}

// Replaces settings in place. Invalid `version` is rejected rather than partially applied.
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
    setLocal(STORAGE_KEYS.greetingSize, payload.greetingSize ?? DEFAULT_GREETING_SIZE),
    setLocal(STORAGE_KEYS.showClock, payload.showClock ?? true),
    setLocal(STORAGE_KEYS.showWeather, payload.showWeather ?? true),
    setLocal(STORAGE_KEYS.forecastDays, payload.forecastDays ?? DEFAULT_FORECAST_DAYS),
    setLocal(STORAGE_KEYS.showTop10, payload.showTop10 ?? true),
    setLocal(STORAGE_KEYS.showRecentlyClosed, payload.showRecentlyClosed ?? true),
    setLocal(STORAGE_KEYS.showCalculator, payload.showCalculator ?? false),
    setLocal(STORAGE_KEYS.showCalculatorWidget, payload.showCalculatorWidget ?? true),
  ]);
}

// Trigger a file download of the backup JSON (no chrome.downloads).
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

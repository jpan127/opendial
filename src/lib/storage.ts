import { browser } from 'wxt/browser';
import { useEffect, useState } from 'react';
import type {
  Dial,
  Greeting,
  RailCollapsed,
  SearchEngine,
  TempUnit,
  ThemeName,
  WeatherCache,
} from '@/src/types';
import { DEFAULT_DIAL_SIZE } from '@/src/types';

export const STORAGE_KEYS = {
  theme: 'opendial.theme',
  greeting: 'opendial.greeting',
  engine: 'opendial.engine',
  dials: 'opendial.dials',
  tempUnit: 'opendial.tempUnit',
  weather: 'opendial.weather',
  weatherCity: 'opendial.weatherCity',
  dialSize: 'opendial.dialSize',
  railCollapsed: 'opendial.railCollapsed',
} as const;

export const DEFAULT_GREETING: Greeting = {
  hello: 'hello',
  name: '',
};

const EMPTY_DIALS: Dial[] = [];

export async function getLocal<T>(key: string, fallback: T): Promise<T> {
  const result = await browser.storage.local.get(key);
  return (result[key] as T | undefined) ?? fallback;
}

export async function setLocal<T>(key: string, value: T): Promise<void> {
  await browser.storage.local.set({ [key]: value });
}

export function useLocalState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getLocal(key, fallback).then((stored) => {
      if (!cancelled) {
        setValue(stored);
        setReady(true);
      }
    });

    const onChange: Parameters<typeof browser.storage.onChanged.addListener>[0] = (
      changes,
      area,
    ) => {
      if (area === 'local' && changes[key] && 'newValue' in changes[key]) {
        setValue((changes[key].newValue as T | undefined) ?? fallback);
      }
    };

    browser.storage.onChanged.addListener(onChange);
    return () => {
      cancelled = true;
      browser.storage.onChanged.removeListener(onChange);
    };
  }, [key]);

  const update = (next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      void setLocal(key, resolved);
      return resolved;
    });
  };

  return [value, update, ready] as const;
}

export function useTheme() {
  return useLocalState<ThemeName>(STORAGE_KEYS.theme, 'dark');
}

export function useGreeting() {
  return useLocalState<Greeting>(STORAGE_KEYS.greeting, DEFAULT_GREETING);
}

export function useEngine() {
  return useLocalState<SearchEngine>(STORAGE_KEYS.engine, 'google');
}

export function useDials() {
  return useLocalState<Dial[]>(STORAGE_KEYS.dials, EMPTY_DIALS);
}

export function useTempUnit() {
  const localeDefault: TempUnit = navigator.language.toLowerCase().includes('us')
    ? 'f'
    : 'c';
  return useLocalState<TempUnit>(STORAGE_KEYS.tempUnit, localeDefault);
}

export function useWeatherCache() {
  return useLocalState<WeatherCache | null>(STORAGE_KEYS.weather, null);
}

export function useWeatherCity() {
  return useLocalState<string>(STORAGE_KEYS.weatherCity, '');
}

export function useDialSize() {
  return useLocalState<number>(STORAGE_KEYS.dialSize, DEFAULT_DIAL_SIZE);
}

const DEFAULT_RAIL: RailCollapsed = { top10: false, closed: false };

export function useRailCollapsed() {
  return useLocalState<RailCollapsed>(STORAGE_KEYS.railCollapsed, DEFAULT_RAIL);
}

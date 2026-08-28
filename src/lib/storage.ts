// chrome.storage.local access and React hooks that stay in sync across tabs.
// Logo catalogs live here but are omitted from backup JSON (they are caches).
import { browser } from 'wxt/browser';
import { useEffect, useState } from 'react';
import type {
  Dial,
  Greeting,
  SearchEngine,
  TempUnit,
  ThemeName,
  WeatherCache,
  CalcHistoryEntry,
  RedditCacheBank,
  Note,
  RedditSort,
  WidgetId,
} from '@/src/types';
import {
  DEFAULT_DIAL_SIZE,
  DEFAULT_FORECAST_DAYS,
  DEFAULT_GREETING_SIZE,
  DEFAULT_REDDIT_LIMIT,
  DEFAULT_REDDIT_LIST_HEIGHT,
  DEFAULT_REDDIT_WIDTH,
  DEFAULT_DOCK_WIDTH,
  DEFAULT_WIDGET_ORDER,
} from '@/src/types';

export const STORAGE_KEYS = {
  theme: 'opendial.theme',
  greeting: 'opendial.greeting',
  engine: 'opendial.engine',
  dials: 'opendial.dials',
  tempUnit: 'opendial.tempUnit',
  weather: 'opendial.weather',
  weatherCity: 'opendial.weatherCity',
  dialSize: 'opendial.dialSize',
  greetingSize: 'opendial.greetingSize',
  showClock: 'opendial.showClock',
  showWeather: 'opendial.showWeather',
  forecastDays: 'opendial.forecastDays',
  showTop10: 'opendial.showTop10',
  showRecentlyClosed: 'opendial.showRecentlyClosed',
  showCalculator: 'opendial.showCalculator', // panel open
  showCalculatorWidget: 'opendial.showCalculatorWidget', // toolbar button
  calcHistory: 'opendial.calcHistory',
  svglCatalog: 'opendial.svglCatalog', // not in backup
  simpleIconsCatalog: 'opendial.simpleIconsCatalog', // not in backup
  showReddit: 'opendial.showReddit',
  redditSubs: 'opendial.redditSubs',
  redditLimit: 'opendial.redditLimit',
  redditSort: 'opendial.redditSort',
  redditWidth: 'opendial.redditWidth',
  redditListHeight: 'opendial.redditListHeight',
  redditCache: 'opendial.redditCache', // not in backup
  widgetOrder: 'opendial.widgetOrder',
  dockWidth: 'opendial.dockWidth',
  notes: 'opendial.notes', // included in backup JSON
} as const;

export const DEFAULT_GREETING: Greeting = {
  hello: 'hello',
  name: '',
};

const EMPTY_DIALS: Dial[] = [];
const EMPTY_NOTES: Note[] = [];

// Read one key; missing keys return `fallback`.
export async function getLocal<T>(key: string, fallback: T): Promise<T> {
  const result = await browser.storage.local.get(key);
  return (result[key] as T | undefined) ?? fallback;
}

export async function setLocal<T>(key: string, value: T): Promise<void> {
  await browser.storage.local.set({ [key]: value });
}

// Storage-backed state. Third tuple value `ready` is false until the first read.
// Updates write through immediately so other new-tab pages see them.
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
  // First-run default only; a stored value always wins.
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

export function useGreetingSize() {
  return useLocalState<number>(STORAGE_KEYS.greetingSize, DEFAULT_GREETING_SIZE);
}

export function useShowClock() {
  return useLocalState<boolean>(STORAGE_KEYS.showClock, true);
}

export function useShowWeather() {
  return useLocalState<boolean>(STORAGE_KEYS.showWeather, true);
}

export function useForecastDays() {
  return useLocalState<number>(STORAGE_KEYS.forecastDays, DEFAULT_FORECAST_DAYS);
}

export function useShowTop10() {
  return useLocalState<boolean>(STORAGE_KEYS.showTop10, true);
}

export function useShowRecentlyClosed() {
  return useLocalState<boolean>(STORAGE_KEYS.showRecentlyClosed, true);
}

export function useWidgetOrder() {
  return useLocalState<WidgetId[]>(STORAGE_KEYS.widgetOrder, DEFAULT_WIDGET_ORDER);
}

export function useDockWidth() {
  return useLocalState<number>(STORAGE_KEYS.dockWidth, DEFAULT_DOCK_WIDTH);
}

// Whether the calculator panel is open. Kept so new tabs restore it.
export function useCalcOpen() {
  return useLocalState<boolean>(STORAGE_KEYS.showCalculator, false);
}

// Whether the calculator button is shown. Defaults on; independent of open state.
export function useShowCalculator() {
  return useLocalState<boolean>(STORAGE_KEYS.showCalculatorWidget, true);
}

const EMPTY_CALC_HISTORY: CalcHistoryEntry[] = [];

export function useCalcHistory() {
  return useLocalState<CalcHistoryEntry[]>(STORAGE_KEYS.calcHistory, EMPTY_CALC_HISTORY);
}

export function useShowReddit() {
  return useLocalState<boolean>(STORAGE_KEYS.showReddit, false);
}

const EMPTY_REDDIT_SUBS: string[] = [];

export function useRedditSubs() {
  return useLocalState<string[]>(STORAGE_KEYS.redditSubs, EMPTY_REDDIT_SUBS);
}

export function useRedditLimit() {
  return useLocalState<number>(STORAGE_KEYS.redditLimit, DEFAULT_REDDIT_LIMIT);
}

export function useRedditSort() {
  return useLocalState<RedditSort>(STORAGE_KEYS.redditSort, 'hot');
}

export function useRedditWidth() {
  return useLocalState<number>(STORAGE_KEYS.redditWidth, DEFAULT_REDDIT_WIDTH);
}

export function useRedditListHeight() {
  return useLocalState<number>(STORAGE_KEYS.redditListHeight, DEFAULT_REDDIT_LIST_HEIGHT);
}

export function useRedditCache() {
  return useLocalState<RedditCacheBank | null>(STORAGE_KEYS.redditCache, null);
}

export function useNotes() {
  return useLocalState<Note[]>(STORAGE_KEYS.notes, EMPTY_NOTES);
}

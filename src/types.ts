// Persisted shapes for chrome.storage.local and backup JSON.
// Suggested logos are never stored as their own kind — Save writes `upload` + `via`.

export type ThemeName = 'dark' | 'light';

export type SearchEngine = 'google' | 'chatgpt' | 'gemini';

export type Greeting = {
  hello: string;
  name: string;
};

export type DialIcon =
  | { kind: 'favicon' }
  | {
      kind: 'upload';
      dataUrl: string; // data:image/png (or jpeg from a user drop); not svg+xml — Chrome NTP blocks those
      via?: 'suggested'; // rasterized from Suggested; Edit opens that tab
    }
  | { kind: 'url'; href: string };

export type Dial = {
  id: string;
  name: string;
  url: string;
  icon: DialIcon;
  order: number;
  createdAt: number;
};

export type TempUnit = 'c' | 'f';

export type DailyForecast = {
  date: string;
  weatherCode: number;
  highC: number;
  lowC: number;
  precipChance?: number;
};

export type WeatherCache = {
  temperatureC: number;
  weatherCode: number;
  highC: number;
  lowC: number;
  aqi?: number;
  precipChance?: number;
  uvIndex?: number;
  daily?: DailyForecast[];
  cityLabel: string;
  latitude: number;
  longitude: number;
  fetchedAt: number;
};

export type CalcHistoryEntry = {
  id: string;
  input: string;
  output: string;
  at: number;
};

// Version 1 backup. Older files omit later optional fields; import fills defaults.
export type BackupPayload = {
  version: 1;
  theme: ThemeName;
  greeting: Greeting;
  engine: SearchEngine;
  dials: Dial[];
  tempUnit: TempUnit;
  weatherCity?: string;
  dialSize?: number;
  greetingSize?: number;
  showClock?: boolean;
  showWeather?: boolean;
  forecastDays?: number;
  showTop10?: boolean;
  showRecentlyClosed?: boolean;
  // Calculator panel open (not button visibility). Key kept for existing backups.
  showCalculator?: boolean;
  // Gear-menu toggle for the calculator button. Missing ⇒ shown.
  showCalculatorWidget?: boolean;
  showReddit?: boolean;
  redditSubs?: string[];
  redditLimit?: number;
  redditSort?: RedditSort;
  redditWidth?: number;
  redditListHeight?: number;
  dockWidth?: number;
  widgetOrder?: WidgetId[];
  // Absent on backups from before notes existed.
  notes?: Note[];
};

export type RedditSort = 'hot' | 'day' | 'week';

export type RedditPost = {
  id: string;
  sub: string;
  title: string;
  url: string;
  author: string;
  updatedAt: number;
  score?: number;
};

export type RedditCache = {
  version: 1;
  fetchedAt: number;
  sort: RedditSort;
  subsKey: string;
  posts: RedditPost[];
};

// chrome.storage blob for all Hot/Today/Week snapshots. Not in backup JSON.
export type RedditCacheBank = {
  version: 2;
  slots: Record<string, RedditCache>;
};

export const DEFAULT_DIAL_SIZE = 148;
export const MIN_DIAL_SIZE = 110;
export const MAX_DIAL_SIZE = 200;

export const DEFAULT_GREETING_SIZE = 58;
export const MIN_GREETING_SIZE = 32;
export const MAX_GREETING_SIZE = 120;

export const DEFAULT_FORECAST_DAYS = 0;
export const MIN_FORECAST_DAYS = 0;
export const MAX_FORECAST_DAYS = 6;

export const DEFAULT_REDDIT_LIMIT = 12;
export const MIN_REDDIT_LIMIT = 5;
export const MAX_REDDIT_LIMIT = 100;
export const MAX_REDDIT_SUBS = 20;

export const DEFAULT_REDDIT_WIDTH = 380;
export const MIN_REDDIT_WIDTH = 280;
export const MAX_REDDIT_WIDTH = 560;

export const DEFAULT_DOCK_WIDTH = 320;
export const MIN_DOCK_WIDTH = 260;
export const MAX_DOCK_WIDTH = 1200;

export const DEFAULT_REDDIT_LIST_HEIGHT = 360;
export const MIN_REDDIT_LIST_HEIGHT = 200;
export const MAX_REDDIT_LIST_HEIGHT = 800;

export type NoteBlockKind = 'text' | 'bullet' | 'check';

export type NoteBlock = {
  id: string;
  kind: NoteBlockKind;
  text: string;
  // Checklist only. The square in the row toggles this; the bubble check icon does not.
  done?: boolean;
};

export type Note = {
  id: string;
  title: string;
  blocks: NoteBlock[];
  createdAt: number;
};

export type BuiltinWidgetId = 'clock' | 'weather' | 'top10' | 'closed' | 'reddit';

// Each note is its own dock slot so it can drag independently of the others.
export type NoteSlotId = `note:${string}`;

export type WidgetId = BuiltinWidgetId | NoteSlotId;

export const WIDGET_IDS: BuiltinWidgetId[] = ['clock', 'weather', 'top10', 'closed', 'reddit'];

export const DEFAULT_WIDGET_ORDER: WidgetId[] = ['clock', 'weather', 'top10', 'closed', 'reddit'];

// Cap so the dock cannot grow without bound from "+ Note".
export const MAX_NOTES = 30;

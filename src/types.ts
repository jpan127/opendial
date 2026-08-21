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

// Sidebar section headers; `true` means collapsed.
export type RailCollapsed = {
  top10: boolean;
  closed: boolean;
};

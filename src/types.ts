export type ThemeName = 'dark' | 'light';

export type SearchEngine = 'google' | 'chatgpt' | 'gemini';

export type Greeting = {
  hello: string;
  name: string;
};

export type DialIcon =
  | { kind: 'favicon' }
  | { kind: 'upload'; dataUrl: string }
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

export type RailCollapsed = {
  top10: boolean;
  closed: boolean;
};

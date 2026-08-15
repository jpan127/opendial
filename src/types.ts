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

export type WeatherCache = {
  temperatureC: number;
  weatherCode: number;
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
};

export const DEFAULT_DIAL_SIZE = 148;
export const MIN_DIAL_SIZE = 110;
export const MAX_DIAL_SIZE = 200;

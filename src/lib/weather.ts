import { browser } from 'wxt/browser';
import type { WeatherCache } from '@/src/types';
import { STORAGE_KEYS, getLocal, setLocal } from '@/src/lib/storage';

const CACHE_MS = 20 * 60 * 1000;

const WEATHER_LABELS: Record<number, string> = {
  0: 'Clear',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Fog',
  51: 'Drizzle',
  53: 'Drizzle',
  55: 'Drizzle',
  61: 'Rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Snow',
  73: 'Snow',
  75: 'Snow',
  80: 'Showers',
  81: 'Showers',
  82: 'Showers',
  95: 'Thunder',
  96: 'Thunder',
  99: 'Thunder',
};

export function weatherLabel(code: number): string {
  return WEATHER_LABELS[code] ?? 'Weather';
}

export function formatTemp(celsius: number, unit: 'c' | 'f'): string {
  if (unit === 'f') {
    return `${Math.round((celsius * 9) / 5 + 32)}°`;
  }
  return `${Math.round(celsius)}°`;
}

async function fetchForecast(
  latitude: number,
  longitude: number,
  cityLabel: string,
): Promise<WeatherCache> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', 'temperature_2m,weather_code');
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Weather request failed');
  }
  const data = await response.json();
  const cache: WeatherCache = {
    temperatureC: data.current.temperature_2m,
    weatherCode: data.current.weather_code,
    cityLabel,
    latitude,
    longitude,
    fetchedAt: Date.now(),
  };
  await setLocal(STORAGE_KEYS.weather, cache);
  return cache;
}

export async function geocodeCity(name: string): Promise<{
  latitude: number;
  longitude: number;
  label: string;
}> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', name);
  url.searchParams.set('count', '1');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('City lookup failed');
  }
  const data = await response.json();
  const first = data.results?.[0];
  if (!first) {
    throw new Error('City not found');
  }
  const parts = [first.name, first.admin1, first.country_code].filter(Boolean);
  return {
    latitude: first.latitude,
    longitude: first.longitude,
    label: parts.join(', '),
  };
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 8000,
      maximumAge: 30 * 60 * 1000,
    });
  });
}

export async function loadWeather(force = false): Promise<WeatherCache> {
  const cached = await getLocal<WeatherCache | null>(STORAGE_KEYS.weather, null);
  if (!force && cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    return cached;
  }

  const savedCity = await getLocal<string>(STORAGE_KEYS.weatherCity, '');
  if (savedCity) {
    const place = await geocodeCity(savedCity);
    return fetchForecast(place.latitude, place.longitude, place.label);
  }

  try {
    const position = await getPosition();
    return fetchForecast(
      position.coords.latitude,
      position.coords.longitude,
      'Local',
    );
  } catch {
    if (cached) return cached;
    throw new Error('Location unavailable');
  }
}

export async function setWeatherCity(city: string): Promise<WeatherCache> {
  const trimmed = city.trim();
  await setLocal(STORAGE_KEYS.weatherCity, trimmed);
  if (!trimmed) {
    await browser.storage.local.remove(STORAGE_KEYS.weather);
    return loadWeather(true);
  }
  const place = await geocodeCity(trimmed);
  return fetchForecast(place.latitude, place.longitude, place.label);
}

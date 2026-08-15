import { browser } from 'wxt/browser';
import type { DailyForecast, WeatherCache } from '@/src/types';
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

export function aqiMeta(aqi: number): { label: string; tone: string } {
  if (aqi <= 50) return { label: 'Good', tone: 'good' };
  if (aqi <= 100) return { label: 'Moderate', tone: 'moderate' };
  if (aqi <= 150) return { label: 'Sensitive', tone: 'sensitive' };
  if (aqi <= 200) return { label: 'Unhealthy', tone: 'unhealthy' };
  if (aqi <= 300) return { label: 'Very unhealthy', tone: 'very-unhealthy' };
  return { label: 'Hazardous', tone: 'hazardous' };
}

function formatPlace(parts: Array<string | undefined>): string {
  const unique: string[] = [];
  for (const part of parts) {
    const trimmed = part?.trim();
    if (trimmed && !unique.includes(trimmed)) unique.push(trimmed);
  }
  return unique.join(', ');
}

async function fetchAqi(latitude: number, longitude: number): Promise<number | undefined> {
  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', 'us_aqi');
  url.searchParams.set('timezone', 'auto');
  const response = await fetch(url);
  if (!response.ok) return undefined;
  const data = await response.json();
  const value = data.current?.us_aqi;
  return typeof value === 'number' ? Math.round(value) : undefined;
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
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max',
  );
  url.searchParams.set('forecast_days', '7');
  url.searchParams.set('timezone', 'auto');

  const [forecastRes, aqi] = await Promise.all([
    fetch(url),
    fetchAqi(latitude, longitude).catch(() => undefined),
  ]);
  if (!forecastRes.ok) {
    throw new Error('Weather request failed');
  }
  const data = await forecastRes.json();
  const times: string[] = data.daily?.time ?? [];
  const daily: DailyForecast[] = times.map((date, index) => ({
    date,
    weatherCode: data.daily.weather_code?.[index] ?? data.current.weather_code,
    highC: data.daily.temperature_2m_max?.[index] ?? data.current.temperature_2m,
    lowC: data.daily.temperature_2m_min?.[index] ?? data.current.temperature_2m,
    precipChance: data.daily.precipitation_probability_max?.[index],
  }));
  const cache: WeatherCache = {
    temperatureC: data.current.temperature_2m,
    weatherCode: data.current.weather_code,
    highC: daily[0]?.highC ?? data.current.temperature_2m,
    lowC: daily[0]?.lowC ?? data.current.temperature_2m,
    precipChance: daily[0]?.precipChance,
    uvIndex: data.daily?.uv_index_max?.[0],
    aqi,
    daily,
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
  return {
    latitude: first.latitude,
    longitude: first.longitude,
    label: formatPlace([first.name, first.admin1]),
  };
}

async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('localityLanguage', 'en');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Reverse geocode failed');
  }
  const data = await response.json();
  const region =
    data.principalSubdivisionCode?.replace(/^[A-Z]{2}-/, '') || data.principalSubdivision;
  return formatPlace([data.city || data.locality, region]) || 'Local';
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 8000,
      maximumAge: 30 * 60 * 1000,
    });
  });
}

function cacheComplete(cache: WeatherCache | null): boolean {
  return (
    cache != null &&
    typeof cache.highC === 'number' &&
    typeof cache.lowC === 'number' &&
    (cache.daily?.length ?? 0) >= 7
  );
}

export async function loadWeather(force = false): Promise<WeatherCache> {
  const cached = await getLocal<WeatherCache | null>(STORAGE_KEYS.weather, null);
  const needsPlace = cached?.cityLabel === 'Local' || !cached?.cityLabel;
  if (!force && cacheComplete(cached) && Date.now() - cached!.fetchedAt < CACHE_MS && !needsPlace) {
    return cached!;
  }

  const savedCity = await getLocal<string>(STORAGE_KEYS.weatherCity, '');
  if (savedCity) {
    const place = await geocodeCity(savedCity);
    return fetchForecast(place.latitude, place.longitude, place.label);
  }

  try {
    const position = await getPosition();
    let label = 'Local';
    try {
      label = await reverseGeocode(position.coords.latitude, position.coords.longitude);
    } catch {
      /* keep Local */
    }
    return fetchForecast(position.coords.latitude, position.coords.longitude, label);
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

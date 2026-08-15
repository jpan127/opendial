import { useEffect, useState } from 'react';
import { WeatherGlyph } from '@/src/components/WeatherGlyph';
import type { TempUnit, WeatherCache } from '@/src/types';
import {
  aqiMeta,
  formatTemp,
  loadWeather,
  setWeatherCity,
  weatherLabel,
} from '@/src/lib/weather';

type Props = {
  unit: TempUnit;
  onUnitChange: (unit: TempUnit) => void;
  forecastDays: number;
};

export function Weather({ unit, onUnitChange, forecastDays }: Props) {
  const [data, setData] = useState<WeatherCache | null>(null);
  const [editing, setEditing] = useState(false);
  const [city, setCity] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void loadWeather()
      .then(setData)
      .catch(() => setError('Set city'));
  }, []);

  if (editing) {
    return (
      <form
        className="weather-edit"
        onSubmit={(event) => {
          event.preventDefault();
          void setWeatherCity(city)
            .then((next) => {
              setData(next);
              setEditing(false);
              setError('');
            })
            .catch(() => setError('City not found'));
        }}
      >
        <input
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="City"
          autoFocus
        />
        <button type="submit" className="text-btn">
          Save
        </button>
        <button type="button" className="text-btn" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </form>
    );
  }

  if (!data) {
    return (
      <button type="button" className="weather-main" onClick={() => setEditing(true)}>
        <span className="weather-city">{error || 'Weather'}</span>
      </button>
    );
  }

  const aqi = data.aqi != null ? aqiMeta(data.aqi) : null;
  const upcoming = (data.daily ?? []).slice(1, 1 + forecastDays);

  return (
    <div className="weather-pane">
      <div className="weather-top">
        <button
          type="button"
          className="weather-main"
          onClick={() => setEditing(true)}
          title="Set city"
        >
          <WeatherGlyph code={data.weatherCode} />
          <span className="weather-copy">
            <span className="weather-temp-row">
              <span className="now-hero weather-temp">{formatTemp(data.temperatureC, unit)}</span>
              <span className="weather-cond">{weatherLabel(data.weatherCode)}</span>
            </span>
            <span className="weather-city">{data.cityLabel}</span>
            <span className="weather-stats">
              <span>H {formatTemp(data.highC, unit)}</span>
              <span>L {formatTemp(data.lowC, unit)}</span>
              {data.precipChance != null && data.precipChance > 0 ? (
                <span>{Math.round(data.precipChance)}% rain</span>
              ) : null}
              {data.uvIndex != null ? <span>UV {Math.round(data.uvIndex)}</span> : null}
              {aqi && data.aqi != null ? (
                <span className={`aqi aqi-${aqi.tone}`}>
                  AQI {data.aqi} {aqi.label}
                </span>
              ) : null}
            </span>
          </span>
        </button>
        <div
          className="unit-seg"
          role="group"
          aria-label="Temperature unit"
        >
          <button
            type="button"
            className={unit === 'f' ? 'is-on' : ''}
            onClick={() => onUnitChange('f')}
          >
            °F
          </button>
          <button
            type="button"
            className={unit === 'c' ? 'is-on' : ''}
            onClick={() => onUnitChange('c')}
          >
            °C
          </button>
        </div>
      </div>
      {upcoming.length > 0 ? (
        <div className="forecast-row">
          {upcoming.map((day) => {
            const date = new Date(`${day.date}T12:00:00`);
            const name = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
            return (
              <div key={day.date} className="forecast-day" title={weatherLabel(day.weatherCode)}>
                <span className="forecast-name">{name}</span>
                <WeatherGlyph code={day.weatherCode} className="weather-glyph forecast-glyph" />
                <span className="forecast-hi">{formatTemp(day.highC, unit)}</span>
                <span className="forecast-lo">{formatTemp(day.lowC, unit)}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

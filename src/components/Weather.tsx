import { useEffect, useState } from 'react';
import type { TempUnit, WeatherCache } from '@/src/types';
import { formatTemp, loadWeather, setWeatherCity, weatherLabel } from '@/src/lib/weather';

type Props = {
  unit: TempUnit;
  onUnitChange: (unit: TempUnit) => void;
};

export function Weather({ unit, onUnitChange }: Props) {
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

  return (
    <div className="weather">
      <button
        type="button"
        className="weather-main"
        onClick={() => setEditing(true)}
        title="Set city"
      >
        {data ? (
          <>
            <span>
              {formatTemp(data.temperatureC, unit)} {weatherLabel(data.weatherCode)}
            </span>
            <span className="weather-city">{data.cityLabel}</span>
          </>
        ) : (
          <span>{error || 'Weather'}</span>
        )}
      </button>
      <button
        type="button"
        className="text-btn unit-btn"
        onClick={() => onUnitChange(unit === 'c' ? 'f' : 'c')}
        title="Toggle units"
      >
        {unit === 'c' ? 'C' : 'F'}
      </button>
    </div>
  );
}

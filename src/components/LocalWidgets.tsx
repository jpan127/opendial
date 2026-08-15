import { Clock } from '@/src/components/Clock';
import { Weather } from '@/src/components/Weather';
import type { TempUnit } from '@/src/types';

type Props = {
  showClock: boolean;
  showWeather: boolean;
  forecastDays: number;
  unit: TempUnit;
  onUnitChange: (unit: TempUnit) => void;
};

export function LocalWidgets({
  showClock,
  showWeather,
  forecastDays,
  unit,
  onUnitChange,
}: Props) {
  if (!showClock && !showWeather) return null;

  return (
    <div className="now-card">
      {showClock ? <Clock /> : null}
      {showClock && showWeather ? <div className="now-rule" aria-hidden /> : null}
      {showWeather ? (
        <Weather unit={unit} onUnitChange={onUnitChange} forecastDays={forecastDays} />
      ) : null}
    </div>
  );
}

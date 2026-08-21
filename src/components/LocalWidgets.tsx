// Top-left “now” card that holds Clock and/or Weather.
//
// Those two widgets share one chrome (border, padding, divider). Either
// can be turned off in Settings. Both off → this returns `null` and the
// top bar only has the right-side controls. Passes temperature unit and
// forecast length through to `Weather`.
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

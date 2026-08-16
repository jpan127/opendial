import { DialGrid } from '@/src/components/DialGrid';
import { Greeting } from '@/src/components/Greeting';
import { LeftRail } from '@/src/components/LeftRail';
import { LocalWidgets } from '@/src/components/LocalWidgets';
import { SearchBar } from '@/src/components/SearchBar';
import { SettingsMenu } from '@/src/components/SettingsMenu';
import { ThemeToggle } from '@/src/components/ThemeToggle';
import {
  useDialSize,
  useDials,
  useEngine,
  useForecastDays,
  useGreeting,
  useGreetingSize,
  useShowClock,
  useShowWeather,
  useTempUnit,
  useTheme,
} from '@/src/lib/storage';
import { useEffect } from 'react';

export default function App() {
  const [theme, setTheme] = useTheme();
  const [greeting, setGreeting] = useGreeting();
  const [engine, setEngine] = useEngine();
  const [dials, setDials] = useDials();
  const [tempUnit, setTempUnit] = useTempUnit();
  const [dialSize] = useDialSize();
  const [greetingSize] = useGreetingSize();
  const [showClock] = useShowClock();
  const [showWeather] = useShowWeather();
  const [forecastDays] = useForecastDays();

  useEffect(() => {
    document.documentElement.style.setProperty('--od-dial-size', `${dialSize}px`);
  }, [dialSize]);

  useEffect(() => {
    document.documentElement.style.setProperty('--od-greeting-size', `${greetingSize}px`);
  }, [greetingSize]);

  return (
    <div className="app">
      <LeftRail dials={dials} />
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <LocalWidgets
              showClock={showClock}
              showWeather={showWeather}
              forecastDays={forecastDays}
              unit={tempUnit}
              onUnitChange={setTempUnit}
            />
          </div>
          <div className="topbar-right">
            <SettingsMenu />
            <ThemeToggle
              theme={theme}
              onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            />
          </div>
        </header>
        <div className="hero">
          <Greeting greeting={greeting} onChange={setGreeting} />
          <SearchBar engine={engine} onEngineChange={setEngine} />
        </div>
        <DialGrid dials={dials} onChange={setDials} />
      </main>
    </div>
  );
}

// OpenDial new-tab page.
//
// This is the layout root: left rail (Top 10 / recently closed), top-left
// clock/weather card, top-right calculator/settings/theme, then greeting,
// search, and the speed-dial grid.
//
// It owns the chrome.storage-backed settings that several children share
// (theme, greeting, search engine, dials, tile/greeting size, widget flags)
// and writes `--od-dial-size` / `--od-greeting-size` so CSS can size those
// without every child reading storage.
import { Calculator } from '@/src/components/Calculator';
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

  // Settings sliders write CSS variables used by the dial grid and greeting.
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
            <Calculator />
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

// OpenDial new-tab page.
//
// Layout root: left widget dock (clock/weather, Top 10, recently closed,
// Reddit — drag to reorder), then the main column: top-right
// calculator/settings/theme, greeting, search, and the speed-dial grid.
//
// It owns the chrome.storage-backed settings that several children share
// (theme, greeting, search engine, dials, tile/greeting size, widget flags)
// and writes `--od-dial-size` / `--od-greeting-size` / `--od-dock-width` so CSS can size those
// without every child reading storage.
import { Calculator } from '@/src/components/Calculator';
import { DialGrid } from '@/src/components/DialGrid';
import { Greeting } from '@/src/components/Greeting';
import { SearchBar } from '@/src/components/SearchBar';
import { SettingsMenu } from '@/src/components/SettingsMenu';
import { ThemeToggle } from '@/src/components/ThemeToggle';
import { WidgetDock } from '@/src/components/WidgetDock';
import { clampDockWidth } from '@/src/lib/widgets';
import {
  useDockWidth,
  useDialSize,
  useDials,
  useEngine,
  useForecastDays,
  useGreeting,
  useGreetingSize,
  useShowClock,
  useShowRecentlyClosed,
  useShowReddit,
  useShowTop10,
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
  const [tempUnit] = useTempUnit();
  const [dialSize] = useDialSize();
  const [greetingSize] = useGreetingSize();
  const [showClock] = useShowClock();
  const [showWeather] = useShowWeather();
  const [showReddit] = useShowReddit();
  const [showTop10] = useShowTop10();
  const [showRecentlyClosed] = useShowRecentlyClosed();
  const [dockWidth] = useDockWidth();
  const [forecastDays] = useForecastDays();

  // Settings sliders write CSS variables used by the dial grid, greeting, and dock.
  useEffect(() => {
    document.documentElement.style.setProperty('--od-dial-size', `${dialSize}px`);
  }, [dialSize]);

  useEffect(() => {
    document.documentElement.style.setProperty('--od-greeting-size', `${greetingSize}px`);
  }, [greetingSize]);

  useEffect(() => {
    document.documentElement.style.setProperty('--od-dock-width', `${clampDockWidth(dockWidth)}px`);
  }, [dockWidth]);

  return (
    <div className="app">
      <WidgetDock
        dials={dials}
        showClock={showClock}
        showWeather={showWeather}
        showTop10={showTop10}
        showRecentlyClosed={showRecentlyClosed}
        showReddit={showReddit}
        forecastDays={forecastDays}
        unit={tempUnit}
      />
      <main className="main">
        <header className="topbar">
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

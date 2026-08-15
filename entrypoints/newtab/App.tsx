import { Clock } from '@/src/components/Clock';
import { DialGrid } from '@/src/components/DialGrid';
import { Greeting } from '@/src/components/Greeting';
import { LeftRail } from '@/src/components/LeftRail';
import { SearchBar } from '@/src/components/SearchBar';
import { SettingsMenu } from '@/src/components/SettingsMenu';
import { ThemeToggle } from '@/src/components/ThemeToggle';
import { Weather } from '@/src/components/Weather';
import {
  useDialSize,
  useDials,
  useEngine,
  useGreeting,
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

  useEffect(() => {
    document.documentElement.style.setProperty('--od-dial-size', `${dialSize}px`);
  }, [dialSize]);

  return (
    <div className="app">
      <LeftRail dials={dials} />
      <main className="main">
        <header className="topbar">
          <Clock />
          <div className="topbar-right">
            <Weather unit={tempUnit} onUnitChange={setTempUnit} />
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
        <p className="attribution">Weather by Open-Meteo</p>
      </main>
    </div>
  );
}

import { useEffect } from 'react';
import type { ThemeName } from '@/src/types';

type Props = {
  theme: ThemeName;
  onToggle: () => void;
};

export function ThemeToggle({ theme, onToggle }: Props) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={onToggle}
      title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}

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
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="4.2" fill="currentColor" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="12"
              y1="2.5"
              x2="12"
              y2="5.2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              transform={`rotate(${deg} 12 12)`}
            />
          ))}
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path
            d="M16.4 14.2A7 7 0 0 1 9.8 5.2 7.2 7.2 0 1 0 16.4 14.2z"
            fill="currentColor"
          />
        </svg>
      )}
    </button>
  );
}

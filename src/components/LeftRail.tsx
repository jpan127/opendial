// Left sidebar: browsing shortcuts that are not the dial grid.
//
// Two optional sections, both togglable in Settings:
// - Top 10 — most-visited domains (90 days of history, `topSites` fallback).
//   Hosts already on the dial grid are hidden. Click opens the site.
// - Recently closed — Chrome session restore. Click restores that tab or
//   window. New-tab / extension URLs are omitted.
//
// Section headers collapse the list (that state is stored). Turning both
// sections off returns `null` so the page is a single column. The scrollbar
// is shown only while the list is scrolling.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { browser } from 'wxt/browser';
import { faviconUrl, formatCount, hostnameOf, monogram, relativeTime } from '@/src/lib/format';
import { getMostVisited, type MostVisitedItem } from '@/src/lib/mostVisited';
import { getRecentlyClosed, restoreClosed, type ClosedEntry } from '@/src/lib/sessions';
import { useRailCollapsed, useShowRecentlyClosed, useShowTop10 } from '@/src/lib/storage';
import type { Dial } from '@/src/types';

type Props = {
  dials: Dial[];
};

export function LeftRail({ dials }: Props) {
  const [visited, setVisited] = useState<MostVisitedItem[]>([]);
  const [closed, setClosed] = useState<ClosedEntry[]>([]);
  const [collapsed, setCollapsed] = useRailCollapsed();
  const [showTop10] = useShowTop10();
  const [showRecentlyClosed] = useShowRecentlyClosed();

  useEffect(() => {
    if (!showTop10) return;
    const hidden = new Set(
      dials
        .map((dial) => hostnameOf(dial.url))
        .filter((host): host is string => Boolean(host)),
    );
    void getMostVisited(hidden).then(setVisited);
  }, [dials, showTop10]);

  useEffect(() => {
    if (!showRecentlyClosed) return;
    const load = () => {
      void getRecentlyClosed().then(setClosed);
    };
    load();
    const listener = () => load();
    browser.sessions.onChanged.addListener(listener);
    return () => browser.sessions.onChanged.removeListener(listener);
  }, [showRecentlyClosed]);

  if (!showTop10 && !showRecentlyClosed) return null;

  return (
    <aside className="rail">
      {showTop10 ? (
        <RailSection
          title="Top 10"
          open={!collapsed.top10}
          fill={!showRecentlyClosed}
          onToggle={() => setCollapsed({ ...collapsed, top10: !collapsed.top10 })}
        >
          {visited.length === 0 ? (
            <li className="rail-empty">Browsing history will show up here</li>
          ) : (
            visited.map((item) => (
              <li key={item.host}>
                <a className="rail-row" href={item.url} title={item.host}>
                  <Favicon url={item.url} label={item.host} />
                  <span className="rail-title">{item.host}</span>
                  {item.visits != null ? (
                    <span className="rail-meta">{formatCount(item.visits)}</span>
                  ) : null}
                </a>
              </li>
            ))
          )}
        </RailSection>
      ) : null}
      {showRecentlyClosed ? (
        <RailSection
          title="Recently closed"
          open={!collapsed.closed}
          fill
          onToggle={() => setCollapsed({ ...collapsed, closed: !collapsed.closed })}
        >
          {closed.length === 0 ? (
            <li className="rail-empty">Closed tabs will show up here</li>
          ) : (
            closed.map((entry) => (
              <li key={entry.sessionId}>
                <button
                  type="button"
                  className="rail-row"
                  onClick={() => void restoreClosed(entry.sessionId)}
                  title={entry.title}
                >
                  <Favicon url={entry.url} label={entry.title} />
                  <span className="rail-title">{entry.title}</span>
                  <span className="rail-meta">{relativeTime(entry.lastModified)}</span>
                </button>
              </li>
            ))
          )}
        </RailSection>
      ) : null}
    </aside>
  );
}

function RailSection({
  title,
  open,
  fill,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  fill: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [scrolling, setScrolling] = useState(false);
  const timer = useRef<number>(0);

  return (
    <section className={`rail-section${fill && open ? ' fill' : ''}${open ? '' : ' collapsed'}`}>
      <button
        type="button"
        className="rail-toggle"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{title}</span>
        <span className="rail-chevron" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open ? (
        <ul
          ref={listRef}
          className={`rail-list${scrolling ? ' is-scrolling' : ''}`}
          onScroll={() => {
            setScrolling(true); // CSS shows the scrollbar only while scrolling
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setScrolling(false), 700);
          }}
        >
          {children}
        </ul>
      ) : null}
    </section>
  );
}

function Favicon({ url, label }: { url?: string; label: string }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return <span className="rail-mono">{monogram(label)}</span>;
  }
  return (
    <img
      className="rail-favicon"
      src={faviconUrl(url, 32)}
      alt=""
      onError={() => setBroken(true)}
    />
  );
}

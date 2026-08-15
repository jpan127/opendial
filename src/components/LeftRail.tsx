import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { faviconUrl, formatCount, hostnameOf, monogram, relativeTime } from '@/src/lib/format';
import { getMostVisited, type MostVisitedItem } from '@/src/lib/mostVisited';
import { getRecentlyClosed, restoreClosed, type ClosedEntry } from '@/src/lib/sessions';
import type { Dial } from '@/src/types';

type Props = {
  dials: Dial[];
};

export function LeftRail({ dials }: Props) {
  const [visited, setVisited] = useState<MostVisitedItem[]>([]);
  const [closed, setClosed] = useState<ClosedEntry[]>([]);

  useEffect(() => {
    const hidden = new Set(
      dials
        .map((dial) => hostnameOf(dial.url))
        .filter((host): host is string => Boolean(host)),
    );
    void getMostVisited(hidden).then(setVisited);
  }, [dials]);

  useEffect(() => {
    const load = () => {
      void getRecentlyClosed().then(setClosed);
    };
    load();
    const listener = () => load();
    browser.sessions.onChanged.addListener(listener);
    return () => browser.sessions.onChanged.removeListener(listener);
  }, []);

  return (
    <aside className="rail">
      <section className="rail-section">
        <h2>Most visited</h2>
        <ul>
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
        </ul>
      </section>
      <section className="rail-section">
        <h2>Recently closed</h2>
        <ul>
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
        </ul>
      </section>
    </aside>
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

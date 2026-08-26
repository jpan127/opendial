// Recently closed tabs/windows card in the left widget dock.
//
// Chrome session restore. Click restores that tab or window. New-tab /
// extension URLs are omitted. The list is capped and scrolls.
import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { WidgetFavicon } from '@/src/components/WidgetFavicon';
import { relativeTime } from '@/src/lib/format';
import { useOverlayScroll } from '@/src/lib/overlayScroll';
import { getRecentlyClosed, restoreClosed, type ClosedEntry } from '@/src/lib/sessions';

export function RecentlyClosed() {
  const [closed, setClosed] = useState<ClosedEntry[]>([]);
  const { scrolling, onScroll } = useOverlayScroll();

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
    <section className="now-card widget-card">
      <h2 className="widget-title">Recently closed</h2>
      <ul
        className={`widget-list widget-list-scroll od-scroll${scrolling ? ' is-scrolling' : ''}`}
        onScroll={onScroll}
      >
        {closed.length === 0 ? (
          <li className="widget-empty">Closed tabs will show up here</li>
        ) : (
          closed.map((entry) => (
            <li key={entry.sessionId}>
              <button
                type="button"
                className="widget-row"
                onClick={() => void restoreClosed(entry.sessionId)}
                title={entry.title}
              >
                <WidgetFavicon url={entry.url} label={entry.title} />
                <span className="widget-row-title">{entry.title}</span>
                <span className="widget-row-meta">{relativeTime(entry.lastModified)}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

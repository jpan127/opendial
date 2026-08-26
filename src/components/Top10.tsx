// Most-visited domains card in the left widget dock.
//
// Last 90 days of history, `topSites` fallback. Hosts already on the dial
// grid are hidden. Click opens the site.
import { useEffect, useState } from 'react';
import { WidgetFavicon } from '@/src/components/WidgetFavicon';
import { formatCount, hostnameOf } from '@/src/lib/format';
import { getMostVisited, type MostVisitedItem } from '@/src/lib/mostVisited';
import type { Dial } from '@/src/types';

type Props = {
  dials: Dial[];
};

export function Top10({ dials }: Props) {
  const [visited, setVisited] = useState<MostVisitedItem[]>([]);

  useEffect(() => {
    const hidden = new Set(
      dials
        .map((dial) => hostnameOf(dial.url))
        .filter((host): host is string => Boolean(host)),
    );
    void getMostVisited(hidden).then(setVisited);
  }, [dials]);

  return (
    <section className="now-card widget-card">
      <h2 className="widget-title">Top 10</h2>
      <ul className="widget-list">
        {visited.length === 0 ? (
          <li className="widget-empty">Browsing history will show up here</li>
        ) : (
          visited.map((item) => (
            <li key={item.host}>
              <a className="widget-row" href={item.url} title={item.host}>
                <WidgetFavicon url={item.url} label={item.host} />
                <span className="widget-row-title">{item.host}</span>
                {item.visits != null ? (
                  <span className="widget-row-meta">{formatCount(item.visits)}</span>
                ) : null}
              </a>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

// Top 10 domains from the last 90 days of history.
// Search pages and hosts already on the dial grid are skipped.
// Chrome topSites fills in when history is thin.
import { browser } from 'wxt/browser';
import { hostnameOf } from '@/src/lib/format';

export type MostVisitedItem = {
  host: string;
  url: string;
  title: string;
  visits?: number;
};

const SKIP_HOSTS = new Set([
  'localhost',
  'newtab',
]);

function shouldSkipUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return true;
    const host = parsed.hostname.replace(/^www\./, '');
    if (SKIP_HOSTS.has(host)) return true;
    if (parsed.pathname.startsWith('/search')) return true; // google/bing results, not the product
    if (host === 'google.com' && parsed.pathname === '/') return true;
    if (host === 'chatgpt.com' && parsed.searchParams.has('q')) return true; // our own search hops
    if (host === 'gemini.google.com') return true;
    return false;
  } catch {
    return true;
  }
}

export async function getMostVisited(
  hiddenHosts: Set<string>,
  limit = 10,
): Promise<MostVisitedItem[]> {
  const startTime = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const history = await browser.history.search({
    text: '',
    maxResults: 1000,
    startTime,
  });

  const byHost = new Map<string, MostVisitedItem>();
  for (const item of history) {
    if (!item.url || shouldSkipUrl(item.url)) continue;
    const host = hostnameOf(item.url);
    if (!host || hiddenHosts.has(host)) continue;

    const visits = item.visitCount ?? 1;
    const existing = byHost.get(host);
    if (existing) {
      existing.visits = (existing.visits ?? 0) + visits;
    } else {
      byHost.set(host, {
        host,
        url: `https://${host}`,
        title: host,
        visits,
      });
    }
  }

  let results = [...byHost.values()]
    .sort((a, b) => (b.visits ?? 0) - (a.visits ?? 0))
    .slice(0, limit);

  // History can be empty in a fresh profile; topSites is Chrome’s own shortcut list.
  if (results.length < 5) {
    const topSites = await browser.topSites.get();
    const seen = new Set(results.map((item) => item.host));
    for (const site of topSites) {
      if (shouldSkipUrl(site.url)) continue;
      const host = hostnameOf(site.url);
      if (!host || hiddenHosts.has(host) || seen.has(host)) continue;
      results.push({
        host,
        url: `https://${host}`,
        title: site.title || host,
      });
      seen.add(host);
      if (results.length >= limit) break;
    }
  }

  return results.slice(0, limit);
}

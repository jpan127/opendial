import { browser } from 'wxt/browser';

export type ClosedEntry = {
  sessionId: string;
  title: string;
  url?: string;
  lastModified: number;
  kind: 'tab' | 'window';
  tabCount?: number;
};

function isNtp(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.startsWith('chrome://newtab') ||
    url.startsWith('chrome://new-tab-page') ||
    url.startsWith('chrome-extension://') ||
    url === 'about:blank'
  );
}

export async function getRecentlyClosed(limit = 25): Promise<ClosedEntry[]> {
  const sessions = await browser.sessions.getRecentlyClosed({ maxResults: limit });
  const entries: ClosedEntry[] = [];

  for (const session of sessions) {
    if (session.tab) {
      if (isNtp(session.tab.url)) continue;
      if (!session.tab.sessionId) continue;
      entries.push({
        sessionId: session.tab.sessionId,
        title: session.tab.title || session.tab.url || 'Untitled',
        url: session.tab.url,
        lastModified: session.lastModified ?? 0,
        kind: 'tab',
      });
      continue;
    }

    if (session.window?.sessionId) {
      const tabs = session.window.tabs ?? [];
      const usable = tabs.filter((tab) => !isNtp(tab.url));
      if (usable.length === 0) continue;
      const first = usable[0];
      if (!first) continue;
      entries.push({
        sessionId: session.window.sessionId,
        title:
          usable.length === 1
            ? first.title || first.url || 'Window'
            : `${usable.length} tabs`,
        url: first.url,
        lastModified: session.lastModified ?? 0,
        kind: 'window',
        tabCount: usable.length,
      });
    }
  }

  return entries.slice(0, limit);
}

export async function restoreClosed(sessionId: string): Promise<void> {
  await browser.sessions.restore(sessionId);
}

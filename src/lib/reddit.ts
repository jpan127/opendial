// Combined Reddit RSS for the new-tab card.
//
// One GET covers every registered sub (`/r/a+b/hot/.rss?limit=100`). Parse
// Atom entries in feed order. If RSS is 403/429/empty, try the old.reddit
// listing HTML once (not another RSS URL). Cache 15 minutes in RAM +
// chrome.storage.local. On failure keep that sort's stale snapshot. Never retry
// in a loop. credentials: omit so Reddit session cookies stay off this page.
//
// Hot / Today / Week are three feeds. We keep one slot per sort+sub-list so
// switching tabs does not refetch if that slot is still fresh. After a pull,
// the other two sorts prefetch a few seconds apart so a later click is RAM.
//
// Fetch runs in the background worker. Reddit does not send CORS headers, so
// `fetch` from home.html (chrome-extension://) is blocked; weather works only
// because Open-Meteo sends Access-Control-Allow-Origin.
import { browser } from 'wxt/browser';
import type { RedditCache, RedditCacheBank, RedditPost, RedditSort } from '@/src/types';
import { MAX_REDDIT_SUBS } from '@/src/types';
import { STORAGE_KEYS, getLocal, setLocal } from '@/src/lib/storage';

export const REDDIT_CACHE_MS = 15 * 60 * 1000;
const CACHE_VERSION = 1;
const ATOM_NS = 'http://www.w3.org/2005/Atom';
const FEED_LIMIT = 100;
const SUB_RE = /^[a-z0-9_]{2,21}$/;

export type RedditLoad = {
  cache: RedditCache | null;
  blocked: boolean;
};

const SORTS: RedditSort[] = ['hot', 'day', 'week'];
const PREFETCH_GAP_MS = 2800;

let ram: RedditCacheBank | null = null;
const inflight = new Map<string, Promise<RedditLoad>>();

export function normalizeSubreddit(raw: string): string | null {
  const name = raw
    .trim()
    .replace(/^\/+/, '')
    .replace(/^r\//i, '')
    .toLowerCase();
  if (!SUB_RE.test(name)) return null;
  return name;
}

export function subsKey(subs: string[]): string {
  return subs.join('+');
}

function atomChildren(parent: Element, local: string): Element[] {
  return Array.from(parent.getElementsByTagNameNS(ATOM_NS, local)).filter(
    (node) => node.parentElement === parent,
  );
}

function atomText(parent: Element, local: string): string {
  return atomChildren(parent, local)[0]?.textContent?.trim() ?? '';
}

function parseAtom(xml: string): RedditPost[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) return [];
  const feed = doc.documentElement;
  if (!feed) return [];
  const posts: RedditPost[] = [];
  for (const entry of atomChildren(feed, 'entry')) {
    const links = atomChildren(entry, 'link');
    const href =
      links.find((link) => (link.getAttribute('rel') ?? 'alternate') === 'alternate')?.getAttribute(
        'href',
      ) ??
      links[0]?.getAttribute('href') ??
      '';
    const title = atomText(entry, 'title');
    if (!href || !title) continue;
    const category = atomChildren(entry, 'category')[0];
    const fromCat = (category?.getAttribute('term') ?? '').toLowerCase();
    const fromUrl = href.match(/\/r\/([^/]+)\//i)?.[1]?.toLowerCase() ?? '';
    const sub = normalizeSubreddit(fromCat) ?? normalizeSubreddit(fromUrl);
    if (!sub) continue;
    const authorEl = atomChildren(entry, 'author')[0];
    const author = (authorEl ? atomText(authorEl, 'name') : '').replace(/^\/u\//i, '');
    const idRaw = atomText(entry, 'id') || href;
    const stamp = atomText(entry, 'updated') || atomText(entry, 'published');
    const updatedAt = Date.parse(stamp) || Date.now();
    posts.push({
      id: idRaw,
      sub,
      title,
      url: href,
      author,
      updatedAt,
    });
  }
  return posts;
}

function parseOldHtml(html: string): RedditPost[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const posts: RedditPost[] = [];
  for (const thing of Array.from(doc.querySelectorAll('.thing[data-permalink]'))) {
    const className = thing.className;
    if (/\bpromoted\b|\bsponsored\b/.test(className)) continue;
    const permalink = thing.getAttribute('data-permalink') ?? '';
    const sub = normalizeSubreddit(thing.getAttribute('data-subreddit') ?? '');
    const title =
      thing.querySelector('a.title')?.textContent?.trim() ??
      thing.querySelector('[data-event-action="title"]')?.textContent?.trim() ??
      '';
    if (!permalink || !sub || !title) continue;
    const scoreRaw = thing.getAttribute('data-score');
    const score = scoreRaw != null && scoreRaw !== '' ? Number(scoreRaw) : undefined;
    const timeEl = thing.querySelector('time[datetime]');
    const updatedAt = Date.parse(timeEl?.getAttribute('datetime') ?? '') || Date.now();
    const fullname = thing.getAttribute('data-fullname') ?? permalink;
    const url = permalink.startsWith('http')
      ? permalink
      : `https://www.reddit.com${permalink}`;
    posts.push({
      id: fullname,
      sub,
      title,
      url,
      author: (thing.getAttribute('data-author') ?? '').replace(/^\/u\//i, ''),
      updatedAt,
      score: Number.isFinite(score) ? score : undefined,
    });
  }
  return posts;
}

function rssUrl(key: string, sort: RedditSort): string {
  if (sort === 'hot') {
    return `https://www.reddit.com/r/${key}/hot/.rss?limit=${FEED_LIMIT}`;
  }
  const range = sort === 'day' ? 'day' : 'week';
  return `https://www.reddit.com/r/${key}/top/.rss?t=${range}&limit=${FEED_LIMIT}`;
}

function htmlUrl(key: string, sort: RedditSort): string {
  if (sort === 'hot') {
    return `https://old.reddit.com/r/${key}/hot/`;
  }
  const range = sort === 'day' ? 'day' : 'week';
  return `https://old.reddit.com/r/${key}/top/?sort=top&t=${range}`;
}

async function fetchText(url: string): Promise<{ ok: boolean; status: number; text: string }> {
  try {
    const reply = (await browser.runtime.sendMessage({
      type: 'opendial.redditFetch',
      url,
    })) as { ok?: boolean; status?: number; text?: string } | undefined;
    return {
      ok: Boolean(reply?.ok),
      status: typeof reply?.status === 'number' ? reply.status : 0,
      text: typeof reply?.text === 'string' ? reply.text : '',
    };
  } catch {
    return { ok: false, status: 0, text: '' };
  }
}

function slotKey(sort: RedditSort, key: string): string {
  return `${sort}|${key}`;
}

function emptyBank(): RedditCacheBank {
  return { version: 2, slots: {} };
}

function asBank(stored: RedditCacheBank | RedditCache | null): RedditCacheBank {
  if (stored && 'slots' in stored && stored.version === 2 && stored.slots) {
    return stored;
  }
  if (
    stored &&
    'posts' in stored &&
    stored.version === 1 &&
    Array.isArray(stored.posts)
  ) {
    const legacy = stored as RedditCache;
    return {
      version: 2,
      slots: { [slotKey(legacy.sort, legacy.subsKey)]: legacy },
    };
  }
  return emptyBank();
}

async function readBank(): Promise<RedditCacheBank> {
  if (ram) return ram;
  const disk = await getLocal<RedditCacheBank | RedditCache | null>(
    STORAGE_KEYS.redditCache,
    null,
  );
  ram = asBank(disk);
  return ram;
}

async function writeSlot(entry: RedditCache): Promise<void> {
  const bank = await readBank();
  bank.slots[slotKey(entry.sort, entry.subsKey)] = entry;
  ram = bank;
  await setLocal(STORAGE_KEYS.redditCache, bank);
}

function cacheMatches(cache: RedditCache | undefined, key: string, sort: RedditSort): cache is RedditCache {
  return (
    cache != null &&
    cache.version === CACHE_VERSION &&
    cache.subsKey === key &&
    cache.sort === sort &&
    Array.isArray(cache.posts)
  );
}

function isFresh(cache: RedditCache): boolean {
  return Date.now() - cache.fetchedAt < REDDIT_CACHE_MS;
}

export type SubLookup = 'ok' | 'missing' | 'private' | 'unknown';

export async function lookupSubreddit(name: string): Promise<SubLookup> {
  const response = await fetchText(`https://old.reddit.com/r/${name}/hot/`);
  if (response.status === 404) return 'missing';
  if (response.status === 403) return 'private';
  if (response.status === 429 || response.status === 0) return 'unknown';
  if (!response.ok) return 'unknown';
  const head = response.text.slice(0, 5000).toLowerCase();
  if (head.includes('page not found')) return 'missing';
  if (head.includes('private community') || head.includes('must be invited')) return 'private';
  return 'ok';
}

async function fetchFeed(key: string, sort: RedditSort): Promise<RedditPost[]> {
  try {
    const rss = await fetchText(rssUrl(key, sort));
    if (rss.ok) {
      const posts = parseAtom(rss.text);
      if (posts.length > 0) return posts;
    }
  } catch {
    // fall through to HTML
  }

  const html = await fetchText(htmlUrl(key, sort));
  if (!html.ok) {
    const err = new Error(`Reddit blocked this request (${html.status})`) as Error & {
      blocked: boolean;
      status: number;
    };
    err.blocked = html.status === 403 || html.status === 429;
    err.status = html.status;
    throw err;
  }
  const posts = parseOldHtml(html.text);
  if (posts.length === 0) {
    throw new Error('Reddit returned no posts');
  }
  return posts;
}

export async function loadReddit(
  subs: string[],
  sort: RedditSort,
  force = false,
): Promise<RedditLoad> {
  const cleaned = subs
    .map(normalizeSubreddit)
    .filter((name): name is string => Boolean(name))
    .slice(0, MAX_REDDIT_SUBS);
  if (cleaned.length === 0) {
    return { cache: null, blocked: false };
  }

  const key = subsKey(cleaned);
  const flightKey = slotKey(sort, key);
  const pending = inflight.get(flightKey);
  if (pending) return pending;

  const run = (async (): Promise<RedditLoad> => {
    const bank = await readBank();
    const slot = bank.slots[flightKey];
    if (!force && cacheMatches(slot, key, sort) && isFresh(slot)) {
      return { cache: slot, blocked: false };
    }

    try {
      const posts = await fetchFeed(key, sort);
      const cache: RedditCache = {
        version: CACHE_VERSION,
        fetchedAt: Date.now(),
        sort,
        subsKey: key,
        posts,
      };
      await writeSlot(cache);
      return { cache, blocked: false };
    } catch (error) {
      const blocked =
        typeof error === 'object' &&
        error != null &&
        'blocked' in error &&
        Boolean((error as { blocked?: boolean }).blocked);
      const stale = (await readBank()).slots[flightKey];
      if (cacheMatches(stale, key, sort)) {
        return { cache: stale, blocked };
      }
      return { cache: null, blocked };
    }
  })();

  inflight.set(flightKey, run);
  try {
    return await run;
  } finally {
    inflight.delete(flightKey);
  }
}

export function prefetchRedditSorts(subs: string[], current: RedditSort): () => void {
  const others = SORTS.filter((item) => item !== current);
  const timers = others.map((item, index) =>
    window.setTimeout(() => {
      void loadReddit(subs, item, false);
    }, PREFETCH_GAP_MS * (index + 1)),
  );
  return () => {
    for (const timer of timers) window.clearTimeout(timer);
  };
}

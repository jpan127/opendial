// SVGL brand marks for speed-dial tiles.
//
// Catalog vs files
// SVGL's API is a JSON phone book (~665 brands: title, site url, SVG hrefs),
// not a folder of images. We cache that index 5 minutes in RAM +
// chrome.storage.local (opendial.svglCatalog). It is not part of backup JSON.
// Matching is local: hostname, then longest path prefix (github.com vs
// github.com/features/copilot). Product hosts also search the parent domain
// (drive.google.com uses google.com/drive). Homepage `/` on the parent is
// ignored so Drive does not fall through to the Google mark. Do not use
// ?search= — that is title search and ranks Copilot first for "github".
//
// When we hit the network
// Add site loads the catalog when the modal opens (Suggested is default).
// Edit with a suggested-origin tile does the same; other edits load it only
// after the user clicks Suggested. Never refetch while typing. SVGL rate-limits at 5 req / 10s then a 3-minute lockout; in-flight
// coalescing plus the TTL stay under that. Preview <img> may use svgl.app
// (display-only). Save never fetch()es svgl.app — it has no
// Access-Control-Allow-Origin, and Chrome logs CORS even if we catch it.
// Download and rasterize go through api.svgl.app (CORS *).
//
// Why PNG data URLs, not SVG on disk
// The extension package is read-only at runtime — we cannot write
// chrome-extension://id/reddit.svg. Persistence is chrome.storage (a
// key/value DB). A data: URL embeds the file in the stored string so New Tab
// does not call SVGL again. data:image/svg+xml is blocked as an <img> src on
// Chrome extension pages (SVG can carry script). data:image/png is allowed.
// Suggested Save rasterizes the SVG to a 256px PNG and stores it as
// DialIcon upload with via: 'suggested' so Edit reopens that tab. Alternatives we did not
// take: hotlink svgl.app every New Tab; bundle 665 SVGs at build time;
// store SVG text and mint a blob: URL each load (would keep vectors).
import type { ThemeName } from '@/src/types';
import { createCatalogLoader } from '@/src/lib/catalogCache';
import { hostnameOf, normalizeUrl } from '@/src/lib/format';
import { rasterizeRemoteToPng, rasterizeSvgToPng } from '@/src/lib/iconRaster';
import { STORAGE_KEYS, getLocal, setLocal } from '@/src/lib/storage';

export const SVGL_CACHE_MS = 5 * 60 * 1000;
const CATALOG_URL = 'https://api.svgl.app';
const CATALOG_VERSION = 1;

export type SvglRow = {
  title: string;
  path: string;
  light: string;
  dark: string;
};

export type SvglCatalog = {
  version: typeof CATALOG_VERSION;
  fetchedAt: number;
  byHost: Record<string, SvglRow[]>;
};

type SvglApiRoute = string | { light?: string; dark?: string };
type SvglApiItem = {
  title?: string;
  url?: string;
  route?: SvglApiRoute;
};

export const loadSvglCatalog = createCatalogLoader<SvglCatalog>({
  ttlMs: SVGL_CACHE_MS,
  readDisk,
  fetchFresh: fetchCatalog,
  writeDisk: (next) => setLocal(STORAGE_KEYS.svglCatalog, next),
});

export function matchSvgl(pageUrl: string, catalog: SvglCatalog | null): SvglRow | null {
  // Longest matching path prefix wins; exact host beats a parent-domain match at the same length.
  if (!catalog) return null;
  let parsed: URL;
  try {
    parsed = new URL(normalizeUrl(pageUrl));
  } catch {
    return null;
  }
  const host = hostnameOf(parsed.href);
  if (!host) return null;
  const dialPath = normalizePath(parsed.pathname);
  const attempts = hostPathAttempts(host, dialPath);

  let best: SvglRow | null = null;
  let bestLen = -1;
  let bestExact = false;
  for (const attempt of attempts) {
    const rows = catalog.byHost[attempt.host] ?? [];
    for (const row of rows) {
      if (attempt.host !== host && row.path === '/') continue; // don't let google.com/ steal Drive
      if (!pathPrefixOk(row.path, attempt.path)) continue;
      const len = pathScore(row.path);
      const exact = attempt.host === host;
      if (len > bestLen || (len === bestLen && exact && !bestExact)) {
        best = row;
        bestLen = len;
        bestExact = exact;
      }
    }
  }
  return best;
}

// drive.google.com/… also looks at google.com rows (SVGL lists Drive as google.com/drive).
function hostPathAttempts(host: string, dialPath: string): Array<{ host: string; path: string }> {
  const attempts: Array<{ host: string; path: string }> = [{ host, path: dialPath }];
  const labels = host.split('.');
  if (labels.length < 3) return attempts;
  const sub = labels[0] ?? '';
  const parent = labels.slice(1).join('.');
  if (!sub || !parent) return attempts;
  attempts.push({ host: parent, path: dialPath });
  const productPath = normalizePath(`/${sub}`);
  if (productPath !== '/' && productPath !== dialPath) {
    attempts.push({ host: parent, path: productPath });
  }
  return attempts;
}

export function svglIconHref(row: SvglRow, theme: ThemeName): string {
  return theme === 'light' ? row.light : row.dark;
}

// Persist a suggested mark as a PNG data URL.
//
// `href` is the catalog preview URL (https://svgl.app/library/reddit.svg).
// Do not fetch or draw that host: it has no Access-Control-Allow-Origin, so
// Chrome blocks fetch() from chrome-extension:// and still logs CORS when
// the rejection is caught. Map the filename onto api.svgl.app (CORS *) and
// rasterize from there. Prefer loading the API URL as an <img> (one GET);
// if that fails, fetch SVG text from the same API URL and rasterize locally.
export async function fetchSvgAsDataUrl(href: string): Promise<string> {
  const apiUrl = apiSvgUrl(href);
  if (!apiUrl) {
    throw new Error('Could not download the suggested logo');
  }
  try {
    return await rasterizeRemoteToPng(apiUrl);
  } catch {
    try {
      const text = await fetchSvgText(apiUrl);
      if (!text.includes('<svg')) {
        throw new Error('Could not download the suggested logo');
      }
      return await rasterizeSvgToPng(text);
    } catch (error) {
      throw toSaveError(error);
    }
  }
}

// Catalog `route` is https://svgl.app/library/{file}.svg (preview <img> only).
// The download endpoint is GET https://api.svgl.app/svg/{file}.svg
// (Access-Control-Allow-Origin: *). Filename is the last path segment.
function apiSvgUrl(href: string): string | null {
  const file = fileNameOf(href);
  return file ? `https://api.svgl.app/svg/${file}` : null;
}

function fileNameOf(href: string): string {
  try {
    const path = new URL(href).pathname;
    return path.split('/').filter(Boolean).pop() ?? '';
  } catch {
    return '';
  }
}

// fetch() only api.svgl.app. Never pass svgl.app — CORS is not present there.
async function fetchSvgText(url: string): Promise<string> {
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) {
    throw new Error('Could not download the suggested logo');
  }
  return response.text();
}

function toSaveError(error: unknown): Error {
  const message = error instanceof Error ? error.message : '';
  if (!message || /failed to fetch|networkerror|load failed/i.test(message)) {
    return new Error('Could not download the suggested logo. Check your connection and try again.');
  }
  return error instanceof Error ? error : new Error('Could not download the suggested logo');
}

async function readDisk(): Promise<SvglCatalog | null> {
  const stored = await getLocal<SvglCatalog | null>(STORAGE_KEYS.svglCatalog, null);
  if (!stored || stored.version !== CATALOG_VERSION || !stored.byHost) return null;
  return stored;
}

async function fetchCatalog(): Promise<SvglCatalog> {
  const response = await fetch(CATALOG_URL);
  if (!response.ok) {
    throw new Error(`SVGL catalog ${response.status}`);
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('SVGL catalog was not a list');
  }
  return {
    version: CATALOG_VERSION,
    fetchedAt: Date.now(),
    byHost: ingest(data as SvglApiItem[]),
  };
}

function ingest(items: SvglApiItem[]): Record<string, SvglRow[]> {
  const byHost: Record<string, SvglRow[]> = {};
  for (const item of items) {
    const row = toRow(item);
    if (!row) continue;
    const list = byHost[row.host] ?? [];
    list.push(row.entry);
    byHost[row.host] = list;
  }
  return byHost;
}

function toRow(item: SvglApiItem): { host: string; entry: SvglRow } | null {
  const title = item.title?.trim();
  const page = item.url?.trim();
  const routes = splitRoute(item.route);
  if (!title || !page || !routes) return null;
  let parsed: URL;
  try {
    parsed = new URL(page);
  } catch {
    return null;
  }
  const host = hostnameOf(parsed.href);
  if (!host) return null;
  return {
    host,
    entry: {
      title,
      path: normalizePath(parsed.pathname),
      light: routes.light,
      dark: routes.dark,
    },
  };
}

function splitRoute(route: SvglApiRoute | undefined): { light: string; dark: string } | null {
  if (typeof route === 'string') {
    const href = absoluteIconUrl(route);
    return href ? { light: href, dark: href } : null;
  }
  if (!route || typeof route !== 'object') return null;
  const light = absoluteIconUrl(route.light ?? route.dark);
  const dark = absoluteIconUrl(route.dark ?? route.light);
  if (!light || !dark) return null;
  return { light, dark };
}

function absoluteIconUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed, 'https://svgl.app/').href;
  } catch {
    return null;
  }
}

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

function pathPrefixOk(entryPath: string, dialPath: string): boolean {
  const entry = normalizePath(entryPath);
  const dial = normalizePath(dialPath);
  if (entry === '/') return true;
  return dial === entry || dial.startsWith(`${entry}/`);
}

function pathScore(entryPath: string): number {
  const path = normalizePath(entryPath);
  return path === '/' ? 1 : path.length;
}

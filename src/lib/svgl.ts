/**
 * SVGL brand marks for speed-dial tiles.
 *
 * Catalog vs files
 * SVGL's API is a JSON phone book (~665 brands: title, site url, SVG hrefs),
 * not a folder of images. We cache that index 5 minutes in RAM +
 * chrome.storage.local (opendial.svglCatalog). It is not part of backup JSON.
 * Matching is local: hostname, then longest path prefix (github.com vs
 * github.com/features/copilot). Product hosts also search the parent domain
 * (drive.google.com uses google.com/drive). Homepage `/` on the parent is
 * ignored so Drive does not fall through to the Google mark. Do not use
 * ?search= — that is title search and ranks Copilot first for "github".
 *
 * When we hit the network
 * Add site loads the catalog when the modal opens (Suggested is default).
 * Edit with a suggested-origin tile does the same; other edits load it only
 * after the user clicks Suggested. Never refetch while typing. SVGL rate-limits at 5 req / 10s then a 3-minute lockout; in-flight
 * coalescing plus the TTL stay under that. Preview <img> may use svgl.app
 * (display-only). Save never fetch()es svgl.app — it has no
 * Access-Control-Allow-Origin, and Chrome logs CORS even if we catch it.
 * Download and rasterize go through api.svgl.app (CORS *).
 *
 * Why PNG data URLs, not SVG on disk
 * The extension package is read-only at runtime — we cannot write
 * chrome-extension://id/reddit.svg. Persistence is chrome.storage (a
 * key/value DB). A data: URL embeds the file in the stored string so New Tab
 * does not call SVGL again. data:image/svg+xml is blocked as an <img> src on
 * Chrome extension pages (SVG can carry script). data:image/png is allowed.
 * Suggested Save rasterizes the SVG to a 256px PNG and stores it as
 * DialIcon upload with via: 'suggested' so Edit reopens that tab. Alternatives we did not
 * take: hotlink svgl.app every New Tab; bundle 665 SVGs at build time;
 * store SVG text and mint a blob: URL each load (would keep vectors).
 */
import type { ThemeName } from '@/src/types';
import { hostnameOf, normalizeUrl } from '@/src/lib/format';
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

let memory: SvglCatalog | null = null;
let inflight: Promise<SvglCatalog | null> | null = null;

export async function loadSvglCatalog(): Promise<SvglCatalog | null> {
  if (memory && isFresh(memory)) return memory;
  if (inflight) return inflight;
  inflight = loadCatalogInner().finally(() => {
    inflight = null;
  });
  return inflight;
}

export function matchSvgl(pageUrl: string, catalog: SvglCatalog | null): SvglRow | null {
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
      if (attempt.host !== host && row.path === '/') continue;
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

/** drive.google.com/… also looks at google.com rows (SVGL lists Drive as google.com/drive). */
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

const ICON_RASTER_SIZE = 256;

/**
 * Persist a suggested mark as a PNG data URL.
 *
 * `href` is the catalog preview URL (https://svgl.app/library/reddit.svg).
 * Do not fetch or draw that host: it has no Access-Control-Allow-Origin, so
 * Chrome blocks fetch() from chrome-extension:// and still logs CORS when
 * the rejection is caught. Map the filename onto api.svgl.app (CORS *) and
 * rasterize from there. Prefer loading the API URL as an <img> (one GET);
 * if that fails, fetch SVG text from the same API URL and rasterize locally.
 */
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

export function isSvgDataUrl(value: string): boolean {
  return value.startsWith('data:image/svg+xml');
}

export async function rasterizeSvgDataUrl(dataUrl: string): Promise<string> {
  return rasterizeSvgToPng(svgTextFromDataUrl(dataUrl));
}

/** Draw SVG markup via a blob: URL. NTP blocks data:image/svg+xml as <img> src. */
export async function rasterizeSvgToPng(svgText: string, size = ICON_RASTER_SIZE): Promise<string> {
  const prepared = prepareSvg(svgText, size);
  const objectUrl = URL.createObjectURL(
    new Blob([prepared], { type: 'image/svg+xml;charset=utf-8' }),
  );
  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not draw the suggested logo');
    ctx.drawImage(image, 0, 0, size, size);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function prepareSvg(svgText: string, size: number): string {
  let svg = svgText.trim();
  if (!/\sxmlns=/.test(svg)) {
    svg = svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!/<svg[^>]*\bwidth=/i.test(svg)) {
    svg = svg.replace(/<svg\b/i, `<svg width="${size}" height="${size}"`);
  }
  return svg;
}

function svgTextFromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : '';
  if (/;base64,/i.test(dataUrl)) {
    const binary = atob(payload);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return decodeURIComponent(payload);
}

/**
 * Draw an HTTPS SVG into a canvas. `crossOrigin = anonymous` is required so
 * the canvas is not tainted and toDataURL('image/png') is allowed. Only pass
 * api.svgl.app URLs — svgl.app would fail this CORS check.
 */
async function rasterizeRemoteToPng(url: string, size = ICON_RASTER_SIZE): Promise<string> {
  const image = await loadImage(url, 'anonymous');
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not draw the suggested logo');
  ctx.drawImage(image, 0, 0, size, size);
  return canvas.toDataURL('image/png');
}

function loadImage(src: string, crossOrigin?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Must set crossOrigin before src, or the first request is a no-CORS load.
    if (crossOrigin) image.crossOrigin = crossOrigin;
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not draw the suggested logo'));
    image.src = src;
  });
}

/**
 * Catalog `route` is https://svgl.app/library/{file}.svg (preview <img> only).
 * The download endpoint is GET https://api.svgl.app/svg/{file}.svg
 * (Access-Control-Allow-Origin: *). Filename is the last path segment.
 */
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

/** fetch() only api.svgl.app. Never pass svgl.app — CORS is not present there. */
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

async function loadCatalogInner(): Promise<SvglCatalog | null> {
  const disk = await readDisk();
  if (disk && isFresh(disk)) {
    memory = disk;
    return disk;
  }

  try {
    const next = await fetchCatalog();
    memory = next;
    await setLocal(STORAGE_KEYS.svglCatalog, next);
    return next;
  } catch {
    if (disk) {
      memory = disk;
      return disk;
    }
    if (memory) return memory;
    return null;
  }
}

async function readDisk(): Promise<SvglCatalog | null> {
  const stored = await getLocal<SvglCatalog | null>(STORAGE_KEYS.svglCatalog, null);
  if (!stored || stored.version !== CATALOG_VERSION || !stored.byHost) return null;
  return stored;
}

function isFresh(catalog: SvglCatalog): boolean {
  return Date.now() - catalog.fetchedAt < SVGL_CACHE_MS;
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

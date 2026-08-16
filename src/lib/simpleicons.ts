/**
 * Simple Icons fallback when SVGL has no row for the dial URL.
 *
 * Catalog is the npm JSON on jsDelivr (not GitHub). Match hostname → slug
 * (github.com → github), then aliases in the file. Product hosts like
 * drive.google.com (or google.com/drive) map to googledrive before the
 * generic google slug. Preview uses cdn.simpleicons.org (brand color).
 * Save fetches the SVG from jsDelivr (CORS *) and rasterizes to PNG.
 */
import { hostnameOf, normalizeUrl } from '@/src/lib/format';
import { STORAGE_KEYS, getLocal, setLocal } from '@/src/lib/storage';
import { rasterizeSvgToPng } from '@/src/lib/svgl';

export const SIMPLE_ICONS_CACHE_MS = 5 * 60 * 1000;
const CATALOG_VERSION = 1;
const SI_MAJOR = '16';
const CATALOG_URL = `https://cdn.jsdelivr.net/npm/simple-icons@${SI_MAJOR}/data/simple-icons.json`;

export type SimpleIconRow = {
  title: string;
  slug: string;
  hex: string;
};

export type SimpleIconsCatalog = {
  version: typeof CATALOG_VERSION;
  fetchedAt: number;
  bySlug: Record<string, SimpleIconRow>;
};

type SimpleIconsApiItem = {
  title?: string;
  slug?: string;
  hex?: string;
  aliases?: { aka?: string[]; old?: string[] };
};

const HOST_SLUG: Record<string, string> = {
  'youtu.be': 'youtube',
  'youtube.com': 'youtube',
  'x.com': 'x',
  'twitter.com': 'x',
  't.co': 'x',
  'gmail.com': 'gmail',
  'google.com': 'google',
  'chatgpt.com': 'openai',
  'openai.com': 'openai',
  'reddit.com': 'reddit',
  'stackoverflow.com': 'stackoverflow',
  'stackexchange.com': 'stackexchange',
  'wikipedia.org': 'wikipedia',
  'instagram.com': 'instagram',
  'facebook.com': 'facebook',
  'fb.com': 'facebook',
  'linkedin.com': 'linkedin',
  'whatsapp.com': 'whatsapp',
  'netflix.com': 'netflix',
  'twitch.tv': 'twitch',
  'discord.com': 'discord',
  'discord.gg': 'discord',
};

/** Subdomain or first path segment on google.com → Simple Icons slug. */
const GOOGLE_PRODUCT_SLUG: Record<string, string> = {
  drive: 'googledrive',
  docs: 'googledocs',
  sheets: 'googlesheets',
  slides: 'googleslides',
  mail: 'gmail',
  calendar: 'googlecalendar',
  photos: 'googlephotos',
  maps: 'googlemaps',
  meet: 'meet',
  news: 'googlenews',
  chat: 'googlechat',
  classroom: 'googleclassroom',
  keep: 'googlekeep',
  fonts: 'googlefonts',
  translate: 'googletranslate',
  scholar: 'googlescholar',
};

let memory: SimpleIconsCatalog | null = null;
let inflight: Promise<SimpleIconsCatalog | null> | null = null;

export async function loadSimpleIconsCatalog(): Promise<SimpleIconsCatalog | null> {
  if (memory && isFresh(memory)) return memory;
  if (inflight) return inflight;
  inflight = loadCatalogInner().finally(() => {
    inflight = null;
  });
  return inflight;
}

export function googleProductSlug(pageUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(normalizeUrl(pageUrl));
  } catch {
    return null;
  }
  const host = hostnameOf(parsed.href);
  if (!host) return null;
  const pathSeg = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
  if (host.endsWith('.google.com')) {
    const sub = host.split('.')[0] ?? '';
    return GOOGLE_PRODUCT_SLUG[sub] ?? null;
  }
  if (host === 'google.com' && pathSeg) {
    return GOOGLE_PRODUCT_SLUG[pathSeg] ?? null;
  }
  return null;
}

export function matchSimpleIcon(
  pageUrl: string,
  catalog: SimpleIconsCatalog | null,
): SimpleIconRow | null {
  if (!catalog) return null;
  for (const slug of slugCandidates(pageUrl)) {
    const row = catalog.bySlug[slug];
    if (row) return row;
  }
  return null;
}

export function simpleIconPreviewHref(row: SimpleIconRow): string {
  return `https://cdn.simpleicons.org/${row.slug}/${row.hex}`;
}

export async function fetchSimpleIconPng(row: SimpleIconRow): Promise<string> {
  const url = `https://cdn.jsdelivr.net/npm/simple-icons@${SI_MAJOR}/icons/${row.slug}.svg`;
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) {
    throw new Error('Could not download the suggested logo');
  }
  const text = await response.text();
  if (!text.includes('<svg')) {
    throw new Error('Could not download the suggested logo');
  }
  const colored = text.replace(/<svg\b/i, `<svg fill="#${row.hex}"`);
  return rasterizeSvgToPng(colored);
}

function slugCandidates(pageUrl: string): string[] {
  let parsed: URL;
  try {
    parsed = new URL(normalizeUrl(pageUrl));
  } catch {
    return [];
  }
  const host = hostnameOf(parsed.href);
  if (!host) return [];
  const labels = host.split('.');
  const pathSeg = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
  const guessed: string[] = [];

  const mapped = HOST_SLUG[host];
  if (mapped) guessed.push(mapped);

  // drive.google.com and google.com/drive → googledrive, before falling back to google
  if (host === 'google.com' || host.endsWith('.google.com')) {
    const product = host.endsWith('.google.com') ? labels[0] : pathSeg;
    const googleSlug = product ? GOOGLE_PRODUCT_SLUG[product] : undefined;
    if (googleSlug) guessed.push(googleSlug);
    if (product) {
      guessed.push(titleToSlug(`google${product}`));
      guessed.push(titleToSlug(product));
    }
  }

  if (labels[0]) guessed.push(titleToSlug(labels[0]));
  if (labels.length >= 3) guessed.push(titleToSlug(`${labels[0]}${labels[1]}`));
  if (labels.length >= 3) guessed.push(titleToSlug(labels[labels.length - 2] ?? ''));
  return [...new Set(guessed.filter(Boolean))];
}

function titleToSlug(title: string): string {
  const replacements: Record<string, string> = {
    '+': 'plus',
    '.': 'dot',
    '&': 'and',
  };
  return title
    .toLowerCase()
    .replace(/[+.&]/g, (char) => replacements[char] ?? '')
    .normalize('NFD')
    .replace(/[^a-z\d]/g, '');
}

async function loadCatalogInner(): Promise<SimpleIconsCatalog | null> {
  const disk = await readDisk();
  if (disk && isFresh(disk)) {
    memory = disk;
    return disk;
  }
  try {
    const next = await fetchCatalog();
    memory = next;
    await setLocal(STORAGE_KEYS.simpleIconsCatalog, next);
    return next;
  } catch {
    if (disk) {
      memory = disk;
      return disk;
    }
    return memory;
  }
}

async function readDisk(): Promise<SimpleIconsCatalog | null> {
  const stored = await getLocal<SimpleIconsCatalog | null>(
    STORAGE_KEYS.simpleIconsCatalog,
    null,
  );
  if (!stored || stored.version !== CATALOG_VERSION || !stored.bySlug) return null;
  return stored;
}

function isFresh(catalog: SimpleIconsCatalog): boolean {
  return Date.now() - catalog.fetchedAt < SIMPLE_ICONS_CACHE_MS;
}

async function fetchCatalog(): Promise<SimpleIconsCatalog> {
  const response = await fetch(CATALOG_URL);
  if (!response.ok) throw new Error(`Simple Icons catalog ${response.status}`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('Simple Icons catalog was not a list');
  return {
    version: CATALOG_VERSION,
    fetchedAt: Date.now(),
    bySlug: ingest(data as SimpleIconsApiItem[]),
  };
}

function ingest(items: SimpleIconsApiItem[]): Record<string, SimpleIconRow> {
  const bySlug: Record<string, SimpleIconRow> = {};
  for (const item of items) {
    const title = item.title?.trim();
    const hex = item.hex?.trim();
    if (!title || !hex) continue;
    const slug = (item.slug?.trim() || titleToSlug(title)).toLowerCase();
    const row: SimpleIconRow = { title, slug, hex };
    bySlug[slug] = row;
    for (const alias of [...(item.aliases?.aka ?? []), ...(item.aliases?.old ?? [])]) {
      const aliasSlug = titleToSlug(alias);
      if (aliasSlug && !bySlug[aliasSlug]) bySlug[aliasSlug] = row;
    }
  }
  return bySlug;
}

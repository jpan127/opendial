// URL, favicon, and display helpers shared by dials and the sidebar.
import { browser } from 'wxt/browser';

// Chrome’s extension favicon service (`favicon` permission).
export function faviconUrl(pageUrl: string, size = 64): string {
  const url = new URL(`chrome-extension://${browser.runtime.id}/_favicon/`);
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', String(size));
  return url.toString();
}

// Hostname without a leading `www.`; null if `url` is not absolute.
export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// Accepts `github.com` or a full URL; prepends https when the scheme is missing.
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('URL is required');
  }
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) {
    const value = (n / 1000).toFixed(1).replace(/\.0$/, '');
    return `${value}k`;
  }
  return `${Math.round(n / 1000)}k`;
}

// Compact age for recently closed rows. Chrome sessions use seconds, not ms.
export function relativeTime(epochSeconds: number): string {
  const deltaMs = Date.now() - epochSeconds * 1000;
  const minutes = Math.max(0, Math.round(deltaMs / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function ageLabel(thenMs: number, nowMs = Date.now()): string {
  const minutes = Math.max(0, Math.round((nowMs - thenMs) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return '1 hr ago';
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export function waitMinutesLabel(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return minutes === 1 ? '1 min' : `${minutes} min`;
}

export function monogram(label: string): string {
  const cleaned = label.replace(/^www\./, '').trim();
  return (cleaned[0] ?? '?').toUpperCase();
}

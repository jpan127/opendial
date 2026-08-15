import { browser } from 'wxt/browser';
import type { SearchEngine } from '@/src/types';

export const GEMINI_QUERY_KEY = 'opendial.geminiQuery';

export const ENGINES: {
  id: SearchEngine;
  label: string;
}[] = [
  { id: 'google', label: 'Google' },
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'gemini', label: 'Gemini' },
];

export function engineLabel(id: SearchEngine): string {
  return ENGINES.find((engine) => engine.id === id)?.label ?? 'Google';
}

export async function submitSearch(engine: SearchEngine, query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;

  if (engine === 'google') {
    window.location.assign(
      `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`,
    );
    return;
  }

  if (engine === 'chatgpt') {
    window.location.assign(
      `https://chatgpt.com/?q=${encodeURIComponent(trimmed)}`,
    );
    return;
  }

  await browser.storage.session.set({ [GEMINI_QUERY_KEY]: trimmed });
  window.location.assign('https://gemini.google.com/app');
}

export function geminiFallbackUrl(query: string): string {
  return `https://www.google.com/search?udm=50&q=${encodeURIComponent(query)}`;
}

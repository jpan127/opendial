// Search submit. Google navigates immediately.
// ChatGPT/Gemini stash the prompt, then open the site so the content script can fill the box.
import type { SearchEngine } from '@/src/types';
import {
  CHATGPT_QUERY_KEY,
  GEMINI_QUERY_KEY,
  stashPrompt,
} from '@/src/lib/pendingPrompt';

export { CHATGPT_QUERY_KEY, GEMINI_QUERY_KEY };

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
  const encoded = encodeURIComponent(trimmed);

  if (engine === 'google') {
    window.location.assign(`https://www.google.com/search?q=${encoded}`);
    return;
  }

  if (engine === 'chatgpt') {
    await stashPrompt(CHATGPT_QUERY_KEY, trimmed);
    window.location.assign(`https://chatgpt.com/?q=${encoded}&prompt=${encoded}`);
    return;
  }

  await stashPrompt(GEMINI_QUERY_KEY, trimmed);
  window.location.assign(
    `https://gemini.google.com/app?q=${encoded}&prompt=${encoded}`,
  );
}

// One-shot prompt handoff to ChatGPT/Gemini content scripts.
// URL `q`/`prompt` is a fallback if storage is slow or blocked.
import { browser } from 'wxt/browser';

export const GEMINI_QUERY_KEY = 'opendial.geminiQuery';
export const CHATGPT_QUERY_KEY = 'opendial.chatgptQuery';

// Ignore a stash older than this so a leftover prompt cannot fill a later visit.
const MAX_AGE_MS = 60_000;

type PendingPrompt = {
  text: string;
  at: number;
};

export async function stashPrompt(key: string, text: string): Promise<void> {
  const payload: PendingPrompt = { text, at: Date.now() };
  await browser.storage.local.set({ [key]: payload });
}

export async function readStashedPrompt(key: string): Promise<string | null> {
  try {
    const stored = await browser.storage.local.get(key);
    const value = stored[key] as PendingPrompt | string | undefined;
    if (!value) return null;
    if (typeof value === 'string') return value.trim() || null; // older backups stored a bare string
    if (Date.now() - value.at > MAX_AGE_MS) return null;
    return value.text.trim() || null;
  } catch {
    return null;
  }
}

export async function clearStashedPrompt(key: string): Promise<void> {
  try {
    await browser.storage.local.remove(key);
    } catch {
      // content scripts can be denied storage in some contexts
    }
}

export function queryFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return (params.get('prompt') || params.get('q'))?.trim() || null;
}

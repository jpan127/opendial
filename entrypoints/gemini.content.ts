import { geminiFallbackUrl, GEMINI_QUERY_KEY } from '@/src/lib/search';

export default defineContentScript({
  matches: ['https://gemini.google.com/*'],
  runAt: 'document_idle',
  async main() {
    const stored = await browser.storage.session.get(GEMINI_QUERY_KEY);
    const query = stored[GEMINI_QUERY_KEY];
    if (typeof query !== 'string' || !query.trim()) return;
    await browser.storage.session.remove(GEMINI_QUERY_KEY);

    const filled = await fillGemini(query.trim());
    if (!filled) {
      window.location.replace(geminiFallbackUrl(query.trim()));
    }
  },
});

async function fillGemini(query: string): Promise<boolean> {
  const deadline = Date.now() + 12_000;

  while (Date.now() < deadline) {
    const editor = findEditor();
    if (editor) {
      editor.focus();
      const ok =
        document.execCommand('insertText', false, query) ||
        setEditorText(editor, query);
      if (ok) {
        await wait(250);
        clickSend();
        return true;
      }
    }
    await wait(300);
  }

  return false;
}

function findEditor(): HTMLElement | null {
  const selectors = [
    'div.ql-editor[contenteditable="true"]',
    'rich-textarea [contenteditable="true"]',
    '[contenteditable="true"][role="textbox"]',
    'textarea',
    '[contenteditable="true"]',
  ];
  for (const selector of selectors) {
    const node = document.querySelector<HTMLElement>(selector);
    if (node && isVisible(node)) return node;
  }
  return null;
}

function setEditorText(editor: HTMLElement, query: string): boolean {
  if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
    editor.value = query;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  editor.textContent = query;
  editor.dispatchEvent(new InputEvent('input', { bubbles: true, data: query }));
  return Boolean(editor.textContent);
}

function clickSend(): void {
  const send = document.querySelector<HTMLElement>(
    'button[aria-label*="Send" i], button[aria-label*="submit" i]',
  );
  send?.click();
}

function isVisible(node: HTMLElement): boolean {
  const rect = node.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

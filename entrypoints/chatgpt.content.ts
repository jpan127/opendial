import { fillComposer, isVisible, waitForEditor } from '@/src/lib/fillComposer';
import { CHATGPT_QUERY_KEY } from '@/src/lib/search';

export default defineContentScript({
  matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
  runAt: 'document_idle',
  async main() {
    const query = await readQuery();
    if (!query) return;

    const editor = await waitForEditor(findEditor);
    if (!editor) {
      await browser.storage.session.remove(CHATGPT_QUERY_KEY);
      return;
    }
    fillComposer(editor, query);
    await browser.storage.session.remove(CHATGPT_QUERY_KEY);
  },
});

async function readQuery(): Promise<string | null> {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('prompt') || params.get('q');
  const stored = await browser.storage.session.get(CHATGPT_QUERY_KEY);
  const fromStore = stored[CHATGPT_QUERY_KEY];
  const query = typeof fromStore === 'string' ? fromStore : fromUrl;
  return query?.trim() || null;
}

function findEditor(): HTMLElement | null {
  const selectors = [
    '#prompt-textarea',
    'div#prompt-textarea[contenteditable="true"]',
    'div.ProseMirror[contenteditable="true"]',
    '[data-placeholder][contenteditable="true"]',
    'textarea[name="prompt-textarea"]',
    '[contenteditable="true"][role="textbox"]',
  ];
  for (const selector of selectors) {
    const node = document.querySelector<HTMLElement>(selector);
    if (node && isVisible(node)) return node;
  }
  return null;
}

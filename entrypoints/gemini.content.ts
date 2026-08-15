import { fillComposer, isVisible, waitForEditor } from '@/src/lib/fillComposer';
import {
  GEMINI_QUERY_KEY,
  clearStashedPrompt,
  queryFromUrl,
  readStashedPrompt,
} from '@/src/lib/pendingPrompt';

export default defineContentScript({
  matches: ['https://gemini.google.com/*'],
  runAt: 'document_idle',
  async main() {
    const query = (await readStashedPrompt(GEMINI_QUERY_KEY)) || queryFromUrl();
    if (!query) return;

    const editor = await waitForEditor(findEditor);
    if (!editor) {
      await clearStashedPrompt(GEMINI_QUERY_KEY);
      return;
    }
    fillComposer(editor, query);
    await clearStashedPrompt(GEMINI_QUERY_KEY);
  },
});

function findEditor(): HTMLElement | null {
  const selectors = [
    'div[contenteditable="true"][role="textbox"]',
    'rich-textarea [contenteditable="true"]',
    'div.ql-editor[contenteditable="true"]',
    '[aria-label="Enter a prompt here"]',
    '[aria-label*="prompt" i][contenteditable="true"]',
    'textarea',
    '[contenteditable="true"]',
  ];
  for (const selector of selectors) {
    const node = document.querySelector<HTMLElement>(selector);
    if (node && isVisible(node)) return node;
  }
  return null;
}

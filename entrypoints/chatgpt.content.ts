import { fillComposer, isVisible, waitForEditor } from '@/src/lib/fillComposer';
import {
  CHATGPT_QUERY_KEY,
  clearStashedPrompt,
  queryFromUrl,
  readStashedPrompt,
} from '@/src/lib/pendingPrompt';

export default defineContentScript({
  matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
  runAt: 'document_idle',
  async main() {
    const query = (await readStashedPrompt(CHATGPT_QUERY_KEY)) || queryFromUrl();
    if (!query) return;

    const editor = await waitForEditor(findEditor);
    if (!editor) {
      await clearStashedPrompt(CHATGPT_QUERY_KEY);
      return;
    }
    fillComposer(editor, query);
    await clearStashedPrompt(CHATGPT_QUERY_KEY);
  },
});

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

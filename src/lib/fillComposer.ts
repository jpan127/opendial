// Fill ChatGPT/Gemini composers. Sites often ignore a plain `.value =`.
// Native value setter + input events, then execCommand, then textContent.
export function fillComposer(editor: HTMLElement, query: string): boolean {
  editor.focus();

  if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
    const proto = editor instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter?.call(editor, query); // bypass React-style value interceptors
    editor.value = query;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
    return Boolean(editor.value);
  }

  // contenteditable / ProseMirror path
  document.execCommand('selectAll', false);
  const inserted = document.execCommand('insertText', false, query);
  if (inserted) return true;

  editor.textContent = query;
  editor.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data: query,
      inputType: 'insertText',
    }),
  );
  return Boolean(editor.textContent?.trim());
}

export function isVisible(node: HTMLElement): boolean {
  const rect = node.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// Poll until the page mounts a visible editor (SPAs load after document_idle).
export async function waitForEditor(
  find: () => HTMLElement | null,
  timeoutMs = 15_000,
): Promise<HTMLElement | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const editor = find();
    if (editor) return editor;
    await wait(250);
  }
  return null;
}

export function fillComposer(editor: HTMLElement, query: string): boolean {
  editor.focus();

  if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
    const proto = editor instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter?.call(editor, query);
    editor.value = query;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
    return Boolean(editor.value);
  }

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

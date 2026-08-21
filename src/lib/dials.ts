// Speed-dial list helpers. `order` is the persisted sort key (0…n-1 after a drag).
import type { Dial } from '@/src/types';

export function sortedDials(dials: Dial[]): Dial[] {
  return [...dials].sort((a, b) => a.order - b.order);
}

export function nextOrder(dials: Dial[]): number {
  return dials.reduce((max, dial) => Math.max(max, dial.order), -1) + 1;
}

// Move `fromId` to `toId`’s index and reindex `order`.
export function reorderDials(dials: Dial[], fromId: string, toId: string): Dial[] {
  const ordered = sortedDials(dials);
  const fromIndex = ordered.findIndex((dial) => dial.id === fromId);
  const toIndex = ordered.findIndex((dial) => dial.id === toId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return dials;

  const [moved] = ordered.splice(fromIndex, 1);
  if (!moved) return dials;
  ordered.splice(toIndex, 0, moved);
  return ordered.map((dial, index) => ({ ...dial, order: index }));
}

// Dropping on the Add tile appends the dragged dial.
export function moveDialToEnd(dials: Dial[], fromId: string): Dial[] {
  const ordered = sortedDials(dials);
  const fromIndex = ordered.findIndex((dial) => dial.id === fromId);
  if (fromIndex < 0 || fromIndex === ordered.length - 1) return dials;

  const [moved] = ordered.splice(fromIndex, 1);
  if (!moved) return dials;
  ordered.push(moved);
  return ordered.map((dial, index) => ({ ...dial, order: index }));
}

export function sameDialOrder(a: Dial[], b: Dial[]): boolean {
  const left = sortedDials(a);
  const right = sortedDials(b);
  return left.length === right.length && left.every((dial, index) => dial.id === right[index]?.id);
}

export function createDial(input: {
  name: string;
  url: string;
  icon: Dial['icon'];
  order: number;
}): Dial {
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    url: input.url,
    icon: input.icon,
    order: input.order,
    createdAt: Date.now(),
  };
}

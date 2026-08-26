// Dock widget ids and order helpers. Hidden widgets stay in the saved list.
import {
  DEFAULT_WIDGET_ORDER,
  MAX_DOCK_WIDTH,
  MIN_DOCK_WIDTH,
  WIDGET_IDS,
  type WidgetId,
} from '@/src/types';

const KNOWN = new Set<string>(WIDGET_IDS);

export function normalizeWidgetOrder(stored: string[]): WidgetId[] {
  const seen = new Set<WidgetId>();
  const next: WidgetId[] = [];
  for (const id of stored) {
    if (id === 'now') {
      for (const split of ['clock', 'weather'] as const) {
        if (seen.has(split)) continue;
        seen.add(split);
        next.push(split);
      }
      continue;
    }
    if (!KNOWN.has(id) || seen.has(id as WidgetId)) continue;
    seen.add(id as WidgetId);
    next.push(id as WidgetId);
  }
  for (const id of DEFAULT_WIDGET_ORDER) {
    if (!seen.has(id)) next.push(id);
  }
  return next;
}

export function sameWidgetOrder(a: WidgetId[], b: WidgetId[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

// Reorder two visible cards; ids that are off stay in their slots.
export function reorderVisibleWidgets(
  full: WidgetId[],
  visible: WidgetId[],
  fromId: WidgetId,
  toId: WidgetId,
): WidgetId[] {
  const vis = visible.slice();
  const from = vis.indexOf(fromId);
  const to = vis.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return full;
  const [moved] = vis.splice(from, 1);
  if (!moved) return full;
  vis.splice(to, 0, moved);
  const visSet = new Set(visible);
  let index = 0;
  return full.map((id) => (visSet.has(id) ? vis[index++]! : id));
}

export function clampDockWidth(px: number, maxCap = MAX_DOCK_WIDTH): number {
  const max = Math.min(maxCap, Math.floor(window.innerWidth * 0.7));
  return Math.min(max, Math.max(MIN_DOCK_WIDTH, Math.round(px)));
}

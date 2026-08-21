// One speed-dial bookmark as a labeled icon.
//
// Shows the stored icon (favicon, uploaded PNG, or image URL). Legacy SVG
// data URLs are rasterized to PNG first because Chrome blocks SVG `<img>`
// on extension pages. A broken image falls back to a monogram letter.
//
// Left-click navigates (the parent can intercept Ctrl/Cmd-click). Right-click
// edits. Drag: after an 8px move, pointer listeners on `window` drive the
// grid’s ghost; the following click is ignored so a reorder does not also
// open the site. Native HTML5 drag is turned off on the `<a>`.
//
// `DialTileGhost` is the same face, used while dragging so the original
// tile can dim in place.
import type { MouseEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Dial, DialIcon } from '@/src/types';
import { faviconUrl, hostnameOf, monogram } from '@/src/lib/format';
import { isSvgDataUrl, rasterizeSvgDataUrl } from '@/src/lib/iconRaster';

const DRAG_THRESHOLD_PX = 8;

// Pointer origin when a tile drag starts — used to position the ghost.
export type DialDragOrigin = {
  x: number;
  y: number;
  width: number;
  offsetX: number;
  offsetY: number;
  src: string | null;
  broken: boolean;
};

type Props = {
  dial: Dial;
  dragging: boolean;
  onOpen: (event: MouseEvent, dial: Dial) => void;
  onEdit: (dial: Dial) => void;
  onDragBegin: (id: string, origin: DialDragOrigin) => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragOver: (clientX: number, clientY: number) => void;
  onDragEnd: () => void;
};

export function DialTile({
  dial,
  dragging,
  onOpen,
  onEdit,
  onDragBegin,
  onDragMove,
  onDragOver,
  onDragEnd,
}: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const rawSrc = iconSrc(dial.icon, dial.url);
  const [src, setSrc] = useState<string | null>(
    rawSrc && isSvgDataUrl(rawSrc) ? null : rawSrc, // hide SVG until rasterized
  );

  useEffect(() => {
    if (!rawSrc) {
      setSrc(null);
      return;
    }
    if (!isSvgDataUrl(rawSrc)) {
      setSrc(rawSrc);
      return;
    }
    let cancelled = false;
    void rasterizeSvgDataUrl(rawSrc)
      .then((png) => {
        if (!cancelled) setSrc(png);
      })
      .catch(() => {
        if (!cancelled) setSrc(rawSrc);
      });
    return () => {
      cancelled = true;
    };
  }, [rawSrc]);

  const broken = !src || src === failedSrc;
  const origin = useRef<{ x: number; y: number } | null>(null);
  const moving = useRef(false);
  const didDrag = useRef(false);
  const tileRef = useRef<HTMLAnchorElement | null>(null);
  const callbacks = useRef({ onDragBegin, onDragMove, onDragOver, onDragEnd });
  callbacks.current = { onDragBegin, onDragMove, onDragOver, onDragEnd };

  const stopWindowDrag = useRef<(() => void) | null>(null);

  useEffect(() => () => stopWindowDrag.current?.(), []);

  const finishDrag = () => {
    origin.current = null;
    stopWindowDrag.current?.();
    stopWindowDrag.current = null;
    if (!moving.current) return;
    moving.current = false;
    callbacks.current.onDragEnd();
  };

  return (
    <a
      ref={tileRef}
      className={`dial-tile${dragging ? ' is-dragging' : ''}`}
      href={dial.url}
      data-dial-id={dial.id}
      draggable={false}
      onDragStart={(event) => event.preventDefault()} // stop the browser from dragging the <a>
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        stopWindowDrag.current?.();
        origin.current = { x: event.clientX, y: event.clientY };
        moving.current = false;
        didDrag.current = false;

        const onMove = (moveEvent: globalThis.PointerEvent) => {
          if (!origin.current) return;
          const dx = moveEvent.clientX - origin.current.x;
          const dy = moveEvent.clientY - origin.current.y;
          if (!moving.current) {
            if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
            const node = tileRef.current;
            if (!node) return;
            moving.current = true;
            didDrag.current = true;
            const rect = node.getBoundingClientRect();
            callbacks.current.onDragBegin(dial.id, {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              offsetX: moveEvent.clientX - rect.left,
              offsetY: moveEvent.clientY - rect.top,
              src,
              broken,
            });
          }
          callbacks.current.onDragMove(moveEvent.clientX, moveEvent.clientY);
          callbacks.current.onDragOver(moveEvent.clientX, moveEvent.clientY);
        };

        const onUp = () => finishDrag();
        window.addEventListener('pointermove', onMove, { capture: true });
        window.addEventListener('pointerup', onUp, { capture: true });
        window.addEventListener('pointercancel', onUp, { capture: true });
        stopWindowDrag.current = () => {
          window.removeEventListener('pointermove', onMove, { capture: true });
          window.removeEventListener('pointerup', onUp, { capture: true });
          window.removeEventListener('pointercancel', onUp, { capture: true });
        };
      }}
      onClick={(event) => {
        if (didDrag.current) {
          event.preventDefault();
          didDrag.current = false;
          return;
        }
        onOpen(event, dial);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onEdit(dial);
      }}
    >
      <DialFace
        name={dial.name}
        url={dial.url}
        src={src}
        broken={broken}
        onImgError={() => setFailedSrc(src)}
      />
    </a>
  );
}

// Floating copy of a tile that follows the cursor during reorder.
export function DialTileGhost({
  dial,
  src,
  broken,
  ghostRef,
  width,
  x,
  y,
}: {
  dial: Dial;
  src: string | null;
  broken: boolean;
  ghostRef: { current: HTMLDivElement | null };
  width: number;
  x: number;
  y: number;
}) {
  return (
    <div
      ref={ghostRef}
      className="dial-tile dial-tile-ghost"
      aria-hidden
      style={{ width, transform: `translate3d(${x}px, ${y}px, 0) scale(1.06)` }}
    >
      <DialFace name={dial.name} url={dial.url} src={src} broken={broken} />
    </div>
  );
}

function DialFace({
  name,
  url,
  src,
  broken,
  onImgError,
}: {
  name: string;
  url: string;
  src: string | null;
  broken: boolean;
  onImgError?: () => void;
}) {
  return (
    <>
      <span className="dial-icon">
        {src && !broken ? (
          <img key={src} src={src} alt="" draggable={false} onError={onImgError} />
        ) : (
          <span className="monogram">{monogram(name || hostnameOf(url) || '?')}</span>
        )}
      </span>
      <span className="dial-name">{name}</span>
    </>
  );
}

function iconSrc(icon: DialIcon, pageUrl: string): string | null {
  if (icon.kind === 'upload') return icon.dataUrl;
  if (icon.kind === 'url') return icon.href;
  return faviconUrl(pageUrl, 256);
}

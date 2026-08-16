import type { MouseEvent } from 'react';
import { useEffect, useState } from 'react';
import type { Dial, DialIcon } from '@/src/types';
import { faviconUrl, hostnameOf, monogram } from '@/src/lib/format';
import { isSvgDataUrl, rasterizeSvgDataUrl } from '@/src/lib/svgl';

type Props = {
  dial: Dial;
  onOpen: (event: MouseEvent, dial: Dial) => void;
  onEdit: (dial: Dial) => void;
  onDragStart: (id: string) => void;
  onDrop: (id: string) => void;
};

export function DialTile({ dial, onOpen, onEdit, onDragStart, onDrop }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const rawSrc = iconSrc(dial.icon, dial.url);
  const [src, setSrc] = useState<string | null>(
    rawSrc && isSvgDataUrl(rawSrc) ? null : rawSrc,
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

  return (
    <a
      className="dial-tile"
      href={dial.url}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', dial.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart(dial.id);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(dial.id);
      }}
      onClick={(event) => onOpen(event, dial)}
      onContextMenu={(event) => {
        event.preventDefault();
        onEdit(dial);
      }}
    >
      <span className="dial-icon">
        {src && !broken ? (
          <img key={src} src={src} alt="" onError={() => setFailedSrc(src)} />
        ) : (
          <span className="monogram">{monogram(dial.name || hostnameOf(dial.url) || '?')}</span>
        )}
      </span>
      <span className="dial-name">{dial.name}</span>
    </a>
  );
}

function iconSrc(icon: DialIcon, pageUrl: string): string | null {
  if (icon.kind === 'upload') return icon.dataUrl;
  if (icon.kind === 'url') return icon.href;
  return faviconUrl(pageUrl, 256);
}

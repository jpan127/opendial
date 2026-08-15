import type { MouseEvent } from 'react';
import { useState } from 'react';
import type { Dial, DialIcon } from '@/src/types';
import { faviconUrl, hostnameOf, monogram } from '@/src/lib/format';

type Props = {
  dial: Dial;
  onOpen: (event: MouseEvent, dial: Dial) => void;
  onEdit: (dial: Dial) => void;
  onDragStart: (id: string) => void;
  onDrop: (id: string) => void;
};

export function DialTile({ dial, onOpen, onEdit, onDragStart, onDrop }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = iconSrc(dial.icon, dial.url);
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

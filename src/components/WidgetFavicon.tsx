// Favicon for dock list rows. Broken images fall back to a monogram.
import { useState } from 'react';
import { faviconUrl, monogram } from '@/src/lib/format';

export function WidgetFavicon({ url, label }: { url?: string; label: string }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return <span className="widget-mono">{monogram(label)}</span>;
  }
  return (
    <img
      className="widget-favicon"
      src={faviconUrl(url, 32)}
      alt=""
      onError={() => setBroken(true)}
    />
  );
}

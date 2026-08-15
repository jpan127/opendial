import { useEffect, useState } from 'react';

export function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const time = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(now);

  const zone = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short',
  })
    .formatToParts(now)
    .find((part) => part.type === 'timeZoneName')?.value;

  return (
    <div className="clock">
      <span className="clock-time">{time}</span>
      {zone ? <span className="clock-zone">{zone}</span> : null}
    </div>
  );
}

import { useEffect, useState } from 'react';

export function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let id = 0;
    const tick = () => {
      setNow(new Date());
      id = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    tick();
    return () => window.clearTimeout(id);
  }, []);

  const parts = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now);
  const hour = part(parts, 'hour');
  const minute = part(parts, 'minute');
  const second = part(parts, 'second');
  const dayPeriod = part(parts, 'dayPeriod');
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(now);
  const zone = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short',
  })
    .formatToParts(now)
    .find((item) => item.type === 'timeZoneName')?.value;

  return (
    <div className="clock">
      <span className="now-hero clock-time">
        {hour}
        <span className="clock-colon">:</span>
        {minute}
        <span className="clock-colon">:</span>
        {second}
      </span>
      <span className="clock-meta">
        {dayPeriod ? <span className="clock-period">{dayPeriod}</span> : null}
        {zone ? <span className="clock-zone">{zone}</span> : null}
      </span>
      <span className="clock-date">{date}</span>
    </div>
  );
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((item) => item.type === type)?.value ?? '';
}

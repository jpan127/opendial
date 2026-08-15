export function WeatherGlyph({
  code,
  className = 'weather-glyph',
}: {
  code: number;
  className?: string;
}) {
  const kind =
    code === 0
      ? 'sun'
      : code <= 2
        ? 'partly'
        : code === 45 || code === 48
          ? 'fog'
          : code >= 71 && code <= 77
            ? 'snow'
            : code >= 95
              ? 'storm'
              : code >= 51
                ? 'rain'
                : 'cloud';

  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden>
      {kind === 'sun' ? (
        <>
          <circle cx="16" cy="16" r="6.5" fill="currentColor" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="16"
              y1="3"
              x2="16"
              y2="7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${deg} 16 16)`}
            />
          ))}
        </>
      ) : null}
      {kind === 'partly' ? (
        <>
          <circle cx="11" cy="11" r="5" fill="currentColor" opacity="0.9" />
          <path
            d="M9 24h13a5 5 0 0 0 0-10 7 7 0 0 0-13.2 2A4.5 4.5 0 0 0 9 24z"
            fill="currentColor"
          />
        </>
      ) : null}
      {kind === 'cloud' ? (
        <path
          d="M8 24h15a5.5 5.5 0 0 0 0-11 8 8 0 0 0-15.4 2.4A5 5 0 0 0 8 24z"
          fill="currentColor"
        />
      ) : null}
      {kind === 'fog' ? (
        <path
          d="M8 16h16M6 20h20M9 24h14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : null}
      {kind === 'rain' ? (
        <>
          <path
            d="M8 18h15a5 5 0 0 0 0-10 7.5 7.5 0 0 0-14.6 2.2A4.5 4.5 0 0 0 8 18z"
            fill="currentColor"
          />
          <path
            d="M12 22v5M17 22v5M22 22v5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {kind === 'snow' ? (
        <>
          <path
            d="M8 18h15a5 5 0 0 0 0-10 7.5 7.5 0 0 0-14.6 2.2A4.5 4.5 0 0 0 8 18z"
            fill="currentColor"
          />
          <path
            d="M12 22l2 3M17 22l-1 3.5M22 22l1 3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {kind === 'storm' ? (
        <>
          <path
            d="M8 17h15a5 5 0 0 0 0-10 7.5 7.5 0 0 0-14.6 2.2A4.5 4.5 0 0 0 8 17z"
            fill="currentColor"
          />
          <path d="M17 18l-4 6h4l-2 6 7-8h-4l3-4z" fill="currentColor" />
        </>
      ) : null}
    </svg>
  );
}

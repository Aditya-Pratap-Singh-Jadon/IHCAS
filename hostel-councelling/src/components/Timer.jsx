import { useState, useEffect } from 'react';

const styles = {
  container: {
    background: '#ffffff',
    padding: '1.5rem',
    borderRadius: '0.75rem',
    boxShadow: '0 12px 40px rgba(26,35,126,0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    border: '1px solid rgba(0,6,102,0.05)',
  },
  label: {
    fontSize: '0.625rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    color: '#454652',
    marginBottom: '0.25rem',
  },
  time: {
    fontFamily: "'Inter', monospace",
    fontWeight: 900,
    letterSpacing: '-0.04em',
    lineHeight: 1,
  },
  svgContainer: {
    width: 64,
    height: 64,
    position: 'relative',
    flexShrink: 0,
  },
  iconOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default function Timer({ 
  initialTime = 180, 
  onExpire, 
  size = 'large',
  onTick 
}) {
  const [time, setTime] = useState(initialTime);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (time <= 0) {
      if (!expired) {
        setExpired(true);
        if (onExpire) onExpire();
      }
      return;
    }

    const interval = setInterval(() => {
      setTime((prev) => {
        const next = prev - 1;
        if (onTick) onTick(next);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [time, expired, onExpire, onTick]);

  const minutes = Math.floor(Math.max(0, time) / 60);
  const seconds = Math.max(0, time) % 60;
  const progress = time / initialTime;
  const isWarning = time <= 30 && time > 0;
  const isExpired = time <= 0;

  // SVG circle values
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const timeColor = isExpired
    ? '#ba1a1a'
    : isWarning
    ? '#ba1a1a'
    : '#000666';

  const fontSize = size === 'large' ? '3.5rem' : '2rem';

  return (
    <div
      style={{
        ...styles.container,
        ...(isWarning ? { animation: 'pulse 1.5s ease infinite' } : {}),
        ...(isExpired ? { opacity: 0.6 } : {}),
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={styles.label}>Time Remaining</span>
        <div style={{ ...styles.time, fontSize, color: timeColor }}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        {isExpired && (
          <span style={{ fontSize: '0.6875rem', color: '#ba1a1a', fontWeight: 700, marginTop: '0.25rem' }}>
            SESSION EXPIRED
          </span>
        )}
      </div>
      <div style={styles.svgContainer}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 64 64"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="transparent"
            stroke="#eceef0"
            strokeWidth="4"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="transparent"
            stroke={timeColor}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
        <div style={styles.iconOverlay}>
          <span
            className="material-symbols-outlined"
            style={{
              color: timeColor,
              fontSize: '1.25rem',
              fontVariationSettings: "'FILL' 1",
            }}
          >
            {isExpired ? 'timer_off' : 'hourglass_top'}
          </span>
        </div>
      </div>
    </div>
  );
}

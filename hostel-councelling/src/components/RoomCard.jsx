const styles = {
  card: {
    padding: '1.5rem',
    borderRadius: '0.75rem',
    textAlign: 'left',
    transition: 'all 0.3s ease',
    border: '2px solid transparent',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
  },
  available: {
    background: '#ffffff',
    boxShadow: '0 1px 3px rgba(26,35,126,0.04)',
  },
  occupied: {
    background: '#f2f4f6',
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  selected: {
    background: '#ffffff',
    border: '2px solid #000666',
    boxShadow: '0 8px 30px rgba(0,6,102,0.08)',
  },
  roomNumber: {
    fontSize: '1.5rem',
    fontWeight: 700,
    lineHeight: 1,
  },
  description: {
    fontSize: '0.8125rem',
    color: '#454652',
    margin: '1rem 0',
  },
  amenities: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.25rem',
  },
  checkIcon: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    color: '#000666',
    fontVariationSettings: "'FILL' 1",
  },
};

const statusConfig = {
  available: {
    label: 'Available',
    badgeBg: '#a3f69c',
    badgeColor: '#005312',
  },
  occupied: {
    label: 'Occupied',
    badgeBg: '#ffdad6',
    badgeColor: '#93000a',
  },
  selected: {
    label: 'Selected',
    badgeBg: '#a3f69c',
    badgeColor: '#005312',
  },
  partial: {
    label: 'Partial',
    badgeBg: '#d6e5ef',
    badgeColor: '#3b4951',
  },
};

export default function RoomCard({
  roomNumber,
  status = 'available',
  description = '',
  amenities = [],
  selected = false,
  onSelect,
  disabled = false,
  capacity,
  occupants = 0,
}) {
  const isOccupied = status === 'occupied' || status === 'full';
  const isDisabled = disabled || isOccupied;
  const isSelected = selected && !isDisabled;

  const displayStatus = isSelected ? 'selected' : (isOccupied ? 'occupied' : status);
  const config = statusConfig[displayStatus] || statusConfig.available;

  const cardStyle = {
    ...styles.card,
    ...(isSelected
      ? styles.selected
      : isOccupied
      ? styles.occupied
      : styles.available),
    ...(isDisabled ? { pointerEvents: 'none' } : {}),
  };

  const handleClick = () => {
    if (!isDisabled && onSelect) {
      onSelect(roomNumber);
    }
  };

  return (
    <div
      style={cardStyle}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (!isDisabled && !isSelected) {
          e.currentTarget.style.borderColor = 'rgba(0,6,102,0.2)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(26,35,126,0.06)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled && !isSelected) {
          e.currentTarget.style.borderColor = 'transparent';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(26,35,126,0.04)';
        }
      }}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
    >
      {isSelected && (
        <span className="material-symbols-outlined" style={styles.checkIcon}>
          check_circle
        </span>
      )}
      <div style={styles.header}>
        <span
          style={{
            ...styles.roomNumber,
            color: isOccupied ? '#526069' : '#000666',
          }}
        >
          {roomNumber}
        </span>
        <span
          style={{
            padding: '0.125rem 0.5rem',
            borderRadius: '9999px',
            fontSize: '0.5625rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            background: config.badgeBg,
            color: config.badgeColor,
          }}
        >
          {config.label}
        </span>
      </div>
      {description && <p style={styles.description}>{description}</p>}
      {capacity !== undefined && (
        <p style={{ fontSize: '0.6875rem', color: '#767683', marginTop: '0.25rem' }}>
          {occupants}/{capacity} beds occupied
        </p>
      )}
      <div style={styles.amenities}>
        {isOccupied ? (
          <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#526069' }}>
            lock
          </span>
        ) : (
          amenities.map((a, i) => (
            <span
              key={i}
              className="material-symbols-outlined"
              style={{ fontSize: '1rem', color: isSelected ? '#000666' : '#454652' }}
            >
              {a}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

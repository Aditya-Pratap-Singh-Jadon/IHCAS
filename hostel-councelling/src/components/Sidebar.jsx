import { NavLink, useLocation } from 'react-router-dom';

const styles = {
  aside: {
    width: 256,
    position: 'fixed',
    left: 0,
    top: 0,
    paddingTop: 72,
    height: '100vh',
    background: 'rgba(241, 245, 249, 0.5)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 40,
    overflowY: 'auto',
  },
  header: {
    padding: '1.5rem 1.5rem 1rem',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 900,
    color: '#1a237e',
    lineHeight: 1,
  },
  subtitle: {
    fontSize: '0.625rem',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    color: '#454652',
    opacity: 0.6,
    marginTop: '0.25rem',
  },
  nav: {
    flex: 1,
    marginTop: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    margin: '0 0.5rem',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#64748b',
    textDecoration: 'none',
    transition: 'all 0.2s',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
  activeLink: {
    background: '#ffffff',
    color: '#1a237e',
    fontWeight: 600,
    boxShadow: '0 1px 3px rgba(26,35,126,0.04)',
  },
  quickBtn: {
    width: 'calc(100% - 2rem)',
    margin: '0 1rem',
    padding: '0.75rem',
    background: '#000666',
    color: '#ffffff',
    border: 'none',
    borderRadius: '0.75rem',
    fontWeight: 700,
    fontSize: '0.8125rem',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0,6,102,0.2)',
    transition: 'opacity 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  footer: {
    marginTop: 'auto',
    borderTop: '1px solid rgba(198,197,212,0.1)',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  footerLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 1rem',
    color: '#64748b',
    fontSize: '0.8125rem',
    fontWeight: 500,
    textDecoration: 'none',
    borderRadius: '0.75rem',
    transition: 'background 0.2s',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
};

const navItems = [
  { to: '/dashboard', icon: 'dashboard', label: 'Overview' },
  { to: '/admin', icon: 'format_list_numbered', label: 'Rank List' },
  { to: '/', icon: 'bed', label: 'Room Allocation' },
  { to: '/warden', icon: 'event_busy', label: 'Leave Requests' },
  { to: '#', icon: 'terminal', label: 'System Logs' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside style={styles.aside}>
      <div style={styles.header}>
        <h2 style={styles.title}>Hostel Admin</h2>
        <p style={styles.subtitle}>Active Session: 14:59</p>
      </div>
      <nav style={styles.nav}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              style={{
                ...styles.link,
                ...(isActive ? styles.activeLink : {}),
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(99,102,241,0.04)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                }
              }}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div style={{ padding: '1rem' }}>
        <button
          style={styles.quickBtn}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add_circle</span>
          Quick Room Assign
        </button>
      </div>
      <div style={styles.footer}>
        <button
          style={styles.footerLink}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span className="material-symbols-outlined">settings</span>
          Settings
        </button>
        <button
          style={styles.footerLink}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span className="material-symbols-outlined">help</span>
          Help Center
        </button>
      </div>
    </aside>
  );
}

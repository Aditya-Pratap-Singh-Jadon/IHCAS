import { NavLink } from 'react-router-dom';
import { loadAllocation } from '../store/hostelData';

const C = {
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  primary: '#2563eb',
  bg: 'rgba(255,255,255,0.9)',
};

export default function Navbar() {
  const allocation = loadAllocation();
  const hasAllocation = !!allocation;

  return (
    <nav style={{
      background: C.bg,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${C.border}`,
      position: 'sticky',
      top: 0,
      zIndex: 50,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 2rem',
      height: 60,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <span style={{ fontSize: '1rem', fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>
          🏨 Hostel Portal
        </span>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <NavLink
            to="/"
            style={({ isActive }) => ({
              padding: '0.375rem 0.875rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.15s',
              background: isActive ? '#eff6ff' : 'transparent',
              color: isActive ? C.primary : C.muted,
            })}
          >
            Counselling
          </NavLink>
          {hasAllocation && (
            <NavLink
              to="/dashboard"
              style={({ isActive }) => ({
                padding: '0.375rem 0.875rem',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.15s',
                background: isActive ? '#eff6ff' : 'transparent',
                color: isActive ? C.primary : C.muted,
              })}
            >
              My Room
            </NavLink>
          )}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {hasAllocation && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.25rem 0.75rem', borderRadius: '9999px',
            background: '#dcfce7', border: '1px solid #bbf7d0',
            fontSize: '0.75rem', fontWeight: 700, color: '#16a34a',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
            Room Allocated
          </div>
        )}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: '#eff6ff', color: C.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '0.75rem', border: `1px solid ${C.primary}20`,
        }}>JD</div>
      </div>
    </nav>
  );
}

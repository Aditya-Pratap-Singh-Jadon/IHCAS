import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadAllocation } from '../store/hostelData';

const C = {
  bg: '#f5f7fb',
  card: '#ffffff',
  primary: '#2563eb',
  primaryLight: '#eff6ff',
  primaryBorder: '#bfdbfe',
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  success: '#16a34a',
  successLight: '#dcfce7',
  shadow: '0 1px 3px rgba(0,0,0,0.08)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.10)',
  radius: '0.75rem',
  radiusSm: '0.5rem',
};

export default function StudentPage() {
  const navigate = useNavigate();
  const allocation = loadAllocation();

  useEffect(() => {
    if (!allocation) {
      navigate('/');
    }
  }, [allocation, navigate]);

  if (!allocation) return null;

  const {
    gender,
    hostelName,
    roomId,
    roomType,
    beds,
    wing,
    floor,
    amenities = [],
    roommates = [],
    autoAllocated,
    timestamp,
  } = allocation;

  const allocDate = timestamp ? new Date(timestamp).toLocaleString() : '—';

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* Status Banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '1rem 1.5rem', borderRadius: C.radius,
          background: autoAllocated ? '#fef9c3' : C.successLight,
          border: `1px solid ${autoAllocated ? '#fde047' : '#bbf7d0'}`,
          marginBottom: '2rem',
        }}>
          <span style={{ fontSize: '1.75rem' }}>{autoAllocated ? '⏰' : '✅'}</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: autoAllocated ? '#854d0e' : C.success }}>
              {autoAllocated ? 'Room Auto-Allocated Due to Timeout' : 'Counselling Completed'}
            </p>
            <p style={{ fontSize: '0.8125rem', color: C.muted, marginTop: '0.125rem' }}>
              {autoAllocated
                ? 'A room was automatically assigned as the timer expired. Contact admin if you need a change.'
                : 'Your room has been confirmed and locked. No further changes are permitted.'}
            </p>
          </div>
        </div>

        {/* Main Allocation Card */}
        <div style={{ background: C.card, borderRadius: '1rem', boxShadow: C.shadowMd, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {/* Card Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            padding: '2rem 2rem 1.75rem',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: -20, top: -20, width: 160, height: 160, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', right: 40, bottom: -40, width: 100, height: 100, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.75, marginBottom: '0.25rem' }}>
                Allocated Room
              </p>
              <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.04em', margin: 0, lineHeight: 1 }}>{roomId}</h1>
              <p style={{ fontSize: '1rem', opacity: 0.85, marginTop: '0.5rem' }}>{roomType} · {hostelName}</p>
            </div>
          </div>

          {/* Allocation Details */}
          <div style={{ padding: '2rem' }}>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.muted, marginBottom: '1rem' }}>
              Allocation Details
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
              {[
                ['Gender Block', gender === 'male' ? '♂ Boys Hostel' : '♀ Girls Hostel'],
                ['Hostel', hostelName],
                ['Room Number', roomId],
                ['Room Type', roomType],
                ['Occupancy', `${beds}-bed room`],
                ['Wing / Floor', `${wing} Wing · Floor ${floor}`],
              ].map(([k, v], i) => (
                <div
                  key={k}
                  style={{
                    padding: '1rem 0.5rem',
                    borderBottom: `1px solid ${C.border}`,
                    ...(i % 2 === 0 ? { borderRight: `1px solid ${C.border}`, paddingRight: '1.5rem' } : { paddingLeft: '1.5rem' }),
                  }}
                >
                  <p style={{ fontSize: '0.6875rem', color: C.muted, fontWeight: 500 }}>{k}</p>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, marginTop: '0.25rem', color: C.text }}>{v}</p>
                </div>
              ))}
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div style={{ padding: '1rem 0.5rem', borderBottom: `1px solid ${C.border}` }}>
                <p style={{ fontSize: '0.6875rem', color: C.muted, fontWeight: 500, marginBottom: '0.5rem' }}>Amenities</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {amenities.map((a) => (
                    <span
                      key={a}
                      style={{
                        padding: '0.25rem 0.75rem', borderRadius: '9999px',
                        background: C.primaryLight, color: C.primary,
                        fontSize: '0.75rem', fontWeight: 600, border: `1px solid ${C.primaryBorder}`,
                      }}
                    >{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Roommates */}
            <div style={{ padding: '1rem 0.5rem', borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontSize: '0.6875rem', color: C.muted, fontWeight: 500, marginBottom: '0.5rem' }}>
                Roommates ({roommates.length}/{beds - 1 > 0 ? beds - 1 : 0} added)
              </p>
              {roommates.length === 0 ? (
                <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: C.muted }}>None (solo occupancy)</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {roommates.map((r) => (
                    <div key={r.regNo} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: C.primaryLight,
                        color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.6875rem',
                      }}>
                        {r.regNo.slice(0, 2)}
                      </div>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{r.name}</p>
                        <p style={{ fontSize: '0.6875rem', color: C.muted }}>{r.regNo} · OTP Verified</p>
                      </div>
                      <span style={{ marginLeft: 'auto', color: C.success, fontWeight: 700, fontSize: '0.75rem' }}>✓</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status + Timestamp */}
            <div style={{ padding: '1rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.6875rem', color: C.muted, fontWeight: 500 }}>Status</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.success }} />
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: C.success }}>Confirmed & Locked</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.6875rem', color: C.muted, fontWeight: 500 }}>Allocated On</p>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: '0.25rem' }}>{allocDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div style={{
          marginTop: '1.5rem', padding: '1rem 1.25rem', borderRadius: C.radiusSm,
          background: C.card, border: `1px solid ${C.border}`, boxShadow: C.shadow,
          fontSize: '0.8125rem', color: C.muted, display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>ℹ️</span>
          <p style={{ lineHeight: 1.6, margin: 0 }}>
            Your room allocation is final. For any issues (wrong auto-allocation, maintenance requests, or roommate changes), please contact the Hostel Warden's Office directly.
          </p>
        </div>
      </div>
    </div>
  );
}

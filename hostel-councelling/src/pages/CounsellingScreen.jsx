import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HOSTELS_BY_GENDER,
  ROOM_TYPES,
  getRooms,
  findBestRoom,
  saveAllocation,
  isRegistrationLocked,
  lockRegistration,
} from '../store/hostelData';

// ── Design tokens ──────────────────────────────────────────
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
  danger: '#dc2626',
  dangerLight: '#fee2e2',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.10)',
  radius: '0.75rem',
  radiusSm: '0.5rem',
};

// ── Timer hook ─────────────────────────────────────────────
function useTimer(initial, onExpire) {
  const [time, setTime] = useState(initial);
  const expired = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    const iv = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          clearInterval(iv);
          if (!expired.current) {
            expired.current = true;
            onExpireRef.current();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return time;
}

// ── Stepper component ──────────────────────────────────────
const stepLabels = ['Gender', 'Hostel', 'Room Type', 'Room', 'Roommates', 'Confirm'];

function Stepper({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '2.5rem' }}>
      {stepLabels.map((label, i) => {
        const idx = i + 1;
        const done = step > idx;
        const active = step === idx;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < stepLabels.length - 1 ? 1 : 'unset' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem', minWidth: 60 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.25s',
                background: done ? C.primary : active ? C.primary : C.border,
                color: done || active ? '#fff' : C.muted,
                boxShadow: active ? `0 0 0 4px ${C.primaryBorder}` : 'none',
              }}>
                {done ? '✓' : idx}
              </div>
              <span style={{
                fontSize: '0.625rem', fontWeight: active ? 700 : 500,
                color: active ? C.primary : done ? C.muted : C.muted,
                textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
              }}>{label}</span>
            </div>
            {i < stepLabels.length - 1 && (
              <div style={{
                flex: 1, height: 2, background: done ? C.primary : C.border,
                margin: '0 0.25rem', marginBottom: '1.25rem', transition: 'background 0.25s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Timer display ──────────────────────────────────────────
function TimerBadge({ time }) {
  const mins = Math.floor(time / 60);
  const secs = time % 60;
  const warn = time <= 30;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.5rem 1rem', borderRadius: '9999px',
      background: warn ? C.dangerLight : C.primaryLight,
      border: `1px solid ${warn ? '#fca5a5' : C.primaryBorder}`,
      fontSize: '0.9375rem', fontWeight: 700,
      color: warn ? C.danger : C.primary,
      animation: warn ? 'pulse 1s ease infinite' : 'none',
    }}>
      <span style={{ fontSize: '1.125rem' }}>{warn ? '⏰' : '⏱'}</span>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  );
}

// ── Amenity pill ───────────────────────────────────────────
function AmenityPill({ label }) {
  return (
    <span style={{
      padding: '0.125rem 0.5rem', borderRadius: '9999px',
      background: C.primaryLight, color: C.primary,
      fontSize: '0.625rem', fontWeight: 600, border: `1px solid ${C.primaryBorder}`,
    }}>{label}</span>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function CounsellingScreen() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [gender, setGender] = useState(null);        // 'male' | 'female'
  const [hostelId, setHostelId] = useState(null);    // 'block-a' etc
  const [hostelName, setHostelName] = useState('');
  const [beds, setBeds] = useState(null);            // 1|2|4|6
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roommates, setRoommates] = useState([]);    // [{ regNo, name }]
  const [regInput, setRegInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpStep, setOtpStep] = useState('reg');     // 'reg' | 'otp'
  const [pendingReg, setPendingReg] = useState('');
  const [regError, setRegError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [autoMsg, setAutoMsg] = useState('');

  const rooms = hostelId && beds ? getRooms(hostelId, beds) : [];

  // ── Handle auto-allocate on expiry ──────────────────────
  const handleExpire = useCallback(() => {
    // Find best hostel and room or use current selections
    const targetHostel = hostelId || (gender === 'female' ? 'block-c' : 'block-a');
    const targetBeds = beds || 1;
    const hostels = HOSTELS_BY_GENDER[gender || 'male'];
    let autoRoom = null;
    let autoHostel = hostels[0];
    let autoHostelId = autoHostel?.id || 'block-a';

    for (const h of hostels) {
      const r = findBestRoom(h.id, targetBeds);
      if (r) { autoRoom = r; autoHostel = h; autoHostelId = h.id; break; }
    }
    if (!autoRoom) {
      for (const h of hostels) {
        for (const b of [1, 2, 4, 6]) {
          const r = findBestRoom(h.id, b);
          if (r) { autoRoom = r; autoHostel = h; autoHostelId = h.id; break; }
        }
        if (autoRoom) break;
      }
    }

    if (autoRoom) {
      const allocation = {
        gender: gender || 'male',
        hostelId: autoHostelId,
        hostelName: autoHostel.name,
        roomId: autoRoom.id,
        roomType: autoRoom.type,
        beds: autoRoom.capacity,
        wing: autoRoom.wing,
        floor: autoRoom.floor,
        amenities: autoRoom.amenities,
        roommates: [],
        autoAllocated: true,
        timestamp: Date.now(),
      };
      saveAllocation(allocation);
      navigate('/dashboard', { state: { autoAllocated: true } });
    } else {
      setAutoMsg('No rooms available. Please contact admin.');
    }
  }, [gender, hostelId, beds, navigate]);

  const time = useTimer(180, handleExpire);

  // ── Confirm allocation ───────────────────────────────────
  const handleConfirm = () => {
    const allocation = {
      gender,
      hostelId,
      hostelName,
      roomId: selectedRoom.id,
      roomType: selectedRoom.type,
      beds: selectedRoom.capacity,
      wing: selectedRoom.wing,
      floor: selectedRoom.floor,
      amenities: selectedRoom.amenities,
      roommates,
      autoAllocated: false,
      timestamp: Date.now(),
    };
    // Lock roommates
    roommates.forEach((r) => lockRegistration(r.regNo));
    saveAllocation(allocation);
    navigate('/dashboard');
  };

  // ── OTP flow ─────────────────────────────────────────────
  const handleSendOtp = () => {
    const reg = regInput.trim().toUpperCase();
    if (!reg) { setRegError('Please enter a registration number.'); return; }
    if (isRegistrationLocked(reg)) { setRegError('This student is already allocated to a room.'); return; }
    if (roommates.find((r) => r.regNo === reg)) { setRegError('Already added as roommate.'); return; }
    const maxRoommates = (selectedRoom?.capacity || 1) - 1;
    if (roommates.length >= maxRoommates) {
      setRegError(`Room capacity full. Maximum ${maxRoommates} roommate(s) allowed.`); return;
    }
    setRegError('');
    setPendingReg(reg);
    setOtpStep('otp');
    setOtpInput('');
    setOtpError('');
  };

  const handleVerifyOtp = () => {
    if (otpInput.length !== 6) { setOtpError('Enter the 6-digit OTP.'); return; }
    setRoommates((prev) => [...prev, { regNo: pendingReg, name: `Student (${pendingReg})` }]);
    setRegInput('');
    setOtpInput('');
    setPendingReg('');
    setOtpStep('reg');
    setOtpError('');
  };

  // ── UI blocks per step ───────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // ── STEP 1: Gender ──────────────────────────────────
      case 1:
        return (
          <div>
            <h2 style={h2}>Select Your Gender</h2>
            <p style={desc}>Hostels are gender-segregated. Your selection determines which blocks are available to you.</p>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2rem' }}>
              {['male', 'female'].map((g) => {
                const active = gender === g;
                return (
                  <button
                    key={g}
                    style={{
                      ...genderBtn,
                      ...(active ? { background: C.primary, color: '#fff', borderColor: C.primary, boxShadow: C.shadowMd } : {}),
                    }}
                    onClick={() => setGender(g)}
                  >
                    <span style={{ fontSize: '2.5rem' }}>{g === 'male' ? '♂' : '♀'}</span>
                    <span style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.5rem', textTransform: 'capitalize' }}>{g === 'male' ? 'Male' : 'Female'}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>
                      {g === 'male' ? 'Block A & Block B' : 'Block C & Block D'}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={navRow}>
              <div />
              <button style={{ ...primaryBtn, opacity: !gender ? 0.4 : 1 }} onClick={() => gender && setStep(2)} disabled={!gender}>
                Next → Select Hostel
              </button>
            </div>
          </div>
        );

      // ── STEP 2: Hostel ──────────────────────────────────
      case 2: {
        const hostels = HOSTELS_BY_GENDER[gender] || [];
        return (
          <div>
            <h2 style={h2}>Choose Your Hostel Block</h2>
            <p style={desc}>Showing {gender === 'male' ? 'boys' : 'girls'} hostels only.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '2rem' }}>
              {hostels.map((h) => {
                const active = hostelId === h.id;
                return (
                  <button
                    key={h.id}
                    style={{
                      ...selCard,
                      ...(active ? selCardActive : {}),
                    }}
                    onClick={() => { setHostelId(h.id); setHostelName(h.name); }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ fontWeight: 800, fontSize: '1.25rem', color: active ? C.primary : C.text }}>{h.name}</p>
                        <p style={{ fontSize: '0.8125rem', color: C.muted, marginTop: '0.25rem' }}>{h.description}</p>
                      </div>
                      <span style={{
                        padding: '0.125rem 0.5rem', borderRadius: '0.25rem',
                        background: gender === 'male' ? '#dbeafe' : '#fce7f3',
                        color: gender === 'male' ? '#1d4ed8' : '#be185d',
                        fontSize: '0.5625rem', fontWeight: 800,
                      }}>{h.badge}</span>
                    </div>
                    <div style={{ width: '100%', height: 1, background: active ? C.primaryBorder : C.border, margin: '1rem 0' }} />
                    <div style={{ display: 'flex', gap: '1.5rem', width: '100%' }}>
                      {[['🏠', 'Capacity', '120 beds'], ['📍', 'Location', h.description.split('·')[0].trim()]].map(([icon, label, val]) => (
                        <div key={label} style={{ textAlign: 'left' }}>
                          <p style={{ fontSize: '0.625rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                          <p style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{val}</p>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={navRow}>
              <button style={ghostBtn} onClick={() => setStep(1)}>← Back</button>
              <button style={{ ...primaryBtn, opacity: !hostelId ? 0.4 : 1 }} onClick={() => hostelId && setStep(3)} disabled={!hostelId}>
                Next → Room Type
              </button>
            </div>
          </div>
        );
      }

      // ── STEP 3: Room Type ───────────────────────────────
      case 3:
        return (
          <div>
            <h2 style={h2}>Room Occupancy</h2>
            <p style={desc}>How many students will share the room?</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '2rem' }}>
              {ROOM_TYPES.map(({ beds: b, label, sublabel }) => {
                const active = beds === b;
                const available = getRooms(hostelId, b).some((r) => r.status === 'available');
                return (
                  <button
                    key={b}
                    style={{
                      ...roomTypeBtn,
                      ...(active ? { background: C.primary, color: '#fff', borderColor: C.primary } : {}),
                      ...(!available ? { opacity: 0.35, cursor: 'not-allowed' } : {}),
                    }}
                    onClick={() => available && setBeds(b)}
                    disabled={!available}
                  >
                    <span style={{ fontSize: '2rem', fontWeight: 900 }}>{b}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{label}</span>
                    <span style={{ fontSize: '0.6875rem', opacity: 0.7 }}>{sublabel}</span>
                    {!available && <span style={{ fontSize: '0.5625rem', color: C.danger }}>Unavailable</span>}
                  </button>
                );
              })}
            </div>
            <div style={navRow}>
              <button style={ghostBtn} onClick={() => setStep(2)}>← Back</button>
              <button style={{ ...primaryBtn, opacity: !beds ? 0.4 : 1 }} onClick={() => beds && setStep(4)} disabled={!beds}>
                Next → Select Room
              </button>
            </div>
          </div>
        );

      // ── STEP 4: Room ────────────────────────────────────
      case 4:
        return (
          <div>
            <h2 style={h2}>Select a Room</h2>
            <p style={desc}>{hostelName} — {beds}-bed rooms</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
              {rooms.map((room) => {
                const isOccupied = room.status === 'occupied';
                const isSelected = selectedRoom?.id === room.id;
                return (
                  <div
                    key={room.id}
                    onClick={() => !isOccupied && setSelectedRoom(room)}
                    style={{
                      padding: '1.25rem', borderRadius: C.radius, cursor: isOccupied ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      background: isOccupied ? '#f9fafb' : isSelected ? C.primaryLight : C.card,
                      border: isOccupied ? `1.5px solid ${C.border}` : isSelected ? `1.5px solid ${C.primary}` : `1.5px solid ${C.border}`,
                      opacity: isOccupied ? 0.5 : 1,
                      boxShadow: isSelected ? `0 0 0 3px ${C.primaryBorder}` : C.shadow,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: '1.125rem', color: isSelected ? C.primary : C.text }}>{room.id}</p>
                        <p style={{ fontSize: '0.75rem', color: C.muted, marginTop: '0.125rem' }}>{room.type}</p>
                      </div>
                      {isOccupied
                        ? <span style={{ fontSize: '1rem' }}>🔒</span>
                        : isSelected
                        ? <span style={{ color: C.primary, fontSize: '1.25rem' }}>✓</span>
                        : null}
                    </div>
                    <div style={{ marginTop: '0.875rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {room.amenities.map((a) => <AmenityPill key={a} label={a} />)}
                    </div>
                    <p style={{ marginTop: '0.625rem', fontSize: '0.6875rem', color: C.muted }}>
                      Floor {room.floor} · {room.wing} Wing ·  {room.occupants}/{room.capacity} occupied
                    </p>
                  </div>
                );
              })}
            </div>
            <div style={navRow}>
              <button style={ghostBtn} onClick={() => setStep(3)}>← Back</button>
              <button style={{ ...primaryBtn, opacity: !selectedRoom ? 0.4 : 1 }} onClick={() => selectedRoom && setStep(5)} disabled={!selectedRoom}>
                Next → Roommates
              </button>
            </div>
          </div>
        );

      // ── STEP 5: Roommates (optional) ────────────────────
      case 5: {
        const maxRoommates = (selectedRoom?.capacity || 1) - 1;
        return (
          <div>
            <h2 style={h2}>Add Roommates <span style={{ fontWeight: 400, color: C.muted, fontSize: '1rem' }}>(Optional)</span></h2>
            <p style={desc}>
              {maxRoommates === 0
                ? 'This is a single-occupancy room. No roommates can be added.'
                : `You can add up to ${maxRoommates} roommate${maxRoommates > 1 ? 's' : ''}. Each person must verify with an OTP sent to their registered number.`}
            </p>

            {maxRoommates > 0 && roommates.length < maxRoommates && (
              <div style={{ ...C_card, marginTop: '2rem', maxWidth: 480 }}>
                {otpStep === 'reg' ? (
                  <>
                    <label style={fieldLabel}>Roommate's Registration Number</label>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <input
                        type="text"
                        value={regInput}
                        onChange={(e) => { setRegInput(e.target.value.toUpperCase()); setRegError(''); }}
                        placeholder="e.g. CS2024156"
                        style={textInput}
                      />
                      <button style={primaryBtn} onClick={handleSendOtp}>Send OTP</button>
                    </div>
                    {regError && <p style={errMsg}>{regError}</p>}
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '0.875rem', color: C.muted, marginBottom: '0.75rem' }}>
                      OTP sent to <strong>{pendingReg}</strong>'s registered mobile. Ask them to share it.
                    </p>
                    <label style={fieldLabel}>Enter 6-digit OTP</label>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <input
                        type="text"
                        value={otpInput}
                        onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                        placeholder="● ● ● ● ● ●"
                        maxLength={6}
                        style={{ ...textInput, letterSpacing: '0.4em', textAlign: 'center', fontSize: '1.25rem' }}
                      />
                      <button style={primaryBtn} onClick={handleVerifyOtp}>Verify</button>
                    </div>
                    {otpError && <p style={errMsg}>{otpError}</p>}
                    <button onClick={() => { setOtpStep('reg'); setOtpError(''); }} style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: C.primary, fontSize: '0.8125rem', cursor: 'pointer' }}>
                      ← Change registration number
                    </button>
                  </>
                )}
              </div>
            )}

            {roommates.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: '0.75rem' }}>
                  Verified Roommates ({roommates.length}/{maxRoommates})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {roommates.map((r) => (
                    <div key={r.regNo} style={{ ...C_card, display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.primaryLight, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>
                        {r.regNo.slice(0, 2)}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.name}</p>
                        <p style={{ fontSize: '0.6875rem', color: C.muted }}>{r.regNo}</p>
                      </div>
                      <span style={{ marginLeft: 'auto', color: C.success, fontWeight: 700, fontSize: '0.75rem' }}>✓ Verified</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={navRow}>
              <button style={ghostBtn} onClick={() => setStep(4)}>← Back</button>
              <button style={primaryBtn} onClick={() => setStep(6)}>
                {maxRoommates === 0 || roommates.length === 0 ? 'Skip → Review' : 'Next → Review'}
              </button>
            </div>
          </div>
        );
      }

      // ── STEP 6: Confirm ─────────────────────────────────
      case 6:
        return (
          <div>
            <h2 style={h2}>Review & Confirm</h2>
            <p style={desc}>Please verify your selection before confirming. This action is final and cannot be changed.</p>
            <div style={{ ...C_card, marginTop: '2rem', maxWidth: 560 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: C.radiusSm, background: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🏨</div>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '1.125rem' }}>Allocation Summary</p>
                  <p style={{ fontSize: '0.75rem', color: C.muted }}>Academic Year 2024–2025</p>
                </div>
              </div>
              {[
                ['Gender', gender === 'male' ? 'Male (Boys Hostel)' : 'Female (Girls Hostel)'],
                ['Hostel', hostelName],
                ['Room', selectedRoom?.id],
                ['Room Type', selectedRoom?.type],
                ['Occupancy', `${selectedRoom?.capacity}-bed room`],
                ['Wing / Floor', `${selectedRoom?.wing} Wing · Floor ${selectedRoom?.floor}`],
                ['Amenities', selectedRoom?.amenities?.join(', ')],
                ['Roommates', roommates.length > 0 ? roommates.map((r) => r.regNo).join(', ') : 'None (solo)'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.875rem 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: '0.875rem', color: C.muted }}>{k}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: '1.5rem', padding: '0.875rem', background: '#fef9c3', borderRadius: C.radiusSm, border: '1px solid #fde047', fontSize: '0.8125rem', color: '#854d0e' }}>
                ⚠️ Once confirmed, your room selection is permanent and cannot be changed.
              </div>
            </div>
            <div style={navRow}>
              <button style={ghostBtn} onClick={() => setStep(5)}>← Back</button>
              <button
                style={{ ...primaryBtn, background: C.success, boxShadow: '0 4px 14px rgba(22,163,74,0.3)' }}
                onClick={handleConfirm}
              >
                ✓ Confirm & Finalize Allocation
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Shared styles ────────────────────────────────────────
  const h2 = { fontSize: '1.875rem', fontWeight: 800, color: C.text, letterSpacing: '-0.02em', margin: 0 };
  const desc = { fontSize: '1rem', color: C.muted, marginTop: '0.5rem', lineHeight: 1.6 };
  const navRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: `1px solid ${C.border}` };
  const primaryBtn = {
    padding: '0.75rem 1.75rem', borderRadius: C.radiusSm, border: 'none', cursor: 'pointer',
    background: C.primary, color: '#fff', fontWeight: 700, fontSize: '0.9375rem',
    boxShadow: '0 4px 14px rgba(37,99,235,0.3)', transition: 'all 0.2s',
    fontFamily: 'inherit',
  };
  const ghostBtn = {
    padding: '0.75rem 1.5rem', borderRadius: C.radiusSm, border: `1.5px solid ${C.border}`, cursor: 'pointer',
    background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.9375rem',
    transition: 'all 0.2s', fontFamily: 'inherit',
  };
  const genderBtn = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '0.25rem', padding: '2.5rem 3rem', borderRadius: C.radius, cursor: 'pointer',
    border: `1.5px solid ${C.border}`, background: C.card, transition: 'all 0.2s',
    fontFamily: 'inherit', color: C.text, boxShadow: C.shadow, minWidth: 200,
  };
  const selCard = {
    padding: '1.5rem', borderRadius: C.radius, cursor: 'pointer', display: 'flex',
    flexDirection: 'column', alignItems: 'flex-start', gap: 0,
    border: `1.5px solid ${C.border}`, background: C.card, transition: 'all 0.2s',
    fontFamily: 'inherit', textAlign: 'left', boxShadow: C.shadow,
  };
  const selCardActive = { border: `1.5px solid ${C.primary}`, background: C.primaryLight, boxShadow: `0 0 0 3px ${C.primaryBorder}` };
  const roomTypeBtn = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
    padding: '1.5rem 1rem', borderRadius: C.radius, border: `1.5px solid ${C.border}`,
    background: C.card, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
    color: C.text, boxShadow: C.shadow,
  };
  const C_card = { background: C.card, padding: '1.5rem', borderRadius: C.radius, boxShadow: C.shadow, border: `1px solid ${C.border}` };
  const fieldLabel = { fontSize: '0.8125rem', fontWeight: 600, color: C.muted, display: 'block' };
  const textInput = {
    flex: 1, padding: '0.75rem 1rem', borderRadius: C.radiusSm, border: `1.5px solid ${C.border}`,
    fontSize: '0.9375rem', fontFamily: 'inherit', outline: 'none', color: C.text,
    transition: 'border-color 0.2s', background: C.bg,
  };
  const errMsg = { color: C.danger, fontSize: '0.8125rem', marginTop: '0.375rem' };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: C.text, margin: 0 }}>Room Allocation</h1>
            <p style={{ fontSize: '0.8125rem', color: C.muted, marginTop: '0.125rem' }}>Academic Year 2024–2025 · Counselling Session Active</p>
          </div>
          <TimerBadge time={time} />
        </div>

        {/* Stepper */}
        <Stepper step={step} />

        {/* Step content in a card */}
        <div style={{ background: C.card, borderRadius: '1rem', padding: '2rem 2.5rem', boxShadow: C.shadowMd, border: `1px solid ${C.border}` }}>
          {autoMsg
            ? <p style={{ color: C.danger, fontWeight: 600 }}>{autoMsg}</p>
            : renderStep()}
        </div>
      </div>
    </div>
  );
}

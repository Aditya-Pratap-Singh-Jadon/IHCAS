import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Check } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default function StudentCounselling() {
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [counsellingStatus, setCounsellingStatus] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Counselling Session State
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomHostelFilter, setRoomHostelFilter] = useState('ALL');
  const [roomTypeFilter, setRoomTypeFilter] = useState('ALL');

  // Roommate OTP State
  const [roommateInput, setRoommateInput] = useState('');
  const [roommateOtpInput, setRoommateOtpInput] = useState('');
  const [otpSentTarget, setOtpSentTarget] = useState(null);
  const [verifiedRoommates, setVerifiedRoommates] = useState([]);

  // Server-authoritative timer countdown
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(null);
  const timerRef = useRef(null);

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Load Status & Data
  const loadCounsellingData = async () => {
    try {
      const [statusRes, dashRes, roomsRes] = await Promise.all([
        api.get('/counselling/status').catch(() => ({ data: { success: true, data: { has_slot: false } } })),
        api.get('/dashboard/student').catch(() => ({ data: { success: true, data: null } })),
        api.get('/inventory/rooms').catch(() => ({ data: { success: true, data: [] } })),
      ]);

      const slotData = statusRes.data?.data || { has_slot: false };
      const dash = dashRes.data?.data || null;

      setCounsellingStatus(slotData);
      setDashboardData(dash);
      setRooms(roomsRes.data?.data || []);
    } catch (err) {
      console.error('Error loading counselling data', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Unable to retrieve counselling status from server.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCounsellingData();
  }, []);

  // Server Timer Synchronization
  useEffect(() => {
    if (counsellingStatus?.status === 'ACTIVE' && counsellingStatus.end_time) {
      const calculateRemaining = () => {
        const endTimeMs = new Date(counsellingStatus.end_time).getTime();
        const nowMs = Date.now();
        const remaining = Math.max(0, Math.floor((endTimeMs - nowMs) / 1000));
        setTimeRemainingSeconds(remaining);

        if (remaining <= 0) {
          clearInterval(timerRef.current);
          setFeedback({
            type: 'warning',
            message: 'Your 3-minute counselling window has expired. The server has returned you to the queue with your original academic rank priority.',
          });
          // Refresh state to sync with backend checkAndExpireSlot
          setTimeout(() => {
            loadCounsellingData();
          }, 1000);
        }
      };

      calculateRemaining();
      timerRef.current = setInterval(calculateRemaining, 1000);

      return () => clearInterval(timerRef.current);
    } else {
      setTimeRemainingSeconds(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [counsellingStatus?.status, counsellingStatus?.end_time]);

  // Handle Slot Activation
  const handleActivateSlot = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.post('/counselling/activate');
      setFeedback({
        type: 'success',
        message: res.data?.message || 'Counselling slot activated successfully! You have 3 minutes to choose a room.',
      });
      await loadCounsellingData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to activate slot. Please check eligibility and queue position.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Roommate OTP Request
  const handleRequestRoommateOtp = async (e) => {
    e.preventDefault();
    const cleanReg = roommateInput.trim().toUpperCase();
    if (!cleanReg || isSubmitting) return;

    if (cleanReg === dashboardData?.student?.reg_no) {
      setFeedback({ type: 'error', message: 'You cannot add yourself as a roommate.' });
      return;
    }

    if (verifiedRoommates.includes(cleanReg)) {
      setFeedback({ type: 'error', message: 'This roommate has already been verified.' });
      return;
    }

    const selectedRoom = rooms.find((r) => r.room_id === Number(selectedRoomId));
    if (selectedRoom && verifiedRoommates.length >= selectedRoom.capacity - 1) {
      setFeedback({
        type: 'error',
        message: `This ${selectedRoom.type_name} has a capacity of ${selectedRoom.capacity}. You cannot add more than ${selectedRoom.capacity - 1} roommates.`,
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.post('/allocation/roommate-otp/request', {
        roommate_reg_no: cleanReg,
      });
      setOtpSentTarget(cleanReg);
      setFeedback({
        type: 'info',
        message: res.data?.message || `Verification OTP has been sent to ${cleanReg}'s registered VIT university email.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || err.response?.data?.message || 'Failed to send OTP to roommate.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Roommate OTP Verification
  const handleVerifyRoommateOtp = async (e) => {
    e.preventDefault();
    if (!otpSentTarget || !roommateOtpInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.post('/allocation/roommate-otp/verify', {
        roommate_reg_no: otpSentTarget,
        otp_code: roommateOtpInput.trim(),
      });
      setVerifiedRoommates((prev) => Array.from(new Set([...prev, otpSentTarget])));
      setFeedback({
        type: 'success',
        message: res.data?.message || `Roommate ${otpSentTarget} verified successfully!`,
      });
      setOtpSentTarget(null);
      setRoommateInput('');
      setRoommateOtpInput('');
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || err.response?.data?.message || 'Invalid or expired OTP.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveVerifiedRoommate = (regNo) => {
    setVerifiedRoommates((prev) => prev.filter((r) => r !== regNo));
  };

  // Confirm Allocation
  const handleConfirmAllocation = async () => {
    if (!selectedRoomId || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        room_id: Number(selectedRoomId),
        roommates: verifiedRoommates,
      };
      const res = await api.post('/allocation', payload);
      setFeedback({
        type: 'success',
        message: res.data?.message || 'Room allocated and confirmed successfully!',
      });
      setShowConfirmModal(false);
      setSelectedRoomId(null);
      setVerifiedRoommates([]);
      await loadCounsellingData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || err.response?.data?.message || 'Failed to allocate room.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Room filtering by student gender and user preferences
  const studentGender = dashboardData?.student?.gender;

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // Gender eligibility rule: MH = Male, LH = Female
      const hostelName = r.hostel_name || '';
      if (studentGender === 'M' && !hostelName.toUpperCase().startsWith('MH')) {
        return false;
      }
      if (studentGender === 'F' && !hostelName.toUpperCase().startsWith('LH')) {
        return false;
      }

      // Available capacity
      if (r.available_capacity <= 0) return false;

      // Filter by Hostel
      if (roomHostelFilter !== 'ALL' && String(r.hostel_id) !== String(roomHostelFilter)) {
        return false;
      }

      // Filter by Room Type
      if (roomTypeFilter !== 'ALL' && String(r.room_type_id) !== String(roomTypeFilter)) {
        return false;
      }

      return true;
    });
  }, [rooms, studentGender, roomHostelFilter, roomTypeFilter]);

  const uniqueHostels = useMemo(() => {
    const map = new Map();
    rooms.forEach((r) => {
      const hName = r.hostel_name || `Hostel ${r.hostel_id}`;
      // Only include gender-eligible hostels
      if (studentGender === 'M' && !hName.toUpperCase().startsWith('MH')) return;
      if (studentGender === 'F' && !hName.toUpperCase().startsWith('LH')) return;
      if (r.hostel_id && !map.has(r.hostel_id)) {
        map.set(r.hostel_id, hName);
      }
    });
    return Array.from(map.entries());
  }, [rooms, studentGender]);

  const uniqueRoomTypes = useMemo(() => {
    const map = new Map();
    rooms.forEach((r) => {
      if (r.room_type_id && !map.has(r.room_type_id)) {
        map.set(r.room_type_id, r.type_name);
      }
    });
    return Array.from(map.entries());
  }, [rooms]);

  const selectedRoomObj = useMemo(() => {
    return rooms.find((r) => r.room_id === Number(selectedRoomId)) || null;
  }, [rooms, selectedRoomId]);

  // Format Timer
  const formatTimer = (totalSeconds) => {
    if (totalSeconds === null || totalSeconds === undefined) return '--:--';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="student-loading-container">
        <div className="student-spinner" aria-hidden="true" />
        <p>Loading counselling session details&hellip;</p>
      </div>
    );
  }

  const isAllocated = !!dashboardData?.allocation;
  const hasSlot = counsellingStatus?.has_slot;
  const isPending = hasSlot && counsellingStatus.status === 'PENDING';
  const isActive = hasSlot && counsellingStatus.status === 'ACTIVE' && timeRemainingSeconds !== null && timeRemainingSeconds > 0;
  const isCompleted = hasSlot && counsellingStatus.status === 'COMPLETED';

  // Activation eligibility: queue position is 1 OR current time is >= start_time
  const isEligibleToActivate = isPending && (
    counsellingStatus.queue_position === 1 ||
    (counsellingStatus.start_time && new Date() >= new Date(counsellingStatus.start_time))
  );

  return (
    <div className="counselling-page-container">
      {/* Feedback Banner */}
      {feedback && (
        <div className={`portal-alert portal-alert-${feedback.type}`} role="alert">
          {feedback.type === 'error' && <AlertTriangleIcon />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ================= CASE 1: ALREADY ALLOCATED ================= */}
      {isAllocated && (
        <div className="card counselling-card-main">
          <div className="counselling-header-status confirmed-head">
            <div className="counselling-status-icon">
              <ShieldCheckIcon />
            </div>
            <div>
              <span className="badge badge-success">Room Allocated</span>
              <h2 style={{ margin: '0.25rem 0 0 0', border: 'none', padding: 0 }}>
                Your Room is Confirmed
              </h2>
              <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
                You have already completed the counselling process and confirmed your room allocation.
              </p>
            </div>
          </div>

          <div className="counselling-allocation-details-grid">
            <div className="metric-card">
              <span className="metric-card-label">Hostel</span>
              <span className="metric-card-value">{dashboardData.allocation.hostel_name}</span>
              <span className="metric-card-subtext">Floor {dashboardData.allocation.floor}</span>
            </div>
            <div className="metric-card">
              <span className="metric-card-label">Room Number</span>
              <span className="metric-card-value">{dashboardData.allocation.room_number}</span>
              <span className="metric-card-subtext">{dashboardData.allocation.room_type}</span>
            </div>
            <div className="metric-card">
              <span className="metric-card-label">Allocation Status</span>
              <span className="metric-card-value" style={{ fontSize: '1.1rem', color: 'var(--color-lime-500)' }}>
                {dashboardData.allocation.allocation_status}
              </span>
              <span className="metric-card-subtext">
                Confirmed: {new Date(dashboardData.allocation.confirmed_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {dashboardData.roommates && dashboardData.roommates.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0' }}>Confirmed Roommates</h3>
              <div className="roommate-chips">
                {dashboardData.roommates.map((rm) => (
                  <span key={rm.reg_no} className="roommate-chip roommate-chip-verified">
                    <Check size={12} strokeWidth={2.5} style={{ marginRight: '0.25rem', display: 'inline-block', verticalAlign: 'middle' }} />
                    {rm.name} ({rm.reg_no})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
            <Link to="/dashboard/student" className="btn btn-primary">
              Return to Dashboard
            </Link>
            <Link to="/dashboard/student?tab=requests" className="btn btn-outline">
              Request Room Change
            </Link>
          </div>
        </div>
      )}

      {/* ================= CASE 2: NO COUNSELLING SLOT ================= */}
      {!isAllocated && !hasSlot && (
        <div className="card counselling-card-main">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
              <Calendar size={36} strokeWidth={1.5} />
            </div>
            <h3>No Counselling Slot Assigned</h3>
            <p style={{ maxWidth: 500, margin: '0 auto 1.5rem auto' }}>
              Hostel counselling slots are scheduled in batches by administrators according to academic rank. 
              No slot has been generated for your account yet. Please check back when your session opens.
            </p>
            <Link to="/dashboard/student" className="btn btn-outline">
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* ================= CASE 3: PENDING QUEUE (WAITING) ================= */}
      {!isAllocated && isPending && (
        <div className="card counselling-card-main">
          <div className="counselling-header-status pending-head">
            <div className="counselling-status-icon pending-icon">
              <ClockIcon />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="badge badge-warning">Queue Status: Waiting</span>
                {counsellingStatus.queue_position && (
                  <span className="badge badge-info">Position #{counsellingStatus.queue_position}</span>
                )}
              </div>
              <h2 style={{ margin: '0.35rem 0 0 0', border: 'none', padding: 0 }}>
                Hostel Counselling Queue
              </h2>
              <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>
                Slots are prioritized strictly by academic rank and CGPA. A batch contains a maximum of 20 students.
              </p>
            </div>
          </div>

          <div className="counselling-queue-metrics">
            <div className="metric-card">
              <span className="metric-card-label">Your Queue Position</span>
              <span className="metric-card-value">#{counsellingStatus.queue_position || '—'}</span>
              <span className="metric-card-subtext">Calculated server-authoritatively</span>
            </div>
            <div className="metric-card">
              <span className="metric-card-label">Academic Rank Priority</span>
              <span className="metric-card-value">{dashboardData?.student?.academic_rank || '—'}</span>
              <span className="metric-card-subtext">CGPA: {dashboardData?.student?.cgpa || '—'}</span>
            </div>
            <div className="metric-card">
              <span className="metric-card-label">Scheduled Start Time</span>
              <span className="metric-card-value" style={{ fontSize: '1rem' }}>
                {counsellingStatus.start_time ? new Date(counsellingStatus.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
              </span>
              <span className="metric-card-subtext">
                {counsellingStatus.start_time ? new Date(counsellingStatus.start_time).toLocaleDateString() : ''}
              </span>
            </div>
          </div>

          <div className="counselling-activation-banner">
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--primary-color)' }}>
                {isEligibleToActivate ? 'Your Turn Has Arrived!' : 'Waiting for Your Turn in Queue'}
              </h4>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                {isEligibleToActivate
                  ? 'You are at the front of the queue. Activate your slot to begin your 3-minute room selection window.'
                  : 'Slot activation unlocks automatically when you reach position #1 or when your scheduled window arrives.'}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-lime btn-lg"
              onClick={handleActivateSlot}
              disabled={!isEligibleToActivate || isSubmitting}
              id="activate-counselling-btn"
            >
              {isSubmitting ? 'Activating…' : isEligibleToActivate ? 'Activate Slot Now' : 'Waiting in Queue'}
            </button>
          </div>
        </div>
      )}

      {/* ================= CASE 4: ACTIVE COUNSELLING SESSION ================= */}
      {!isAllocated && isActive && (
        <div className="counselling-active-workspace">
          {/* Top Server-Authoritative Timer Bar */}
          <div className="counselling-timer-bar">
            <div className="counselling-timer-content">
              <div className="timer-badge-wrap">
                <span className="timer-label">Counselling Window Active</span>
                <div className={`timer-clock ${timeRemainingSeconds <= 60 ? 'urgent' : ''}`} id="counselling-countdown">
                  <ClockIcon />
                  <span>{formatTimer(timeRemainingSeconds)}</span>
                </div>
              </div>
              <p className="timer-subtext">
                Server-authoritative 3-minute timer. If time expires before allocation, you retain your original rank priority for the next batch.
              </p>
            </div>
            {selectedRoomObj && (
              <button
                type="button"
                className="btn btn-lime btn-lg"
                onClick={() => setShowConfirmModal(true)}
                id="open-confirm-modal-btn"
              >
                Confirm Room {selectedRoomObj.room_number}
              </button>
            )}
          </div>

          <div className="counselling-split-layout">
            {/* Left: Room Browser */}
            <div className="counselling-browser-panel">
              <div className="card">
                <div className="counselling-filter-row">
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem 0' }}>Available Room Inventory</h3>
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                      Filtered for {studentGender === 'M' ? "Men's Hostels (MH)" : "Ladies' Hostels (LH)"}
                    </span>
                  </div>
                  <div className="counselling-filters-actions">
                    <select
                      value={roomHostelFilter}
                      onChange={(e) => setRoomHostelFilter(e.target.value)}
                      className="form-group-select"
                      aria-label="Filter by hostel"
                    >
                      <option value="ALL">All Eligible Hostels</option>
                      {uniqueHostels.map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>

                    <select
                      value={roomTypeFilter}
                      onChange={(e) => setRoomTypeFilter(e.target.value)}
                      className="form-group-select"
                      aria-label="Filter by room type"
                    >
                      <option value="ALL">All Room Types</option>
                      {uniqueRoomTypes.map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredRooms.length === 0 ? (
                  <div className="empty-state">
                    <p>No available rooms match the selected criteria.</p>
                  </div>
                ) : (
                  <div className="room-grid">
                    {filteredRooms.map((room) => {
                      const isSelected = selectedRoomId === room.room_id;
                      return (
                        <div
                          key={room.room_id}
                          className={`room-selection-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedRoomId(room.room_id)}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setSelectedRoomId(room.room_id);
                            }
                          }}
                        >
                          <div className="room-card-head">
                            <div>
                              <h4 className="room-title">Room {room.room_number}</h4>
                              <span className="room-hostel-name">{room.hostel_name} &bull; Floor {room.floor}</span>
                            </div>
                            <span className="badge badge-info">{room.type_name}</span>
                          </div>

                          <div className="capacity-meter">
                            <div className="capacity-bar">
                              <div
                                className="capacity-bar-fill"
                                style={{ width: `${(room.available_capacity / room.capacity) * 100}%` }}
                              />
                            </div>
                            <span>{room.available_capacity} / {room.capacity} beds free</span>
                          </div>

                          <button
                            type="button"
                            className={`btn btn-sm ${isSelected ? 'btn-lime' : 'btn-outline'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRoomId(room.room_id);
                            }}
                          >
                            {isSelected ? (
                              <>
                                <Check size={14} strokeWidth={2.5} style={{ marginRight: '0.25rem', display: 'inline-block', verticalAlign: 'middle' }} />
                                Selected
                              </>
                            ) : (
                              'Select Room'
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Room Selection & Roommate Verification */}
            <div className="counselling-action-panel">
              <div className="card">
                <h3>Selected Room Details</h3>
                {selectedRoomObj ? (
                  <div className="selected-room-summary">
                    <div className="selected-room-badge-row">
                      <span className="selected-room-large">{selectedRoomObj.hostel_name} &mdash; {selectedRoomObj.room_number}</span>
                      <span className="badge badge-success">{selectedRoomObj.type_name}</span>
                    </div>
                    <dl className="dl-grid" style={{ marginTop: '0.75rem' }}>
                      <dt>Floor</dt>
                      <dd>{selectedRoomObj.floor}</dd>
                      <dt>Total Capacity</dt>
                      <dd>{selectedRoomObj.capacity} beds</dd>
                      <dt>Available Beds</dt>
                      <dd>{selectedRoomObj.available_capacity} beds</dd>
                    </dl>

                    {/* Roommate Verification Section */}
                    {selectedRoomObj.capacity > 1 && (
                      <div className="roommate-verification-box">
                        <div className="roommate-box-header">
                          <UserPlusIcon />
                          <h4>Roommate Verification (Optional)</h4>
                        </div>
                        <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0 0 0.75rem 0' }}>
                          Add up to {selectedRoomObj.capacity - 1} roommates. Each roommate must confirm with a 6-digit OTP sent to their VIT email.
                        </p>

                        {/* Roommate Invite Form */}
                        {!otpSentTarget ? (
                          <form onSubmit={handleRequestRoommateOtp} className="roommate-otp-request-form">
                            <input
                              type="text"
                              placeholder="e.g. 24BCE0913"
                              value={roommateInput}
                              onChange={(e) => setRoommateInput(e.target.value)}
                              disabled={isSubmitting || verifiedRoommates.length >= selectedRoomObj.capacity - 1}
                              aria-label="Roommate Registration Number"
                              className="form-group-input"
                            />
                            <button
                              type="submit"
                              className="btn btn-outline btn-sm"
                              disabled={isSubmitting || !roommateInput.trim() || verifiedRoommates.length >= selectedRoomObj.capacity - 1}
                            >
                              Send OTP
                            </button>
                          </form>
                        ) : (
                          <form onSubmit={handleVerifyRoommateOtp} className="roommate-otp-verify-form">
                            <span className="otp-target-hint">
                              OTP sent to <strong>{otpSentTarget}</strong>
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <input
                                type="text"
                                placeholder="6-digit OTP"
                                maxLength={6}
                                value={roommateOtpInput}
                                onChange={(e) => setRoommateOtpInput(e.target.value)}
                                disabled={isSubmitting}
                                aria-label="Enter 6-digit OTP"
                                className="form-group-input"
                              />
                              <button
                                type="submit"
                                className="btn btn-lime btn-sm"
                                disabled={isSubmitting || roommateOtpInput.trim().length !== 6}
                              >
                                Verify
                              </button>
                            </div>
                            <button
                              type="button"
                              className="btn-link-cancel"
                              onClick={() => {
                                setOtpSentTarget(null);
                                setRoommateOtpInput('');
                              }}
                            >
                              Cancel
                            </button>
                          </form>
                        )}

                        {/* Verified Roommates Chips */}
                        {verifiedRoommates.length > 0 && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>Verified Roommates:</span>
                            <div className="roommate-chips">
                              {verifiedRoommates.map((rm) => (
                                <span key={rm} className="roommate-chip roommate-chip-verified">
                                  <Check size={12} strokeWidth={2.5} style={{ marginRight: '0.25rem', display: 'inline-block', verticalAlign: 'middle' }} />
                                  {rm}
                                  <button
                                    type="button"
                                    className="chip-remove"
                                    onClick={() => handleRemoveVerifiedRoommate(rm)}
                                    title="Remove roommate"
                                  >
                                    &times;
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ marginTop: '1.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-lime btn-lg"
                        style={{ width: '100%' }}
                        onClick={() => setShowConfirmModal(true)}
                        id="confirm-allocation-sidebar-btn"
                      >
                        Confirm Allocation
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>Select a room from the inventory to view details and verify roommates.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONFIRMATION MODAL ================= */}
      {showConfirmModal && selectedRoomObj && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
          <div className="modal-dialog">
            <h3 id="confirm-modal-title" style={{ margin: '0 0 0.5rem 0' }}>Confirm Room Allocation</h3>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
              Are you sure you want to lock and confirm this room allocation? This action is binding.
            </p>

            <div className="modal-room-summary-box">
              <p><strong>Hostel:</strong> {selectedRoomObj.hostel_name}</p>
              <p><strong>Room:</strong> {selectedRoomObj.room_number} ({selectedRoomObj.type_name})</p>
              <p><strong>Floor:</strong> {selectedRoomObj.floor}</p>
              {verifiedRoommates.length > 0 && (
                <p><strong>Roommates:</strong> {verifiedRoommates.join(', ')}</p>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                Go Back
              </button>
              <button
                type="button"
                className="btn btn-lime"
                onClick={handleConfirmAllocation}
                disabled={isSubmitting}
                id="modal-confirm-submit-btn"
              >
                {isSubmitting ? 'Allocating…' : 'Yes, Confirm Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

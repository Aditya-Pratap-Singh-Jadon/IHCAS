import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Building2, ClipboardList } from 'lucide-react';
import api from '../api/client';

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Primary Data
  const [dashboardData, setDashboardData] = useState(null);
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [requests, setRequests] = useState({
    leave: [],
    room_change: [],
    mess_change: [],
    complaints: []
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Forms
  const [hostelForm, setHostelForm] = useState({
    name: '',
    gender: 'MALE',
    location: '',
    hostel_type: 'NORMAL',
    total_capacity: ''
  });

  const [sessionForm, setSessionForm] = useState({
    academic_year: '',
    start_date: '',
    end_date: '',
    slot_duration_minutes: '15'
  });

  const setActiveTab = (tab) => {
    if (tab === 'overview') {
      searchParams.delete('tab');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ tab });
    }
  };

  const loadAllAdminData = async () => {
    try {
      const [dashRes, hostelsRes, roomsRes, leaveRes, roomReqRes, messRes, compRes] = await Promise.all([
        api.get('/dashboard/admin'),
        api.get('/inventory/hostels').catch(() => ({ data: { data: [] } })),
        api.get('/inventory/rooms').catch(() => ({ data: { data: [] } })),
        api.get('/requests/leave').catch(() => ({ data: { data: [] } })),
        api.get('/requests/room-change').catch(() => ({ data: { data: [] } })),
        api.get('/requests/mess-change').catch(() => ({ data: { data: [] } })),
        api.get('/requests/complaints').catch(() => ({ data: { data: [] } }))
      ]);

      setDashboardData(dashRes.data?.data || null);
      setHostels(hostelsRes.data?.data || []);
      setRooms(roomsRes.data?.data || []);
      setRequests({
        leave: leaveRes.data?.data || [],
        room_change: roomReqRes.data?.data || [],
        mess_change: messRes.data?.data || [],
        complaints: compRes.data?.data || []
      });
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to load administrator overview data.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  // Form Submissions
  const handleCreateHostel = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Strict naming rules check: MH- for MALE, LH- for FEMALE
    const nameUpper = hostelForm.name.trim().toUpperCase();
    if (hostelForm.gender === 'MALE' && !nameUpper.startsWith('MH-')) {
      setFeedback({ type: 'error', message: "Boys' hostel name must start with the prefix 'MH-' (e.g. MH-D)." });
      return;
    }
    if (hostelForm.gender === 'FEMALE' && !nameUpper.startsWith('LH-')) {
      setFeedback({ type: 'error', message: "Girls' hostel name must start with the prefix 'LH-' (e.g. LH-C)." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.post('/inventory/hostels', {
        ...hostelForm,
        name: nameUpper,
        total_capacity: parseInt(hostelForm.total_capacity, 10)
      });
      setFeedback({ type: 'success', message: `Hostel ${nameUpper} created successfully.` });
      setHostelForm({ name: '', gender: 'MALE', location: '', hostel_type: 'NORMAL', total_capacity: '' });
      await loadAllAdminData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to create hostel.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (new Date(sessionForm.start_date) >= new Date(sessionForm.end_date)) {
      setFeedback({ type: 'error', message: 'Session start date must be before end date.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.post('/counselling/sessions', {
        ...sessionForm,
        slot_duration_minutes: parseInt(sessionForm.slot_duration_minutes, 10),
        status: 'SCHEDULED'
      });
      setFeedback({ type: 'success', message: 'Counselling session scheduled successfully.' });
      setSessionForm({ academic_year: '', start_date: '', end_date: '', slot_duration_minutes: '15' });
      await loadAllAdminData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to create counselling session.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateSlots = async (sessionId) => {
    if (isSubmitting) return;
    if (!window.confirm('Generate counselling slots for this session? Slots are created strictly based on student academic rank with at most 20 students per batch.')) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.post(`/counselling/sessions/${sessionId}/generate-slots`);
      setFeedback({ type: 'success', message: res.data?.message || 'Counselling slots generated successfully.' });
      await loadAllAdminData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to generate slots.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Derived metrics from real API data
  const roomMetrics = useMemo(() => {
    let availableCount = 0;
    let partialCount = 0;
    let fullCount = 0;
    let unavailableCount = 0;

    rooms.forEach((r) => {
      const isAvailableStatus = r.status === 'AVAILABLE' || r.status === 'PARTIALLY_FILLED';
      if (!isAvailableStatus) {
        unavailableCount++;
      } else if (r.available_capacity === r.capacity) {
        availableCount++;
      } else if (r.available_capacity === 0) {
        fullCount++;
      } else {
        partialCount++;
      }
    });

    return {
      total: rooms.length,
      available: availableCount,
      partial: partialCount,
      full: fullCount,
      unavailable: unavailableCount
    };
  }, [rooms]);

  const totalPendingRequests = useMemo(() => {
    const pLeave = requests.leave.filter((r) => r.status === 'PENDING').length;
    const pRoom = requests.room_change.filter((r) => r.status === 'PENDING').length;
    const pMess = requests.mess_change.filter((r) => r.status === 'PENDING').length;
    const pComp = requests.complaints.filter((r) => r.status === 'PENDING').length;
    return pLeave + pRoom + pMess + pComp;
  }, [requests]);

  if (loading) {
    return (
      <div className="student-loading-container">
        <div className="student-spinner" aria-hidden="true" />
        <p>Loading administrator workspace&hellip;</p>
      </div>
    );
  }

  const inventory = dashboardData?.inventory;
  const users = dashboardData?.users;
  const sessions = dashboardData?.sessions || [];

  const occupancyRate = inventory?.total_capacity && inventory.total_capacity > 0
    ? ((inventory.occupied_beds / inventory.total_capacity) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="student-dashboard-wrap">
      {/* Feedback banner */}
      {feedback && (
        <div className={`portal-alert portal-alert-${feedback.type}`} role="alert">
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ================= GLOBAL SUMMARY KPI BAR ================= */}
      <div className="student-stat-cards-grid">
        {/* Metric 1: Students & Wardens */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Registered Users</span>
            <span className="badge badge-info">{users?.students || 0} Students</span>
          </div>
          <div className="metric-card-value">{(users?.students || 0) + (users?.wardens || 0)}</div>
          <div className="metric-card-subtext">
            {users?.students || 0} students &bull; {users?.wardens || 0} wardens
          </div>
        </div>

        {/* Metric 2: Hostels & Total Bed Capacity */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">System Bed Capacity</span>
            <span className="badge badge-info">{inventory?.total_hostels || 0} Hostels</span>
          </div>
          <div className="metric-card-value">{inventory?.total_capacity || 0} Beds</div>
          <div className="metric-card-subtext">
            Across {inventory?.total_hostels || 0} gender-segregated hostels
          </div>
        </div>

        {/* Metric 3: Confirmed Occupancy Rate */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Overall Occupancy</span>
            <span className="badge badge-confirmed">{occupancyRate}% Filled</span>
          </div>
          <div className="metric-card-value">{inventory?.occupied_beds || 0} Confirmed</div>
          <div className="metric-card-subtext">
            {(inventory?.total_capacity || 0) - (inventory?.occupied_beds || 0)} beds currently free
          </div>
        </div>

        {/* Metric 4: Room Status Breakdown */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Rooms Status</span>
            <span className="badge badge-info">{roomMetrics.total} Total</span>
          </div>
          <div className="metric-card-value">{roomMetrics.available} Free</div>
          <div className="metric-card-subtext">
            {roomMetrics.partial} partial &bull; {roomMetrics.full} full &bull; {roomMetrics.unavailable} maintenance
          </div>
        </div>
      </div>

      {/* ================= SECONDARY NAVIGATION (TABS) ================= */}
      <div className="student-dashboard-tabs">
        <button
          type="button"
          className={`student-tab-pill ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          id="admin-tab-overview"
        >
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`student-tab-pill ${activeTab === 'counselling' ? 'active' : ''}`}
          onClick={() => setActiveTab('counselling')}
          id="admin-tab-counselling"
        >
          <span>Counselling Operations</span>
          {sessions.length > 0 && <span className="tab-count-badge">{sessions.length}</span>}
        </button>

        <button
          type="button"
          className={`student-tab-pill ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
          id="admin-tab-inventory"
        >
          <span>Hostel Inventory</span>
          <span className="tab-count-badge">{hostels.length}</span>
        </button>

        <button
          type="button"
          className={`student-tab-pill ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
          id="admin-tab-requests"
        >
          <span>Pending Operations</span>
          {totalPendingRequests > 0 && (
            <span className="tab-count-badge alert-count">{totalPendingRequests}</span>
          )}
        </button>
      </div>

      {/* ================= TAB 1: OVERVIEW ================= */}
      {activeTab === 'overview' && (
        <div className="student-overview-grid">
          {/* Main Column */}
          <div className="student-overview-main-col">
            {/* Quick Actions / Operations Card */}
            <div className="card">
              <h2>Quick Actions</h2>
              <div className="student-quick-actions-row">
                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() => setActiveTab('counselling')}
                >
                  <div className="quick-action-icon">
                    <Calendar size={22} strokeWidth={2} />
                  </div>
                  <div className="quick-action-text">
                    <strong>Manage Counselling</strong>
                    <span>Sessions, batch generation</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() => setActiveTab('inventory')}
                >
                  <div className="quick-action-icon">
                    <Building2 size={22} strokeWidth={2} />
                  </div>
                  <div className="quick-action-text">
                    <strong>Hostels &amp; Rooms</strong>
                    <span>Capacity, blocks distribution</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() => setActiveTab('requests')}
                >
                  <div className="quick-action-icon">
                    <ClipboardList size={22} strokeWidth={2} />
                  </div>
                  <div className="quick-action-text">
                    <strong>Pending Requests</strong>
                    <span>{totalPendingRequests} awaiting review</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Active Sessions Highlight */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Counselling Sessions Status</h2>
                <button
                  type="button"
                  className="student-text-btn"
                  onClick={() => setActiveTab('counselling')}
                >
                  View all &rarr;
                </button>
              </div>

              {sessions.length === 0 ? (
                <div className="empty-state">
                  <p>No counselling sessions scheduled. Create a session to generate slots.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Academic Year</th>
                        <th>Scheduled Window</th>
                        <th>Slot Duration</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.slice(0, 3).map((s) => (
                        <tr key={s.session_id}>
                          <td><strong>{s.academic_year}</strong></td>
                          <td>
                            {new Date(s.start_date).toLocaleDateString()} &mdash; {new Date(s.end_date).toLocaleDateString()}
                          </td>
                          <td>{s.slot_duration_minutes || 15} mins</td>
                          <td>
                            <span className={`badge ${s.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                              {s.status}
                            </span>
                          </td>
                          <td>
                            {s.status === 'SCHEDULED' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-lime"
                                onClick={() => handleGenerateSlots(s.session_id)}
                                disabled={isSubmitting}
                              >
                                Generate Slots
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Side Column: Inventory & Requests Summary */}
          <div className="student-overview-side-col">
            {/* Hostels Summary Card */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Hostel Distribution</h3>
                <button
                  type="button"
                  className="student-text-btn"
                  onClick={() => setActiveTab('inventory')}
                >
                  Details &rarr;
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {hostels.map((h) => (
                  <div key={h.hostel_id} className="student-request-snippet">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--primary-color)' }}>{h.name}</strong>
                      <span className={`badge ${h.gender === 'MALE' ? 'badge-info' : 'badge-warning'}`}>
                        {h.gender}
                      </span>
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                      Capacity: {h.total_capacity} beds &bull; {h.location || 'Campus'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Requests Count */}
            <div className="card">
              <h3 style={{ margin: '0 0 0.75rem 0' }}>Pending Operational Tasks</h3>
              <dl className="dl-grid">
                <dt>Leave Requests</dt>
                <dd>{requests.leave.filter((r) => r.status === 'PENDING').length}</dd>
                <dt>Room Change</dt>
                <dd>{requests.room_change.filter((r) => r.status === 'PENDING').length}</dd>
                <dt>Mess Change</dt>
                <dd>{requests.mess_change.filter((r) => r.status === 'PENDING').length}</dd>
                <dt>Open Complaints</dt>
                <dd>{requests.complaints.filter((r) => r.status === 'PENDING').length}</dd>
              </dl>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ width: '100%', marginTop: '1rem' }}
                onClick={() => setActiveTab('requests')}
              >
                Inspect All Requests &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: COUNSELLING OPERATIONS ================= */}
      {activeTab === 'counselling' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Batch policy banner */}
          <div className="portal-alert portal-alert-info">
            <span>
              <strong>Counselling Rule:</strong> Each counselling batch is restricted to at most <strong>20 students</strong>.
              Queue priority is enforced server-side strictly by academic rank, followed by CGPA.
              Students receive an authoritative 3-minute window upon activation.
            </span>
          </div>

          <div className="card">
            <h2>Counselling Sessions</h2>
            {sessions.length === 0 ? (
              <div className="empty-state">
                <p>No counselling sessions configured yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Session ID</th>
                      <th>Academic Year</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th>Slot Duration</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.session_id}>
                        <td>#{s.session_id}</td>
                        <td><strong>{s.academic_year}</strong></td>
                        <td>{new Date(s.start_date).toLocaleString()}</td>
                        <td>{new Date(s.end_date).toLocaleString()}</td>
                        <td>{s.slot_duration_minutes || 15} minutes</td>
                        <td>
                          <span className={`badge ${s.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td>
                          {s.status === 'SCHEDULED' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-lime"
                              onClick={() => handleGenerateSlots(s.session_id)}
                              disabled={isSubmitting}
                              id={`generate-slots-btn-${s.session_id}`}
                            >
                              Generate Slots
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Create Session Form */}
          <div className="card" style={{ maxWidth: 640 }}>
            <h2>Create New Counselling Session</h2>
            <form onSubmit={handleCreateSession} className="request-form">
              <div className="form-group">
                <label htmlFor="session-academic-year">Academic Year</label>
                <input
                  id="session-academic-year"
                  type="text"
                  required
                  placeholder="e.g. 2026-2027"
                  value={sessionForm.academic_year}
                  onChange={(e) => setSessionForm({ ...sessionForm, academic_year: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="session-start-date">Start Date &amp; Time</label>
                  <input
                    id="session-start-date"
                    type="datetime-local"
                    required
                    value={sessionForm.start_date}
                    onChange={(e) => setSessionForm({ ...sessionForm, start_date: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="session-end-date">End Date &amp; Time</label>
                  <input
                    id="session-end-date"
                    type="datetime-local"
                    required
                    value={sessionForm.end_date}
                    onChange={(e) => setSessionForm({ ...sessionForm, end_date: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="session-duration">Slot Duration (Minutes)</label>
                <input
                  id="session-duration"
                  type="number"
                  min="3"
                  max="60"
                  required
                  value={sessionForm.slot_duration_minutes}
                  onChange={(e) => setSessionForm({ ...sessionForm, slot_duration_minutes: e.target.value })}
                  disabled={isSubmitting}
                />
                <span className="form-hint">Server gives active students 3 minutes to confirm allocation during their active turn.</span>
              </div>

              <button
                type="submit"
                className="btn btn-lime"
                disabled={isSubmitting}
                id="create-session-submit-btn"
              >
                {isSubmitting ? 'Creating Session…' : 'Schedule Counselling Session'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= TAB 3: HOSTEL INVENTORY ================= */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Hostels List */}
          <div className="card">
            <h2>Hostel Blocks &amp; Permitted Gender</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hostel Name</th>
                    <th>Gender Eligibility</th>
                    <th>Location</th>
                    <th>Bed Capacity</th>
                    <th>Assigned Warden</th>
                  </tr>
                </thead>
                <tbody>
                  {hostels.map((h) => (
                    <tr key={h.hostel_id}>
                      <td><strong>{h.name}</strong></td>
                      <td>
                        <span className={`badge ${h.gender === 'MALE' ? 'badge-info' : 'badge-warning'}`}>
                          {h.gender === 'MALE' ? 'Boys (MH-)' : 'Girls (LH-)'}
                        </span>
                      </td>
                      <td>{h.location || 'Main Campus'}</td>
                      <td>{h.total_capacity} beds</td>
                      <td>{h.warden_id ? `Warden #${h.warden_id}` : 'Unassigned'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add New Hostel Form */}
          <div className="card" style={{ maxWidth: 640 }}>
            <h2>Register New Hostel Block</h2>
            <form onSubmit={handleCreateHostel} className="request-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="hostel-name">Hostel Name</label>
                  <input
                    id="hostel-name"
                    type="text"
                    required
                    placeholder="e.g. MH-D or LH-C"
                    value={hostelForm.name}
                    onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })}
                    disabled={isSubmitting}
                  />
                  <span className="form-hint">Boys must start with MH-; Girls must start with LH-.</span>
                </div>
                <div className="form-group">
                  <label htmlFor="hostel-gender">Permitted Gender</label>
                  <select
                    id="hostel-gender"
                    value={hostelForm.gender}
                    onChange={(e) => setHostelForm({ ...hostelForm, gender: e.target.value })}
                    disabled={isSubmitting}
                  >
                    <option value="MALE">Male (MH-)</option>
                    <option value="FEMALE">Female (LH-)</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="hostel-capacity">Total Bed Capacity</label>
                  <input
                    id="hostel-capacity"
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 150"
                    value={hostelForm.total_capacity}
                    onChange={(e) => setHostelForm({ ...hostelForm, total_capacity: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="hostel-location">Location / Campus</label>
                  <input
                    id="hostel-location"
                    type="text"
                    placeholder="e.g. North Campus"
                    value={hostelForm.location}
                    onChange={(e) => setHostelForm({ ...hostelForm, location: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-lime"
                disabled={isSubmitting}
                id="create-hostel-submit-btn"
              >
                {isSubmitting ? 'Registering…' : 'Register Hostel'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= TAB 4: PENDING OPERATIONS ================= */}
      {activeTab === 'requests' && (
        <div className="card">
          <h2>System-Wide Student Requests Oversight</h2>
          <p className="text-muted" style={{ marginBottom: '1.25rem' }}>
            System-wide view of all requests submitted by students across all hostel blocks.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Leave requests */}
            <div>
              <h3>Leave Applications ({requests.leave.length})</h3>
              {requests.leave.length === 0 ? (
                <p className="text-muted">No leave requests found.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Request ID</th>
                        <th>Student ID</th>
                        <th>Dates</th>
                        <th>Reason</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.leave.map((r) => (
                        <tr key={r.leave_id}>
                          <td>#{r.leave_id}</td>
                          <td>Student #{r.student_id}</td>
                          <td>
                            {r.start_date?.split('T')[0]} &mdash; {r.end_date?.split('T')[0]}
                          </td>
                          <td>{r.reason}</td>
                          <td>
                            <span className={`badge ${r.status === 'APPROVED' ? 'badge-success' : r.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Room change requests */}
            <div>
              <h3>Room Change Requests ({requests.room_change.length})</h3>
              {requests.room_change.length === 0 ? (
                <p className="text-muted">No room change requests found.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Change ID</th>
                        <th>Student ID</th>
                        <th>Requested Type</th>
                        <th>Reason</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.room_change.map((r) => (
                        <tr key={r.change_id}>
                          <td>#{r.change_id}</td>
                          <td>Student #{r.student_id}</td>
                          <td>{r.requested_room_type}</td>
                          <td>{r.reason}</td>
                          <td>
                            <span className={`badge ${r.status === 'APPROVED' ? 'badge-success' : r.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Building2,
  DoorOpen,
  Plane,
  Wrench,
  UtensilsCrossed,
  Bell,
  Check,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data State
  const [data, setData] = useState(null);
  const [counselling, setCounselling] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [requestHistory, setRequestHistory] = useState({
    leave: [],
    room_change: [],
    mess_change: [],
    complaints: [],
  });

  // UI Tabs & Filters
  const activeTab = searchParams.get('tab') || 'overview'; // 'overview' | 'requests' | 'notifications'
  const [requestSubTab, setRequestSubTab] = useState('leave'); // 'leave' | 'room_change' | 'mess_change' | 'complaints' | 'history'
  const [notifFilter, setNotifFilter] = useState('unread'); // 'unread' | 'all'

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Forms
  const [leaveForm, setLeaveForm] = useState({ start_date: '', end_date: '', reason: '' });
  const [roomChangeForm, setRoomChangeForm] = useState({ requested_room_type: '', reason: '' });
  const [messChangeForm, setMessChangeForm] = useState({ requested_mess: 'Special Mess', reason: '' });
  const [complaintForm, setComplaintForm] = useState({ category: 'Maintenance / Furniture', description: '', priority: 'LOW' });

  const setActiveTab = (tab) => {
    if (tab === 'overview') {
      searchParams.delete('tab');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ tab });
    }
  };

  const fetchRequestHistory = async () => {
    try {
      const [leaveRes, roomRes, messRes, compRes] = await Promise.all([
        api.get('/requests/leave').catch(() => ({ data: { data: [] } })),
        api.get('/requests/room-change').catch(() => ({ data: { data: [] } })),
        api.get('/requests/mess-change').catch(() => ({ data: { data: [] } })),
        api.get('/requests/complaints').catch(() => ({ data: { data: [] } })),
      ]);

      setRequestHistory({
        leave: leaveRes.data.data || [],
        room_change: roomRes.data.data || [],
        mess_change: messRes.data.data || [],
        complaints: compRes.data.data || [],
      });
    } catch (err) {
      console.error('Failed to load request history', err);
    }
  };

  const loadAllData = async () => {
    try {
      const [dashRes, counsellingRes, typesRes] = await Promise.all([
        api.get('/dashboard/student'),
        api.get('/counselling/status').catch(() => ({ data: { success: true, data: { has_slot: false } } })),
        api.get('/inventory/room-types').catch(() => ({ data: { data: [] } })),
      ]);

      setData(dashRes.data?.data || null);
      setCounselling(counsellingRes.data?.data || null);
      setRoomTypes(typesRes.data?.data || []);
      await fetchRequestHistory();
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to load student dashboard.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Request Form Submissions
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (new Date(leaveForm.start_date) > new Date(leaveForm.end_date)) {
      setFeedback({ type: 'error', message: 'Leave start date cannot be later than end date.' });
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.post('/requests/leave', leaveForm);
      setFeedback({ type: 'success', message: 'Leave request submitted successfully.' });
      setLeaveForm({ start_date: '', end_date: '', reason: '' });
      await loadAllData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to submit leave request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoomChangeSubmit = async (e) => {
    e.preventDefault();
    if (!data?.allocation) {
      setFeedback({
        type: 'error',
        message: 'You must have an active confirmed room allocation to request a room change.',
      });
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.post('/requests/room-change', roomChangeForm);
      setFeedback({ type: 'success', message: 'Room change request submitted successfully.' });
      setRoomChangeForm({ requested_room_type: '', reason: '' });
      await loadAllData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to submit room change request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMessChangeSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.post('/requests/mess-change', messChangeForm);
      setFeedback({ type: 'success', message: 'Mess change request submitted successfully.' });
      setMessChangeForm({ requested_mess: 'Special Mess', reason: '' });
      await loadAllData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to submit mess change request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.post('/requests/complaints', complaintForm);
      setFeedback({ type: 'success', message: 'Complaint registered successfully.' });
      setComplaintForm({ category: 'Maintenance / Furniture', description: '', priority: 'LOW' });
      await loadAllData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to register complaint.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      await loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Computed data
  const totalPendingRequests = useMemo(() => {
    if (!data?.requests) return 0;
    return (
      (data.requests.leave?.length || 0) +
      (data.requests.room_change?.length || 0) +
      (data.requests.mess_change?.length || 0) +
      (data.requests.complaints?.length || 0)
    );
  }, [data]);

  const allHistoryItems = useMemo(() => {
    const list = [];
    requestHistory.leave.forEach((item) =>
      list.push({
        id: `leave-${item.leave_id}`,
        type: 'Leave Request',
        details: `${item.start_date?.split('T')[0]} to ${item.end_date?.split('T')[0]} — ${item.reason}`,
        date: item.requested_at,
        status: item.status,
      })
    );
    requestHistory.room_change.forEach((item) =>
      list.push({
        id: `room-${item.change_id}`,
        type: 'Room Change',
        details: `Type: ${item.requested_room_type} — Reason: ${item.reason}`,
        date: item.requested_at,
        status: item.status,
      })
    );
    requestHistory.mess_change.forEach((item) =>
      list.push({
        id: `mess-${item.mess_id}`,
        type: 'Mess Change',
        details: `Requested: ${item.requested_mess} — Reason: ${item.reason}`,
        date: item.requested_at,
        status: item.status,
      })
    );
    requestHistory.complaints.forEach((item) =>
      list.push({
        id: `comp-${item.complaint_id}`,
        type: `Complaint (${item.category})`,
        details: `${item.description} [Priority: ${item.priority}]`,
        date: item.created_at,
        status: item.status,
      })
    );
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [requestHistory]);

  const notificationsList = useMemo(() => {
    const raw = data?.notifications || [];
    if (notifFilter === 'unread') {
      return raw.filter((n) => !n.is_read);
    }
    return raw;
  }, [data, notifFilter]);

  if (loading) {
    return (
      <div className="student-loading-container">
        <div className="student-spinner" aria-hidden="true" />
        <p>Loading student dashboard&hellip;</p>
      </div>
    );
  }

  const student = data?.student;
  const allocation = data?.allocation;
  const isAllocated = !!allocation;

  return (
    <div className="student-dashboard-wrap">
      {/* Feedback banner */}
      {feedback && (
        <div className={`portal-alert portal-alert-${feedback.type}`} role="alert">
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ================= IDENTITY & METRIC CARDS ROW ================= */}
      <div className="student-stat-cards-grid">
        {/* Card 1: Student Identity */}
        <div className="metric-card student-identity-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Student Profile</span>
            <span className="badge badge-info">{student?.gender === 'M' ? 'Male (MH)' : 'Female (LH)'}</span>
          </div>
          <div className="student-id-details">
            <div className="student-id-name">{student?.name || user?.name}</div>
            <div className="student-id-reg">Reg No: <strong>{student?.reg_no || '—'}</strong></div>
            <div className="student-id-meta">
              <span>Rank: <strong>#{student?.academic_rank || '—'}</strong></span>
              <span>CGPA: <strong>{student?.cgpa || '—'}</strong></span>
            </div>
          </div>
        </div>

        {/* Card 2: Counselling Status */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Counselling Status</span>
            <span className={`badge ${
              counselling?.status === 'ACTIVE' ? 'badge-success' :
              counselling?.status === 'COMPLETED' ? 'badge-confirmed' :
              counselling?.status === 'PENDING' ? 'badge-warning' : 'badge-info'
            }`}>
              {counselling?.status || 'No Active Slot'}
            </span>
          </div>
          <div className="metric-card-value">
            {counselling?.status === 'PENDING' ? (
              counselling.queue_position ? `Queue #${counselling.queue_position}` : 'In Queue'
            ) : counselling?.status === 'ACTIVE' ? (
              'Active Window'
            ) : counselling?.status === 'COMPLETED' ? (
              'Completed'
            ) : (
              'Not Scheduled'
            )}
          </div>
          <div className="metric-card-subtext">
            <Link to="/counselling" className="student-card-link" id="dash-counselling-link">
              Go to Counselling Room &rarr;
            </Link>
          </div>
        </div>

        {/* Card 3: Room Allocation */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Room Allocation</span>
            <span className={`badge ${isAllocated ? 'badge-confirmed' : 'badge-warning'}`}>
              {isAllocated ? 'Allocated' : 'Unallocated'}
            </span>
          </div>
          <div className="metric-card-value">
            {isAllocated ? `${allocation.hostel_name} - ${allocation.room_number}` : 'None'}
          </div>
          <div className="metric-card-subtext">
            {isAllocated ? `${allocation.room_type} • Floor ${allocation.floor}` : 'Allocation pending counselling'}
          </div>
        </div>

        {/* Card 4: Outstanding Requests */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Active Requests</span>
            <span className="badge badge-info">{totalPendingRequests} Pending</span>
          </div>
          <div className="metric-card-value">{totalPendingRequests}</div>
          <div className="metric-card-subtext">
            <button
              type="button"
              className="student-text-btn"
              onClick={() => setActiveTab('requests')}
            >
              View request details &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ================= SECONDARY NAVIGATION (TABS) ================= */}
      <div className="student-dashboard-tabs">
        <button
          type="button"
          className={`student-tab-pill ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
          id="tab-overview-btn"
        >
          <HomeIcon />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`student-tab-pill ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
          id="tab-requests-btn"
        >
          <span>Service Requests</span>
          {totalPendingRequests > 0 && (
            <span className="tab-count-badge">{totalPendingRequests}</span>
          )}
        </button>

        <button
          type="button"
          className={`student-tab-pill ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
          id="tab-notifications-btn"
        >
          <BellIcon />
          <span>Notifications</span>
          {data?.notifications?.filter((n) => !n.is_read).length > 0 && (
            <span className="tab-count-badge alert-count">
              {data.notifications.filter((n) => !n.is_read).length}
            </span>
          )}
        </button>
      </div>

      {/* ================= TAB 1: OVERVIEW ================= */}
      {activeTab === 'overview' && (
        <div className="student-overview-grid">
          {/* Left Column: Counselling & Room Details */}
          <div className="student-overview-main-col">
            {/* Counselling Banner CTA */}
            {!isAllocated && (
              <div className="card counselling-cta-banner">
                <div className="counselling-cta-copy">
                  <span className="badge badge-warning">Counselling Session</span>
                  <h3>
                    {counselling?.status === 'ACTIVE'
                      ? 'Your Counselling Window is Active!'
                      : counselling?.status === 'PENDING'
                      ? `You are Queue #${counselling.queue_position || '—'} in Counselling`
                      : 'Participate in Hostel Allocation'}
                  </h3>
                  <p className="text-muted">
                    {counselling?.status === 'ACTIVE'
                      ? 'You have 3 minutes to choose your preferred room and invite roommates.'
                      : 'Slots are strictly merit-based. Track your queue position and enter the live counselling room.'}
                  </p>
                </div>
                <Link to="/counselling" className="btn btn-lime btn-lg" id="overview-enter-counselling-btn">
                  Enter Counselling Room
                </Link>
              </div>
            )}

            {/* Confirmed Room Details */}
            {isAllocated ? (
              <div className="card">
                <h2>Confirmed Room Allocation</h2>
                <div className="room-confirmed-banner">
                  <div className="room-confirmed-badge-row">
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
                        {allocation.hostel_name} &mdash; Room {allocation.room_number}
                      </h3>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                        Floor {allocation.floor} &bull; {allocation.room_type}
                      </span>
                    </div>
                    <span className="badge badge-success">Confirmed</span>
                  </div>

                  <dl className="dl-grid" style={{ marginTop: '1rem' }}>
                    <dt>Confirmed On</dt>
                    <dd>{new Date(allocation.confirmed_at).toLocaleString()}</dd>
                    <dt>Hostel Prefix</dt>
                    <dd>{allocation.hostel_name.startsWith('MH') ? "Men's Hostel" : "Ladies' Hostel"}</dd>
                  </dl>

                  {data.roommates && data.roommates.length > 0 && (
                    <div style={{ marginTop: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>Confirmed Roommates</h4>
                      <div className="roommate-chips">
                        {data.roommates.map((rm) => (
                          <span key={rm.reg_no} className="roommate-chip roommate-chip-verified">
                            <Check size={12} strokeWidth={2.5} style={{ marginRight: '0.25rem', display: 'inline-block', verticalAlign: 'middle' }} />
                            {rm.name} ({rm.reg_no})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '1.25rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setActiveTab('requests');
                        setRequestSubTab('room_change');
                      }}
                    >
                      Apply for Room Change
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <h2>Current Allocation</h2>
                <div className="empty-state">
                  <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                    <Building2 size={36} strokeWidth={1.5} />
                  </div>
                  <h3>No Room Allocated Yet</h3>
                  <p>Your room will be allocated once you select and confirm a room during your active counselling window.</p>
                  <Link to="/counselling" className="btn btn-outline btn-sm" style={{ marginTop: '1rem' }}>
                    View Counselling Status
                  </Link>
                </div>
              </div>
            )}

            {/* Quick Actions Card */}
            <div className="card">
              <h2>Quick Actions</h2>
              <div className="student-quick-actions-row">
                <Link to="/counselling" className="quick-action-item">
                  <div className="quick-action-icon">
                    <DoorOpen size={22} strokeWidth={2} />
                  </div>
                  <div className="quick-action-text">
                    <strong>Enter Counselling</strong>
                    <span>Live room selection room</span>
                  </div>
                </Link>

                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() => {
                    setActiveTab('requests');
                    setRequestSubTab('leave');
                  }}
                >
                  <div className="quick-action-icon">
                    <Plane size={22} strokeWidth={2} />
                  </div>
                  <div className="quick-action-text">
                    <strong>Apply for Leave</strong>
                    <span>Submit night / weekend leave</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() => {
                    setActiveTab('requests');
                    setRequestSubTab('complaints');
                  }}
                >
                  <div className="quick-action-icon">
                    <Wrench size={22} strokeWidth={2} />
                  </div>
                  <div className="quick-action-text">
                    <strong>Report Maintenance</strong>
                    <span>File hostel complaint</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() => {
                    setActiveTab('requests');
                    setRequestSubTab('mess_change');
                  }}
                >
                  <div className="quick-action-icon">
                    <UtensilsCrossed size={22} strokeWidth={2} />
                  </div>
                  <div className="quick-action-text">
                    <strong>Change Mess</strong>
                    <span>Switch meal preferences</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Recent Requests & Notifications Summary */}
          <div className="student-overview-side-col">
            {/* Active Requests Card */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Recent Requests</h3>
                <button
                  type="button"
                  className="student-text-btn"
                  onClick={() => setActiveTab('requests')}
                >
                  All ({allHistoryItems.length})
                </button>
              </div>

              {allHistoryItems.length === 0 ? (
                <div className="empty-state" style={{ padding: '1.5rem 1rem' }}>
                  <p>No requests submitted yet.</p>
                </div>
              ) : (
                <div className="student-recent-requests-list">
                  {allHistoryItems.slice(0, 4).map((item) => (
                    <div key={item.id} className="student-request-snippet">
                      <div className="snippet-type">{item.type}</div>
                      <div className="snippet-details text-muted">{item.details}</div>
                      <div className="snippet-footer">
                        <span className={`badge ${
                          item.status === 'APPROVED' ? 'badge-success' :
                          item.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {item.status}
                        </span>
                        <span className="snippet-date text-muted">{new Date(item.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unread Notifications Snippet */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Recent Notifications</h3>
                <button
                  type="button"
                  className="student-text-btn"
                  onClick={() => setActiveTab('notifications')}
                >
                  View All
                </button>
              </div>

              {(!data?.notifications || data.notifications.length === 0) ? (
                <div className="empty-state" style={{ padding: '1.5rem 1rem' }}>
                  <p>No notifications.</p>
                </div>
              ) : (
                <div className="student-notifications-snippet-list">
                  {data.notifications.slice(0, 3).map((n) => (
                    <div key={n.notification_id} className={`student-notif-snippet ${!n.is_read ? 'unread' : ''}`}>
                      <div className="notif-snippet-title">{n.title}</div>
                      <div className="notif-snippet-msg text-muted">{n.message}</div>
                      <div className="notif-snippet-meta">
                        <span>{new Date(n.created_at).toLocaleDateString()}</span>
                        {!n.is_read && (
                          <button
                            type="button"
                            className="student-text-btn"
                            onClick={() => markNotificationRead(n.notification_id)}
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: SERVICE REQUESTS ================= */}
      {activeTab === 'requests' && (
        <div className="card">
          <h2>Service Requests &amp; Inquiries</h2>
          <div className="segmented-group">
            <button
              type="button"
              className={`segmented-btn ${requestSubTab === 'leave' ? 'active' : ''}`}
              onClick={() => setRequestSubTab('leave')}
              id="subtab-leave-btn"
            >
              Apply for Leave
            </button>
            <button
              type="button"
              className={`segmented-btn ${requestSubTab === 'room_change' ? 'active' : ''}`}
              onClick={() => setRequestSubTab('room_change')}
              id="subtab-room-btn"
            >
              Room Change
            </button>
            <button
              type="button"
              className={`segmented-btn ${requestSubTab === 'mess_change' ? 'active' : ''}`}
              onClick={() => setRequestSubTab('mess_change')}
              id="subtab-mess-btn"
            >
              Mess Change
            </button>
            <button
              type="button"
              className={`segmented-btn ${requestSubTab === 'complaints' ? 'active' : ''}`}
              onClick={() => setRequestSubTab('complaints')}
              id="subtab-complaints-btn"
            >
              Lodge Complaint
            </button>
            <button
              type="button"
              className={`segmented-btn ${requestSubTab === 'history' ? 'active' : ''}`}
              onClick={() => setRequestSubTab('history')}
              id="subtab-history-btn"
            >
              Request History ({allHistoryItems.length})
            </button>
          </div>

          {/* Subtab: Leave */}
          {requestSubTab === 'leave' && (
            <div style={{ maxWidth: 600 }}>
              <h3>Submit Leave Application</h3>
              <form onSubmit={handleLeaveSubmit} className="request-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="leave-start-date">Start Date</label>
                    <input
                      id="leave-start-date"
                      type="date"
                      required
                      value={leaveForm.start_date}
                      onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="leave-end-date">End Date</label>
                    <input
                      id="leave-end-date"
                      type="date"
                      required
                      value={leaveForm.end_date}
                      onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="leave-reason">Reason for Leave</label>
                  <textarea
                    id="leave-reason"
                    rows="3"
                    required
                    placeholder="Provide justification for leave"
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <button type="submit" className="btn btn-lime" disabled={isSubmitting} id="submit-leave-btn">
                  {isSubmitting ? 'Submitting…' : 'Submit Leave Request'}
                </button>
              </form>
            </div>
          )}

          {/* Subtab: Room Change */}
          {requestSubTab === 'room_change' && (
            <div style={{ maxWidth: 600 }}>
              <h3>Formal Room Change Request</h3>
              {!isAllocated ? (
                <div className="portal-alert portal-alert-warning">
                  You must have an active confirmed room allocation to request a room change.
                </div>
              ) : (
                <form onSubmit={handleRoomChangeSubmit} className="request-form">
                  <div className="form-group">
                    <label htmlFor="room-change-type">Requested Room Type</label>
                    <select
                      id="room-change-type"
                      required
                      value={roomChangeForm.requested_room_type}
                      onChange={(e) => setRoomChangeForm({ ...roomChangeForm, requested_room_type: e.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="">Select a preferred room type</option>
                      {roomTypes.map((rt) => (
                        <option key={rt.room_type_id} value={rt.type_name}>
                          {rt.type_name} ({rt.capacity} beds)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="room-change-reason">Reason for Change</label>
                    <textarea
                      id="room-change-reason"
                      rows="3"
                      required
                      placeholder="State reason for requested room reassignment"
                      value={roomChangeForm.reason}
                      onChange={(e) => setRoomChangeForm({ ...roomChangeForm, reason: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <button type="submit" className="btn btn-lime" disabled={isSubmitting} id="submit-room-change-btn">
                    {isSubmitting ? 'Submitting…' : 'Submit Room Change Request'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Subtab: Mess Change */}
          {requestSubTab === 'mess_change' && (
            <div style={{ maxWidth: 600 }}>
              <h3>Mess Change Request</h3>
              <form onSubmit={handleMessChangeSubmit} className="request-form">
                <div className="form-group">
                  <label htmlFor="mess-change-select">Preferred Mess Caterer</label>
                  <select
                    id="mess-change-select"
                    value={messChangeForm.requested_mess}
                    onChange={(e) => setMessChangeForm({ ...messChangeForm, requested_mess: e.target.value })}
                    disabled={isSubmitting}
                  >
                    <option value="Special Mess">Special Mess</option>
                    <option value="North Indian Veg">North Indian Veg</option>
                    <option value="South Indian Veg">South Indian Veg</option>
                    <option value="Non-Veg Catering">Non-Veg Catering</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="mess-change-reason">Reason</label>
                  <textarea
                    id="mess-change-reason"
                    rows="3"
                    required
                    placeholder="Dietary requirements or preferences"
                    value={messChangeForm.reason}
                    onChange={(e) => setMessChangeForm({ ...messChangeForm, reason: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <button type="submit" className="btn btn-lime" disabled={isSubmitting} id="submit-mess-change-btn">
                  {isSubmitting ? 'Submitting…' : 'Submit Mess Request'}
                </button>
              </form>
            </div>
          )}

          {/* Subtab: Complaints */}
          {requestSubTab === 'complaints' && (
            <div style={{ maxWidth: 600 }}>
              <h3>Lodge Hostel Complaint</h3>
              <form onSubmit={handleComplaintSubmit} className="request-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="complaint-category">Category</label>
                    <select
                      id="complaint-category"
                      value={complaintForm.category}
                      onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="Maintenance / Furniture">Maintenance / Furniture</option>
                      <option value="Electrical / Lighting">Electrical / Lighting</option>
                      <option value="Plumbing / Water">Plumbing / Water</option>
                      <option value="Cleanliness / Waste">Cleanliness / Waste</option>
                      <option value="Noise / Roommate">Noise / Roommate</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="complaint-priority">Priority</label>
                    <select
                      id="complaint-priority"
                      value={complaintForm.priority}
                      onChange={(e) => setComplaintForm({ ...complaintForm, priority: e.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="complaint-desc">Description</label>
                  <textarea
                    id="complaint-desc"
                    rows="3"
                    required
                    placeholder="Detailed description of the issue"
                    value={complaintForm.description}
                    onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <button type="submit" className="btn btn-lime" disabled={isSubmitting} id="submit-complaint-btn">
                  {isSubmitting ? 'Registering…' : 'Register Complaint'}
                </button>
              </form>
            </div>
          )}

          {/* Subtab: History */}
          {requestSubTab === 'history' && (
            <div>
              <h3>Request History</h3>
              {allHistoryItems.length === 0 ? (
                <div className="empty-state">
                  <p>No historical requests recorded.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Details</th>
                        <th>Submission Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allHistoryItems.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.type}</strong></td>
                          <td>{item.details}</td>
                          <td>{new Date(item.date).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge ${
                              item.status === 'APPROVED' ? 'badge-success' :
                              item.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: NOTIFICATIONS ================= */}
      {activeTab === 'notifications' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, border: 'none', padding: 0 }}>System Notifications</h2>
            <div className="segmented-group" style={{ margin: 0 }}>
              <button
                type="button"
                className={`segmented-btn ${notifFilter === 'unread' ? 'active' : ''}`}
                onClick={() => setNotifFilter('unread')}
              >
                Unread ({data?.notifications?.filter((n) => !n.is_read).length || 0})
              </button>
              <button
                type="button"
                className={`segmented-btn ${notifFilter === 'all' ? 'active' : ''}`}
                onClick={() => setNotifFilter('all')}
              >
                All ({data?.notifications?.length || 0})
              </button>
            </div>
          </div>

          {notificationsList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                <Bell size={36} strokeWidth={1.5} />
              </div>
              <h3>No Notifications</h3>
              <p>You have no {notifFilter === 'unread' ? 'unread' : ''} notifications at this time.</p>
            </div>
          ) : (
            <ul className="notification-list">
              {notificationsList.map((n) => (
                <li key={n.notification_id} className="notification-item">
                  <div className="notification-content">
                    <h4>{n.title}</h4>
                    <p>{n.message}</p>
                    <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem', display: 'inline-block' }}>
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  {!n.is_read && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => markNotificationRead(n.notification_id)}
                    >
                      Mark Read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

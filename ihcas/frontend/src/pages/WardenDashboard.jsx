import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import api from '../api/client';

export default function WardenDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Primary Data
  const [data, setData] = useState(null);
  const [rooms, setRooms] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });

  const setActiveTab = (tab) => {
    if (tab === 'overview') {
      searchParams.delete('tab');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ tab });
    }
  };

  const fetchWardenData = async () => {
    try {
      // Backend automatically scopes /dashboard/warden and /inventory/rooms to this warden's assigned hostel
      const [resDash, resRooms] = await Promise.all([
        api.get('/dashboard/warden'),
        api.get('/inventory/rooms').catch(() => ({ data: { data: [] } }))
      ]);

      setData(resDash.data.data);
      // All rooms returned here belong strictly to this warden's assigned hostel
      setRooms(resRooms.data?.data || []);
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to load warden dashboard.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWardenData();
  }, []);

  // Request review action (APPROVED / REJECTED / RESOLVED)
  const handleReview = async (type, id, status, extraData = {}) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.put(`/requests/${type}/${id}/review`, { status, ...extraData });
      setFeedback({
        type: 'success',
        message: `Request successfully ${status.toLowerCase()}.`
      });
      await fetchWardenData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.response?.data?.error?.message || 'Failed to update request.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Broadcast announcement to assigned hostel residents
  const submitAnnouncement = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.post('/notifications/announcements', announcement);
      setFeedback({
        type: 'success',
        message: `Announcement broadcast successfully to all residents of ${data?.warden?.hostel_name}.`
      });
      setAnnouncement({ title: '', message: '' });
      await fetchWardenData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to publish announcement.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Available rooms in this hostel for room change reassignment
  const availableRoomsInHostel = useMemo(() => {
    return rooms.filter((r) => r.available_capacity > 0);
  }, [rooms]);

  // Derived room metrics strictly for this assigned hostel
  const hostelRoomMetrics = useMemo(() => {
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

  const pendingRequestsCount = useMemo(() => {
    if (!data?.requests) return 0;
    return (
      (data.requests.leave?.length || 0) +
      (data.requests.room_change?.length || 0) +
      (data.requests.mess_change?.length || 0) +
      (data.requests.complaints?.length || 0)
    );
  }, [data]);

  if (loading) {
    return (
      <div className="student-loading-container">
        <div className="student-spinner" aria-hidden="true" />
        <p>Loading warden dashboard&hellip;</p>
      </div>
    );
  }

  const warden = data?.warden;
  const inventory = data?.inventory;
  const hasAssignedHostel = !!warden?.hostel_id;

  const occupancyRate = inventory?.total_bed_capacity && inventory.total_bed_capacity > 0
    ? ((inventory.occupied_beds / inventory.total_bed_capacity) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="student-dashboard-wrap">
      {/* Feedback Alert */}
      {feedback && (
        <div className={`portal-alert portal-alert-${feedback.type}`} role="alert">
          <span>{feedback.message}</span>
        </div>
      )}

      {!hasAssignedHostel ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
              <Building2 size={36} strokeWidth={1.5} />
            </div>
            <h3>No Hostel Assigned</h3>
            <p>You have not been assigned to a hostel block yet. Please contact a system administrator to link your account.</p>
          </div>
        </div>
      ) : (
        <>
          {/* ================= ASSIGNED-HOSTEL SUMMARY KPI BAR ================= */}
          <div className="student-stat-cards-grid">
            {/* Metric 1: Assigned Hostel Identity */}
            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-card-label">Assigned Hostel</span>
                <span className={`badge ${warden.hostel_gender === 'MALE' ? 'badge-info' : 'badge-warning'}`}>
                  {warden.hostel_gender === 'MALE' ? 'Boys (MH)' : 'Girls (LH)'}
                </span>
              </div>
              <div className="metric-card-value">{warden.hostel_name}</div>
              <div className="metric-card-subtext">
                Warden ID: {warden.employee_id || 'WRD'} &bull; {warden.email}
              </div>
            </div>

            {/* Metric 2: Bed Capacity & Occupancy */}
            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-card-label">Beds Occupancy</span>
                <span className="badge badge-confirmed">{occupancyRate}% Filled</span>
              </div>
              <div className="metric-card-value">
                {inventory?.occupied_beds || 0} / {inventory?.total_bed_capacity || warden.total_capacity || 0}
              </div>
              <div className="metric-card-subtext">
                {(inventory?.total_bed_capacity || warden.total_capacity || 0) - (inventory?.occupied_beds || 0)} beds currently available
              </div>
            </div>

            {/* Metric 3: Rooms in Hostel */}
            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-card-label">Rooms Status</span>
                <span className="badge badge-info">{hostelRoomMetrics.total} Rooms</span>
              </div>
              <div className="metric-card-value">{hostelRoomMetrics.available} Free</div>
              <div className="metric-card-subtext">
                {hostelRoomMetrics.partial} partial &bull; {hostelRoomMetrics.full} full &bull; {hostelRoomMetrics.unavailable} maintenance
              </div>
            </div>

            {/* Metric 4: Pending Requests */}
            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-card-label">Action Required</span>
                <span className={`badge ${pendingRequestsCount > 0 ? 'badge-danger' : 'badge-success'}`}>
                  {pendingRequestsCount > 0 ? 'Pending' : 'All Clear'}
                </span>
              </div>
              <div className="metric-card-value">{pendingRequestsCount}</div>
              <div className="metric-card-subtext">
                <button
                  type="button"
                  className="student-text-btn"
                  onClick={() => setActiveTab('requests')}
                >
                  Review pending requests &rarr;
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
              id="warden-tab-overview"
            >
              <span>Overview</span>
            </button>

            <button
              type="button"
              className={`student-tab-pill ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
              id="warden-tab-requests"
            >
              <span>Pending Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="tab-count-badge alert-count">{pendingRequestsCount}</span>
              )}
            </button>

            <button
              type="button"
              className={`student-tab-pill ${activeTab === 'rooms' ? 'active' : ''}`}
              onClick={() => setActiveTab('rooms')}
              id="warden-tab-rooms"
            >
              <span>Room Inventory</span>
              <span className="tab-count-badge">{rooms.length}</span>
            </button>

            <button
              type="button"
              className={`student-tab-pill ${activeTab === 'announcements' ? 'active' : ''}`}
              onClick={() => setActiveTab('announcements')}
              id="warden-tab-announcements"
            >
              <span>Announcements</span>
            </button>
          </div>

          {/* ================= TAB 1: OVERVIEW ================= */}
          {activeTab === 'overview' && (
            <div className="student-overview-grid">
              {/* Main Column */}
              <div className="student-overview-main-col">
                {/* Action Required Banner */}
                {pendingRequestsCount > 0 ? (
                  <div className="card counselling-cta-banner" style={{ background: 'var(--color-charcoal-900)' }}>
                    <div className="counselling-cta-copy">
                      <span className="badge badge-warning">Action Required</span>
                      <h3>{pendingRequestsCount} Student Requests Pending</h3>
                      <p className="text-muted">
                        Students residing in {warden.hostel_name} have submitted leave, room change, or complaint requests that require your review.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-lime btn-lg"
                      onClick={() => setActiveTab('requests')}
                    >
                      Review Requests Now
                    </button>
                  </div>
                ) : (
                  <div className="card">
                    <h2>Requests Status</h2>
                    <div className="empty-state" style={{ padding: '1.5rem 1rem' }}>
                      <p>All student requests for {warden.hostel_name} have been reviewed. No pending actions required.</p>
                    </div>
                  </div>
                )}

                {/* Rooms Quick View */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Room Inventory Overview</h2>
                    <button
                      type="button"
                      className="student-text-btn"
                      onClick={() => setActiveTab('rooms')}
                    >
                      View all {rooms.length} rooms &rarr;
                    </button>
                  </div>

                  {rooms.length === 0 ? (
                    <div className="empty-state">
                      <p>No rooms configured for this hostel.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Room No.</th>
                            <th>Floor</th>
                            <th>Type</th>
                            <th>Capacity</th>
                            <th>Occupied</th>
                            <th>Available Beds</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rooms.slice(0, 5).map((r) => (
                            <tr key={r.room_id}>
                              <td><strong>{r.room_number}</strong></td>
                              <td>Floor {r.floor}</td>
                              <td>{r.type_name || `${r.capacity}-Bed`}</td>
                              <td>{r.capacity}</td>
                              <td>{r.calculated_occupied_beds || 0}</td>
                              <td>{r.available_capacity}</td>
                              <td>
                                <span className={`badge ${
                                  r.available_capacity === 0 ? 'badge-danger' :
                                  r.available_capacity === r.capacity ? 'badge-success' : 'badge-warning'
                                }`}>
                                  {r.available_capacity === 0 ? 'Full' : r.available_capacity === r.capacity ? 'Vacant' : 'Partial'}
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

              {/* Side Column: Announcements & Summary */}
              <div className="student-overview-side-col">
                {/* Publish Announcement Card */}
                <div className="card">
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>Quick Announcement</h3>
                  <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0 0 1rem 0' }}>
                    Broadcast an alert strictly to confirmed residents of {warden.hostel_name}.
                  </p>

                  <form onSubmit={submitAnnouncement} className="request-form">
                    <input
                      type="text"
                      placeholder="Announcement Subject"
                      required
                      value={announcement.title}
                      onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                      disabled={isSubmitting}
                    />
                    <textarea
                      placeholder="Message for hostel residents…"
                      required
                      rows="3"
                      value={announcement.message}
                      onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                      disabled={isSubmitting}
                    />
                    <button
                      type="submit"
                      className="btn btn-lime btn-sm"
                      disabled={isSubmitting || !announcement.title.trim()}
                    >
                      {isSubmitting ? 'Publishing…' : `Broadcast to ${warden.hostel_name}`}
                    </button>
                  </form>
                </div>

                {/* Hostel Identity Details */}
                <div className="card">
                  <h3 style={{ margin: '0 0 0.75rem 0' }}>Hostel Metadata</h3>
                  <dl className="dl-grid">
                    <dt>Block</dt>
                    <dd>{warden.hostel_name}</dd>
                    <dt>Gender</dt>
                    <dd>{warden.hostel_gender}</dd>
                    <dt>Total Beds</dt>
                    <dd>{inventory?.total_bed_capacity || warden.total_capacity} beds</dd>
                    <dt>Total Rooms</dt>
                    <dd>{inventory?.total_rooms || rooms.length} rooms</dd>
                    <dt>Scope</dt>
                    <dd>Strictly Isolated</dd>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: PENDING REQUESTS REVIEW ================= */}
          {activeTab === 'requests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Leave Requests */}
              <div className="card">
                <h2>Pending Leave Requests ({data.requests.leave?.length || 0})</h2>
                {(!data.requests.leave || data.requests.leave.length === 0) ? (
                  <div className="empty-state">
                    <p>No pending leave requests for {warden.hostel_name}.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Reg No.</th>
                          <th>Leave Dates</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.requests.leave.map((r) => (
                          <tr key={r.leave_id}>
                            <td><strong>{r.student_name}</strong></td>
                            <td><code>{r.reg_no}</code></td>
                            <td>
                              {r.start_date.split('T')[0]} &mdash; {r.end_date.split('T')[0]}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-lime"
                                  onClick={() => handleReview('leave', r.leave_id, 'APPROVED')}
                                  disabled={isSubmitting}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleReview('leave', r.leave_id, 'REJECTED')}
                                  disabled={isSubmitting}
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Room Change Requests */}
              <div className="card">
                <h2>Pending Room Change Requests ({data.requests.room_change?.length || 0})</h2>
                {(!data.requests.room_change || data.requests.room_change.length === 0) ? (
                  <div className="empty-state">
                    <p>No pending room change requests for {warden.hostel_name}.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Reg No.</th>
                          <th>Requested Type</th>
                          <th>Assign Room &amp; Decision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.requests.room_change.map((r) => (
                          <tr key={r.change_id}>
                            <td><strong>{r.student_name}</strong></td>
                            <td><code>{r.reg_no}</code></td>
                            <td>{r.requested_room_type}</td>
                            <td>
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const new_room_id = e.target.elements.new_room_id.value;
                                  handleReview('room-change', r.change_id, 'APPROVED', { new_room_id });
                                }}
                                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                              >
                                <select
                                  name="new_room_id"
                                  required
                                  aria-label="Assign Room"
                                  className="form-group-select"
                                  style={{ width: '160px' }}
                                >
                                  <option value="">Select Room…</option>
                                  {availableRoomsInHostel.map((rm) => (
                                    <option key={rm.room_id} value={rm.room_id}>
                                      Room {rm.room_number} ({rm.available_capacity} free)
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="submit"
                                  className="btn btn-sm btn-lime"
                                  disabled={isSubmitting || availableRoomsInHostel.length === 0}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleReview('room-change', r.change_id, 'REJECTED')}
                                  disabled={isSubmitting}
                                >
                                  Reject
                                </button>
                              </form>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Mess Change Requests */}
              <div className="card">
                <h2>Pending Mess Change Requests ({data.requests.mess_change?.length || 0})</h2>
                {(!data.requests.mess_change || data.requests.mess_change.length === 0) ? (
                  <div className="empty-state">
                    <p>No pending mess change requests for {warden.hostel_name}.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Reg No.</th>
                          <th>Requested Mess</th>
                          <th>Decision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.requests.mess_change.map((r) => (
                          <tr key={r.mess_id}>
                            <td><strong>{r.student_name}</strong></td>
                            <td><code>{r.reg_no}</code></td>
                            <td>{r.requested_mess}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-lime"
                                  onClick={() => handleReview('mess-change', r.mess_id, 'APPROVED')}
                                  disabled={isSubmitting}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleReview('mess-change', r.mess_id, 'REJECTED')}
                                  disabled={isSubmitting}
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Open Complaints */}
              <div className="card">
                <h2>Open Hostel Complaints ({data.requests.complaints?.length || 0})</h2>
                {(!data.requests.complaints || data.requests.complaints.length === 0) ? (
                  <div className="empty-state">
                    <p>No open complaints for {warden.hostel_name}.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Reg No.</th>
                          <th>Category</th>
                          <th>Priority</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.requests.complaints.map((r) => (
                          <tr key={r.complaint_id}>
                            <td><strong>{r.student_name}</strong></td>
                            <td><code>{r.reg_no}</code></td>
                            <td>{r.category}</td>
                            <td>
                              <span className={`badge ${
                                r.priority === 'URGENT' || r.priority === 'HIGH' ? 'badge-danger' :
                                r.priority === 'MEDIUM' ? 'badge-warning' : 'badge-info'
                              }`}>
                                {r.priority}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-lime"
                                onClick={() => handleReview('complaints', r.complaint_id, 'RESOLVED')}
                                disabled={isSubmitting}
                              >
                                Mark Resolved
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 3: ROOM INVENTORY ================= */}
          {activeTab === 'rooms' && (
            <div className="card">
              <h2>{warden.hostel_name} Room Inventory ({rooms.length} Rooms)</h2>
              <p className="text-muted" style={{ marginBottom: '1.25rem' }}>
                All rooms strictly scoped to {warden.hostel_name} ({warden.hostel_gender}).
              </p>

              {rooms.length === 0 ? (
                <div className="empty-state">
                  <p>No rooms found for this hostel.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Room Number</th>
                        <th>Floor</th>
                        <th>Room Type</th>
                        <th>Total Capacity</th>
                        <th>Occupied Beds</th>
                        <th>Available Capacity</th>
                        <th>Occupancy Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((r) => (
                        <tr key={r.room_id}>
                          <td><strong>Room {r.room_number}</strong></td>
                          <td>Floor {r.floor}</td>
                          <td>{r.type_name || `${r.capacity}-Bed`}</td>
                          <td>{r.capacity} beds</td>
                          <td>{r.calculated_occupied_beds || 0} beds</td>
                          <td>{r.available_capacity} beds</td>
                          <td>
                            <span className={`badge ${
                              r.available_capacity === 0 ? 'badge-danger' :
                              r.available_capacity === r.capacity ? 'badge-success' : 'badge-warning'
                            }`}>
                              {r.available_capacity === 0 ? 'Full' : r.available_capacity === r.capacity ? 'Vacant' : 'Partial'}
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

          {/* ================= TAB 4: ANNOUNCEMENTS ================= */}
          {activeTab === 'announcements' && (
            <div className="card" style={{ maxWidth: 640 }}>
              <h2>Publish Hostel Announcement</h2>
              <p className="text-muted" style={{ marginBottom: '1.25rem' }}>
                Announcements published here are sent strictly to confirmed student residents of <strong>{warden.hostel_name}</strong>.
              </p>

              <form onSubmit={submitAnnouncement} className="request-form">
                <div className="form-group">
                  <label htmlFor="announcement-title">Subject / Title</label>
                  <input
                    id="announcement-title"
                    type="text"
                    required
                    placeholder="e.g. Scheduled Water Maintenance on 2nd Floor"
                    value={announcement.title}
                    onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="announcement-body">Message Content</label>
                  <textarea
                    id="announcement-body"
                    required
                    rows="4"
                    placeholder="Provide details for residents of this block…"
                    value={announcement.message}
                    onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-lime"
                  disabled={isSubmitting}
                  id="publish-announcement-submit-btn"
                >
                  {isSubmitting ? 'Publishing…' : `Broadcast Announcement to ${warden.hostel_name}`}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}

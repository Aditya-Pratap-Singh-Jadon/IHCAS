import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function WardenDashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });
  const [rooms, setRooms] = useState([]);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const [resDash, resRooms] = await Promise.all([
        api.get('/dashboard/warden'),
        api.get('/inventory/rooms')
      ]);
      setData(resDash.data.data);
      setRooms(resRooms.data.data.filter(r => r.available_capacity > 0));
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (type, id, status, extraData = {}) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.put(`/requests/${type}/${id}/review`, { status, ...extraData });
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitAnnouncement = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.post('/notifications/announcements', announcement);
      setAnnouncement({ title: '', message: '' });
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Error publishing announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="container p-4">Loading dashboard...</div>;
  if (error) return <div className="container p-4 text-red-500">{error}</div>;

  return (
    <div className="container">
      <header className="header">
        <h1>Warden Dashboard - {data?.warden?.hostel_name || 'No Assigned Hostel'}</h1>
        <button onClick={logout} className="btn btn-secondary btn-sm">Sign Out</button>
      </header>

      {!data?.warden?.hostel_id ? (
        <div className="card">
          <p className="text-muted">You have not been assigned a hostel yet. Please contact an administrator.</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {/* Hostel Overview & Occupancy */}
          <section className="card">
            <h2>Hostel Overview</h2>
            <dl className="dl-grid">
              <dt>Name</dt><dd>{data.warden.hostel_name}</dd>
              <dt>Gender</dt><dd>{data.warden.hostel_gender}</dd>
              <dt>Total Capacity</dt><dd>{data.warden.total_capacity} beds</dd>
              <dt>Total Rooms</dt><dd>{data.inventory?.total_rooms || 0}</dd>
              <dt>Occupancy</dt><dd>{data.inventory?.occupied_beds || 0} / {data.inventory?.total_bed_capacity || 0} beds filled</dd>
            </dl>
          </section>

          {/* Announcements */}
          <section className="card">
            <h2>Publish Announcement</h2>
            <form onSubmit={submitAnnouncement} className="request-form">
              <input type="text" placeholder="Announcement Title" required value={announcement.title} onChange={e => setAnnouncement({...announcement, title: e.target.value})} />
              <textarea placeholder="Message body..." required value={announcement.message} onChange={e => setAnnouncement({...announcement, message: e.target.value})} rows="3"></textarea>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>Publish to Hostel</button>
              </div>
            </form>
          </section>

          {/* Pending Requests */}
          <section className="card full-width">
            <h2>Action Required: Pending Requests</h2>
            
            {/* Leave Requests Table */}
            <h3>Leave Requests</h3>
            {data.requests.leave?.length === 0 ? <p className="text-muted">No pending leave requests.</p> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Dates</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.requests.leave?.map(r => (
                    <tr key={r.leave_id}>
                      <td>{r.student_name} ({r.reg_no})</td>
                      <td>{r.start_date.split('T')[0]} to {r.end_date.split('T')[0]}</td>
                      <td>
                        <button onClick={() => handleReview('leave', r.leave_id, 'APPROVED')} className="btn btn-sm btn-primary" style={{marginRight: '0.5rem'}} disabled={isSubmitting}>Approve</button>
                        <button onClick={() => handleReview('leave', r.leave_id, 'REJECTED')} className="btn btn-sm btn-danger" disabled={isSubmitting}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Room Change Table */}
            <h3>Room Change Requests</h3>
            {data.requests.room_change?.length === 0 ? <p className="text-muted">No pending room change requests.</p> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Requested Type</th>
                    <th>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {data.requests.room_change?.map(r => (
                    <tr key={r.change_id}>
                      <td>{r.student_name} ({r.reg_no})</td>
                      <td>{r.requested_room_type}</td>
                      <td>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const new_room_id = e.target.elements.new_room_id.value;
                          handleReview('room-change', r.change_id, 'APPROVED', { new_room_id });
                        }} style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                          <select name="new_room_id" required style={{ width: '120px', padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                            <option value="">Select Room...</option>
                            {rooms.map(room => (
                              <option key={room.room_id} value={room.room_id}>
                                {room.room_number} ({room.available_capacity} free)
                              </option>
                            ))}
                          </select>
                          <button type="submit" className="btn btn-sm btn-primary" disabled={isSubmitting}>Approve</button>
                          <button type="button" onClick={() => handleReview('room-change', r.change_id, 'REJECTED')} className="btn btn-sm btn-danger" disabled={isSubmitting}>Reject</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Mess Change Table */}
            <h3>Mess Change Requests</h3>
            {data.requests.mess_change?.length === 0 ? <p className="text-muted">No pending mess change requests.</p> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Requested Mess</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.requests.mess_change?.map(r => (
                    <tr key={r.mess_id}>
                      <td>{r.student_name} ({r.reg_no})</td>
                      <td>{r.requested_mess}</td>
                      <td>
                        <button onClick={() => handleReview('mess-change', r.mess_id, 'APPROVED')} className="btn btn-sm btn-primary" style={{marginRight: '0.5rem'}} disabled={isSubmitting}>Approve</button>
                        <button onClick={() => handleReview('mess-change', r.mess_id, 'REJECTED')} className="btn btn-sm btn-danger" disabled={isSubmitting}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Complaints Table */}
            <h3>Complaints</h3>
            {data.requests.complaints?.length === 0 ? <p className="text-muted">No open complaints.</p> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.requests.complaints?.map(r => (
                    <tr key={r.complaint_id}>
                      <td>{r.student_name} ({r.reg_no})</td>
                      <td>{r.category}</td>
                      <td><span className={`badge badge-${r.priority.toLowerCase()}`}>{r.priority}</span></td>
                      <td>
                        <button onClick={() => handleReview('complaints', r.complaint_id, 'RESOLVED')} className="btn btn-sm btn-success" disabled={isSubmitting}>Mark Resolved</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

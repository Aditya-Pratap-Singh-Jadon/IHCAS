import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Forms states
  const [hostelForm, setHostelForm] = useState({ name: '', gender: 'MALE', total_capacity: '' });
  const [sessionForm, setSessionForm] = useState({ academic_year: '', start_date: '', end_date: '', slot_duration_minutes: '15' });

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard/admin');
      setData(res.data.data);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHostel = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.post('/inventory/hostels', { ...hostelForm, total_capacity: parseInt(hostelForm.total_capacity, 10) });
      setHostelForm({ name: '', gender: 'MALE', total_capacity: '' });
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating hostel');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.post('/counselling/sessions', { ...sessionForm, slot_duration_minutes: parseInt(sessionForm.slot_duration_minutes, 10) });
      setSessionForm({ academic_year: '', start_date: '', end_date: '', slot_duration_minutes: '15' });
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateSlots = async (sessionId) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.post(`/counselling/sessions/${sessionId}/generate-slots`);
      fetchDashboard();
      alert('Slots generated successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Error generating slots');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="container p-4">Loading dashboard...</div>;
  if (error) return <div className="container p-4 text-red-500">{error}</div>;

  return (
    <div className="container">
      <header className="header">
        <h1>Administrator Workspace</h1>
        <button onClick={logout} className="btn btn-secondary btn-sm">Sign Out</button>
      </header>
      
      <div className="dashboard-grid">
        {/* Global Overview */}
        <section className="card">
          <h2>Global Overview</h2>
          <dl className="dl-grid">
            <dt>Total Students</dt><dd>{data?.users?.students || 0}</dd>
            <dt>Total Wardens</dt><dd>{data?.users?.wardens || 0}</dd>
            <dt>Total Hostels</dt><dd>{data?.inventory?.total_hostels || 0}</dd>
            <dt>System Capacity</dt><dd>{data?.inventory?.total_capacity || 0} beds</dd>
            <dt>Occupied Beds</dt><dd>{data?.inventory?.occupied_beds || 0}</dd>
            <dt>Overall Occupancy</dt>
            <dd>
              {data?.inventory?.total_capacity ? 
                ((data.inventory.occupied_beds / data.inventory.total_capacity) * 100).toFixed(1) + '%' 
                : 'N/A'}
            </dd>
          </dl>
        </section>

        {/* Counselling Sessions */}
        <section className="card">
          <h2>Counselling Sessions</h2>
          {data?.sessions?.length === 0 ? <p className="text-muted">No counselling sessions found.</p> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.sessions?.map(s => (
                  <tr key={s.session_id}>
                    <td>{s.academic_year}</td>
                    <td>{new Date(s.start_date).toLocaleDateString()} to {new Date(s.end_date).toLocaleDateString()}</td>
                    <td><span className={`badge badge-${s.status === 'SCHEDULED' ? 'pending' : 'info'}`}>{s.status}</span></td>
                    <td>
                      {s.status === 'SCHEDULED' && (
                        <button onClick={() => handleGenerateSlots(s.session_id)} className="btn btn-sm btn-primary" disabled={isSubmitting}>Generate Slots</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Management Actions */}
        <section className="card full-width">
          <h2>Management Actions</h2>
          <div className="forms-grid">
            <form onSubmit={handleCreateHostel} className="request-form">
              <h3>Create Hostel</h3>
              <input type="text" placeholder="Hostel Name (e.g. MH-A)" required value={hostelForm.name} onChange={e => setHostelForm({...hostelForm, name: e.target.value})} />
              <select value={hostelForm.gender} onChange={e => setHostelForm({...hostelForm, gender: e.target.value})}>
                <option value="MALE">Male (MH- prefix)</option>
                <option value="FEMALE">Female (LH- prefix)</option>
              </select>
              <input type="number" placeholder="Total Capacity" required value={hostelForm.total_capacity} onChange={e => setHostelForm({...hostelForm, total_capacity: e.target.value})} />
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Create Hostel</button>
            </form>

            <form onSubmit={handleCreateSession} className="request-form">
              <h3>Create Counselling Session</h3>
              <input type="text" placeholder="Academic Year (e.g. 2026-2027)" required value={sessionForm.academic_year} onChange={e => setSessionForm({...sessionForm, academic_year: e.target.value})} />
              <label className="text-muted" style={{fontSize: '0.75rem', marginBottom: '-0.5rem'}}>Start Date & Time</label>
              <input type="datetime-local" required value={sessionForm.start_date} onChange={e => setSessionForm({...sessionForm, start_date: e.target.value})} />
              <label className="text-muted" style={{fontSize: '0.75rem', marginBottom: '-0.5rem'}}>End Date & Time</label>
              <input type="datetime-local" required value={sessionForm.end_date} onChange={e => setSessionForm({...sessionForm, end_date: e.target.value})} />
              <label className="text-muted" style={{fontSize: '0.75rem', marginBottom: '-0.5rem'}}>Slot Duration (minutes)</label>
              <input type="number" required value={sessionForm.slot_duration_minutes} onChange={e => setSessionForm({...sessionForm, slot_duration_minutes: e.target.value})} />
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Create Session</button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { showToast } from '../components/Toast';

const requestsData = [
  {
    id: 1, type: 'LEAVE', typeBg: '#d3e2ed', typeColor: '#3b4951',
    name: 'Alex Sharma', initials: 'AS', studentId: '44920',
    detail: 'Weekend visit to home (Medical)', subDetail: 'Oct 24 - Oct 26',
    location: 'B-302 / North', urgency: 'Routine', urgencyColor: '#5aa958', urgencyDot: '#88d982',
  },
  {
    id: 2, type: 'ROOM CHANGE', typeBg: '#e0e0ff', typeColor: '#343d96',
    name: 'Elena Rodriguez', initials: 'ER', studentId: '45112',
    detail: 'AC not cooling, requesting floor 1', subDetail: 'Submitted 2h ago',
    location: 'C-104 / East', urgency: 'High', urgencyColor: '#93000a', urgencyDot: '#ba1a1a',
  },
  {
    id: 3, type: 'MAINTENANCE', typeBg: '#e0e3e5', typeColor: '#454652',
    name: 'Marcus Kim', initials: 'MK', studentId: '44881',
    detail: 'Water leakage in washroom', subDetail: 'Submitted 5h ago',
    location: 'A-202 / North', urgency: 'Low', urgencyColor: '#3b4951', urgencyDot: '#767683',
  },
  {
    id: 4, type: 'LEAVE', typeBg: '#d3e2ed', typeColor: '#3b4951',
    name: 'Priya Nair', initials: 'PN', studentId: '45001',
    detail: 'Family emergency — urgent travel', subDetail: 'Submitted 30m ago',
    location: 'A-105 / North', urgency: 'High', urgencyColor: '#93000a', urgencyDot: '#ba1a1a',
  },
  {
    id: 5, type: 'MESS CHANGE', typeBg: '#a3f69c', typeColor: '#005312',
    name: 'Raj Verma', initials: 'RV', studentId: '44990',
    detail: 'Switch from Mess A to Mess B', subDetail: 'Submitted 1d ago',
    location: 'B-210 / South', urgency: 'Routine', urgencyColor: '#5aa958', urgencyDot: '#88d982',
  },
];

const alerts = [
  { icon: 'error', iconColor: '#ba1a1a', borderColor: '#ba1a1a', title: 'New Complaint', desc: 'Room D-402: Power outage in entire block.', time: '2 mins ago', iconFill: true },
  { icon: 'verified_user', iconColor: '#003909', borderColor: '#88d982', title: 'Leave Approved', desc: 'Student Sam Lee checked out at Main Gate.', time: '15 mins ago', iconFill: false },
  { icon: 'group_add', iconColor: '#000666', borderColor: '#000666', title: 'New Allocation', desc: 'Sarah J. assigned to Room B-102.', time: '42 mins ago', iconFill: false },
];

const s = {
  page: { display: 'flex', minHeight: '100vh', background: '#f7f9fb', fontFamily: "'Inter', sans-serif" },
  main: { flex: 1, marginLeft: 256, padding: '1.5rem 2.5rem', overflow: 'auto' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' },
  title: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
  desc: { color: '#454652', marginTop: '0.5rem', maxWidth: 520 },
  statCard: {
    background: '#ffffff', padding: '1rem', borderRadius: '0.75rem',
    boxShadow: '0 1px 3px rgba(26,35,126,0.04)', border: '1px solid rgba(198,197,212,0.1)',
    minWidth: 140,
  },
  tableSection: {
    background: '#ffffff', borderRadius: '1rem',
    boxShadow: '0 12px 40px rgba(26,35,126,0.06)', overflow: 'hidden', marginBottom: '2rem',
  },
  filters: {
    padding: '1.5rem', borderBottom: '1px solid #eceef0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
  },
  filterLeft: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  selectSmall: {
    background: '#f2f4f6', border: 'none', borderRadius: '0.5rem',
    fontSize: '0.6875rem', fontWeight: 600, padding: '0.375rem 0.75rem',
    color: '#191c1e', outline: 'none', cursor: 'pointer',
  },
  searchInput: {
    paddingLeft: '2.5rem', paddingRight: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem',
    background: '#f2f4f6', border: 'none', borderRadius: '0.75rem',
    fontSize: '0.8125rem', width: 256, outline: 'none',
    transition: 'box-shadow 0.2s', fontFamily: "'Inter', sans-serif",
  },
  actionBtn: {
    width: 32, height: 32, borderRadius: '0.5rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', cursor: 'pointer', transition: 'opacity 0.2s',
  },
  pagination: {
    padding: '1rem 1.5rem', borderTop: '1px solid #eceef0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: '0.75rem', color: '#454652',
  },
  pageBtn: {
    padding: '0.25rem 0.75rem', borderRadius: '0.25rem',
    border: 'none', cursor: 'pointer', fontSize: '0.75rem', transition: 'background 0.2s',
  },
  bottomGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' },
  occupancyGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  bigStatCard: {
    padding: '1.5rem', borderRadius: '1rem', position: 'relative', overflow: 'hidden',
  },
  alertsPanel: {
    background: 'rgba(224,227,229,0.3)', borderRadius: '1rem', padding: '1.5rem',
    border: '1px solid rgba(198,197,212,0.1)',
  },
  alertItem: {
    display: 'flex', gap: '1rem', padding: '0.75rem',
    background: '#ffffff', borderRadius: '0.75rem',
    boxShadow: '0 1px 3px rgba(26,35,126,0.04)', marginBottom: '1rem',
    borderLeft: '4px solid',
  },
};

export default function WardenPage() {
  const [requests, setRequests] = useState(requestsData);
  const [searchVal, setSearchVal] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = requests.filter((r) => {
    const matchSearch = !searchVal || r.name.toLowerCase().includes(searchVal.toLowerCase()) || r.location.toLowerCase().includes(searchVal.toLowerCase());
    const matchUrgency = filterUrgency === 'All' || r.urgency === filterUrgency;
    return matchSearch && matchUrgency;
  });

  const handleApprove = (id) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    showToast('Request approved successfully', 'success');
  };

  const handleReject = (id) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    showToast('Request rejected', 'error');
  };

  return (
    <div style={s.page}>
      <Sidebar />
      <main style={s.main}>
        {/* Header */}
        <div style={s.headerRow}>
          <div>
            <h1 style={s.title}>Warden Operations</h1>
            <p style={s.desc}>Monitor real-time requests and maintain institutional standards with precision.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={s.statCard}>
              <p style={{ fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: '#454652' }}>Pending Total</p>
              <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#000666' }}>{requests.length}</p>
            </div>
            <div style={s.statCard}>
              <p style={{ fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: '#454652' }}>Avg. Response</p>
              <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#5aa958' }}>12m</p>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <section style={s.tableSection}>
          {/* Filters */}
          <div style={s.filters}>
            <div style={s.filterLeft}>
              <span className="material-symbols-outlined" style={{ color: '#454652', fontSize: '1.125rem' }}>filter_list</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>Active Filters:</span>
              <select style={s.selectSmall} value={filterUrgency} onChange={(e) => setFilterUrgency(e.target.value)}>
                <option value="All">Urgency: All</option>
                <option value="High">High Priority</option>
                <option value="Routine">Routine</option>
                <option value="Low">Low</option>
              </select>
              <select style={s.selectSmall}>
                <option>Floor: All</option>
                <option>Ground</option>
                <option>Floor 1</option>
                <option>Floor 2</option>
              </select>
              <select style={s.selectSmall}>
                <option>Wing: North</option>
                <option>South Wing</option>
                <option>East Wing</option>
              </select>
            </div>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: '#454652', fontSize: '0.875rem',
              }}>search</span>
              <input
                type="text"
                style={s.searchInput}
                placeholder="Search student or room..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onFocus={(e) => (e.target.style.boxShadow = '0 0 0 2px rgba(0,6,102,0.2)')}
                onBlur={(e) => (e.target.style.boxShadow = 'none')}
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#000666', color: '#ffffff' }}>
                  {['Type', 'Student', 'Detail', 'Room/Wing', 'Urgency', 'Actions'].map((h, i) => (
                    <th key={h} style={{
                      padding: '1rem 1.5rem', fontSize: '0.6875rem', fontWeight: 800,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      textAlign: h === 'Actions' ? 'center' : 'left',
                      ...(i === 0 ? { borderRadius: '0.5rem 0 0 0' } : {}),
                      ...(i === 5 ? { borderRadius: '0 0.5rem 0 0' } : {}),
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => (
                  <tr
                    key={req.id}
                    style={{ borderBottom: '1px solid #eceef0', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f2f4f6')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem', borderRadius: '9999px',
                        fontSize: '0.5625rem', fontWeight: 700,
                        background: req.typeBg, color: req.typeColor,
                      }}>{req.type}</span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '0.5rem',
                          background: 'rgba(0,6,102,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#000666', fontWeight: 700, fontSize: '0.6875rem',
                        }}>{req.initials}</div>
                        <div>
                          <p style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{req.name}</p>
                          <p style={{ fontSize: '0.5625rem', color: '#454652' }}>ID: {req.studentId}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <p style={{ fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{req.detail}</p>
                      <p style={{ fontSize: '0.5625rem', color: '#454652', marginTop: '0.125rem' }}>{req.subDetail}</p>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.8125rem', fontWeight: 500 }}>
                      {req.location}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 600, color: req.urgencyColor }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: req.urgencyDot }} />
                        {req.urgency}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <button
                          style={{ ...s.actionBtn, background: '#a3f69c', color: '#005312' }}
                          onClick={() => handleApprove(req.id)}
                          title="Approve"
                        ><span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>check</span></button>
                        <button
                          style={{ ...s.actionBtn, background: '#ffdad6', color: '#93000a' }}
                          onClick={() => handleReject(req.id)}
                          title="Reject"
                        ><span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span></button>
                        <button
                          style={{ ...s.actionBtn, background: '#e0e3e5', color: '#000666' }}
                          onClick={() => showToast('Opening chat...', 'info')}
                          title="Chat"
                        ><span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chat_bubble</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#767683' }}>
                      No matching requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={s.pagination}>
            <p>Showing 1-{filtered.length} of {requests.length} active requests</p>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button style={{ ...s.pageBtn, background: '#f2f4f6', color: '#454652' }}>Prev</button>
              <button style={{ ...s.pageBtn, background: '#000666', color: '#ffffff' }}>1</button>
              <button style={{ ...s.pageBtn, background: '#f2f4f6', color: '#454652' }}>2</button>
              <button style={{ ...s.pageBtn, background: '#f2f4f6', color: '#454652' }}>Next</button>
            </div>
          </div>
        </section>

        {/* Bottom Grid */}
        <div style={s.bottomGrid}>
          {/* Occupancy Overview */}
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#000666' }}>analytics</span>
              Occupancy Overview
            </h3>
            <div style={s.occupancyGrid}>
              <div style={{ ...s.bigStatCard, background: '#1a237e', color: '#ffffff' }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 500, opacity: 0.8 }}>Available Beds</p>
                  <p style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em', marginTop: '0.5rem' }}>142</p>
                  <div style={{
                    marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    fontSize: '0.6875rem', fontWeight: 700, background: 'rgba(255,255,255,0.1)',
                    width: 'fit-content', padding: '0.25rem 0.75rem', borderRadius: '9999px',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>trending_up</span>
                    +12% vs last month
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{
                  position: 'absolute', right: -16, bottom: -16, fontSize: '10rem', opacity: 0.05,
                }}>bed</span>
              </div>
              <div style={{ ...s.bigStatCard, background: '#ffffff', boxShadow: '0 1px 3px rgba(26,35,126,0.04)', border: '1px solid rgba(198,197,212,0.1)' }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#454652' }}>Active Complaints</p>
                  <p style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em', marginTop: '0.5rem' }}>08</p>
                  <div style={{
                    marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    fontSize: '0.6875rem', fontWeight: 700, color: '#ba1a1a',
                    background: '#ffdad6', width: 'fit-content', padding: '0.25rem 0.75rem', borderRadius: '9999px',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>warning</span>
                    3 overdue
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{
                  position: 'absolute', right: -16, bottom: -16, fontSize: '10rem', opacity: 0.03, color: '#000666',
                }}>engineering</span>
              </div>
            </div>
          </div>

          {/* Live Alerts */}
          <div style={s.alertsPanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Live Alerts</h3>
              <span style={{
                padding: '0.125rem 0.5rem', background: '#ba1a1a', color: '#fff',
                borderRadius: '0.25rem', fontSize: '0.5625rem', fontWeight: 700,
              }}>REAL-TIME</span>
            </div>
            {alerts.map((alert, i) => (
              <div key={i} style={{ ...s.alertItem, borderLeftColor: alert.borderColor }}>
                <span className="material-symbols-outlined" style={{
                  color: alert.iconColor, marginTop: '0.125rem',
                  ...(alert.iconFill ? { fontVariationSettings: "'FILL' 1" } : {}),
                }}>{alert.icon}</span>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700 }}>{alert.title}</p>
                  <p style={{ fontSize: '0.6875rem', color: '#454652', marginTop: '0.125rem' }}>{alert.desc}</p>
                  <p style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#000666', marginTop: '0.5rem', textTransform: 'uppercase' }}>{alert.time}</p>
                </div>
              </div>
            ))}
            <button style={{
              width: '100%', padding: '0.5rem', background: 'transparent', border: 'none',
              cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#000666',
            }}>View All Notifications</button>
          </div>
        </div>
      </main>
    </div>
  );
}

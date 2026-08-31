import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { showToast } from '../components/Toast';

const statsData = [
  { label: 'Total Students', value: '1,248', icon: 'groups', change: '+2.4%', changeType: 'success' },
  { label: 'Occupied Rooms', value: '582', icon: 'meeting_room', change: 'High Load', changeType: 'info' },
  { label: 'Available Rooms', value: '42', icon: 'bed', change: 'Available', changeType: 'success' },
  { label: 'Pending Requests', value: '18', icon: 'pending_actions', change: 'Action Required', changeType: 'error' },
];

const recentAllocations = [
  { name: 'Arjun Sharma', initials: 'AS', room: 'B-402', type: 'AC Dual', rank: '#452', status: 'ALLOCATED' },
  { name: 'Meera Iyer', initials: 'MI', room: 'C-105', type: 'Non-AC Triple', rank: '#1,092', status: 'WAITLIST' },
  { name: 'Rohan Patel', initials: 'RP', room: 'A-201', type: 'AC Single', rank: '#12', status: 'ALLOCATED' },
  { name: 'Priya Menon', initials: 'PM', room: 'A-304', type: 'AC Quad', rank: '#234', status: 'ALLOCATED' },
  { name: 'Karan Desai', initials: 'KD', room: 'B-108', type: 'Non-AC Dual', rank: '#567', status: 'WAITLIST' },
];

const occupancyWeeks = [
  { label: 'WEEK 1', height: '40%' },
  { label: 'WEEK 2', height: '65%' },
  { label: 'WEEK 3', height: '85%' },
  { label: 'WEEK 4', height: '95%' },
  { label: 'WEEK 5', height: '70%' },
];

const s = {
  page: { display: 'flex', minHeight: '100vh', background: '#f7f9fb', fontFamily: "'Inter', sans-serif" },
  main: { flex: 1, marginLeft: 256, padding: '2.5rem 3rem' },
  header: { marginBottom: '2.5rem' },
  title: { fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#000666', marginBottom: '0.5rem' },
  desc: { color: '#454652', maxWidth: 600, lineHeight: 1.6 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' },
  statCard: {
    background: '#ffffff', padding: '1.5rem', borderRadius: '0.75rem',
    border: '1px solid rgba(198,197,212,0.1)', boxShadow: '0 4px 20px rgba(26,35,126,0.03)',
    transition: 'all 0.3s',
  },
  mainGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '2rem' },
  quickActions: { background: '#f2f4f6', padding: '2rem', borderRadius: '1rem' },
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' },
  uploadZone: {
    background: '#ffffff', padding: '1rem', borderRadius: '0.75rem',
    border: '2px dashed rgba(198,197,212,0.3)', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    cursor: 'pointer', transition: 'border-color 0.2s', minHeight: 120,
  },
  configCard: { background: '#ffffff', padding: '1rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(26,35,126,0.04)' },
  tableWrapper: { background: '#ffffff', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(26,35,126,0.04)' },
  tableHeader: { padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '2rem' },
  chartCard: { background: '#ffffff', padding: '2rem', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(26,35,126,0.04)' },
  zoneCard: {
    background: '#1a237e', padding: '1.5rem', borderRadius: '1rem', color: '#bdc2ff',
    position: 'relative', overflow: 'hidden',
  },
};

const changeColors = {
  success: { bg: '#a3f69c', color: '#003909' },
  info: { bg: '#d6e5ef', color: '#3b4951' },
  error: { bg: '#ffdad6', color: '#93000a' },
};

export default function AdminPage() {
  const [fileName, setFileName] = useState('');

  const handleFileUpload = () => {
    setFileName('rank_list_2024.csv');
    showToast('Rank list uploaded successfully!', 'success');
  };

  return (
    <div style={s.page}>
      <Sidebar />
      <main style={s.main}>
        {/* Header */}
        <header style={s.header}>
          <h1 style={s.title}>Management Dashboard</h1>
          <p style={s.desc}>System-wide overview of hostel operations, allocation progress, and administrative quick actions.</p>
        </header>

        {/* Stats */}
        <section style={s.statsGrid}>
          {statsData.map((stat) => {
            const cc = changeColors[stat.changeType];
            return (
              <div
                key={stat.label}
                style={s.statCard}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 30px rgba(26,35,126,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(26,35,126,0.03)')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{
                    padding: '0.5rem', borderRadius: '0.5rem', background: '#e0e0ff', color: '#1a237e',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined">{stat.icon}</span>
                  </div>
                  <span style={{
                    fontSize: '0.5625rem', fontWeight: 700, background: cc.bg, color: cc.color,
                    padding: '0.125rem 0.5rem', borderRadius: '9999px',
                  }}>{stat.change}</span>
                </div>
                <h4 style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#454652', marginBottom: '0.25rem' }}>
                  {stat.label}
                </h4>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#000666', letterSpacing: '-0.04em' }}>
                  {stat.value}
                </div>
              </div>
            );
          })}
        </section>

        <div style={s.mainGrid}>
          {/* Left Column */}
          <div style={s.leftCol}>
            {/* Quick Configuration */}
            <div style={s.quickActions}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#000666', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined">bolt</span>
                Quick Configuration
              </h3>
              <div style={s.quickGrid}>
                <div
                  style={s.uploadZone}
                  onClick={handleFileUpload}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(0,6,102,0.4)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(198,197,212,0.3)')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#1a237e', marginBottom: '0.5rem' }}>upload_file</span>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#000666' }}>Upload Rank List</p>
                  <p style={{ fontSize: '0.5625rem', color: '#454652' }}>
                    {fileName || 'CSV or XLSX formats only'}
                  </p>
                </div>
                <div style={s.configCard}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#000666', marginBottom: '0.75rem' }}>Hostel Capacity</p>
                  {[
                    { label: 'AC Rooms', count: '120', pct: 85 },
                    { label: 'Non-AC', count: '504', pct: 60 },
                  ].map((item) => (
                    <div key={item.label} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', marginBottom: '0.375rem' }}>
                        <span style={{ color: '#454652' }}>{item.label}</span>
                        <span style={{ fontWeight: 700, color: '#000666' }}>{item.count}</span>
                      </div>
                      <div style={{ width: '100%', background: '#e6e8ea', height: 6, borderRadius: 9999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${item.pct}%`, background: item.pct > 80 ? '#000666' : '#1a237e', borderRadius: 9999, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ ...s.configCard, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#000666' }}>Session Controls</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                    <span className="material-symbols-outlined" style={{ color: '#000666', fontSize: '1.125rem' }}>timer_3</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>12:45:00</span>
                  </div>
                  <button
                    style={{
                      width: '100%', background: '#e0e3e5', color: '#000666',
                      fontSize: '0.5625rem', fontWeight: 800, textTransform: 'uppercase',
                      letterSpacing: '0.1em', padding: '0.5rem', borderRadius: '0.5rem',
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#000666'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#e0e3e5'; e.currentTarget.style.color = '#000666'; }}
                    onClick={() => showToast('Timer extended by 30 minutes', 'success')}
                  >Extend Timer</button>
                </div>
              </div>
            </div>

            {/* Recent Allocations Table */}
            <div style={s.tableWrapper}>
              <div style={s.tableHeader}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#000666' }}>Recent Allocations</h3>
                <button style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#1a237e', background: 'none', border: 'none', cursor: 'pointer' }}>
                  View All Logs
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f2f4f6' }}>
                      {['Student Name', 'Room No.', 'Type', 'Rank', 'Status'].map((h) => (
                        <th key={h} style={{
                          padding: '1rem 2rem', fontSize: '0.5625rem', fontWeight: 800,
                          textTransform: 'uppercase', letterSpacing: '0.1em', color: '#454652',
                          textAlign: h === 'Status' ? 'right' : 'left',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentAllocations.map((alloc) => (
                      <tr key={alloc.name} style={{ borderBottom: '1px solid #f2f4f6', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(242,244,246,0.5)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '1.25rem 2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%', background: '#e0e0ff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#000666', fontWeight: 700, fontSize: '0.5625rem',
                            }}>{alloc.initials}</div>
                            <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{alloc.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '1.25rem 1rem', color: '#454652', fontSize: '0.875rem' }}>{alloc.room}</td>
                        <td style={{ padding: '1.25rem 1rem', color: '#454652', fontSize: '0.875rem' }}>{alloc.type}</td>
                        <td style={{ padding: '1.25rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>{alloc.rank}</td>
                        <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem', borderRadius: '9999px',
                            fontSize: '0.5625rem', fontWeight: 700,
                            background: alloc.status === 'ALLOCATED' ? '#a3f69c' : '#d6e5ef',
                            color: alloc.status === 'ALLOCATED' ? '#003909' : '#3b4951',
                          }}>{alloc.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={s.rightCol}>
            {/* Occupancy Chart */}
            <div style={s.chartCard}>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#000666', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1.5rem' }}>
                Occupancy Trends
              </h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', height: 192, marginBottom: '1.5rem' }}>
                {occupancyWeeks.map((w, i) => {
                  const opacities = [0.1, 0.3, 0.5, 1, 0.7];
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1, height: w.height, borderRadius: '0.375rem 0.375rem 0 0',
                        background: i === 3 ? '#000666' : `rgba(0,6,102,${opacities[i]})`,
                        transition: 'all 0.3s', cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5625rem', fontWeight: 700, color: '#454652' }}>
                {occupancyWeeks.map((w) => <span key={w.label}>{w.label}</span>)}
              </div>
            </div>

            {/* Allocation Status */}
            <div style={s.chartCard}>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#000666', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1.5rem' }}>
                Allocation Status
              </h3>
              {[
                { label: 'Successfully Allocated', pct: 78, color: '#88d982' },
                { label: 'Payment Pending', pct: 15, color: '#bac9d3' },
                { label: 'Canceled/Withdrawn', pct: 7, color: '#ffdad6' },
              ].map((item) => (
                <div key={item.label} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{item.label}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#000666' }}>{item.pct}%</span>
                  </div>
                  <div style={{ width: '100%', background: '#eceef0', height: 8, borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.pct}%`, background: item.color, borderRadius: 9999, transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Active Zone */}
            <div style={s.zoneCard}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.7, marginBottom: '0.25rem' }}>
                  Active Zone
                </p>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', marginBottom: '1rem' }}>North Wing Block B</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}>
                    <p style={{ opacity: 0.6, fontSize: '0.625rem' }}>Status</p>
                    <p style={{ fontWeight: 700, color: '#fff' }}>Active</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}>
                    <p style={{ opacity: 0.6, fontSize: '0.625rem' }}>Units</p>
                    <p style={{ fontWeight: 700, color: '#fff' }}>240</p>
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{
                position: 'absolute', right: -8, bottom: -8, fontSize: '10rem',
                opacity: 0.05, fontVariationSettings: "'FILL' 1",
              }}>bed</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

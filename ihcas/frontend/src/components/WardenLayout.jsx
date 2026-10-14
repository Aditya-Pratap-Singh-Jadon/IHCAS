import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function BedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 4v16" />
      <path d="M2 8h18a2 2 0 0 1 2 2v10" />
      <path d="M2 17h20" />
      <path d="M6 8v9" />
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 11 18-5v12L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export default function WardenLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'overview';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'requests': return 'Pending Student Requests';
      case 'rooms': return 'Hostel Rooms & Inventory';
      case 'announcements': return 'Hostel Announcements';
      default: return 'Assigned Hostel Overview';
    }
  };

  return (
    <div className="student-shell">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="student-sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true" 
        />
      )}

      {/* ================= LEFT SIDEBAR ================= */}
      <aside className={`student-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="student-sidebar-brand">
          <div className="student-sidebar-logo">IH</div>
          <div className="student-sidebar-brand-text">
            <h2>IHCAS</h2>
            <span>Warden Portal</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="student-sidebar-nav" aria-label="Warden Navigation">
          <div className="student-nav-group-label">Hostel Operations</div>
          
          <NavLink
            to="/dashboard/warden"
            end
            className={`student-nav-link ${location.pathname === '/dashboard/warden' && activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
            id="warden-nav-overview"
          >
            <GridIcon />
            <span>Hostel Overview</span>
          </NavLink>

          <NavLink
            to="/dashboard/warden?tab=requests"
            className={`student-nav-link ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
            id="warden-nav-requests"
          >
            <InboxIcon />
            <span>Pending Requests</span>
          </NavLink>

          <NavLink
            to="/dashboard/warden?tab=rooms"
            className={`student-nav-link ${activeTab === 'rooms' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
            id="warden-nav-rooms"
          >
            <BedIcon />
            <span>Room Inventory</span>
          </NavLink>

          <NavLink
            to="/dashboard/warden?tab=announcements"
            className={`student-nav-link ${activeTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
            id="warden-nav-announcements"
          >
            <MegaphoneIcon />
            <span>Announcements</span>
          </NavLink>
        </nav>

        {/* Sidebar Footer / User Profile */}
        <div className="student-sidebar-footer">
          <div className="student-user-card">
            <div className="student-user-avatar" style={{ borderColor: 'var(--color-lime-400)' }}>
              W
            </div>
            <div className="student-user-info">
              <span className="student-user-name" title={user?.name}>{user?.name || 'Chief Warden'}</span>
              <span className="student-user-reg">{user?.email || 'warden@vit.ac.in'}</span>
            </div>
          </div>
          <button 
            type="button" 
            className="student-sidebar-logout" 
            onClick={handleLogout}
            title="Sign out of portal"
            id="warden-signout-btn"
          >
            <LogoutIcon />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="student-main">
        {/* Topbar */}
        <header className="student-topbar">
          <div className="student-topbar-left">
            <button
              type="button"
              className="student-mobile-toggle"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle navigation menu"
            >
              <MenuIcon />
            </button>
            <h1 className="student-topbar-title">{getPageTitle()}</h1>
          </div>

          <div className="student-topbar-right">
            <span className="badge badge-warning" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Hostel-Scoped Authority
            </span>
            <button
              type="button"
              className="student-topbar-signout-btn"
              onClick={handleLogout}
              id="topbar-warden-signout-btn"
              title="Sign Out"
            >
              <LogoutIcon />
              <span className="hide-on-mobile">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="student-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

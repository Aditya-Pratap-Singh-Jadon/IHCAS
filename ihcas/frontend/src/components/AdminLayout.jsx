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

function BuildingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="9" y1="22" x2="9" y2="22.01" />
      <line x1="15" y1="22" x2="15" y2="22.01" />
      <line x1="9" y1="6" x2="9" y2="6.01" />
      <line x1="15" y1="6" x2="15" y2="6.01" />
      <line x1="9" y1="10" x2="9" y2="10.01" />
      <line x1="15" y1="10" x2="15" y2="10.01" />
      <line x1="9" y1="14" x2="9" y2="14.01" />
      <line x1="15" y1="14" x2="15" y2="14.01" />
      <line x1="9" y1="18" x2="9" y2="18.01" />
      <line x1="15" y1="18" x2="15" y2="18.01" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClipboardListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
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

export default function AdminLayout() {
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
      case 'inventory': return 'Hostel & Room Inventory';
      case 'counselling': return 'Counselling Operations';
      case 'requests': return 'System Requests Oversight';
      default: return 'System-Wide Overview';
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
            <span>Admin Workspace</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="student-sidebar-nav" aria-label="Administrator Navigation">
          <div className="student-nav-group-label">Operations</div>
          
          <NavLink
            to="/dashboard/admin"
            end
            className={`student-nav-link ${location.pathname === '/dashboard/admin' && activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
            id="admin-nav-overview"
          >
            <GridIcon />
            <span>Overview</span>
          </NavLink>

          <NavLink
            to="/dashboard/admin?tab=inventory"
            className={`student-nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
            id="admin-nav-inventory"
          >
            <BuildingIcon />
            <span>Hostels &amp; Rooms</span>
          </NavLink>

          <NavLink
            to="/dashboard/admin?tab=counselling"
            className={`student-nav-link ${activeTab === 'counselling' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
            id="admin-nav-counselling"
          >
            <CalendarIcon />
            <span>Counselling Sessions</span>
          </NavLink>

          <NavLink
            to="/dashboard/admin?tab=requests"
            className={`student-nav-link ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
            id="admin-nav-requests"
          >
            <ClipboardListIcon />
            <span>Pending Operations</span>
          </NavLink>

          <div className="student-nav-group-label" style={{ marginTop: '0.75rem' }}>Insights</div>

          {/* Analytics destination kept distinct per Requirement 3.E */}
          <div
            className="student-nav-link"
            style={{ opacity: 0.65, cursor: 'not-allowed' }}
            title="System Analytics is scheduled for Phase 5"
            id="admin-nav-analytics"
          >
            <BarChartIcon />
            <span>Analytics</span>
            <span className="student-nav-badge-pulse" style={{ background: 'var(--color-charcoal-700)', color: 'var(--color-lime-400)' }}>Phase 5</span>
          </div>
        </nav>

        {/* Sidebar Footer / User Profile */}
        <div className="student-sidebar-footer">
          <div className="student-user-card">
            <div className="student-user-avatar" style={{ borderColor: 'var(--color-lime-400)' }}>
              A
            </div>
            <div className="student-user-info">
              <span className="student-user-name" title={user?.name}>{user?.name || 'Administrator'}</span>
              <span className="student-user-reg">{user?.email || 'admin@vit.ac.in'}</span>
            </div>
          </div>
          <button 
            type="button" 
            className="student-sidebar-logout" 
            onClick={handleLogout}
            title="Sign out of portal"
            id="admin-signout-btn"
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
            <span className="badge badge-info" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Authority
            </span>
            <button
              type="button"
              className="student-topbar-signout-btn"
              onClick={handleLogout}
              id="topbar-admin-signout-btn"
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

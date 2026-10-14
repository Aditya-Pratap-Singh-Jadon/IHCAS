import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function DashboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function CounsellingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function RequestsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function NotificationsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getPageTitle = () => {
    if (location.pathname.startsWith('/counselling')) {
      return 'Enter Counselling';
    }
    return 'Student Dashboard';
  };

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Derive active tab from search params if on dashboard
  const searchParams = new URLSearchParams(location.search);
  const activeTabParam = searchParams.get('tab');

  const isRequestsActive = location.pathname === '/dashboard/student' && activeTabParam === 'requests';
  const isNotificationsActive = location.pathname === '/dashboard/student' && activeTabParam === 'notifications';
  const isDashboardActive = location.pathname === '/dashboard/student' && !activeTabParam;

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
            <span>Student Portal</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="student-sidebar-nav" aria-label="Student Navigation">
          <div className="student-nav-group-label">Menu</div>
          
          <NavLink
            to="/dashboard/student"
            end
            className={`student-nav-link ${isDashboardActive ? 'active' : ''}`}
            onClick={handleNavClick}
            id="nav-student-dashboard"
          >
            <DashboardIcon />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/counselling"
            className={({ isActive }) => `student-nav-link ${isActive ? 'active' : ''}`}
            onClick={handleNavClick}
            id="nav-student-counselling"
          >
            <CounsellingIcon />
            <span>Enter Counselling</span>
            <span className="student-nav-badge-pulse" title="Live counselling module">Live</span>
          </NavLink>

          <NavLink
            to="/dashboard/student?tab=requests"
            className={`student-nav-link ${isRequestsActive ? 'active' : ''}`}
            onClick={handleNavClick}
            id="nav-student-requests"
          >
            <RequestsIcon />
            <span>My Requests</span>
          </NavLink>

          <NavLink
            to="/dashboard/student?tab=notifications"
            className={`student-nav-link ${isNotificationsActive ? 'active' : ''}`}
            onClick={handleNavClick}
            id="nav-student-notifications"
          >
            <NotificationsIcon />
            <span>Notifications</span>
          </NavLink>
        </nav>

        {/* Sidebar Footer / User Profile */}
        <div className="student-sidebar-footer">
          <div className="student-user-card">
            <div className="student-user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="student-user-info">
              <span className="student-user-name" title={user?.name}>{user?.name || 'Student'}</span>
              <span className="student-user-reg">{user?.email || 'Student Account'}</span>
            </div>
          </div>
          <button 
            type="button" 
            className="student-sidebar-logout" 
            onClick={handleLogout}
            title="Sign out of portal"
            id="student-signout-btn"
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
            <NavLink
              to="/counselling"
              className="btn btn-lime btn-sm student-topbar-counselling-cta"
              id="topbar-counselling-btn"
            >
              <CounsellingIcon />
              <span>Counselling Room</span>
            </NavLink>

            <button
              type="button"
              className="student-topbar-signout-btn"
              onClick={handleLogout}
              id="topbar-signout-btn"
              title="Sign Out"
            >
              <LogoutIcon />
              <span className="hide-on-mobile">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Outlet */}
        <main className="student-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

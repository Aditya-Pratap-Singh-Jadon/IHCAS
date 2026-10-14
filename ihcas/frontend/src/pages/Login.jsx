import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';

// Eye icons as simple SVGs — no extra dependency
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function Login() {
  const { login, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect already-authenticated users
  if (user) {
    if (user.role === 'STUDENT') return <Navigate to="/dashboard/student" replace />;
    if (user.role === 'WARDEN')  return <Navigate to="/dashboard/warden"  replace />;
    if (user.role === 'ADMIN')   return <Navigate to="/dashboard/admin"   replace />;
    return <Navigate to="/unauthorized" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Basic client-side presence check
    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // AuthContext.checkAuth() will set user → Login re-renders → Navigate fires
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message;
      if (msg) {
        setError(msg);
      } else if (err?.response?.status === 401) {
        setError('Invalid email or password. Please try again.');
      } else if (err?.response?.status === 403) {
        setError('Access denied. Make sure you are using an authorized VIT email address.');
      } else {
        setError('Unable to sign in right now. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ============ LEFT PANEL ============ */}
      <div className="login-panel-left" aria-hidden="true">
        {/* Top brand */}
        <Link to="/" className="login-left-brand">
          <div className="login-left-logo">IH</div>
          <span className="login-left-brand-name">IHCAS</span>
        </Link>

        {/* Main content */}
        <div className="login-left-content">
          <h1 className="login-left-headline">
            Your hostel journey<br />
            starts <span>here.</span>
          </h1>
          <p className="login-left-copy">
            IHCAS manages hostel counselling and room allocation for VIT
            University. Merit-based, transparent, and fully digital.
          </p>

          <div className="login-left-stats">
            <div className="login-left-stat">
              <div className="login-left-stat-number">6</div>
              <div className="login-left-stat-label">Active hostels</div>
            </div>
            <div className="login-left-stat">
              <div className="login-left-stat-number">60+</div>
              <div className="login-left-stat-label">Rooms configured</div>
            </div>
            <div className="login-left-stat">
              <div className="login-left-stat-number">100+</div>
              <div className="login-left-stat-label">Students enrolled</div>
            </div>
            <div className="login-left-stat">
              <div className="login-left-stat-number">3 min</div>
              <div className="login-left-stat-label">Counselling window</div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <p className="login-left-footer">
          VIT University &mdash; Authorized personnel only
        </p>
      </div>

      {/* ============ RIGHT PANEL ============ */}
      <div className="login-panel-right">
        <div className="login-form-container">
          {/* Back link */}
          <Link to="/" className="login-form-back" id="login-back-home">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Home
          </Link>

          <h1 className="login-form-title">Sign in</h1>
          <p className="login-form-subtitle">
            Use your VIT university email address to access the IHCAS portal.
          </p>

          {/* Error alert */}
          {error && (
            <div className="login-error-msg" role="alert" id="login-error-alert">
              <AlertIcon />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate id="login-form">
            {/* Email */}
            <div className="login-field-group">
              <label htmlFor="login-email" className="login-field-label">
                Email address
              </label>
              <div className="login-field-wrap">
                <input
                  id="login-email"
                  type="email"
                  className={`login-field-input${error ? ' error-field' : ''}`}
                  placeholder="you@vitstudent.ac.in"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  autoComplete="email"
                  autoCapitalize="none"
                  disabled={loading}
                  required
                  aria-describedby={error ? 'login-error-alert' : undefined}
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field-group">
              <label htmlFor="login-password" className="login-field-label">
                Password
              </label>
              <div className="login-field-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`login-field-input has-toggle${error ? ' error-field' : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="login-toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="login-submit-btn"
              id="login-submit-btn"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <SpinnerIcon />
                  Signing in&hellip;
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Domain note */}
          <div className="login-domain-note">
            <strong>Students:</strong> use <code>@vitstudent.ac.in</code>
            &ensp;&bull;&ensp;
            <strong>Wardens &amp; Admins:</strong> use <code>@vit.ac.in</code>
            <br />
            Contact your administrator if you cannot access your account.
          </div>
        </div>
      </div>
    </div>
  );
}

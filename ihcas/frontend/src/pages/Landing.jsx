import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Building2,
  CheckCircle2,
  ClipboardList,
  Megaphone,
  Settings,
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'About', href: '#about' },
];

const FEATURES = [
  {
    icon: Trophy,
    title: 'Merit-Based Queue Management',
    desc: 'Counselling slots are assigned strictly by academic rank and CGPA, ensuring a fair, transparent queue that is managed server-side with no room for manipulation.',
  },
  {
    icon: Building2,
    title: 'Hostel & Room Inventory',
    desc: 'Browse gender-verified hostels (MH for men, LH for women), view available rooms across all bed types — single, double, quad, and six-bed — with AC and non-AC options.',
  },
  {
    icon: CheckCircle2,
    title: 'Room Allocation & Roommate Verification',
    desc: 'Select your preferred room during your active counselling window. Invite roommates by registration number; they confirm via a one-time password sent to their university email.',
  },
  {
    icon: ClipboardList,
    title: 'Student Service Requests',
    desc: 'Submit and track leave applications, room-change requests, mess-change requests, and maintenance complaints. Receive real-time status updates from your warden.',
  },
  {
    icon: Megaphone,
    title: 'Warden Operations & Announcements',
    desc: 'Wardens manage all requests for their assigned hostel, approve room changes, and broadcast official announcements directly to residents.',
  },
  {
    icon: Settings,
    title: 'Administrator Oversight',
    desc: 'Admins configure hostel inventory, open counselling sessions, generate slot schedules for all eligible students, and monitor system-wide occupancy.',
  },
];

const HOW_STEPS = [
  {
    n: '01',
    title: 'Sign In',
    desc: 'Log in with your VIT university email. Students use @vitstudent.ac.in; staff use @vit.ac.in.',
  },
  {
    n: '02',
    title: 'Check Your Slot',
    desc: 'View your assigned counselling window and your current position in the merit queue.',
  },
  {
    n: '03',
    title: 'Activate & Choose',
    desc: 'When your turn arrives, activate your slot and browse available rooms within your gender-verified hostels.',
  },
  {
    n: '04',
    title: 'Confirm Allocation',
    desc: 'Invite and verify roommates via OTP, then confirm your room. Your allocation is locked and recorded.',
  },
];

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = () => setMobileMenuOpen(false);

  return (
    <div>
      {/* ============================= NAVBAR ============================= */}
      <nav className="landing-nav" role="navigation" aria-label="Main navigation">
        <div className="landing-nav-inner">
          {/* Brand */}
          <a href="#" className="landing-brand" aria-label="IHCAS Home">
            <div className="landing-brand-logo" aria-hidden="true">IH</div>
            <span className="landing-brand-name">IHCAS</span>
          </a>

          {/* Desktop links */}
          <div className="landing-nav-links" role="list">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="landing-nav-link" role="listitem">
                {l.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="landing-nav-actions">
            <Link
              to="/login"
              className="btn btn-lime btn-sm"
              id="nav-login-btn"
              aria-label="Sign in to IHCAS"
            >
              Sign In
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="landing-nav-hamburger"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {/* Mobile dropdown */}
        <div className={`landing-mobile-menu${mobileMenuOpen ? ' open' : ''}`} aria-hidden={!mobileMenuOpen}>
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="landing-mobile-link"
              onClick={handleNavClick}
            >
              {l.label}
            </a>
          ))}
          <Link
            to="/login"
            className="btn btn-lime"
            style={{ marginTop: '0.5rem', textAlign: 'center' }}
            onClick={handleNavClick}
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* ============================= HERO ============================= */}
      <section className="landing-hero" aria-labelledby="hero-headline">
        <div className="landing-hero-inner">
          {/* Left — copy */}
          <div className="landing-hero-copy-col">
            <span className="landing-hero-eyebrow" aria-hidden="true">
              VIT University &mdash; Hostel Management
            </span>
            <h1 className="landing-hero-headline" id="hero-headline">
              Hostel Counselling,{' '}
              <span className="accent">Done Right.</span>
            </h1>
            <p className="landing-hero-copy">
              IHCAS replaces manual hostel allocation with a transparent,
              merit-based digital system. Students queue by academic rank,
              choose rooms in real time, and verify roommates securely &mdash;
              all in one place.
            </p>
            <div className="landing-hero-actions">
              <Link to="/login" className="btn btn-lime btn-xl" id="hero-login-btn">
                Sign In to Portal
              </Link>
              <a href="#features" className="btn btn-outline-light btn-xl">
                Explore Features
              </a>
            </div>
          </div>

          {/* Right — visual composition */}
          <div className="landing-hero-visual" aria-hidden="true">
            {/* Process card */}
            <div className="hero-card">
              <p className="hero-card-title">Counselling Process</p>
              <ul className="hero-step-list">
                {HOW_STEPS.map((s) => (
                  <li key={s.n} className="hero-step-item">
                    <div className="hero-step-dot">{s.n}</div>
                    <div className="hero-step-text">
                      <p className="hero-step-title">{s.title}</p>
                      <p className="hero-step-desc">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stats row */}
            <div className="hero-stats-row">
              <div className="hero-stat-item">
                <div className="hero-stat-num">6</div>
                <div className="hero-stat-label">Hostels</div>
              </div>
              <div className="hero-stat-item">
                <div className="hero-stat-num">60+</div>
                <div className="hero-stat-label">Rooms</div>
              </div>
              <div className="hero-stat-item">
                <div className="hero-stat-num">100+</div>
                <div className="hero-stat-label">Students</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================= FEATURES ============================= */}
      <section
        className="landing-section"
        id="features"
        aria-labelledby="features-heading"
      >
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <span className="landing-section-tag">Features</span>
            <h2 className="landing-section-heading" id="features-heading">
              Everything you need, nothing you don&apos;t.
            </h2>
            <p className="landing-section-subheading">
              IHCAS covers the complete hostel lifecycle — from first login to
              confirmed room allocation — with role-specific tools for students,
              wardens, and administrators.
            </p>
          </div>

          <div className="features-grid">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className="feature-card">
                  <div className="feature-icon-wrap" aria-hidden="true">
                    <Icon size={22} strokeWidth={2} />
                  </div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================= HOW IT WORKS ============================= */}
      <section
        className="landing-section-alt"
        id="how-it-works"
        aria-labelledby="how-heading"
      >
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <span className="landing-section-tag">How It Works</span>
            <h2 className="landing-section-heading" id="how-heading">
              Four steps to your room.
            </h2>
            <p className="landing-section-subheading">
              The entire counselling process is transparent and automated.
              Academic rank determines your queue position; the system handles the rest.
            </p>
          </div>

          <ol className="how-steps" aria-label="Counselling steps">
            {HOW_STEPS.map((s) => (
              <li key={s.n} className="how-step">
                <div className="how-step-number" aria-hidden="true">{s.n}</div>
                <h3 className="how-step-title">{s.title}</h3>
                <p className="how-step-desc">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============================= ABOUT ============================= */}
      <section
        className="landing-section"
        id="about"
        aria-labelledby="about-heading"
      >
        <div className="landing-section-inner">
          <div className="landing-section-header" style={{ maxWidth: 680 }}>
            <span className="landing-section-tag">About</span>
            <h2 className="landing-section-heading" id="about-heading">
              Built to be fair and transparent.
            </h2>
            <p className="landing-section-subheading">
              IHCAS was designed to eliminate ambiguity from the hostel
              allocation process. Eligibility, queue ordering, and room
              availability are all determined by verifiable academic data and
              enforced by server-side rules — not manual decisions.
            </p>
            <p
              className="landing-section-subheading"
              style={{ marginTop: '1.25rem' }}
            >
              Wardens manage only their assigned hostels. Administrators
              configure the system and monitor overall occupancy. Every action
              is traceable and role-restricted.
            </p>
          </div>
        </div>
      </section>

      {/* ============================= CTA BANNER ============================= */}
      <div className="landing-cta">
        <div className="landing-cta-inner">
          <div>
            <h2 className="landing-cta-headline">
              Ready to get started?<br />
              <span>Your room is waiting.</span>
            </h2>
            <p className="landing-cta-body">
              Sign in with your VIT university email to access the portal and
              check your counselling eligibility.
            </p>
          </div>
          <div className="landing-cta-actions">
            <Link to="/login" className="btn btn-lime btn-xl" id="cta-login-btn">
              Sign In Now
            </Link>
          </div>
        </div>
      </div>

      {/* ============================= FOOTER ============================= */}
      <footer className="landing-footer" aria-label="Site footer">
        <div className="landing-footer-top">
          {/* Brand column */}
          <div>
            <div className="footer-brand-logo" aria-hidden="true">IH</div>
            <p className="footer-brand-name">IHCAS</p>
            <p className="footer-brand-tagline">
              Intelligent Hostel Counselling &amp; Allocation System.
              Transparent. Merit-based. Secure.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="footer-col-title">Navigation</p>
            <ul className="footer-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#about">About</a></li>
            </ul>
          </div>

          {/* Portal */}
          <div>
            <p className="footer-col-title">Portal</p>
            <ul className="footer-links">
              <li><Link to="/login">Student Login</Link></li>
              <li><Link to="/login">Warden Login</Link></li>
              <li><Link to="/login">Admin Login</Link></li>
            </ul>
          </div>

          {/* Domains */}
          <div>
            <p className="footer-col-title">Authorized Domains</p>
            <ul className="footer-links">
              <li><a href="#about">@vitstudent.ac.in</a></li>
              <li><a href="#about">@vit.ac.in</a></li>
            </ul>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <p className="footer-made-by">
            Made by <strong>IHCAS team</strong>
          </p>
          <p className="footer-legal">
            &copy; {new Date().getFullYear()} VIT University. For authorized users only.
          </p>
        </div>
      </footer>
    </div>
  );
}

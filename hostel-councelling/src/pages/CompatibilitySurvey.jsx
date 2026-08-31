import { useState } from 'react';
import { showToast } from '../components/Toast';

const s = {
  page: {
    background: '#f7f9fb',
    minHeight: '100vh',
    fontFamily: "'Inter', sans-serif",
  },
  main: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '3rem 1.5rem 5rem',
  },
  hero: {
    display: 'flex',
    gap: '3rem',
    alignItems: 'center',
    marginBottom: '4rem',
    flexWrap: 'wrap',
  },
  heroText: {
    flex: 1,
    minWidth: 280,
  },
  heroTitle: {
    fontSize: '3rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: '#000666',
    marginBottom: '1.5rem',
    lineHeight: 1.1,
  },
  heroHighlight: {
    color: '#8690ee',
  },
  heroDesc: {
    fontSize: '1.0625rem',
    color: '#454652',
    lineHeight: 1.7,
    maxWidth: 500,
  },
  heroImage: {
    width: 400,
    height: 256,
    borderRadius: '1.5rem',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(26,35,126,0.12)',
    background: 'linear-gradient(135deg, #1a237e, #4c56af)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  section: {
    padding: '2rem 2.5rem',
    borderRadius: '2rem',
    marginBottom: '3rem',
    display: 'flex',
    gap: '2.5rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  sectionAlt: {
    background: '#ffffff',
    boxShadow: '0 12px 40px rgba(26,35,126,0.06)',
  },
  sectionPlain: {
    background: '#f2f4f6',
  },
  sectionLeft: {
    width: '33%',
    minWidth: 200,
    flexShrink: 0,
  },
  sectionRight: {
    flex: 1,
    minWidth: 280,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: '1rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#000666',
    marginBottom: '0.75rem',
  },
  sectionDesc: {
    fontSize: '0.8125rem',
    color: '#454652',
    lineHeight: 1.6,
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#343d96',
    marginBottom: '1rem',
  },
  sliderMarks: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 0.25rem',
    marginTop: '0.5rem',
  },
  sliderMark: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
  },
  sliderMarkText: {
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: '#767683',
  },
  sliderMarkDot: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: '#c6c5d4',
  },
  cardOption: {
    padding: '1.5rem',
    borderRadius: '1rem',
    background: '#ffffff',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.3s',
    textAlign: 'left',
  },
  cardOptionActive: {
    background: '#000666',
    color: '#ffffff',
  },
  radioOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem',
    borderRadius: '1rem',
    background: '#eceef0',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '1rem',
  },
  radioOptionActive: {
    background: '#d3e2ed',
  },
  barChart: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '0.5rem',
    height: 96,
    marginBottom: '1rem',
  },
  socialGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
  },
  socialBtn: {
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    borderRadius: '1rem',
    border: '2px solid #c6c5d4',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '0.6875rem',
    fontWeight: 700,
  },
  socialBtnActive: {
    border: '2px solid #000666',
    background: '#1a237e',
    color: '#ffffff',
    boxShadow: '0 8px 25px rgba(0,6,102,0.2)',
  },
  footer: {
    marginTop: '4rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #000666, #1a237e)',
    color: '#ffffff',
    padding: '1.25rem 3rem',
    borderRadius: '1rem',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '1.125rem',
    boxShadow: '0 8px 25px rgba(0,6,102,0.25)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    transition: 'all 0.3s',
  },
  privacyNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#454652',
    fontSize: '0.8125rem',
  },
};

const noiseBarHeights = ['20%', '45%', '80%', '50%', '25%'];

export default function CompatibilitySurvey() {
  const [sleepScore, setSleepScore] = useState(3);
  const [studyHabit, setStudyHabit] = useState(null);
  const [cleanliness, setCleanliness] = useState('balanced');
  const [noiseScore, setNoiseScore] = useState(5);
  const [socialLevel, setSocialLevel] = useState('balanced');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!studyHabit) {
      showToast('Please complete all questions before submitting', 'warning');
      return;
    }

    const score = Math.round(
      ((sleepScore / 5) * 20) +
      (studyHabit === 'library' ? 15 : 20) +
      ({ minimalist: 20, balanced: 15, creative: 10 }[cleanliness] || 15) +
      ((noiseScore / 10) * 20) +
      ({ introvert: 10, balanced: 15, extrovert: 20 }[socialLevel] || 15)
    );

    setSubmitted(true);
    showToast(`Compatibility profile saved! Score: ${score}/100`, 'success');
  };

  return (
    <div style={s.page}>
      <main style={s.main}>
        {/* Hero */}
        <section style={s.hero}>
          <div style={s.heroText}>
            <h1 style={s.heroTitle}>
              Find Your Perfect<br />
              <span style={s.heroHighlight}>Living Harmony</span>
            </h1>
            <p style={s.heroDesc}>
              Living together is about more than just sharing a roof. Help us match you with someone who shares your rhythm, habits, and vibes.
            </p>
          </div>
          <div style={s.heroImage}>
            <span className="material-symbols-outlined" style={{ fontSize: '5rem', color: 'rgba(255,255,255,0.3)' }}>
              diversity_3
            </span>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
              background: 'linear-gradient(to top, rgba(0,6,102,0.6), transparent)',
            }} />
          </div>
        </section>

        {/* Factor 1: Sleep Schedule */}
        <section style={{ ...s.section, ...s.sectionAlt }}>
          <div style={s.sectionLeft}>
            <div style={{ ...s.iconBox, background: '#d3e2ed' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#000666' }}>bedtime</span>
            </div>
            <h2 style={s.sectionTitle}>Sleep Schedule</h2>
            <p style={s.sectionDesc}>
              Are you an early bird catching the worm, or a night owl ruling the darkness?
            </p>
          </div>
          <div style={s.sectionRight}>
            <div style={s.sliderLabels}>
              <span>Early Bird</span>
              <span>Night Owl</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={sleepScore}
              onChange={(e) => setSleepScore(Number(e.target.value))}
              style={{ width: '100%' }}
              disabled={submitted}
            />
            <div style={s.sliderMarks}>
              {['5 AM', '8 AM', '11 AM', '2 AM', '4 AM+'].map((label) => (
                <div key={label} style={s.sliderMark}>
                  <span style={s.sliderMarkText}>{label}</span>
                  <span style={s.sliderMarkDot} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Factor 2: Study Habits */}
        <section style={{ ...s.section, ...s.sectionPlain }}>
          <div style={s.sectionLeft}>
            <div style={{ ...s.iconBox, background: '#1a237e' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#ffffff' }}>menu_book</span>
            </div>
            <h2 style={s.sectionTitle}>Study Habits</h2>
            <p style={s.sectionDesc}>
              Where do you do your best thinking? Some need silence, others thrive in bustle.
            </p>
          </div>
          <div style={{ ...s.sectionRight, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div
              style={{
                ...s.cardOption,
                ...(studyHabit === 'library' ? s.cardOptionActive : {}),
              }}
              onClick={() => !submitted && setStudyHabit('library')}
            >
              <span className="material-symbols-outlined" style={{
                marginBottom: '1rem', display: 'block',
                color: studyHabit === 'library' ? '#fff' : '#000666',
              }}>library_books</span>
              <h4 style={{ fontWeight: 700, marginBottom: '0.25rem', color: studyHabit === 'library' ? '#fff' : '#000666' }}>
                Library Lurker
              </h4>
              <p style={{ fontSize: '0.6875rem', color: studyHabit === 'library' ? 'rgba(255,255,255,0.7)' : '#454652' }}>
                I mostly study on campus or in cafes. My room is for resting.
              </p>
            </div>
            <div
              style={{
                ...s.cardOption,
                ...(studyHabit === 'desk' ? s.cardOptionActive : {}),
              }}
              onClick={() => !submitted && setStudyHabit('desk')}
            >
              <span className="material-symbols-outlined" style={{
                marginBottom: '1rem', display: 'block',
                color: studyHabit === 'desk' ? '#fff' : '#000666',
              }}>desk</span>
              <h4 style={{ fontWeight: 700, marginBottom: '0.25rem', color: studyHabit === 'desk' ? '#fff' : '#000666' }}>
                Desk Warrior
              </h4>
              <p style={{ fontSize: '0.6875rem', color: studyHabit === 'desk' ? 'rgba(255,255,255,0.7)' : '#454652' }}>
                I need my own setup and silence. My room is my primary workspace.
              </p>
            </div>
          </div>
        </section>

        {/* Factor 3: Cleanliness */}
        <section style={{ ...s.section, ...s.sectionAlt }}>
          <div style={s.sectionLeft}>
            <div style={{ ...s.iconBox, background: '#a3f69c' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#005312' }}>cleaning_services</span>
            </div>
            <h2 style={s.sectionTitle}>Cleanliness</h2>
            <p style={s.sectionDesc}>
              From "Hotel Standards" to "Organized Chaos." Let's find someone who matches your level.
            </p>
          </div>
          <div style={s.sectionRight}>
            {[
              { key: 'minimalist', label: 'The Minimalist', desc: 'Zero clutter, everything in its place. Daily tidying is a must.', icon: 'verified' },
              { key: 'balanced', label: 'Balanced Living', desc: 'Clean most of the time, but a few dishes can wait until tomorrow.', icon: 'home' },
              { key: 'creative', label: 'Creative Chaos', desc: 'Lived-in and cozy. Tidying up is a weekly (or monthly) event.', icon: 'brush' },
            ].map((opt) => (
              <label
                key={opt.key}
                style={{
                  ...s.radioOption,
                  ...(cleanliness === opt.key ? s.radioOptionActive : {}),
                }}
                onClick={() => !submitted && setCleanliness(opt.key)}
              >
                <input
                  type="radio"
                  name="clean"
                  checked={cleanliness === opt.key}
                  onChange={() => setCleanliness(opt.key)}
                  disabled={submitted}
                  style={{ width: 20, height: 20, accentColor: '#000666' }}
                />
                <div style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 700, color: '#000666' }}>{opt.label}</span>
                  <span style={{ fontSize: '0.6875rem', color: '#454652' }}>{opt.desc}</span>
                </div>
                <span className="material-symbols-outlined" style={{ color: '#000666', opacity: cleanliness === opt.key ? 1 : 0.3 }}>
                  {opt.icon}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Factor 4: Noise Tolerance */}
        <section style={{ ...s.section, ...s.sectionPlain, alignItems: 'center' }}>
          <div style={s.sectionLeft}>
            <div style={{ ...s.iconBox, background: '#ffdad6' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#93000a' }}>hearing</span>
            </div>
            <h2 style={s.sectionTitle}>Noise Tolerance</h2>
            <p style={s.sectionDesc}>
              Can you sleep through a rock concert, or does a ticking clock drive you mad?
            </p>
          </div>
          <div style={{ ...s.sectionRight, background: '#ffffff', padding: '2rem', borderRadius: '1.5rem' }}>
            <div style={s.barChart}>
              {noiseBarHeights.map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: h,
                    background: i === Math.floor(noiseScore / 2.5) ? '#1a237e' : '#d3e2ed',
                    borderRadius: '0.375rem 0.375rem 0 0',
                    transition: 'all 0.3s',
                  }}
                />
              ))}
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={noiseScore}
              onChange={(e) => setNoiseScore(Number(e.target.value))}
              style={{ width: '100%', marginBottom: '1rem' }}
              disabled={submitted}
            />
            <div style={{ ...s.sliderLabels, color: '#000666' }}>
              <span>Pin Drop</span>
              <span>Lively & Loud</span>
            </div>
          </div>
        </section>

        {/* Factor 5: Social Activity */}
        <section style={{ ...s.section, ...s.sectionAlt }}>
          <div style={s.sectionLeft}>
            <div style={{ ...s.iconBox, background: '#d3e2ed' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#000666' }}>groups</span>
            </div>
            <h2 style={s.sectionTitle}>Social Activity</h2>
            <p style={s.sectionDesc}>
              How often do you like to host friends or have social gatherings in your space?
            </p>
          </div>
          <div style={s.sectionRight}>
            <div style={s.socialGrid}>
              {[
                { key: 'introvert', icon: 'person', label: 'Introvert' },
                { key: 'balanced', icon: 'diversity_3', label: 'Balanced' },
                { key: 'extrovert', icon: 'celebration', label: 'Extrovert' },
              ].map((opt) => {
                const isActive = socialLevel === opt.key;
                return (
                  <button
                    key={opt.key}
                    style={{
                      ...s.socialBtn,
                      ...(isActive ? s.socialBtnActive : {}),
                    }}
                    onClick={() => !submitted && setSocialLevel(opt.key)}
                    disabled={submitted}
                  >
                    <span className="material-symbols-outlined" style={{
                      color: isActive ? '#fff' : '#767683',
                      ...(isActive ? { fontVariationSettings: "'FILL' 1" } : {}),
                    }}>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Submit */}
        <div style={s.footer}>
          <button
            style={{
              ...s.submitBtn,
              ...(submitted ? { opacity: 0.5, cursor: 'default' } : {}),
            }}
            onClick={handleSubmit}
            disabled={submitted}
            onMouseEnter={(e) => { if (!submitted) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {submitted ? 'Profile Saved' : 'Find My Roommates'}
            <span className="material-symbols-outlined">
              {submitted ? 'check' : 'arrow_forward'}
            </span>
          </button>
          <p style={s.privacyNote}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>lock</span>
            Your responses are used strictly for compatibility matching.
          </p>
        </div>
      </main>
    </div>
  );
}

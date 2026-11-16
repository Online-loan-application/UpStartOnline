import { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { signOutWithActivity } from '../accountActivity.js';
import brandLogo from '../brandAssets.js';

export default function ProfilePage() {
  const [profile, setProfile] = useState({ loading: true, email: '', application: null, error: '' });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        window.location.replace('./application.html?view=account&mode=login');
        return;
      }

      const { data, error } = await supabase
        .from('loan_applications')
        .select('first_name, last_name, email, phone, address, parish, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (active) {
        setProfile({
          loading: false,
          email: user.email || '',
          application: data,
          error: error?.message || '',
        });
      }
    }

    void loadProfile().catch(() => {
      if (active) setProfile({ loading: false, email: '', application: null, error: 'Your profile could not be loaded. Please try again.' });
    });

    return () => { active = false; };
  }, []);

  async function signOut() {
    try {
      await signOutWithActivity();
      window.location.href = './application.html?view=account&mode=login';
    } catch (error) {
      setProfile((current) => ({ ...current, error: error.message }));
    }
  }

  if (profile.loading) return <main className="container dashboard-loading" aria-live="polite">Loading your profile…</main>;

  const application = profile.application;
  const displayName = [application?.first_name, application?.last_name].filter(Boolean).join(' ');

  return (
    <>
      <a className="skip-link" href="#main">Skip to profile</a>
      <header className="site-header dashboard-header">
        <div className="container nav-wrap">
          <a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src={brandLogo} alt="Upstart Ltd · Loans" /></a>
          <button
            className="dashboard-header-menu"
            type="button"
            aria-label={menuOpen ? 'Close dashboard navigation' : 'Open dashboard navigation'}
            aria-controls="profile-sidebar"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg className="dashboard-menu-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            <svg className="dashboard-menu-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
          <nav className="dashboard-nav" aria-label="Account navigation">
            <span className="dashboard-account-email">{profile.email}</span>
            <button className="button button-quiet" type="button" onClick={signOut}>Log out</button>
          </nav>
        </div>
      </header>
      <main id="main" className="dashboard-main">
        <div className="dashboard-shell">
          <aside id="profile-sidebar" className={`dashboard-sidebar${menuOpen ? ' is-open' : ''}`} aria-label="Dashboard sidebar">
            <p className="dashboard-sidebar-label">My account</p>
            <nav className="dashboard-sidebar-nav" aria-label="Dashboard sections">
              <a href="./application.html?view=dashboard"><span className="sidebar-nav-icon" aria-hidden="true">⌂</span>Overview</a>
              <a href="./application.html?view=dashboard#application"><span className="sidebar-nav-icon" aria-hidden="true">▤</span>Loan application</a>
              <a href="./application.html?view=profile" aria-current="page"><span className="sidebar-nav-icon" aria-hidden="true">◉</span>My profile</a>
            </nav>
            <div className="dashboard-sidebar-help"><span>Need a hand?</span><p>Our team is here to help with your account.</p><a href="./index.html#approach">Contact Upstart <span aria-hidden="true">↗</span></a></div>
          </aside>
          <section className="dashboard-content dashboard-profile">
            <div className="dashboard-page-heading">
              <div><p className="dashboard-panel-kicker">Account settings</p><h1>My profile</h1><p>Contact details from your latest loan application.</p></div>
            </div>
            {profile.error && <p className="account-message" role="alert">{profile.error}</p>}
            {application ? (
              <div className="profile-card dashboard-animate">
                <div className="profile-card-heading"><span className="profile-avatar" aria-hidden="true">{displayName.charAt(0).toUpperCase() || 'U'}</span><div><h2>{displayName || 'Your profile'}</h2><p>{profile.email}</p></div></div>
                <dl className="profile-fields">
                  <div><dt>First name</dt><dd>{application.first_name}</dd></div>
                  <div><dt>Last name</dt><dd>{application.last_name}</dd></div>
                  <div><dt>Email address</dt><dd>{profile.email}</dd></div>
                  <div><dt>Phone number</dt><dd>{application.phone}</dd></div>
                  <div><dt>Street address</dt><dd>{application.address}</dd></div>
                  <div><dt>Parish</dt><dd>{application.parish}</dd></div>
                </dl>
                <p className="profile-note">Profile information is taken from your latest loan application. To update these details, please contact Upstart.</p>
              </div>
            ) : !profile.error ? (
              <div className="account-notice" role="status"><strong>No profile details yet</strong><span>Your profile details will appear here after you submit a loan application.</span></div>
            ) : null}
          </section>
        </div>
      </main>
      <footer className="site-footer"><div className="container footer-inner"><a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src={brandLogo} alt="Upstart Ltd · Loans" /></a><p className="footer-copy">Keep your account details safe and up to date.</p></div></footer>
    </>
  );
}

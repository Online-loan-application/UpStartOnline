import { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { signOutWithActivity } from '../accountActivity.js';
import brandLogo from '../brandAssets.js';

const currency = new Intl.NumberFormat('en-JM', { style: 'currency', currency: 'JMD', maximumFractionDigits: 0 });
const activitySummary = (summary) => summary
  .replace(/\bdemonstration\b/gi, 'simulation')
  .replace(/\bdemo\b/gi, '')
  .replace(/\s+/g, ' ')
  .replace(/\s+([.,;:!?])/g, '$1')
  .trim();

export default function HistoryPage() {
  const [history, setHistory] = useState({ loading: true, email: '', applications: [], events: [], transfers: [], error: '' });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        window.location.replace('./application.html?view=account&mode=login');
        return;
      }

      const { data, error } = await supabase
        .from('loan_applications')
        .select('id, amount, purpose, status, created_at')
        .order('created_at', { ascending: false });

      const { data: events, error: eventError } = await supabase
        .from('account_activity')
        .select('id, event_type, summary, created_at')
        .order('created_at', { ascending: false });

      const { data: transfers, error: transferError } = await supabase
        .from('demo_transfer_requests')
        .select('id, provider, amount, status, created_at, processing_at')
        .order('created_at', { ascending: false });

      if (active) {
        setHistory({
          loading: false,
          email: user.email || '',
          applications: data || [],
          events: events || [],
          transfers: transfers || [],
          error: error?.message || eventError?.message || transferError?.message || '',
        });
      }
    }

    void loadHistory().catch((error) => {
      if (active) setHistory({
        loading: false,
        email: '',
        applications: [],
        events: [],
        transfers: [],
        error: error instanceof Error ? `Your history could not be loaded. ${error.message}` : 'Your history could not be loaded. Please try again.',
      });
    });

    return () => { active = false; };
  }, []);

  async function signOut() {
    try {
      await signOutWithActivity();
      window.location.href = './application.html?view=account&mode=login';
    } catch (error) {
      setHistory((current) => ({ ...current, error: error.message }));
    }
  }

  if (history.loading) return <main className="container dashboard-loading" aria-live="polite">Loading your history…</main>;

  return (
    <>
      <a className="skip-link" href="#main">Skip to account history</a>
      <header className="site-header dashboard-header">
        <div className="container nav-wrap">
          <a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src={brandLogo} alt="Upstart Ltd · Loans" /></a>
          <button
            className="dashboard-header-menu"
            type="button"
            aria-label={menuOpen ? 'Close dashboard navigation' : 'Open dashboard navigation'}
            aria-controls="history-sidebar"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg className="dashboard-menu-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            <svg className="dashboard-menu-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
          <nav className="dashboard-nav" aria-label="Account navigation">
            <span className="dashboard-account-email">{history.email}</span>
            <button className="button button-quiet" type="button" onClick={signOut}>Log out</button>
          </nav>
        </div>
      </header>
      <main id="main" className="dashboard-main">
        <div className="dashboard-shell">
          <aside id="history-sidebar" className={`dashboard-sidebar${menuOpen ? ' is-open' : ''}`} aria-label="Dashboard sidebar">
            <p className="dashboard-sidebar-label">My account</p>
            <nav className="dashboard-sidebar-nav" aria-label="Dashboard sections">
              <a href="./application.html?view=dashboard"><span className="sidebar-nav-icon" aria-hidden="true">⌂</span>Overview</a>
              <a href="./application.html?view=dashboard#application"><span className="sidebar-nav-icon" aria-hidden="true">▤</span>Loan application</a>
              <a href="./application.html?view=transfer"><span className="sidebar-nav-icon" aria-hidden="true">⇄</span>Transfer</a>
              <a href="./application.html?view=dashboard#recent-activities"><span className="sidebar-nav-icon" aria-hidden="true">◷</span>Recent activities</a>
              <a href="./application.html?view=history" aria-current="page"><span className="sidebar-nav-icon" aria-hidden="true">▧</span>History</a>
              <a href="./application.html?view=profile"><span className="sidebar-nav-icon" aria-hidden="true">◉</span>My profile</a>
            </nav>
            <div className="dashboard-sidebar-help"><span>Need a hand?</span><p>Our team is here to help with your account.</p><a href="./index.html#approach">Contact Upstart <span aria-hidden="true">↗</span></a></div>
          </aside>
          <section className="dashboard-content dashboard-history">
            <div className="dashboard-page-heading">
              <div><p className="dashboard-panel-kicker">Account activity</p><h1>History</h1><p>Review sign-ins, application updates, and simulated transfer activity.</p></div>
            </div>
            {history.error && <p className="account-message" role="alert">We couldn’t load your history: {history.error}</p>}
            <div className="history-card">
              <p className="history-disclaimer">Transfer entries are simulated records only. No real funds have moved.</p>
              <h2 className="history-section-title">Account activity</h2>
              {history.events.length ? (
                <ol className="history-list">
                  {history.events.map((event) => (
                    <li className="history-entry" key={event.id}>
                      <div className="history-entry-heading"><div><h2>{event.event_type.replaceAll('_', ' ')}</h2><p>{activitySummary(event.summary)}</p></div></div>
                      <time dateTime={event.created_at}>{new Intl.DateTimeFormat('en-JM', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.created_at))}</time>
                    </li>
                  ))}
                </ol>
              ) : <p className="activity-empty">No account activity has been recorded yet.</p>}
              <h2 className="history-section-title">Transfers</h2>
              {history.transfers.length ? (
                <ol className="history-list">
                  {history.transfers.map((transfer) => (
                    <li className="history-entry" key={transfer.id}>
                      <div className="history-entry-heading"><div><h2>{transfer.provider.replaceAll('-', ' ')} transfer</h2><p>{currency.format(Number(transfer.amount) || 0)} · {transfer.status}</p></div><span className="history-status">{transfer.status}</span></div>
                      <time dateTime={transfer.processing_at || transfer.created_at}>{new Intl.DateTimeFormat('en-JM', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(transfer.processing_at || transfer.created_at))}</time>
                    </li>
                  ))}
                </ol>
              ) : <p className="activity-empty">No transfers have been previewed.</p>}
              <h2 className="history-section-title">Loan applications</h2>
              {history.applications.length ? (
                <ol className="history-list">
                  {history.applications.map((application) => (
                    <li className="history-entry" key={application.id}>
                      <div className="history-entry-heading">
                        <div><h2>Loan application</h2><p>{application.purpose}</p></div>
                        <span className={`history-status is-${application.status}`}>{application.status.replaceAll('_', ' ')}</span>
                      </div>
                      <dl>
                        <div><dt>Requested amount</dt><dd>{currency.format(Number(application.amount) || 0)}</dd></div>
                        <div><dt>Submitted</dt><dd><time dateTime={application.created_at}>{new Intl.DateTimeFormat('en-JM', { dateStyle: 'long' }).format(new Date(application.created_at))}</time></dd></div>
                      </dl>
                    </li>
                  ))}
                </ol>
              ) : !history.error ? (
                <div className="account-notice" role="status"><strong>No history yet</strong><span>Your loan applications will appear here after you submit one.</span></div>
              ) : null}
            </div>
          </section>
        </div>
      </main>
      <footer className="site-footer dashboard-footer"><div className="container footer-inner"><a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src={brandLogo} alt="Upstart Ltd · Loans" /></a><p className="footer-copy">Upstart Ltd Jamaica · Account history</p></div></footer>
    </>
  );
}

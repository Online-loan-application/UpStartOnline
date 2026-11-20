import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase.js';
import { signOutWithActivity } from '../accountActivity.js';
import brandLogo from '../brandAssets.js';

const formatter = new Intl.NumberFormat('en-JM', { maximumFractionDigits: 0 });
const currency = (amount) => `J$${formatter.format(Number(amount) || 0)}`;
const activitySummary = (summary) => summary
  .replace(/\bdemonstration\b/gi, '')
  .replace(/\bdemo\b/gi, '')
  .replace(/\bsimulat(?:ed|ion(?:-only)?)\b/gi, '')
    .replace(/\b(?:no\s+real\s+fund(?:s)\s+moved)\b/gi, '')
  .replace(/\b(?:no\s+fund(?:s)\s+moved)\b/gi, '')
  .replace(/\s+/g, ' ')
  .replace(/\s+([.,;:!?])/g, '$1')
  .trim();

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState({ loading: true, email: '', application: null, activities: [], processingAmount: 0, processingCount: 0, sentAmount: 0, processingTransfers: [], error: '' });
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        window.location.replace('./application.html?view=account&mode=login');
        return;
      }

      const { data, error } = await supabase
        .from('loan_applications')
        .select('id, first_name, last_name, email, phone, address, parish, amount, approved_amount, term, purpose, monthly_income, pay_date, status, created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: activities, error: activityError } = await supabase
        .from('account_activity')
        .select('id, event_type, summary, created_at')
        .order('created_at', { ascending: false })
        .limit(30);
      let processingAmount = 0;
      let processingCount = 0;
      let sentAmount = 0;
      let processingError = null;
      let processingTransfers = [];
      let processingTransfersError = null;
      if (data?.[0]) {
        const { data: totals, error: totalsError } = await supabase.rpc('get_demo_transfer_totals', {
          p_application_id: data[0].id,
        });
        processingError = totalsError;
        processingAmount = Number(totals?.[0]?.processing_amount) || 0;
        processingCount = Number(totals?.[0]?.processing_count) || 0;
        sentAmount = Number(totals?.[0]?.sent_amount) || 0;
        const { data: transfers, error: transfersError } = await supabase
          .from('demo_transfer_requests')
          .select('id, provider, amount, processing_at')
          .eq('application_id', data[0].id)
          .eq('status', 'processing')
          .order('processing_at', { ascending: false });
        processingTransfersError = transfersError;
        processingTransfers = transfers || [];
      }

      if (active) {
        const applicationError = error?.code === '42703' || error?.code === 'PGRST204'
          ? 'Dashboard data is not up to date. Run supabase/approval.sql in the Supabase SQL Editor.'
          : error?.message || activityError?.message || processingError?.message || processingTransfersError?.message || '';
        setDashboard({
          loading: false,
          email: user.email || '',
          application: data?.[0] || null,
          activities: activities || [],
          processingAmount,
          processingCount,
          sentAmount,
          processingTransfers,
          error: applicationError,
        });
      }
    }

    void loadDashboard().catch(() => {
      if (active) setDashboard((current) => ({ ...current, loading: false, error: 'Your account information could not be loaded. Please try again.' }));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function dismissNotifications(event) {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
      } else if (event.type === 'pointerdown' && !notificationRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener('keydown', dismissNotifications);
    document.addEventListener('pointerdown', dismissNotifications);
    return () => {
      document.removeEventListener('keydown', dismissNotifications);
      document.removeEventListener('pointerdown', dismissNotifications);
    };
  }, []);

  const { loading, email, application, error } = dashboard;

  const amount = Number(application?.amount) || 0;
  const grossBalance = application?.status === 'approved' ? amount : 0;
  const balance = Math.max(0, grossBalance - dashboard.processingAmount - dashboard.sentAmount);
  const activeTransfer = dashboard.processingTransfers[0];
  const activeTransferHref = activeTransfer
    ? `./application.html?view=transfer-serial&provider=${encodeURIComponent(activeTransfer.provider)}&transfer_id=${encodeURIComponent(activeTransfer.id)}`
    : './application.html?view=transfer';
  const transferHref = (provider) => activeTransfer
    ? activeTransferHref
    : `./application.html?view=transfer&provider=${encodeURIComponent(provider)}`;
  const term = Number(application?.term) || 36;
  const monthlyRate = 0.165 / 12;
  const payment = amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -term));
  const name = application?.first_name;
  const status = application?.status || '';
  const activities = dashboard.activities;

  async function signOut() {
    try {
      await signOutWithActivity();
      window.location.href = './application.html?view=account&mode=login';
    } catch (signOutError) {
      setDashboard((current) => ({ ...current, error: signOutError.message }));
    }
  }

  if (loading) return <main className="container dashboard-loading" aria-live="polite">Loading your account…</main>;

  return (
    <>
      <a className="skip-link" href="#main">Skip to dashboard</a>
      <header className="site-header dashboard-header"><div className="container nav-wrap">
        <a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src={brandLogo} alt="Upstart Ltd · Loans" /></a>
        <button
          className="dashboard-header-menu"
          type="button"
          aria-label={sidebarOpen ? 'Close dashboard navigation' : 'Open dashboard navigation'}
          aria-controls="dashboard-sidebar"
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          <svg className="dashboard-menu-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          <svg className="dashboard-menu-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        <nav className="dashboard-nav" aria-label="Account navigation">
          <div className="dashboard-notification-menu" ref={notificationRef}>
            <button
              className="dashboard-notification-trigger"
              type="button"
              aria-label={notificationsOpen ? 'Close notifications' : 'Open notifications'}
              aria-expanded={notificationsOpen}
              aria-haspopup="true"
              onClick={() => setNotificationsOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
              {activities.length > 0 && <span className="dashboard-notification-dot" aria-hidden="true"></span>}
            </button>
            {notificationsOpen && <div className="dashboard-notification-dropdown" role="status" aria-live="polite">
              <div className="dashboard-notification-dropdown-heading"><strong>Account notifications</strong><span>{activities.length} recent</span></div>
              {activities.length ? (
                <ol className="dashboard-notification-list">
                  {activities.map((activity) => (
                    <li key={activity.id}>
                      <strong>{activitySummary(activity.summary)}</strong>
                      <time dateTime={activity.created_at}>{new Intl.DateTimeFormat('en-JM', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(activity.created_at))}</time>
                    </li>
                  ))}
                </ol>
              ) : <p>No account activity has been recorded yet.</p>}
              <a className="dashboard-notification-history" href="./application.html?view=history">View full history</a>
            </div>}
          </div>
          <span className="dashboard-account-email">{email}</span>
          <button className="button button-quiet" type="button" onClick={signOut}>Log out</button>
        </nav>
      </div></header>
      <main id="main" className="dashboard-main">
        <div className="dashboard-shell">
          <aside id="dashboard-sidebar" className={`dashboard-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Dashboard sidebar">
            <p className="dashboard-sidebar-label">My account</p>
            <nav className="dashboard-sidebar-nav" aria-label="Dashboard sections">
              <a href="#overview" aria-current="page" onClick={() => setSidebarOpen(false)}><span className="sidebar-nav-icon" aria-hidden="true">⌂</span>Overview</a>
              <a href="#application" onClick={() => setSidebarOpen(false)}><span className="sidebar-nav-icon" aria-hidden="true">▤</span>Loan application</a>
              <a href={activeTransferHref} onClick={() => setSidebarOpen(false)}><span className="sidebar-nav-icon" aria-hidden="true">⇄</span>Transfer</a>
              <a href="#recent-activities" onClick={() => setSidebarOpen(false)}><span className="sidebar-nav-icon" aria-hidden="true">◷</span>Recent activities</a>
              <a href="./application.html?view=history" onClick={() => setSidebarOpen(false)}><span className="sidebar-nav-icon" aria-hidden="true">▧</span>History</a>
              <a href="./application.html?view=profile" onClick={() => setSidebarOpen(false)}><span className="sidebar-nav-icon" aria-hidden="true">◉</span>My profile</a>
            </nav>
            <div className="dashboard-sidebar-help"><span>Need a hand?</span><p>Our team is here to help with your account.</p><a href="./index.html#approach">Contact Upstart <span aria-hidden="true">↗</span></a></div>
          </aside>
          <div className="dashboard-content">
            <section id="overview" className="dashboard-overview">
              <div className="dashboard-page-heading">
                <div><p className="dashboard-panel-kicker">Account overview</p><h1>{name ? `Welcome back, ${name}` : 'Welcome to your account'}</h1><p>Here’s what’s happening with your loan account.</p></div>
                <time className="dashboard-clock dashboard-glass-card" dateTime={currentTime.toISOString()}>
                  <strong>{new Intl.DateTimeFormat('en-JM', { timeZone: 'America/Jamaica', hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(currentTime)}</strong>
                  <span>{new Intl.DateTimeFormat('en-JM', { timeZone: 'America/Jamaica', dateStyle: 'full' }).format(currentTime)}</span>
                </time>
              </div>
              <section className="dashboard-balance-card" aria-labelledby="balance-title">
                <div className="dashboard-balance-copy">
                  <span className="dashboard-panel-kicker">Loan account balance</span>
                  <h2 id="balance-title">{currency(balance)}</h2>
                  <p>{status === 'approved' ? 'Available balance' : 'Your balance will update if your application is approved.'}</p>
                  {dashboard.processingAmount > 0 && <p className="dashboard-processing-balance">{currency(dashboard.processingAmount)} in processing transfers ({dashboard.processingCount})</p>}
                  {dashboard.sentAmount > 0 && <p className="dashboard-processing-balance">{currency(dashboard.sentAmount)} in sent transfers</p>}
                  {dashboard.processingTransfers.length > 0 && (
                    <ul className="dashboard-processing-transfer-list" aria-label="Transfers in processing">
                      {dashboard.processingTransfers.map((transfer) => (
                        <li key={transfer.id}>
                          <strong>{currency(transfer.amount)}</strong> {transfer.provider.replaceAll('-', ' ')} transfer in processing
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className="dashboard-balance-status">{status ? status.replaceAll('_', ' ') : 'No active application'}</span>
              </section>
              <section id="transfers" className="dashboard-transfers" aria-labelledby="transfers-title">
                <div className="dashboard-section-heading"><div><span className="dashboard-panel-kicker">Move money</span><h2 id="transfers-title">Transfer options</h2></div></div>
                <p className="dashboard-transfer-note">Select an option to make your transfer.</p>
                <div className="dashboard-transfer-grid">
                  <a className="dashboard-transfer-option" href={transferHref('local-bank')}>
                    <span className="dashboard-transfer-icon" aria-hidden="true">⇄</span>
                    <div><h3>Local bank transfer</h3><p>Transfer to a Jamaican bank account</p></div>
                  </a>
                  <a className="dashboard-transfer-option" href={transferHref('cash-app')}>
                    <span className="dashboard-transfer-icon" aria-hidden="true">$</span>
                    <div><h3>Cash App</h3><p>Send to a Cash App account</p></div>
                  </a>
                  <a className="dashboard-transfer-option" href={transferHref('paypal')}>
                    <span className="dashboard-transfer-icon" aria-hidden="true">P</span>
                    <div><h3>PayPal</h3><p>Send to a PayPal account</p></div>
                  </a>
                  <a className="dashboard-transfer-option" href={transferHref('other')}>
                    <span className="dashboard-transfer-icon" aria-hidden="true">＋</span>
                    <div><h3>More options</h3><p>Additional transfer services</p></div>
                  </a>
                </div>
              </section>
              <div id="application" className="dashboard-section-heading"><div><span className="dashboard-panel-kicker">Account activity</span><h2>Loan application</h2></div></div>
              {error && <p className="account-message" role="alert">We couldn’t load your application: {error}</p>}
              {application ? <>
                <div className="dashboard-grid">
                  <article className="dashboard-stat"><span>Requested amount</span><strong>{currency(amount)}</strong><small>Jamaican dollars</small></article>
                  <article className="dashboard-stat"><span>Estimated monthly repayment</span><strong>{currency(payment)}</strong><small>Estimated APR 16.5% · {term} months</small></article>
                  <article className="dashboard-stat"><span>Application status</span><strong>{application.status.replaceAll('_', ' ')}</strong><small>Submitted {new Intl.DateTimeFormat('en-JM', { dateStyle: 'medium' }).format(new Date(application.created_at))}</small></article>
                </div>
                <section className="dashboard-details" aria-labelledby="application-details-title"><div><h3 id="application-details-title">Application details</h3><p>Purpose: {application.purpose}</p><p>Repayment term: {term} months</p><p>Preferred first pay date: {new Intl.DateTimeFormat('en-JM', { dateStyle: 'long' }).format(new Date(`${application.pay_date}T12:00:00`))}</p></div></section>
              </> : !error && <div className="account-notice" role="status"><strong>No application found</strong><span>Start an application to see its status and details here.</span></div>}
              <section id="recent-activities" className="dashboard-recent-activities" aria-labelledby="recent-activities-title">
                <div className="dashboard-section-heading">
                  <div><span className="dashboard-panel-kicker">Account history</span><h2 id="recent-activities-title">Recent activities</h2></div>
                  <a className="button button-quiet" href="./application.html?view=history">View history</a>
                </div>
                {activities.length ? (
                  <ol className="activity-list">
                    {activities.slice(0, 6).map((item) => (
                      <li className="activity-item" key={item.id}>
                        <span className="activity-marker" aria-hidden="true">{item.event_type === 'transfer_processing' ? '⇄' : item.event_type === 'signed_in' ? '↗' : '✓'}</span>
                        <div className="activity-copy"><strong>{item.event_type.replaceAll('_', ' ')}</strong><p>{activitySummary(item.summary)}</p></div>
                        <time dateTime={item.created_at}>{new Intl.DateTimeFormat('en-JM', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.created_at))}</time>
                      </li>
                    ))}
                  </ol>
                ) : <p className="activity-empty">Your application activity will appear here.</p>}
              </section>
            </section>
          </div>
        </div>
      </main>
      <footer className="site-footer dashboard-footer"><div className="container footer-inner"><a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src={brandLogo} alt="Upstart Ltd · Loans" /></a><p className="footer-copy">Upstart Ltd Jamaica · Estimates are for planning purposes.</p></div></footer>
    </>
  );
}
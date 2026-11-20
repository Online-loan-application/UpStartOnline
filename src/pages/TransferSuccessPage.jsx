import { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { signOutWithActivity } from '../accountActivity.js';
import brandLogo from '../brandAssets.js';

const transferTypes = {
  'local-bank': {
    name: 'Local bank transfer',
    fields: [
      ['recipientName', 'Account holder full name'],
      ['bankName', 'Bank name'],
      ['accountNumber', 'Account number'],
      ['accountType', 'Account type'],
    ],
  },
  'cash-app': { name: 'Cash App', fields: [['cashTag', 'Recipient $Cashtag']] },
  paypal: { name: 'PayPal', fields: [['paypalEmail', 'Recipient PayPal email']] },
  other: {
    name: 'More transfer options',
    fields: [['serviceName', 'Transfer service'], ['recipientDetails', 'Recipient details']],
  },
};

const amountFormatter = new Intl.NumberFormat('en-JM', {
  style: 'currency',
  currency: 'JMD',
  maximumFractionDigits: 2,
});

export default function TransferSuccessPage() {
  const [result, setResult] = useState({ loading: true, email: '', transfer: null, error: '' });
  const [menuOpen, setMenuOpen] = useState(false);
  const transferId = new URLSearchParams(window.location.search).get('transfer_id');

  useEffect(() => {
    let active = true;

    async function loadTransfer() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        window.location.replace('./application.html?view=account&mode=login');
        return;
      }
      if (!transferId) throw new Error('The transfer confirmation reference is missing.');

      const { data: transfer, error: transferError } = await supabase
        .from('demo_transfer_requests')
        .select('id, user_id, provider, amount, status, recipient_details, reference_code, sent_at')
        .eq('id', transferId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (transferError) throw new Error(`The transfer confirmation could not be loaded. ${transferError.message}`);
      if (!transfer || transfer.status !== 'sent' || !transfer.reference_code) {
        throw new Error('This transfer has not been marked sent.');
      }

      if (active) setResult({ loading: false, email: user.email || '', transfer, error: '' });
    }

    void loadTransfer().catch((error) => {
      if (active) setResult({
        loading: false,
        email: '',
        transfer: null,
        error: error instanceof Error ? error.message : 'The transfer confirmation could not be loaded.',
      });
    });

    return () => { active = false; };
  }, [transferId]);

  async function signOut() {
    try {
      await signOutWithActivity();
      window.location.href = './application.html?view=account&mode=login';
    } catch (error) {
      setResult((current) => ({ ...current, error: error.message }));
    }
  }

  if (result.loading) return <main className="container dashboard-loading" aria-live="polite">Loading transfer confirmation…</main>;

  const transfer = result.transfer;
  const transferType = transfer ? transferTypes[transfer.provider] : null;

  return (
    <>
      <a className="skip-link" href="#main">Skip to transfer confirmation</a>
      <header className="site-header dashboard-header">
        <div className="container nav-wrap">
          <a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src={brandLogo} alt="Upstart Ltd · Loans" /></a>
          <button
            className="dashboard-header-menu"
            type="button"
            aria-label={menuOpen ? 'Close dashboard navigation' : 'Open dashboard navigation'}
            aria-controls="transfer-success-sidebar"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg className="dashboard-menu-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            <svg className="dashboard-menu-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
          <nav className="dashboard-nav" aria-label="Account navigation">
            <span className="dashboard-account-email">{result.email}</span>
            <button className="button button-quiet" type="button" onClick={signOut}>Log out</button>
          </nav>
        </div>
      </header>
      <main id="main" className="dashboard-main">
        <div className="dashboard-shell">
          <aside id="transfer-success-sidebar" className={`dashboard-sidebar${menuOpen ? ' is-open' : ''}`} aria-label="Dashboard sidebar">
            <p className="dashboard-sidebar-label">My account</p>
            <nav className="dashboard-sidebar-nav" aria-label="Dashboard sections">
              <a href="./application.html?view=dashboard"><span className="sidebar-nav-icon" aria-hidden="true">⌂</span>Overview</a>
              <a href="./application.html?view=transfer"><span className="sidebar-nav-icon" aria-hidden="true">⇄</span>Transfer</a>
              <a href="./application.html?view=history"><span className="sidebar-nav-icon" aria-hidden="true">▧</span>History</a>
            </nav>
          </aside>
          <section className="dashboard-content transfer-page-content">
            {result.error && <p className="account-message" role="alert">{result.error}</p>}
            {transfer && transferType && (
              <article className="transfer-preview-card">
                <span className="transfer-detail-icon" aria-hidden="true">✓</span>
                <p className="dashboard-panel-kicker">Transfer confirmation</p>
                <h1>Transfer successful</h1>
                {/* <p className="account-notice" role="status">
                  <strong>This is a simulation</strong>
                  <span>No payment was submitted and no real funds moved.</span>
                </p> */}
                <section className="transfer-success-recipient" aria-labelledby="transfer-recipient-title">
                  <h2 id="transfer-recipient-title">Account sent to</h2>
                  {transferType.fields.some(([field]) => transfer.recipient_details?.[field]) ? (
                    <dl className="transfer-preview-details">
                      {transferType.fields.map(([field, label]) => {
                        const value = transfer.recipient_details?.[field];
                        if (!value) return null;
                        return <div key={field}><dt>{label}</dt><dd>{field === 'accountType' ? String(value).replace(/^./, (letter) => letter.toUpperCase()) : value}</dd></div>;
                      })}
                    </dl>
                  ) : (
                    <p className="account-notice" role="status">Recipient account details are not available for this transfer.</p>
                  )}
                </section>
                <dl className="transfer-preview-details">
                  <div><dt>Amount</dt><dd>{amountFormatter.format(Number(transfer.amount))}</dd></div>
                  <div><dt>Transfer type</dt><dd>{transferType.name}</dd></div>
                  <div><dt>Transfer reference</dt><dd>{transfer.reference_code}</dd></div>
                  {transfer.sent_at && <div><dt>Marked sent</dt><dd>{new Intl.DateTimeFormat('en-JM', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(transfer.sent_at))}</dd></div>}
                </dl>
                <div className="transfer-preview-actions">
                  <a className="button button-dark" href="./application.html?view=dashboard">Back to dashboard</a>
                  <a className="button button-quiet" href="./application.html?view=history">View transfer history</a>
                </div>
              </article>
            )}
          </section>
        </div>
      </main>
      <footer className="site-footer dashboard-footer"><div className="container footer-inner"><a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src={brandLogo} alt="Upstart Ltd · Loans" /></a><p className="footer-copy">Transfers are for display only; no real funds move.</p></div></footer>
    </>
  );
}

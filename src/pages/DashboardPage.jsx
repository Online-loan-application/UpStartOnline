import { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';

const formatter = new Intl.NumberFormat('en-JM', { maximumFractionDigits: 0 });
const currency = (amount) => `J$${formatter.format(Number(amount) || 0)}`;

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState({ loading: true, email: '', application: null, error: '' });

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
        .select('id, first_name, last_name, email, phone, address, parish, amount, term, purpose, monthly_income, pay_date, status, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (active) {
        setDashboard({ loading: false, email: user.email || '', application: data, error: error?.message || '' });
      }
    }

    void loadDashboard().catch(() => {
      if (active) setDashboard({ loading: false, email: '', application: null, error: 'Your account information could not be loaded. Please try again.' });
    });
    return () => { active = false; };
  }, []);

  const { loading, email, application, error } = dashboard;

  const amount = Number(application?.amount) || 0;
  const term = Number(application?.term) || 36;
  const monthlyRate = 0.165 / 12;
  const payment = amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -term));
  const name = application?.first_name || 'Your';

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = './application.html?view=account&mode=login';
  }

  if (loading) return <main className="container dashboard-loading" aria-live="polite">Loading your account…</main>;

  return (
    <>
      <a className="skip-link" href="#main">Skip to dashboard</a>
      <header className="site-header"><div className="container nav-wrap"><a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src="./assets/upstart-logo-blended.png" alt="Upstart Ltd · Loans" /></a><nav className="dashboard-nav" aria-label="Account navigation"><span>{email}</span><button className="button button-quiet" type="button" onClick={signOut}>Log out</button></nav></div></header>
      <main id="main" className="dashboard-main">
        <section className="application-hero dashboard-hero"><div className="container hero-grid"><div><p className="eyebrow">Account overview</p><h1 className="display">Your next chapter, {name}.</h1></div><div className="hero-note"><strong>Application overview</strong><p>Review your submitted application and profile details.</p></div></div></section>
        <section className="application-area dashboard-area"><div className="container">
          <div className="dashboard-heading"><div><span className="step-kicker">Loan application</span><h2>Your application snapshot</h2></div><a className="button button-dark" href="./application.html">Start another application</a></div>
          {error && <p className="account-message" role="alert">We couldn’t load your application: {error}</p>}
          {application ? <>
            <div className="dashboard-grid">
              <article className="dashboard-stat"><span>Requested amount</span><strong>{currency(amount)}</strong><small>Jamaican dollars</small></article>
              <article className="dashboard-stat"><span>Estimated monthly repayment</span><strong>{currency(payment)}</strong><small>Estimated APR 16.5% · {term} months</small></article>
              <article className="dashboard-stat"><span>Application status</span><strong>{application.status.replaceAll('_', ' ')}</strong><small>Submitted {new Intl.DateTimeFormat('en-JM', { dateStyle: 'medium' }).format(new Date(application.created_at))}</small></article>
            </div>
            <section className="dashboard-details" aria-labelledby="profile-title"><div><h3 id="profile-title">Profile</h3><p>{[application.first_name, application.last_name].filter(Boolean).join(' ')}</p><p>{email}</p><p>{application.phone}</p><p>{application.address}</p><p>{application.parish}</p></div><div><h3>Application details</h3><p>Purpose: {application.purpose}</p><p>Repayment term: {term} months</p><p>Preferred first pay date: {new Intl.DateTimeFormat('en-JM', { dateStyle: 'long' }).format(new Date(`${application.pay_date}T12:00:00`))}</p></div></section>
          </> : !error && <div className="account-notice" role="status"><strong>No application found</strong><span>Start an application to see its status and details here.</span></div>}
        </div></section>
      </main>
      <footer className="site-footer"><div className="container footer-inner"><a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src="./assets/upstart-logo-blended.png" alt="Upstart Ltd · Loans" /></a><p className="footer-copy">Upstart Ltd Jamaica · Estimates are for planning purposes.</p></div></footer>
    </>
  );
}
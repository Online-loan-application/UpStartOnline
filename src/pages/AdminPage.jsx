import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../supabase.js';
import { signOutWithActivity } from '../accountActivity.js';
import brandLogo from '../brandAssets.js';
import Toast from '../components/Toast.jsx';

const pageSize = 20;
const amountFormatter = new Intl.NumberFormat('en-JM', { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('en-JM', { dateStyle: 'medium' });
const currency = (amount) => `J$${amountFormatter.format(Number(amount) || 0)}`;

export default function AdminPage() {
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [dashboard, setDashboard] = useState({
    loading: true,
    authorized: false,
    email: '',
    applications: [],
    total: 0,
    pending: 0,
    matchingTotal: 0,
    error: '',
    signOutError: '',
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('notice') === 'application-deleted') {
      setToast('Loan application deleted. The applicant account remains active.');
      url.searchParams.delete('notice');
      window.history.replaceState({}, '', url);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAdminDashboard() {
      if (!isSupabaseConfigured || !supabase) {
        setDashboard((current) => ({
          ...current,
          loading: false,
          error: 'Account services are not configured. Please contact support.',
        }));
        return;
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError?.name === 'AuthSessionMissingError' || (!authError && !user)) {
        if (active) window.location.replace('./application.html?view=account&mode=login');
        return;
      }
      if (authError) throw new Error(`We could not verify your account. ${authError.message}`);
      if (user.app_metadata?.role !== 'admin') {
        if (active) window.location.replace('./application.html?view=dashboard');
        return;
      }

      const start = page * pageSize;
      let applicationsQuery = supabase
        .from('loan_applications')
        .select('id, first_name, last_name, email, amount, approved_amount, status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, start + pageSize - 1);
      const trimmedSearch = searchQuery.trim();
      if (trimmedSearch) {
        const escapedSearch = trimmedSearch.replace(/(["\\])/g, '\\$1');
        const pattern = `"%${escapedSearch}%"`;
        applicationsQuery = applicationsQuery.or(
          `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`,
        );
      }

      const [applicationsResult, totalResult, pendingResult] = await Promise.all([
        applicationsQuery,
        supabase.from('loan_applications').select('id', { count: 'exact', head: true }),
        supabase.from('loan_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      if (applicationsResult.error?.code === '42703' || applicationsResult.error?.code === 'PGRST204') {
        throw new Error('The admin database is not up to date. Run supabase/approval.sql in the Supabase SQL Editor.');
      }
      if (applicationsResult.error) throw new Error(`Applications could not be loaded. ${applicationsResult.error.message}`);
      if (totalResult.error) throw new Error(`Applicant totals could not be loaded. ${totalResult.error.message}`);
      if (pendingResult.error) throw new Error(`Pending applications could not be counted. ${pendingResult.error.message}`);
      if (active) {
        setDashboard({
          loading: false,
          authorized: true,
          email: user.email || '',
          applications: applicationsResult.data || [],
          total: totalResult.count || 0,
          pending: pendingResult.count || 0,
          matchingTotal: applicationsResult.count || 0,
          error: '',
          signOutError: '',
        });
      }
    }

    void loadAdminDashboard().catch((error) => {
      if (active) {
        setDashboard((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : 'The admin dashboard could not be loaded. Please try again.',
        }));
      }
    });

    return () => { active = false; };
  }, [page, revision, searchQuery]);

  async function signOut() {
    if (!supabase) return;
    try {
      await signOutWithActivity();
      window.location.href = './application.html?view=account&mode=login';
    } catch (error) {
      setDashboard((current) => ({ ...current, signOutError: error.message }));
      return;
    }
  }

  const matchingPages = Math.max(1, Math.ceil((dashboard.matchingTotal || 0) / pageSize));

  function submitSearch(event) {
    event.preventDefault();
    setPage(0);
    setSearchQuery(searchInput.trim());
  }

  if (dashboard.loading) {
    return <main className="container dashboard-loading" aria-live="polite">Checking admin access…</main>;
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to admin dashboard</a>
      <Toast message={toast} onDismiss={() => setToast('')} />
      <header className="site-header">
        <div className="container nav-wrap">
          <a className="brand" href="./index.html" aria-label="Upstart Jamaica home">
            <img className="brand-image" src={brandLogo} alt="Upstart Ltd · Loans" />
          </a>
          <nav className="dashboard-nav" aria-label="Admin account navigation">
            {dashboard.email && <span>{dashboard.email}</span>}
            <button className="button button-quiet" type="button" onClick={signOut} disabled={!supabase}>Log out</button>
          </nav>
        </div>
      </header>
      <main id="main" className="dashboard-main">
        <section id="applications" className="admin-page">
          {dashboard.signOutError && <p className="account-message" role="alert">{dashboard.signOutError}</p>}
          {dashboard.error ? (
            <p className="admin-access-message" role="alert">{dashboard.error}</p>
          ) : !dashboard.authorized ? (
            <div className="admin-access-message" role="alert">
              <strong>Admin access required.</strong> Sign in with an account that has the server-managed admin role.
              <div><a className="account-back" href="./application.html?view=account&mode=login">Go to sign in</a></div>
            </div>
          ) : (
            <>
              <div className="admin-section-heading">
                <div><p className="dashboard-panel-kicker">Admin workspace</p><h1>Overview</h1><p>Search and review submitted applications.</p></div>
              </div>
              <section className="admin-overview-cards" aria-label="Applicant overview">
                <article className="admin-overview-card"><span>Total applicants</span><strong>{dashboard.total}</strong><small>All submitted applications</small></article>
                <article className="admin-overview-card"><span>Pending review</span><strong>{dashboard.pending}</strong><small>Awaiting an admin decision</small></article>
              </section>
              <div className="admin-applicants-heading">
                <div><h2>Applicants</h2><span>{dashboard.matchingTotal} matching results</span></div>
                <form className="admin-search" role="search" onSubmit={submitSearch}>
                  <label className="sr-only" htmlFor="admin-applicant-search">Search applicants</label>
                  <input id="admin-applicant-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name or email" />
                  <button className="button button-dark" type="submit">Search</button>
                </form>
              </div>
              <div className="admin-applicant-list" aria-label="Applicants">
                {dashboard.applications.map((application, index) => {
                  const applicantName = [application.first_name, application.last_name].filter(Boolean).join(' ') || 'Applicant';
                  const status = application.status;
                  return (
                    <a
                      className="admin-applicant-card"
                      key={application.id}
                      href={`./application.html?view=admin-applicant&id=${encodeURIComponent(application.id)}`}
                      aria-label={`View full application for ${applicantName}`}
                      style={{ '--admin-card-index': index }}
                    >
                      <div className="admin-applicant-heading">
                        <div className="admin-applicant-identity">
                          <span className="admin-applicant-avatar" aria-hidden="true">{applicantName.charAt(0).toUpperCase()}</span>
                          <div><h2>{applicantName}</h2><p>{application.email}</p></div>
                        </div>
                        <span className={`admin-applicant-status is-${status}`}>{status.replaceAll('_', ' ')}</span>
                      </div>
                      <dl className="admin-applicant-details">
                        <div><dt>Requested</dt><dd>{currency(application.amount)}</dd></div>
                        <div><dt>Approved</dt><dd>{application.status === 'approved' ? currency(application.amount) : '—'}</dd></div>
                        <div><dt>Submitted</dt><dd>{dateFormatter.format(new Date(application.created_at))}</dd></div>
                      </dl>
                      <span className="admin-applicant-link-hint">View full application <span aria-hidden="true">↗</span></span>
                    </a>
                  );
                })}
                {dashboard.applications.length === 0 && <p className="admin-empty">{searchQuery ? 'No applicants match that search.' : 'No applications have been submitted yet.'}</p>}
              </div>
              <div className="admin-pagination" aria-label="Applicant pages">
                <p>Page {page + 1} of {matchingPages}</p>
                <div className="account-actions">
                  <button className="button button-quiet" type="button" disabled={page === 0 || dashboard.loading} onClick={() => setPage((current) => current - 1)}>Previous</button>
                  <button className="button button-quiet" type="button" disabled={page + 1 >= matchingPages || dashboard.loading} onClick={() => setPage((current) => current + 1)}>Next</button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
      <footer className="site-footer"><div className="container footer-inner"><a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src={brandLogo} alt="Upstart Ltd · Loans" /></a><p className="footer-copy">Admin access is restricted to authorized Upstart staff.</p></div></footer>
    </>
  );
}

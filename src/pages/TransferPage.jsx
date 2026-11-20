import { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { logAccountActivity, signOutWithActivity } from '../accountActivity.js';
import brandLogo from '../brandAssets.js';
import Toast from '../components/Toast.jsx';

const transferOptions = {
  'local-bank': {
    name: 'Local bank transfer',
    // description: 'Transfers are cost free',
    icon: '⇄',
    fields: [
      { name: 'recipientName', label: 'Account holder full name', type: 'text', autoComplete: 'name' },
      { name: 'bankName', label: 'Bank name', type: 'text', autoComplete: 'organization' },
      { name: 'accountNumber', label: 'Account number', type: 'text', autoComplete: 'off' },
      { name: 'accountType', label: 'Account type', type: 'select', options: ['Savings', 'Chequing'] },
    ],
  },
  'cash-app': {
    name: 'Cash App',
    description: 'Cash App transfers are not available yet.',
    icon: '$',
    fields: [
      { name: 'cashTag', label: 'Recipient $Cashtag', type: 'text', autoComplete: 'off' },
    ],
  },
  paypal: {
    name: 'PayPal',
    description: 'PayPal transfers are not available yet.',
    icon: 'P',
    fields: [
      { name: 'paypalEmail', label: 'Recipient PayPal email', type: 'email', autoComplete: 'email' },
    ],
  },
  other: {
    name: 'More transfer options',
    description: 'Additional transfer services are not available yet.',
    icon: '＋',
    fields: [
      { name: 'serviceName', label: 'Transfer service', type: 'text', autoComplete: 'off' },
      { name: 'recipientDetails', label: 'Recipient details', type: 'text', autoComplete: 'off' },
    ],
  },
};

export default function TransferPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [processingAmount, setProcessingAmount] = useState(0);
  const [processingTransfer, setProcessingTransfer] = useState(null);
  const [applicationId, setApplicationId] = useState('');
  const [savedRecipients, setSavedRecipients] = useState([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [recipientError, setRecipientError] = useState('');
  const [recipientMessage, setRecipientMessage] = useState('');
  const [savingRecipient, setSavingRecipient] = useState(false);
  const [transferForm, setTransferForm] = useState({});
  const [previewSaving, setPreviewSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [firstSerialState, setFirstSerialState] = useState({ ready: false, error: '' });
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const provider = new URLSearchParams(window.location.search).get('provider');
  const transfer = provider ? transferOptions[provider] : null;
  const transferNavigationHref = processingTransfer
    ? `./application.html?view=transfer-serial&provider=${encodeURIComponent(processingTransfer.provider)}&transfer_id=${encodeURIComponent(processingTransfer.id)}`
    : './application.html?view=transfer';

  useEffect(() => {
    let active = true;

    async function verifyAccount() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        window.location.replace('./application.html?view=account&mode=login');
        return;
      }

      const { data: application, error: applicationError } = await supabase
        .from('loan_applications')
        .select('id, amount, approved_amount, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (applicationError) {
        throw new Error(applicationError.code === '42703' || applicationError.code === 'PGRST204'
          ? 'Transfer balance is unavailable. Run supabase/approval.sql in your Supabase SQL Editor.'
          : `Your transfer balance could not be loaded. ${applicationError.message}`);
      }

      let firstSerialReady = false;
      let serialSetupError = '';
      let recipientRows = [];
      let processingBalance = 0;
      let sentBalance = 0;
      let activeProcessingTransfer = null;
      if (application) {
        const { data: demoSerials, error: serialError } = await supabase.rpc('get_transfer_demo_serials', {
          p_application_id: application.id,
        });

        if (serialError) {
          serialSetupError = serialError.code === '42P01' || serialError.code === 'PGRST205'
            ? 'Serial setup is not configured yet. An administrator must apply the serial setup migration in Supabase.'
            : `Serial setup could not be checked. ${serialError.message}`;
        } else {
          const firstSerial = demoSerials?.find((serial) => serial.sequence === 1);
          if (demoSerials?.length && typeof firstSerial?.code_generated !== 'boolean') {
            serialSetupError = 'An administrator must apply the latest serial setup migration in Supabase.';
          } else {
            firstSerialReady = Boolean(firstSerial?.code_generated && Number(firstSerial.amount) > 0);
          }
        }

        const { data: totals, error: totalsError } = await supabase.rpc('get_demo_transfer_totals', {
          p_application_id: application.id,
        });
        if (totalsError) {
          throw new Error(`Processing transfers could not be loaded. ${totalsError.message}`);
        }
        processingBalance = Number(totals?.[0]?.processing_amount) || 0;
        sentBalance = Number(totals?.[0]?.sent_amount) || 0;

        const { data: activeTransfer, error: activeTransferError } = await supabase
          .from('demo_transfer_requests')
          .select('id, provider')
          .eq('application_id', application.id)
          .eq('status', 'processing')
          .order('processing_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (activeTransferError) {
          throw new Error(`Your processing transfer could not be loaded. ${activeTransferError.message}`);
        }
        activeProcessingTransfer = activeTransfer;
        if (activeProcessingTransfer) {
          window.location.replace(`./application.html?view=transfer-serial&provider=${encodeURIComponent(activeProcessingTransfer.provider)}&transfer_id=${encodeURIComponent(activeProcessingTransfer.id)}`);
          return;
        }

        const { data: recipients, error: recipientsError } = await supabase
          .from('saved_transfer_recipients')
          .select('id, provider, label, recipient_details, created_at')
          .order('created_at', { ascending: false });
        if (recipientsError) {
          throw new Error(`Saved transfer details could not be loaded. ${recipientsError.message}`);
        }
        recipientRows = recipients || [];
      }

      if (active) {
        setEmail(user.email || '');
        setUserId(user.id);
        setApplicationId(application?.id || '');
        setProcessingAmount(processingBalance);
        setProcessingTransfer(activeProcessingTransfer);
        setAvailableBalance(application?.status === 'approved' ? Math.max(0, (Number(application.amount) || 0) - processingBalance - sentBalance) : 0);
        setSavedRecipients(recipientRows);
        setFirstSerialState({ ready: firstSerialReady, error: serialSetupError });
        setLoading(false);
      }
    }

    void verifyAccount().catch((verificationError) => {
      if (active) {
        setError(verificationError instanceof Error ? verificationError.message : 'We could not verify your account. Please return to sign in and try again.');
        setLoading(false);
      }
    });

    return () => { active = false; };
  }, []);

  async function signOut() {
    try {
      await signOutWithActivity();
      window.location.href = './application.html?view=account&mode=login';
    } catch (signOutError) {
      setError(signOutError.message);
    }
  }

  function applySavedRecipient(id) {
    setSelectedRecipientId(id);
    const recipient = savedRecipients.find((candidate) => candidate.id === id);
    if (!recipient) {
      setTransferForm((current) => {
        const next = { ...current };
        transfer.fields.forEach((field) => delete next[field.name]);
        return next;
      });
      setRecipientMessage('Enter new recipient details below.');
      return;
    }
    setTransferForm((current) => ({ ...current, ...recipient.recipient_details }));
    setRecipientMessage(`${recipient.label} details loaded.`);
  }

  async function saveRecipient() {
    if (!supabase || !transfer || !applicationId) return;
    const details = Object.fromEntries(transfer.fields.map((field) => [field.name, transferForm[field.name] || '']));
    if (Object.values(details).some((value) => !String(value).trim())) {
      setRecipientError('Complete the recipient details before saving them.');
      return;
    }

    const label = details.recipientName || details.cashTag || details.paypalEmail || details.serviceName || details.bankName || transfer.name;
    setSavingRecipient(true);
    setRecipientError('');
    setRecipientMessage('');
    try {
      const { data, error: saveError } = await supabase
        .from('saved_transfer_recipients')
        .insert({ user_id: userId, provider, label: String(label).trim().slice(0, 100), recipient_details: details })
        .select('id, provider, label, recipient_details, created_at')
        .single();
      if (saveError) throw new Error(saveError.message);
      setSavedRecipients((current) => [data, ...current]);
      setSelectedRecipientId(data.id);
      setRecipientMessage('Recipient details saved to your account for later use.');
      try {
        await logAccountActivity('recipient_saved', `Saved recipient details for ${transfer.name}.`);
      } catch (activityError) {
        setRecipientError(activityError instanceof Error ? `Recipient saved, but its account notification could not be recorded: ${activityError.message}` : 'Recipient saved, but its account notification could not be recorded.');
      }
    } catch (saveError) {
      setRecipientError(saveError instanceof Error ? saveError.message : 'Recipient details could not be saved.');
    } finally {
      setSavingRecipient(false);
    }
  }

  async function removeSavedRecipient() {
    if (!supabase || !selectedRecipientId) return;
    const recipient = savedRecipients.find((candidate) => candidate.id === selectedRecipientId);
    if (!recipient || !window.confirm(`Remove saved recipient “${recipient.label}”?`)) return;
    setSavingRecipient(true);
    setRecipientError('');
    setRecipientMessage('');
    try {
      const { error: deleteError } = await supabase
        .from('saved_transfer_recipients')
        .delete()
        .eq('id', selectedRecipientId);
      if (deleteError) throw new Error(deleteError.message);
      setSavedRecipients((current) => current.filter((candidate) => candidate.id !== selectedRecipientId));
      setSelectedRecipientId('');
      setRecipientMessage('Saved recipient removed.');
      try {
        await logAccountActivity('recipient_deleted', `Removed saved recipient details for ${transfer.name}.`);
      } catch (activityError) {
        setRecipientError(activityError instanceof Error ? `Recipient removed, but its account notification could not be recorded: ${activityError.message}` : 'Recipient removed, but its account notification could not be recorded.');
      }
    } catch (deleteError) {
      setRecipientError(deleteError instanceof Error ? `Saved recipient could not be removed. ${deleteError.message}` : 'Saved recipient could not be removed.');
    } finally {
      setSavingRecipient(false);
    }
  }

  function updateTransferField(name, value) {
    setTransferForm((current) => ({ ...current, [name]: value }));
  }

  async function openTransferPreview(event) {
    event.preventDefault();
    setFormError('');
    const amount = Number(transferForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter a transfer amount greater than zero.');
      return;
    }
    if (amount > availableBalance) {
      setFormError(`The amount exceeds your available balance of ${new Intl.NumberFormat('en-JM', { style: 'currency', currency: 'JMD', maximumFractionDigits: 0 }).format(availableBalance)}.`);
      return;
    }

    if (!applicationId) {
      setFormError('A loan application is required to create a transfer preview.');
      return;
    }

    setPreviewSaving(true);
    try {
      const recipientDetails = Object.fromEntries(transfer.fields.map((field) => [field.name, transferForm[field.name] || '']));
      const { data: transferId, error: previewError } = await supabase.rpc('create_demo_transfer_preview', {
        p_application_id: applicationId,
        p_provider: provider,
        p_amount: amount,
        p_recipient_details: recipientDetails,
      });
      if (previewError) throw new Error(previewError.message);
      const draft = { id: transferId, provider, amount, details: { ...transferForm } };
      setPreview(draft);
      setToast('Transfer preview ready. No money has been sent.');
    } catch (previewError) {
      setFormError(`The transfer preview could not be saved. ${previewError instanceof Error ? previewError.message : 'Please try again.'}`);
    } finally {
      setPreviewSaving(false);
    }
  }

  function editTransfer() {
    setPreview(null);
  }

  if (loading) return <main className="container dashboard-loading" aria-live="polite">Checking your account…</main>;

  return (
    <>
      <a className="skip-link" href="#main">Skip to transfer details</a>
      <header className="site-header dashboard-header">
        <div className="container nav-wrap">
          <a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src={brandLogo} alt="Upstart Ltd · Loans" /></a>
          <button
            className="dashboard-header-menu"
            type="button"
            aria-label={menuOpen ? 'Close dashboard navigation' : 'Open dashboard navigation'}
            aria-controls="transfer-sidebar"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg className="dashboard-menu-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            <svg className="dashboard-menu-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
          <nav className="dashboard-nav" aria-label="Account navigation">
            <span className="dashboard-account-email">{email}</span>
            <button className="button button-quiet" type="button" onClick={signOut}>Log out</button>
          </nav>
        </div>
      </header>
      <main id="main" className="dashboard-main">
        <div className="dashboard-shell">
          <aside id="transfer-sidebar" className={`dashboard-sidebar${menuOpen ? ' is-open' : ''}`} aria-label="Dashboard sidebar">
            <p className="dashboard-sidebar-label">My account</p>
            <nav className="dashboard-sidebar-nav" aria-label="Dashboard sections">
              <a href="./application.html?view=dashboard"><span className="sidebar-nav-icon" aria-hidden="true">⌂</span>Overview</a>
              <a href="./application.html?view=dashboard#application"><span className="sidebar-nav-icon" aria-hidden="true">▤</span>Loan application</a>
              <a href={transferNavigationHref} aria-current="page"><span className="sidebar-nav-icon" aria-hidden="true">⇄</span>Transfer</a>
              <a href="./application.html?view=dashboard#recent-activities"><span className="sidebar-nav-icon" aria-hidden="true">◷</span>Recent activities</a>
              <a href="./application.html?view=history"><span className="sidebar-nav-icon" aria-hidden="true">▧</span>History</a>
              <a href="./application.html?view=profile"><span className="sidebar-nav-icon" aria-hidden="true">◉</span>My profile</a>
            </nav>
            <div className="dashboard-sidebar-help"><span>Need a hand?</span><p>Our team is here to help with your account.</p><a href="./index.html#approach">Contact Upstart <span aria-hidden="true">↗</span></a></div>
          </aside>
          <section className="dashboard-content transfer-page-content">
            <Toast message={toast} onDismiss={() => setToast('')} />
            {error && <p className="account-message" role="alert">{error}</p>}
            {preview && transferOptions[preview.provider] ? (
              <>
                <button className="transfer-back-link transfer-back-button" type="button" onClick={editTransfer}>← Edit transfer details</button>
                <article className="transfer-preview-card">
                  <span className="transfer-detail-icon" aria-hidden="true">{transferOptions[preview.provider].icon}</span>
                  <p className="dashboard-panel-kicker">Transfer preview</p>
                  <h1>Review your transfer</h1>
                  <div className="transfer-preview-amount">
                    <span>Transfer amount</span>
                    <strong>{new Intl.NumberFormat('en-JM', { style: 'currency', currency: 'JMD', maximumFractionDigits: 2 }).format(preview.amount)}</strong>
                  </div>
                  <dl className="transfer-preview-details">
                    <div><dt>Transfer type</dt><dd>{transferOptions[preview.provider].name}</dd></div>
                    {transferOptions[preview.provider].fields.map((field) => (
                      <div key={field.name}><dt>{field.label}</dt><dd>{preview.details[field.name]}</dd></div>
                    ))}
                    <div><dt>Available balance</dt><dd>{new Intl.NumberFormat('en-JM', { style: 'currency', currency: 'JMD', maximumFractionDigits: 2 }).format(availableBalance)}</dd></div>
                    <div><dt>Balance after preview</dt><dd>{new Intl.NumberFormat('en-JM', { style: 'currency', currency: 'JMD', maximumFractionDigits: 2 }).format(availableBalance - preview.amount)}</dd></div>
                  </dl>
                  <p className="transfer-safety-note">This transfer will be submitted as processing.</p>
                  {!firstSerialState.ready && (
                    <p className="account-notice" role={firstSerialState.error ? 'alert' : 'status'}>
                      <strong>{firstSerialState.error ? 'Setup unavailable' : 'Setup incomplete'}</strong>
                      <span>{firstSerialState.error || 'An administrator must approve the transfer before you can continue.'}</span>
                    </p>
                  )}
                  <div className="transfer-preview-actions">
                    <button className="button button-quiet" type="button" onClick={editTransfer}>Edit details</button>
                    {firstSerialState.ready && preview.id ? (
                      <a className="button button-dark" href={`./application.html?view=transfer-serial&provider=${encodeURIComponent(preview.provider)}&transfer_id=${encodeURIComponent(preview.id)}`}>Continue to serial entry</a>
                    ) : (
                      <button className="button button-dark" type="button" disabled>Continue to serial entry</button>
                    )}
                  </div>
                </article>
              </>
            ) : transfer ? (
              <>
                <a className="transfer-back-link" href="./application.html?view=transfer">← Back to transfers</a>
                <article className="transfer-detail-card">
                  <span className="transfer-detail-icon" aria-hidden="true">{transfer.icon}</span>
                  <p className="dashboard-panel-kicker">Transfer service</p>
                  <h1>{transfer.name}</h1>
                  <p className="transfer-detail-description">{transfer.description}</p>
                  <form className="transfer-form" onSubmit={openTransferPreview}>
                    <p className="transfer-balance-note">Available balance: <strong>{new Intl.NumberFormat('en-JM', { style: 'currency', currency: 'JMD', maximumFractionDigits: 2 }).format(availableBalance)}</strong>{processingAmount > 0 && <span> · {new Intl.NumberFormat('en-JM', { style: 'currency', currency: 'JMD', maximumFractionDigits: 2 }).format(processingAmount)} in processing</span>}</p>
                    {savedRecipients.some((recipient) => recipient.provider === provider) && (
                      <section className="transfer-saved-recipients" aria-labelledby="saved-recipients-title">
                        <div className="transfer-saved-recipients-heading">
                          <div>
                            <span className="dashboard-panel-kicker">Saved details</span>
                            <h2 id="saved-recipients-title">Choose a recipient</h2>
                          </div>
                          <button
                            className={`transfer-new-recipient${selectedRecipientId ? '' : ' is-selected'}`}
                            type="button"
                            aria-pressed={!selectedRecipientId}
                            onClick={() => applySavedRecipient('')}
                          >
                            Enter new details
                          </button>
                        </div>
                        <div className="transfer-saved-recipient-list">
                          {savedRecipients.filter((recipient) => recipient.provider === provider).map((recipient) => {
                            const selected = selectedRecipientId === recipient.id;
                            return (
                              <article className={`transfer-saved-recipient${selected ? ' is-selected' : ''}`} key={recipient.id}>
                                <div className="transfer-saved-recipient-top">
                                  <div>
                                    <h3>{recipient.label}</h3>
                                    {recipient.recipient_details?.bankName && <span>{recipient.recipient_details.bankName}</span>}
                                  </div>
                                  {selected && <span className="transfer-recipient-selected">Selected</span>}
                                </div>
                                <div className="transfer-saved-recipient-actions">
                                  <button
                                    className={selected ? 'button button-quiet' : 'button button-dark'}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => applySavedRecipient(recipient.id)}
                                  >
                                    {selected ? 'Recipient selected' : 'Use this recipient'}
                                  </button>
                                  {selected && (
                                    <button className="button button-quiet transfer-recipient-remove" type="button" onClick={removeSavedRecipient} disabled={savingRecipient}>
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                        {recipientMessage && <p className="transfer-saved-recipient-message" role="status">{recipientMessage}</p>}
                      </section>
                    )}
                    <label className="transfer-form-field">
                      <span>Transfer amount (JMD)</span>
                      <input type="number" min="0.01" max={availableBalance} step="0.01" required value={transferForm.amount || ''} onChange={(event) => updateTransferField('amount', event.target.value)} />
                    </label>
                    {!selectedRecipientId && transfer.fields.map((field) => (
                      <label className="transfer-form-field" key={field.name}>
                        <span>{field.label}</span>
                        {field.type === 'select' ? (
                          <select name={field.name} required value={transferForm[field.name] || ''} onChange={(event) => updateTransferField(field.name, event.target.value)}>
                            <option value="" disabled>Select account type</option>
                            {field.options.map((option) => <option value={option.toLowerCase()} key={option}>{option}</option>)}
                          </select>
                        ) : (
                          <input type={field.type} name={field.name} autoComplete={field.autoComplete} required value={transferForm[field.name] || ''} onChange={(event) => updateTransferField(field.name, event.target.value)} />
                        )}
                      </label>
                    ))}
                    {!selectedRecipientId && transfer.fields.some((field) => String(transferForm[field.name] || '').trim()) && (
                      <section className="transfer-recipient-summary" aria-labelledby="recipient-summary-title" aria-live="polite">
                        <div>
                          <span className="dashboard-panel-kicker">Review</span>
                          <h2 id="recipient-summary-title">Details entered</h2>
                        </div>
                        <dl>
                          {transfer.fields.map((field) => {
                            const value = String(transferForm[field.name] || '').trim();
                            if (!value) return null;
                            const displayValue = field.type === 'select'
                              ? field.options.find((option) => option.toLowerCase() === value.toLowerCase()) || value
                              : value;
                            return (
                              <div key={field.name}>
                                <dt>{field.label}</dt>
                                <dd>{displayValue}</dd>
                              </div>
                            );
                          })}
                        </dl>
                      </section>
                    )}
                    {!selectedRecipientId && (
                      <div className="transfer-recipient-save">
                        <button className="button button-quiet" type="button" onClick={saveRecipient} disabled={savingRecipient}>
                          {savingRecipient ? 'Saving recipient…' : 'Save recipient details'}
                        </button>
                        {recipientMessage && <p role="status">{recipientMessage}</p>}
                        {recipientError && <p role="alert">{recipientError}</p>}
                      </div>
                    )}
                    {formError && <p className="account-message" role="alert">{formError}</p>}
                    <p className="transfer-safety-note">Recipient details are saved with this transfer for its confirmation and history. They are saved for reuse only when you choose “Save recipient details.” No real funds move.</p>
                    <button className="button button-dark" type="submit" disabled={previewSaving}>{previewSaving ? 'Preparing preview…' : 'Preview transfer'}</button>
                  </form>
                </article>
              </>
            ) : (
              <>
                <div className="dashboard-page-heading">
                  <div><p className="dashboard-panel-kicker">Move money</p><h1>Transfer</h1><p>Choose a transfer destination to review its details.</p></div>
                </div>
                {/* <p className="dashboard-transfer-note">Transfers are not available yet. These options are informational previews.</p> */}
                <div className="dashboard-transfer-grid transfer-page-options">
                  {Object.entries(transferOptions).map(([key, option]) => (
                    <a className="dashboard-transfer-option" href={`./application.html?view=transfer&provider=${key}`} key={key}>
                      <span className="dashboard-transfer-icon" aria-hidden="true">{option.icon}</span>
                      <div><h2>{option.name}</h2><p>{option.description}</p></div>
                    </a>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
      <footer className="site-footer dashboard-footer"><div className="container footer-inner"><a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src={brandLogo} alt="Upstart Ltd · Loans" /></a><p className="footer-copy">Transfers are for display only; no real funds move.</p></div></footer>
    </>
  );
}

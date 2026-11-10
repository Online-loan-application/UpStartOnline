import { useEffect } from 'react';

export default function ApplicationPage() {
  useEffect(() => {
    void import('../application.js');
    void import('../motion.js');
  }, []);

  return (
    <>
      
  <a className="skip-link" href="#main">Skip to application</a>
  <header className="site-header" id="top">
    <div className="container nav-wrap">
      <a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src="./assets/upstart-logo-blended.png" alt="Upstart Ltd · Loans" /></a>
      <nav className="nav-links" id="primary-nav" aria-label="Primary navigation"><a href="./index.html#how">How it works</a><a href="./index.html#options">Loan options</a><a href="./index.html#approach">Our approach</a><a href="./application.html" aria-current="page">Application</a></nav>
      <a className="button button-primary nav-cta" href="./index.html#estimate">Estimator</a>
      <button className="menu-toggle" id="menu-toggle" type="button" aria-label="Open navigation" aria-controls="primary-nav" aria-expanded="false"><svg className="menu-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 8h16M4 16h16"></path></svg><svg className="menu-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg></button>
    </div>
  </header>

  <main id="main">
    <section className="application-hero" aria-labelledby="application-title">
      <div className="container hero-grid">
        <div><p className="eyebrow">Loan application · Jamaica</p><h1 className="display" id="application-title">Let’s plan your next chapter.</h1></div>
        <div className="hero-note"><strong>Secure application</strong><p>Complete your details and sign in to submit your application directly to Upstart.</p></div>
      </div>
    </section>

    <section className="application-area" aria-label="Loan application form">
      <div className="container application-layout">
        <div className="application-card" data-intro>
          <form id="application-form">
            <div className="progress-track" aria-hidden="true"><span id="progress-bar"></span></div>
            <ol className="progress-steps" aria-label="Application progress">
              <li className="is-active" data-indicator="1" aria-current="step"><span className="step-dot">1</span><span>About you</span></li>
              <li data-indicator="2"><span className="step-dot">2</span><span>Your finances</span></li>
              <li data-indicator="3"><span className="step-dot">3</span><span>Review</span></li>
            </ol>

            <section className="form-step" data-step="1" aria-labelledby="step-1-title">
              <div className="step-heading"><span className="step-kicker">Step 1 of 3</span><h2 id="step-1-title" tabIndex="-1">First, a little about you.</h2><p>Enter your contact details so we can review your application.</p></div>
              <div className="fields">
                <div className="field"><label htmlFor="first-name">First name <span className="required">*</span></label><input id="first-name" name="firstName" type="text" autoComplete="given-name" minLength="2" required placeholder="Your first name" /></div>
                <div className="field"><label htmlFor="last-name">Last name <span className="required">*</span></label><input id="last-name" name="lastName" type="text" autoComplete="family-name" minLength="2" required placeholder="Your last name" /></div>
                <div className="field"><label htmlFor="email">Email address <span className="required">*</span></label><input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></div>
                <div className="field"><label htmlFor="phone">Phone number <span className="required">*</span></label><input id="phone" name="phone" type="tel" autoComplete="tel" required pattern="[0-9+ \(\)\- ]{10,}" title="Enter at least 10 digits or a valid phone number" placeholder="+1 876 555 0123" /><span className="field-hint">Jamaican or international format</span></div>
                <div className="field field-full"><label htmlFor="address">Street address <span className="required">*</span></label><input id="address" name="address" type="text" autoComplete="street-address" minLength="5" maxLength="160" required placeholder="Street address and apartment number, if applicable" /></div>
                <div className="field field-full"><label htmlFor="parish">Parish <span className="required">*</span></label><select id="parish" name="parish" required><option value="">Select your parish</option><option>Kingston</option><option>St. Andrew</option><option>St. Thomas</option><option>Portland</option><option>St. Mary</option><option>St. Ann</option><option>Trelawny</option><option>St. James</option><option>Hanover</option><option>Westmoreland</option><option>St. Elizabeth</option><option>Manchester</option><option>Clarendon</option><option>St. Catherine</option></select></div>
              </div>
              <div className="form-actions"><button className="button button-dark" type="button" data-next="2">Continue to finances <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"></path></svg></button></div>
              <p className="form-privacy">Required fields are marked *. Your application is submitted after you sign in.</p>
            </section>

            <section className="form-step" data-step="2" aria-labelledby="step-2-title" hidden>
              <div className="step-heading"><span className="step-kicker">Step 2 of 3</span><h2 id="step-2-title" tabIndex="-1">Shape the loan around your plans.</h2><p>Your estimator selections are already here when available.</p></div>
              <div className="fields">
                <div className="field"><label htmlFor="loan-amount">Loan amount <span className="required">*</span></label><div className="money-field"><span>J$</span><input id="loan-amount" name="amount" type="number" min="100000" max="5000000" step="50000" defaultValue="1500000" required /></div><span className="field-hint">J$100,000 to J$5,000,000</span></div>
                <div className="field"><label htmlFor="loan-term">Repayment term <span className="required">*</span></label><select id="loan-term" name="term" defaultValue="36" required><option value="24">24 months</option><option value="36">36 months</option><option value="48">48 months</option><option value="60">60 months</option></select></div>
                <div className="field"><label htmlFor="loan-purpose">Loan purpose <span className="required">*</span></label><select id="loan-purpose" name="purpose" required><option value="">Select a purpose</option><option>Debt consolidation</option><option>Home improvement</option><option>Vehicle repair or purchase</option><option>Education</option><option>Medical expense</option><option>Family or special event</option><option>Business expense</option><option>Other</option></select></div>
                <div className="field"><label htmlFor="employment">Employment status <span className="required">*</span></label><select id="employment" name="employment" required><option value="">Select your status</option><option>Employed full-time</option><option>Employed part-time</option><option>Self-employed</option><option>Contract or gig work</option><option>Retired</option><option>Not currently employed</option></select></div>
                <div className="field"><label htmlFor="bank">Bank name <span className="required">*</span></label><input id="bank" name="bank" type="text" minLength="2" maxLength="80" required placeholder="e.g. National Commercial Bank" /><span className="field-hint">Bank name only—no account number needed</span></div>
                <div className="field"><label htmlFor="monthly-income">Monthly income <span className="required">*</span></label><div className="money-field"><span>J$</span><input id="monthly-income" name="income" type="number" min="0" step="1000" required placeholder="0" /></div></div>
                <div className="field"><label htmlFor="pay-date">Preferred first pay date <span className="required">*</span></label><input id="pay-date" name="payDate" type="date" required /><span className="field-hint">Choose a date that fits your monthly budget</span></div>
              </div>
              <div className="form-actions"><button className="button button-quiet" type="button" data-back="1">Back</button><button className="button button-dark" type="button" data-next="3">Review application <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"></path></svg></button></div>
              <p className="form-privacy">No credit check is performed.</p>
            </section>

            <section className="form-step" data-step="3" aria-labelledby="step-3-title" hidden>
              <div className="step-heading"><span className="step-kicker">Step 3 of 3</span><h2 id="step-3-title" tabIndex="-1">Check everything looks right.</h2><p>Review your details before submitting your application to Upstart.</p></div>
              <div className="review-section"><h3>About you</h3><dl className="review-list"><div className="review-row"><dt>Name</dt><dd id="review-name">—</dd></div><div className="review-row"><dt>Email</dt><dd id="review-email">—</dd></div><div className="review-row"><dt>Phone</dt><dd id="review-phone">—</dd></div><div className="review-row"><dt>Street address</dt><dd id="review-address">—</dd></div><div className="review-row"><dt>Parish</dt><dd id="review-parish">—</dd></div></dl></div>
              <div className="review-section"><h3>Your finances</h3><dl className="review-list"><div className="review-row"><dt>Loan amount</dt><dd id="review-amount">—</dd></div><div className="review-row"><dt>Repayment term</dt><dd id="review-term">—</dd></div><div className="review-row"><dt>Estimated monthly repayment</dt><dd id="review-payment">—</dd></div><div className="review-row"><dt>Purpose</dt><dd id="review-purpose">—</dd></div><div className="review-row"><dt>Employment</dt><dd id="review-employment">—</dd></div><div className="review-row"><dt>Bank</dt><dd id="review-bank">—</dd></div><div className="review-row"><dt>Monthly income</dt><dd id="review-income">—</dd></div><div className="review-row"><dt>Preferred first pay date</dt><dd id="review-pay-date">—</dd></div></dl></div>
              <label className="consent" htmlFor="application-consent"><input id="application-consent" name="consent" type="checkbox" required /><span>I confirm that the information provided is accurate and consent to Upstart receiving and reviewing my application.</span></label>
              <div className="form-actions"><button className="button button-quiet" type="button" data-back="2">Back</button><button className="button button-dark" type="submit">Continue to secure submission <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m5 12h14m-5-5 5 5-5 5"></path></svg></button></div>
            </section>
          </form>

        </div>

        <aside className="loan-summary" aria-labelledby="summary-title" data-intro>
          <span className="summary-kicker">Your loan summary</span><h2 id="summary-title">A plan in the making.</h2><div className="summary-amount" id="side-amount">J$1,500,000</div><div className="summary-label">Requested amount in Jamaican dollars</div>
          <div className="summary-meta"><div><span>Estimated monthly repayment</span><strong id="side-payment">J$53,107</strong></div><div><span>Repayment term</span><strong id="side-term">36 months</strong></div><div><span>Purpose</span><strong id="side-purpose">Not selected</strong></div><div><span>First pay date</span><strong id="side-pay-date">Not selected</strong></div></div>
          <p className="summary-note"><strong>Estimated repayment.</strong><br />Based on an estimated 16.5% APR. Final rates and approval are subject to review.</p>
        </aside>
      </div>
    </section>
  </main>

  <footer className="site-footer"><div className="container footer-inner"><a className="brand" href="./index.html" aria-label="Upstart Jamaica home"><img className="brand-image" src="./assets/upstart-logo-blended.png" alt="Upstart Ltd · Loans" /></a><p className="footer-copy">Upstart Ltd Jamaica. Estimates are for planning and do not represent loan offers or approvals.</p><nav className="footer-links" aria-label="Footer navigation"><a href="./index.html">Home</a><a href="./index.html#estimate">Estimator</a></nav></div></footer>
  
  

    </>
  );
}

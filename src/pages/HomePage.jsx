import { useEffect } from 'react';
import brandLogo from '../brandAssets.js';

export default function HomePage() {
  useEffect(() => {
    void import('../main.js');
    void import('../motion.js');
  }, []);

  return (
    <>
      
  <a className="skip-link" href="#main">Skip to content</a>

  <div className="splash" id="splash" role="dialog" aria-modal="true" aria-label="Upstart introduction">
    <div className="splash-inner" aria-hidden="true">
      <div className="splash-logo-mask"><img className="splash-logo" src={brandLogo} alt="" /></div>
      <div className="splash-copy-mask"><p className="splash-tagline">Fast, fair financing to lift you higher.</p></div>
      <p className="splash-country">Jamaica</p>
      <div className="splash-line"><span></span></div>
    </div>
    <button className="splash-skip" id="skip-splash" type="button">Skip</button>
  </div>

  <header className="site-header" id="top">
    <div className="container nav-wrap">
      <a className="brand" href="#top" aria-label="Upstart Jamaica home">
        <img className="brand-image" src={brandLogo} alt="Upstart Ltd · Loans" />
      </a>
      <nav className="nav-links" id="primary-nav" aria-label="Primary navigation">
        <a href="#how">How it works</a>
        <a href="#options">Loan options</a>
        <a href="#approach">Our approach</a>
        <a href="./application.html">Application</a>
      </nav>
      <a className="button button-primary nav-cta" href="./application.html">Apply now</a>
      <button className="menu-toggle" id="menu-toggle" type="button" aria-label="Open navigation" aria-controls="primary-nav" aria-expanded="false">
        <svg className="menu-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 8h16M4 16h16"></path></svg>
        <svg className="menu-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>
      </button>
    </div>
  </header>

  <main id="main">
    <section className="hero" aria-labelledby="hero-title">
      <svg className="hero-lines" id="hero-lines" viewBox="0 0 1440 900" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path d="M-100 820C290 610 420 730 720 470S1140 160 1550 240" stroke="currentColor"></path>
        <path d="M-80 870C310 660 460 770 760 510S1160 210 1560 290" stroke="currentColor" opacity=".55"></path>
      </svg>
      <div className="hero-orbit" aria-hidden="true"></div>
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Personal loans · Jamaica</p>
          <h1 className="display" id="hero-title">Credit for <span>your next chapter.</span></h1>
          <p className="hero-intro">Fast, fair financing to lift you higher. Explore clear options shaped around your goals—right here in Jamaica.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#estimate">Check my estimate <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"></path></svg></a>
            <a className="text-link" href="#how"><span>See how it works</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"></path></svg></a>
          </div>
          <p className="hero-note">Explore estimated repayments before you apply. Final terms are subject to review.</p>
        </div>

        <form className="estimate-card" id="estimate" aria-labelledby="estimate-title">
          <div className="estimate-heading">
            <h2 id="estimate-title">Estimate your monthly payment</h2>
            <p>A simple starting point for your plans.</p>
          </div>
          <div className="field-group">
            <div className="field-label-row">
              <label className="field-label" htmlFor="amount">Loan amount</label>
              <output className="amount-output" id="amount-output" htmlFor="amount">J$1,500,000</output>
            </div>
            <input id="amount" name="amount" type="range" min="100000" max="5000000" step="50000" defaultValue="1500000" aria-valuetext="J$1,500,000" />
            <div className="range-labels" aria-hidden="true"><span>J$100,000</span><span>J$5,000,000</span></div>
          </div>
          <fieldset className="field-group" style={{border: '0'}}>
            <legend className="field-label" style={{marginBottom: '12px'}}>Repayment term</legend>
            <div className="term-options">
              <div className="term-option"><input type="radio" name="term" id="term-24" defaultValue="24" /><label htmlFor="term-24">24 mo</label></div>
              <div className="term-option"><input type="radio" name="term" id="term-36" defaultValue="36" defaultChecked /><label htmlFor="term-36">36 mo</label></div>
              <div className="term-option"><input type="radio" name="term" id="term-48" defaultValue="48" /><label htmlFor="term-48">48 mo</label></div>
              <div className="term-option"><input type="radio" name="term" id="term-60" defaultValue="60" /><label htmlFor="term-60">60 mo</label></div>
            </div>
          </fieldset>
          <div className="field-group">
            <label className="field-label" htmlFor="profile" style={{display: 'block', marginBottom: '12px'}}>Credit profile</label>
            <select className="profile-select" id="profile" name="profile" defaultValue="16.5">
              <option value="12.5">Excellent</option>
              <option value="16.5">Good</option>
              <option value="22.5">Fair</option>
              <option value="29.5">Building credit</option>
            </select>
          </div>
          <div className="estimate-output" aria-live="polite">
            <span className="payment-label">Estimated payment</span>
            <strong className="payment-value" id="payment-value">J$53,107<small>/mo</small></strong>
            <span className="apr-line" id="apr-line">16.5% estimated APR</span>
          </div>
          <button className="button button-dark estimate-submit" type="submit">Review my estimate <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"></path></svg></button>
          <p className="estimate-disclaimer">Planning tool only. Not a loan offer, approval, or application.</p>
        </form>
      </div>
    </section>

    <aside className="principles" aria-label="Our lending principles">
      <div className="container principles-grid">
        <div className="principle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.5 2.5L16 9"></path></svg>Clear terms, plainly explained</div>
        <div className="principle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 3v18M3 12h18"></path><circle cx="12" cy="12" r="9"></circle></svg>Options shaped around you</div>
        <div className="principle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 21s8-4.5 8-11a4.5 4.5 0 0 0-8-2.8A4.5 4.5 0 0 0 4 10c0 6.5 8 11 8 11Z"></path></svg>Support with a human touch</div>
      </div>
    </aside>

    <section className="continuous-display" aria-label="Upstart lending principles">
      <div className="continuous-track">
        <div className="continuous-group"><span>Jamaican dollars</span><span>Clear terms</span><span>Your next chapter</span><span>Fast, fair financing</span><span>Made to lift you higher</span></div>
        <div className="continuous-group" aria-hidden="true"><span>Jamaican dollars</span><span>Clear terms</span><span>Your next chapter</span><span>Fast, fair financing</span><span>Made to lift you higher</span></div>
      </div>
    </section>

    <section className="section" id="how" aria-labelledby="how-title">
      <div className="container">
        <div className="section-heading" data-reveal>
          <h2 className="display" id="how-title">From possibility to plan.</h2>
          <p>No maze of fine print. Just a straightforward path from exploring what you need to understanding what comes next.</p>
        </div>
        <div className="steps">
          <article className="step" data-reveal><span className="step-number">01</span><h3>Tell us your goal</h3><p>Choose an amount in Jamaican dollars, a repayment rhythm, and the credit profile that feels closest to yours.</p></article>
          <article className="step" data-reveal data-reveal-delay="80"><span className="step-number">02</span><h3>See the full picture</h3><p>Compare an estimated monthly payment and APR together, so the numbers are easier to understand.</p></article>
          <article className="step" data-reveal data-reveal-delay="160"><span className="step-number">03</span><h3>Move at your pace</h3><p>Adjust your estimate as often as you like. The estimator is separate from the loan application.</p></article>
        </div>
      </div>
    </section>

    <section className="section options" id="options" aria-labelledby="options-title">
      <div className="container">
        <div className="section-heading" data-reveal>
          <h2 className="display" id="options-title">One loan. More room to move.</h2>
          <p>Whatever your next chapter looks like, start with a plan that makes space for it.</p>
        </div>
        <div className="option-tabs" role="tablist" aria-label="Loan purposes">
          <button className="option-tab" id="tab-consolidate" type="button" role="tab" aria-selected="true" aria-controls="panel-consolidate" data-option="consolidate">Consolidate debt</button>
          <button className="option-tab" id="tab-purchase" type="button" role="tab" aria-selected="false" aria-controls="panel-purchase" data-option="purchase" tabIndex="-1">Make a purchase</button>
          <button className="option-tab" id="tab-unexpected" type="button" role="tab" aria-selected="false" aria-controls="panel-unexpected" data-option="unexpected" tabIndex="-1">Handle the unexpected</button>
        </div>
        <div className="option-panel" id="panel-consolidate" role="tabpanel" aria-labelledby="tab-consolidate">
          <div className="option-copy" data-reveal><h3>Bring your balances into one clearer view.</h3><p>Replace multiple due dates with one estimated payment plan, built around an amount and timeline you can adjust.</p><ul className="option-points"><li>One monthly payment to plan around</li><li>A choice of repayment timelines</li><li>Clear total-repayment estimates</li></ul><a className="text-link" href="#estimate"><span>Estimate a consolidation loan</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"></path></svg></a></div>
          <div className="option-art" aria-hidden="true" data-reveal data-reveal-delay="100"><div className="option-art-content"><span className="option-art-label">Many balances</span><strong className="option-art-value">One plan</strong><span className="option-art-caption">A simpler view of what’s next</span></div></div>
        </div>
        <div className="option-panel" id="panel-purchase" role="tabpanel" aria-labelledby="tab-purchase" hidden>
          <div className="option-copy" data-reveal><h3>Make the meaningful purchase feel possible.</h3><p>From a car repair to a family celebration, map the cost into a monthly rhythm before you decide.</p><ul className="option-points"><li>Flexible amounts from J$100,000 to J$5,000,000</li><li>Estimated payments update instantly</li><li>No commitment while you explore</li></ul><a className="text-link" href="#estimate"><span>Estimate a purchase loan</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"></path></svg></a></div>
          <div className="option-art" aria-hidden="true" data-reveal data-reveal-delay="100"><div className="option-art-content"><span className="option-art-label">Your goal</span><strong className="option-art-value">In reach</strong><span className="option-art-caption">A plan built around the moment</span></div></div>
        </div>
        <div className="option-panel" id="panel-unexpected" role="tabpanel" aria-labelledby="tab-unexpected" hidden>
          <div className="option-copy" data-reveal><h3>Be ready when life changes the plan.</h3><p>Explore a practical way to spread home repairs, medical costs, or other unexpected expenses over time.</p><ul className="option-points"><li>Quick, pressure-free exploration</li><li>Several repayment terms to compare</li><li>Plain-language estimate details</li></ul><a className="text-link" href="#estimate"><span>Estimate an expense loan</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"></path></svg></a></div>
          <div className="option-art" aria-hidden="true" data-reveal data-reveal-delay="100"><div className="option-art-content"><span className="option-art-label">The unexpected</span><strong className="option-art-value">Handled</strong><span className="option-art-caption">One clear step at a time</span></div></div>
        </div>
      </div>
    </section>

    <section className="section approach" id="approach" aria-labelledby="approach-title">
      <div className="container approach-grid" data-reveal>
        <p className="eyebrow">Our approach</p>
        <div>
          <h2 className="approach-quote" id="approach-title">A credit score is a number. <span>You’re the whole story.</span></h2>
          <p className="approach-copy">Upstart is designed around a simple idea: financial tools should help people in Jamaica see their options more clearly. That means thoughtful design, understandable Jamaican-dollar estimates, and space to make your own decision.</p>
          <div className="approach-signature">Upstart Ltd · Loans · Jamaica</div>
        </div>
      </div>
    </section>

    <section className="final-cta" aria-labelledby="cta-title">
      <div className="container final-cta-inner" data-reveal>
        <h2 className="display" id="cta-title">Your next step can feel lighter.</h2>
        <p>Take a minute to explore the numbers. No pressure, no application—just a clearer place to begin.</p>
        <a className="button button-primary" href="#estimate">Build my estimate <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"></path></svg></a>
      </div>
    </section>
  </main>

  <footer className="site-footer">
    <div className="container">
      <div className="footer-top">
        <div className="footer-brand">
          <a className="brand" href="#top" aria-label="Upstart Jamaica home"><img className="brand-image" src={brandLogo} alt="Upstart Ltd · Loans" /></a>
          <p>Fast, fair financing to lift you higher. Thoughtful tools for Jamaica and whatever comes next.</p>
        </div>
        <div className="footer-column"><h3>Explore</h3><ul className="footer-links"><li><a href="#how">How it works</a></li><li><a href="#options">Loan options</a></li><li><a href="#approach">Our approach</a></li></ul></div>
        <div className="footer-column"><h3>Information</h3><ul className="footer-links"><li><button type="button" id="legal-open">Legal & privacy</button></li><li><button type="button" id="replay-intro">Replay intro</button></li><li><a href="#estimate">Payment estimator</a></li><li><a href="./application.html">Application page</a></li></ul></div>
      </div>
      <div className="footer-bottom"><p>© <span id="year">2026</span> Upstart Ltd Jamaica. Estimates are in Jamaican dollars and are for planning purposes, not loan offers or approvals.</p><span>Made to lift you higher.</span></div>
    </div>
  </footer>

  <dialog id="estimate-dialog" aria-labelledby="summary-title">
    <div className="dialog-inner">
      <button className="dialog-close" type="button" data-close-dialog aria-label="Close estimate summary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg></button>
      <span className="dialog-kicker">Your planning summary</span>
      <h2 id="summary-title">A clearer view of the numbers.</h2>
      <p>Here’s your estimated payment. Adjust any field in the calculator to explore another scenario.</p>
      <dl className="summary-list">
        <div className="summary-row"><dt>Loan amount (JMD)</dt><dd id="summary-amount">J$1,500,000</dd></div>
        <div className="summary-row"><dt>Repayment term</dt><dd id="summary-term">36 months</dd></div>
        <div className="summary-row"><dt>Estimated APR</dt><dd id="summary-apr">16.5%</dd></div>
        <div className="summary-row"><dt>Estimated monthly payment</dt><dd id="summary-payment">J$53,107</dd></div>
        <div className="summary-row"><dt>Estimated total repayment</dt><dd id="summary-total">J$1,911,837</dd></div>
      </dl>
      <p className="dialog-note">This planning tool provides estimates based on the selected APR and term. It is not a loan offer or approval. Final rates and terms are subject to review.</p>
      <a className="button button-primary" id="summary-apply" href="./application.html">Start an application <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"></path></svg></a>
      <button className="button button-dark" type="button" data-close-dialog>Back to my estimate</button>
    </div>
  </dialog>

  <dialog id="legal-dialog" aria-labelledby="legal-title">
    <div className="dialog-inner">
      <button className="dialog-close" type="button" data-close-dialog aria-label="Close legal information"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg></button>
      <span className="dialog-kicker">The fine print, plainly</span>
      <h2 id="legal-title">Legal & privacy</h2>
      <div className="legal-copy"><p>When you submit a loan application and authenticate your account, your application details are sent to Upstart through Supabase for review.</p><p>The payment estimator runs in your browser and displays Jamaican-dollar amounts. Rates and payments shown are estimates, not offers or approvals. Final terms are subject to review.</p><p>Keep your account password private. Contact Upstart for information about application processing and data retention.</p></div>
      <button className="button button-dark" type="button" data-close-dialog>Got it</button>
    </div>
  </dialog>

  
  

    </>
  );
}

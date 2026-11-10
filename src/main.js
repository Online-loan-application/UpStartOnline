const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Branded splash intro. The complete entrance and exit sequence lasts just under 3 seconds.
const splash = document.querySelector('#splash');
const skipSplash = document.querySelector('#skip-splash');
let splashTimers = [];

function clearSplashTimers() {
  splashTimers.forEach(window.clearTimeout);
  splashTimers = [];
}

const pageRegions = [...document.querySelectorAll('.site-header, main, .site-footer')];
let focusBeforeSplash = null;

function setPageInert(inert) {
  pageRegions.forEach((region) => { region.inert = inert; });
}

function finishSplash() {
  splash.hidden = true;
  splash.classList.remove('is-leaving');
  document.body.classList.remove('splash-active');
  setPageInert(false);
  if (focusBeforeSplash instanceof HTMLElement && focusBeforeSplash !== document.body && focusBeforeSplash.isConnected) {
    focusBeforeSplash.focus({ preventScroll: true });
  }
  focusBeforeSplash = null;
}

function dismissSplash(immediate = false) {
  clearSplashTimers();
  if (!splash || splash.hidden) {
    document.body.classList.remove('splash-active');
    setPageInert(false);
    return;
  }
  if (immediate || reduceMotion.matches) {
    finishSplash();
    return;
  }
  splash.classList.add('is-leaving');
  splashTimers.push(window.setTimeout(finishSplash, 550));
}

function playSplash() {
  if (!splash) return;
  clearSplashTimers();
  if (reduceMotion.matches) {
    dismissSplash(true);
    return;
  }
  focusBeforeSplash = document.activeElement;
  splash.hidden = false;
  splash.classList.remove('is-leaving');
  document.body.classList.add('splash-active');
  setPageInert(true);
  skipSplash.focus({ preventScroll: true });
  const animatedParts = splash.querySelectorAll('.splash-logo, .splash-tagline, .splash-line span');
  animatedParts.forEach((part) => {
    part.style.animation = 'none';
    void part.offsetWidth;
    part.style.removeProperty('animation');
  });
  splashTimers.push(window.setTimeout(() => dismissSplash(), 2400));
}

if (splash) {
  skipSplash.addEventListener('click', () => dismissSplash(true));
  splash.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') dismissSplash(true);
  });
  playSplash();
} else {
  document.body.classList.remove('splash-active');
}

reduceMotion.addEventListener('change', (event) => {
  if (event.matches) dismissSplash(true);
});

document.querySelector('#replay-intro')?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  playSplash();
  skipSplash?.focus({ preventScroll: true });
});

// Responsive navigation with keyboard and outside-click dismissal.
const menuToggle = document.querySelector('#menu-toggle');
const primaryNav = document.querySelector('#primary-nav');

function setMenu(open) {
  if (!menuToggle || !primaryNav) return;
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  primaryNav.classList.toggle('is-open', open);
}

menuToggle?.addEventListener('click', () => {
  setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
});

primaryNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMenu(false));
});

document.addEventListener('click', (event) => {
  if (!primaryNav?.classList.contains('is-open')) return;
  if (!primaryNav.contains(event.target) && !menuToggle.contains(event.target)) setMenu(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && primaryNav?.classList.contains('is-open')) {
    setMenu(false);
    menuToggle.focus();
  }
});

window.matchMedia('(min-width: 821px)').addEventListener('change', (event) => {
  if (event.matches) setMenu(false);
});

// Accessible loan-purpose tabs.
const tabs = [...document.querySelectorAll('[role="tab"][data-option]')];

function activateTab(tab, moveFocus = false) {
  tabs.forEach((item) => {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    const panel = document.querySelector(`#panel-${item.dataset.option}`);
    if (panel) panel.hidden = !active;
  });
  if (moveFocus) tab.focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', (event) => {
    let nextIndex = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex !== null) {
      event.preventDefault();
      activateTab(tabs[nextIndex], true);
    }
  });
});

// Live payment estimate. No values leave the browser.
const estimateForm = document.querySelector('#estimate');
const amountInput = document.querySelector('#amount');
const amountOutput = document.querySelector('#amount-output');
const profileInput = document.querySelector('#profile');
const paymentValue = document.querySelector('#payment-value');
const aprLine = document.querySelector('#apr-line');
const estimateDialog = document.querySelector('#estimate-dialog');
const jamaicanNumber = new Intl.NumberFormat('en-JM', { maximumFractionDigits: 0 });
const currency = { format: (value) => `J$${jamaicanNumber.format(value)}` };
let currentEstimate = null;

function getEstimate() {
  const amount = Number(amountInput.value);
  const term = Number(estimateForm.querySelector('input[name="term"]:checked').value);
  const apr = Number(profileInput.value);
  const monthlyRate = apr / 100 / 12;
  const payment = monthlyRate === 0
    ? amount / term
    : amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -term));
  return { amount, term, apr, payment, total: payment * term };
}

function updateEstimate() {
  currentEstimate = getEstimate();
  const { amount, apr, payment } = currentEstimate;
  amountOutput.textContent = currency.format(amount);
  amountInput.setAttribute('aria-valuetext', currency.format(amount));
  const minimum = Number(amountInput.min);
  const maximum = Number(amountInput.max);
  amountInput.style.setProperty('--range-progress', `${((amount - minimum) / (maximum - minimum)) * 100}%`);
  paymentValue.innerHTML = `${currency.format(payment)}<small>/mo</small>`;
  aprLine.textContent = `${apr.toFixed(1)}% estimated APR`;
}

estimateForm?.addEventListener('input', updateEstimate);
estimateForm?.addEventListener('change', updateEstimate);
estimateForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  updateEstimate();
  const { amount, term, apr, payment, total } = currentEstimate;
  document.querySelector('#summary-amount').textContent = currency.format(amount);
  document.querySelector('#summary-term').textContent = `${term} months`;
  document.querySelector('#summary-apr').textContent = `${apr.toFixed(1)}%`;
  document.querySelector('#summary-payment').textContent = currency.format(payment);
  document.querySelector('#summary-total').textContent = currency.format(total);
  document.querySelector('#summary-apply').href = `./application.html?amount=${amount}&term=${term}`;
  estimateDialog.showModal();
});

if (estimateForm) updateEstimate();

// Native dialogs provide focus trapping and Escape support; backdrop and buttons close too.
document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    const inside = event.clientX >= bounds.left && event.clientX <= bounds.right
      && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    if (!inside) dialog.close();
  });
});

document.querySelector('#legal-open')?.addEventListener('click', () => {
  document.querySelector('#legal-dialog').showModal();
});

// Subtle scroll-linked background movement, disabled for reduced motion.
const heroLines = document.querySelector('#hero-lines');
let scrollFrame = null;

function positionHeroLines() {
  scrollFrame = null;
  if (!heroLines || reduceMotion.matches) return;
  const offset = Math.min(window.scrollY, window.innerHeight) * 0.055;
  heroLines.style.transform = `translate3d(0, ${offset}px, 0)`;
}

window.addEventListener('scroll', () => {
  if (scrollFrame === null) scrollFrame = window.requestAnimationFrame(positionHeroLines);
}, { passive: true });

document.querySelector('#year').textContent = String(new Date().getFullYear());

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Responsive navigation.
const menuToggle = document.querySelector('#menu-toggle');
const primaryNav = document.querySelector('#primary-nav');

function setMenu(open) {
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  primaryNav.classList.toggle('is-open', open);
}

menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
primaryNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('click', (event) => {
  if (!primaryNav.classList.contains('is-open')) return;
  if (!primaryNav.contains(event.target) && !menuToggle.contains(event.target)) setMenu(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && primaryNav.classList.contains('is-open')) {
    setMenu(false);
    menuToggle.focus();
  }
});
window.matchMedia('(min-width: 821px)').addEventListener('change', (event) => {
  if (event.matches) setMenu(false);
});

// Application details are staged in this tab until the applicant signs in.
const form = document.querySelector('#application-form');
const steps = [...form.querySelectorAll('.form-step')];
const indicators = [...form.querySelectorAll('[data-indicator]')];
const progressBar = document.querySelector('#progress-bar');
const amountInput = document.querySelector('#loan-amount');
const termInput = document.querySelector('#loan-term');
const purposeInput = document.querySelector('#loan-purpose');
const payDateInput = document.querySelector('#pay-date');
const numberFormatter = new Intl.NumberFormat('en-JM', { maximumFractionDigits: 0 });
const currency = (value) => `J$${numberFormatter.format(Number(value) || 0)}`;
const estimatedMonthlyRate = 0.165 / 12;
const estimatedPayment = () => {
  const amount = Number(amountInput.value) || 0;
  const term = Number(termInput.value) || 1;
  return amount * estimatedMonthlyRate / (1 - Math.pow(1 + estimatedMonthlyRate, -term));
};
const toDateInput = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const formatPayDate = (value) => value
  ? new Intl.DateTimeFormat('en-JM', { dateStyle: 'long' }).format(new Date(`${value}T12:00:00`))
  : 'Not selected';
const today = new Date();
const defaultPayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
const latestPayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 365);
payDateInput.min = toDateInput(today);
payDateInput.max = toDateInput(latestPayDate);
payDateInput.value = toDateInput(defaultPayDate);
payDateInput.defaultValue = payDateInput.value;
let currentStep = 1;

// Carry estimator selections into the application.
const params = new URLSearchParams(window.location.search);
const requestedAmount = Number(params.get('amount'));
const requestedTerm = params.get('term');
if (Number.isFinite(requestedAmount) && requestedAmount > 0) {
  const clamped = Math.min(5000000, Math.max(100000, requestedAmount));
  amountInput.value = String(Math.round(clamped / 50000) * 50000);
}
if (['24', '36', '48', '60'].includes(requestedTerm)) termInput.value = requestedTerm;

function updateLoanSummary() {
  document.querySelector('#side-amount').textContent = currency(amountInput.value);
  document.querySelector('#side-payment').textContent = currency(estimatedPayment());
  document.querySelector('#side-term').textContent = `${termInput.value} months`;
  document.querySelector('#side-purpose').textContent = purposeInput.value || 'Not selected';
  document.querySelector('#side-pay-date').textContent = formatPayDate(payDateInput.value);
  document.dispatchEvent(new CustomEvent('upstart:summary-update'));
}

function validateStep(stepNumber) {
  const fields = [...form.querySelector(`[data-step="${stepNumber}"]`).querySelectorAll('input, select')];
  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }
  return true;
}

function goToStep(stepNumber, moveFocus = true) {
  currentStep = stepNumber;
  steps.forEach((step) => { step.hidden = Number(step.dataset.step) !== stepNumber; });
  indicators.forEach((indicator) => {
    const number = Number(indicator.dataset.indicator);
    indicator.classList.toggle('is-active', number === stepNumber);
    indicator.classList.toggle('is-complete', number < stepNumber);
    if (number === stepNumber) indicator.setAttribute('aria-current', 'step');
    else indicator.removeAttribute('aria-current');
  });
  progressBar.style.width = `${(stepNumber / 3) * 100}%`;
  if (stepNumber === 3) populateReview();
  if (moveFocus) {
    const heading = document.querySelector(`#step-${stepNumber}-title`);
    heading.focus({ preventScroll: true });
    form.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
  }
  document.dispatchEvent(new CustomEvent('upstart:step-change', { detail: { step: stepNumber } }));
}

function populateReview() {
  const value = (id) => document.querySelector(`#${id}`).value;
  const review = {
    'review-name': `${value('first-name')} ${value('last-name')}`,
    'review-email': value('email'),
    'review-phone': value('phone'),
    'review-address': value('address'),
    'review-parish': value('parish'),
    'review-amount': currency(value('loan-amount')),
    'review-term': `${value('loan-term')} months`,
    'review-payment': currency(estimatedPayment()),
    'review-purpose': value('loan-purpose'),
    'review-employment': value('employment'),
    'review-bank': value('bank'),
    'review-income': currency(value('monthly-income')),
    'review-pay-date': formatPayDate(value('pay-date')),
  };
  Object.entries(review).forEach(([id, text]) => { document.querySelector(`#${id}`).textContent = text; });
}

form.querySelectorAll('[data-next]').forEach((button) => {
  button.addEventListener('click', () => {
    if (validateStep(currentStep)) goToStep(Number(button.dataset.next));
  });
});

form.querySelectorAll('[data-back]').forEach((button) => {
  button.addEventListener('click', () => goToStep(Number(button.dataset.back)));
});

[amountInput, termInput, purposeInput, payDateInput].forEach((field) => {
  field.addEventListener('input', updateLoanSummary);
  field.addEventListener('change', updateLoanSummary);
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!validateStep(3)) return;
  const application = Object.fromEntries(new FormData(form).entries());
  sessionStorage.setItem('upstart.applicationDraft', JSON.stringify(application));
  window.location.href = './application.html?view=account&mode=create';
});

updateLoanSummary();

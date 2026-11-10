const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (!reducedMotion.matches) {
  const entrance = (element, options = {}) => {
    if (!element) return;
    element.animate([
      { opacity: 0, transform: 'translateY(24px) scale(.99)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ], {
      duration: options.duration || 650,
      delay: options.delay || 0,
      easing: 'cubic-bezier(.8,0,.2,1)',
      fill: 'both',
    });
  };

  document.querySelectorAll('[data-intro]').forEach((element, index) => {
    entrance(element, { delay: 100 + index * 110, duration: 750 });
  });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entrance(entry.target, { delay: Number(entry.target.dataset.revealDelay || 0) });
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  document.querySelectorAll('[data-reveal]').forEach((element) => revealObserver.observe(element));

  document.addEventListener('upstart:step-change', (event) => {
    const step = document.querySelector(`[data-step="${event.detail.step}"]`);
    entrance(step, { duration: 420 });
  });

  document.addEventListener('upstart:summary-update', () => {
    const amount = document.querySelector('#side-amount');
    amount?.animate([
      { opacity: 0.55, transform: 'translateY(4px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 220, easing: 'ease-out' });
  });

  document.addEventListener('upstart:confirmation', () => {
    const confirmation = document.querySelector('#confirmation');
    entrance(confirmation, { duration: 600 });
    const icon = document.querySelector('.confirmation-icon');
    icon?.animate([
      { opacity: 0, transform: 'scale(.7) rotate(-12deg)' },
      { opacity: 1, transform: 'scale(1) rotate(0)' },
    ], { duration: 650, delay: 140, easing: 'cubic-bezier(.8,0,.2,1)', fill: 'both' });
  });
}

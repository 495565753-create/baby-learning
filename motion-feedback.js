/* Small, optional motion cues for the static site and Android WebView. */
(function (root) {
  'use strict';

  const document = root.document;
  const reduceMotion = () => root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const lightMode = () => root.navigator?.connection?.saveData === true ||
    /^(slow-2g|2g)$/.test(root.navigator?.connection?.effectiveType || '');
  let previousPage = null;

  function reward() {
    const count = document.getElementById('stars');
    count?.classList?.remove('reward-count-pop');
    count?.classList?.add('reward-count-pop');
    root.setTimeout?.(() => count?.classList?.remove('reward-count-pop'), 420);

    if (reduceMotion() || lightMode() || document.hidden ||
        typeof document.body?.appendChild !== 'function') return;

    document.getElementById('rewardBurst')?.remove();
    const burst = document.createElement('div');
    burst.id = 'rewardBurst';
    burst.className = 'reward-burst';
    burst.setAttribute('aria-hidden', 'true');
    const points = [[-94,-60],[-54,-105],[0,-118],[57,-102],[98,-52],
      [90,40],[42,79],[-41,80],[-91,35]];
    burst.innerHTML = points.map(([x,y], i) =>
      `<span style="--dx:${x}px;--dy:${y}px;--delay:${i * 28}ms">${i % 3 === 0 ? '✦' : '★'}</span>`
    ).join('') + '<b>⭐</b>';
    document.body.appendChild(burst);
    root.setTimeout?.(() => burst.remove(), 900);
  }

  function page(name, container) {
    const changed = previousPage !== null && previousPage !== name;
    previousPage = name;
    if (!changed || reduceMotion() || lightMode() || document.hidden) return;
    container?.firstElementChild?.animate?.([
      { opacity: 0.55, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 210, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  function init() {
    const syncPreferences = () => {
      document.body?.classList?.toggle('motion-lite', lightMode());
      document.body?.classList?.toggle('motion-paused', document.hidden);
    };
    syncPreferences();
    document.addEventListener?.('visibilitychange', syncPreferences);
    root.navigator?.connection?.addEventListener?.('change', syncPreferences);
  }

  root.MOTION = { reward, page };
  init();
})(window);

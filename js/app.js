/* Переключение режимов: карта островов (home.js) ↔ сцена режима.
 *   MG.go(имя)   — открыть режим (вызывает карта)
 *   Режим — объект в MG.modes[имя]: { start(), skip(), stop()? }
 *     start — показать режим (первый раз создаёт задачу), skip — другая задача,
 *     stop  — (необязательно) прибраться при уходе из режима: снять выделение, убрать летающие эффекты.
 */
(() => {
  'use strict';

  const MG = window.MG;

  /* секции режимов: <main class="stage" id="mode-…"> */
  const sections = {};
  document.querySelectorAll('main.stage[id^="mode-"]').forEach((s) => { sections[s.id.slice(5)] = s; });

  let curMode = null;

  /* сколько задач решено в каждом режиме — для значков на карте */
  const solvedEl = document.getElementById('solved');
  if (solvedEl && window.MutationObserver) {
    new MutationObserver(() => {
      const n = parseInt(solvedEl.textContent, 10) || 0;
      if (!curMode || !n) return;
      try {
        const k = `mg.solved.${curMode}`;
        if (n > (+localStorage.getItem(k) || 0)) localStorage.setItem(k, String(n));
      } catch (e) { /* нет хранилища */ }
    }).observe(solvedEl, { childList: true, characterData: true, subtree: true });
  }

  function leaveCurrent() {
    if (MG.active && typeof MG.active.stop === 'function') MG.active.stop();
    MG.active = null;
    curMode = null;
    MG.sweepFx();
  }

  function setHash(h) {
    try { history.replaceState(null, '', `#${h}`); } catch (e) { /* file:// в некоторых браузерах */ }
  }

  function showHome() {
    leaveCurrent();
    Object.values(sections).forEach((s) => { s.hidden = true; });
    MG.home.show();
    setHash('home');
  }

  function activate(name) {
    if (!sections[name] || !MG.modes[name]) name = 'cancel';
    leaveCurrent();
    curMode = name;
    MG.home.hide();
    Object.entries(sections).forEach(([k, s]) => { s.hidden = k !== name; });
    MG.tools.use(name);
    MG.active = MG.modes[name];
    MG.active.start();
    setHash(name);
  }

  document.getElementById('skip').addEventListener('click', () => MG.active && MG.active.skip());
  document.getElementById('home-btn').addEventListener('click', showHome);

  MG.go = activate;
  const h0 = location.hash.slice(1);
  if (sections[h0]) activate(h0); else showHome();
})();

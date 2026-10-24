/* Переключение режимов (вкладки в шапке). */
(() => {
  'use strict';

  const MG = window.MG;
  const tabs = [...document.querySelectorAll('.tab')];
  const groups = [...document.querySelectorAll('.group')];
  const subs = [...document.querySelectorAll('.sub')];
  const groupOf = (mode) => { const t = tabs.find((x) => x.dataset.mode === mode); return t ? t.closest('.sub').dataset.group : null; };

  /* раскрыт ровно один раздел (или ни одного) */
  function openGroup(g) {
    groups.forEach((b) => {
      const on = b.dataset.group === g;
      b.classList.toggle('open', on);
      b.setAttribute('aria-expanded', String(on));
    });
    subs.forEach((s) => s.classList.toggle('open', s.dataset.group === g));
  }
  const sections = {
    cancel: document.getElementById('mode-cancel'),
    factor: document.getElementById('mode-factor'),
    common: document.getElementById('mode-common'),
    big: document.getElementById('mode-big'),
    borrow: document.getElementById('mode-borrow'),
    mixed: document.getElementById('mode-mixed'),
    mul: document.getElementById('mode-mul'),
    div: document.getElementById('mode-div'),
    whole: document.getElementById('mode-whole'),
    mixmd: document.getElementById('mode-mixmd'),
    prop: document.getElementById('mode-prop'),
    shift: document.getElementById('mode-shift'),
    br: document.getElementById('mode-br'),
  };

  let curMode = null;
  /* сколько задач решено в каждом режиме — для значков на карте */
  const solvedEl = document.getElementById('solved');
  if (solvedEl && window.MutationObserver) {
    new MutationObserver(() => {
      const n = parseInt(solvedEl.textContent, 10) || 0;
      if (!curMode || !n) return;
      try { const k = `mg.solved.${curMode}`; if (n > (+localStorage.getItem(k) || 0)) localStorage.setItem(k, String(n)); } catch (e) { /* нет хранилища */ }
    }).observe(solvedEl, { childList: true, characterData: true, subtree: true });
  }

  function showHome() {
    curMode = null;
    Object.values(sections).forEach((s) => { s.hidden = true; });
    MG.home.show();
    try { history.replaceState(null, '', '#home'); } catch (e) { /* file:// */ }
  }

  function activate(name) {
    if (!sections[name]) name = 'cancel';
    curMode = name;
    MG.home.hide();
    tabs.forEach((t) => {
      const on = t.dataset.mode === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    Object.entries(sections).forEach(([k, s]) => { s.hidden = k !== name; });
    const cur = groupOf(name);
    groups.forEach((b) => b.classList.toggle('current', b.dataset.group === cur));
    openGroup(cur);
    MG.tools.use(name);
    MG.active = MG.modes[name];
    MG.active.start();
    try { history.replaceState(null, '', `#${name}`); } catch (e) { /* file:// в некоторых браузерах */ }
  }

  tabs.forEach((t) => t.addEventListener('click', () => activate(t.dataset.mode)));
  groups.forEach((b) => b.addEventListener('click', () => openGroup(b.classList.contains('open') ? null : b.dataset.group)));
  document.getElementById('skip').addEventListener('click', () => MG.active && MG.active.skip());

  MG.go = activate;
  document.getElementById('home-btn').addEventListener('click', showHome);
  const h0 = location.hash.slice(1);
  if (sections[h0]) activate(h0); else showHome();
})();

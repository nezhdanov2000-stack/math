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

  function activate(name) {
    if (!sections[name]) name = 'cancel';
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

  activate(location.hash.slice(1));
})();

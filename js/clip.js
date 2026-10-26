/* Планшет для ручного разбиения числа: после 50 % прогресса кувалда не делит число сама —
 * пользователь вводит два множителя. MG.clip.ask(n, fromEl) → Promise<[a, b] | null>. */
(() => {
  'use strict';
  window.MG = window.MG || {};

  const css = document.createElement('style');
  css.textContent = `
    .clip-ov { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; background: rgba(12,10,28,.5); animation: clFade .2s both; }
    .clip-ov.out { animation: clFadeOut .22s both; }
    .clip { position: relative; width: min(90vw, 360px); padding: 38px 14px 16px; border-radius: 24px; background: linear-gradient(#3b3b41, #26262b); box-shadow: 0 5px 0 #121214, 0 22px 44px rgba(0,0,0,.5), inset 0 0 0 2px rgba(255,255,255,.07); transform-origin: var(--ox, 50%) var(--oy, 30%); animation: clPop .42s cubic-bezier(.3,1.35,.5,1) both; }
    .clip-ov.out .clip { animation: clAway .22s ease-in both; }
    .clip .metal { position: absolute; left: 50%; top: -14px; width: 118px; height: 46px; margin-left: -59px; border-radius: 12px 12px 8px 8px; background: linear-gradient(#f4f4f4, #a9adb4 55%, #d8dade); box-shadow: 0 3px 0 #4a4d55, inset 0 0 0 2px rgba(255,255,255,.55); }
    .clip .metal::before, .clip .metal::after { content: ''; position: absolute; top: 16px; width: 12px; height: 12px; border-radius: 50%; background: radial-gradient(#6b6e76 35%, #c9ccd3 40%); box-shadow: 0 1px 0 #fff; }
    .clip .metal::before { left: 14px; } .clip .metal::after { right: 14px; }
    .clip .paper { position: relative; padding: 18px 12px 14px; border-radius: 8px; background: #fbfbf7 repeating-linear-gradient(#fbfbf7 0 27px, #e4e6ee 27px 28px); box-shadow: inset 0 3px 6px rgba(0,0,0,.12); }
    .clip .top { display: flex; align-items: center; justify-content: center; gap: 12px; font-weight: 900; font-size: 2.4rem; line-height: 1; color: #1d1d1f; }
    .clip .top .hm { width: 54px; height: 54px; transform-origin: 80% 85%; animation: clHit 1.6s ease-in-out infinite; }
    .clip .top .hm svg { width: 100%; height: 100%; }
    .clip .eq { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 18px 0 6px; font-weight: 900; font-size: 1.9rem; color: #1d1d1f; }
    .clip .eq .bx { position: relative; min-width: 62px; height: 68px; padding: 0 8px; box-sizing: border-box; display: grid; place-items: center; border: 3px solid #1d1d1f; border-radius: 10px; background: #fff; font: inherit; font-size: 2.1rem; cursor: pointer; transition: border-color .15s, box-shadow .15s; }
    .clip .eq .bx.on { border-color: #4f6ef0; box-shadow: 0 0 0 4px rgba(79,110,240,.22); }
    .clip .eq .bx.on:empty::after { content: ''; width: 3px; height: 34px; background: #4f6ef0; animation: clCaret 1s steps(1) infinite; }
    .clip .eq .bx.bad { animation: clShake .4s; border-color: #e5483f; }
    .clip .msg { min-height: 1.3em; text-align: center; font-weight: 800; font-size: .85rem; color: #d23a30; }
    .clip .row { display: flex; gap: 12px; align-items: flex-start; justify-content: center; margin-top: 6px; }
    .clip .pad { display: grid; grid-template-columns: repeat(3, 52px); gap: 8px; }
    .clip .k { height: 48px; padding: 0; border: 3px solid #6b2340; border-radius: 8px; background: #fff; color: #3a1424; font-family: inherit; font-weight: 900; font-size: 1.45rem; cursor: pointer; box-shadow: 0 3px 0 #6b2340; -webkit-tap-highlight-color: transparent; transition: transform .08s, box-shadow .08s; }
    .clip .k:active { transform: translateY(3px); box-shadow: 0 0 0 #6b2340; }
    .clip .k.w { grid-column: span 2; }
    .clip .acts { display: grid; gap: 10px; width: 104px; }
    .clip .ok, .clip .no { height: 48px; border: 3px solid #1d1d1f; border-radius: 12px; font-family: inherit; font-weight: 900; font-size: .98rem; cursor: pointer; box-shadow: 0 3px 0 #1d1d1f; transition: transform .08s, box-shadow .08s; }
    .clip .ok { background: #3fbf6d; color: #fff; } .clip .no { background: #fff; color: #1d1d1f; }
    .clip .ok:active, .clip .no:active { transform: translateY(3px); box-shadow: 0 0 0 #1d1d1f; }
    @keyframes clFade { from { opacity: 0; } } @keyframes clFadeOut { to { opacity: 0; } }
    @keyframes clPop { 0% { transform: scale(.2) rotate(-6deg); opacity: 0; } 100% { transform: none; opacity: 1; } }
    @keyframes clAway { to { transform: scale(.3) translateY(-30px); opacity: 0; } }
    @keyframes clHit { 0%, 55%, 100% { transform: rotate(0); } 70% { transform: rotate(-32deg); } 82% { transform: rotate(8deg); } }
    @keyframes clCaret { 50% { opacity: 0; } }
    @keyframes clShake { 20%, 60% { transform: translateX(-6px); } 40%, 80% { transform: translateX(6px); } }
    @media (prefers-reduced-motion: reduce) { .clip, .clip .top .hm { animation: none; } }
  `;
  document.head.append(css);

  function ask(n, fromEl) {
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.className = 'clip-ov';
      const hm = (MG.tools && MG.tools.icon) ? MG.tools.icon('hammer') : '';
      ov.innerHTML = `<div class="clip" role="dialog" aria-label="Впиши два множителя"><div class="metal"></div><div class="paper">
        <div class="top"><span>${n}</span><span class="hm">${hm}</span></div>
        <div class="eq"><span>${n}</span><span>=</span><button class="bx on" type="button" data-i="0" aria-label="Первый множитель"></button><span>×</span><button class="bx" type="button" data-i="1" aria-label="Второй множитель"></button></div>
        <div class="msg"></div>
        <div class="row"><div class="pad">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((d) => `<button class="k" type="button" data-d="${d}">${d}</button>`).join('')}<button class="k w" type="button" data-d="0">0</button><button class="k" type="button" data-d="x" aria-label="Стереть">⌫</button></div>
        <div class="acts"><button class="ok" type="button">принять</button><button class="no" type="button">отменить</button></div></div>
      </div></div>`;
      const board = ov.querySelector('.clip');
      if (fromEl) {
        const r = fromEl.getBoundingClientRect();
        board.style.setProperty('--ox', `${r.left + r.width / 2 - (innerWidth - Math.min(innerWidth * 0.9, 360)) / 2}px`);
        board.style.setProperty('--oy', `${r.top + r.height / 2 - innerHeight * 0.2}px`);
      }
      document.body.append(ov);
      const boxes = [...ov.querySelectorAll('.bx')], msg = ov.querySelector('.msg'), vals = ['', ''];
      let cur = 0, done = false;
      const maxLen = String(n).length;
      const paint = () => boxes.forEach((b, i) => { b.textContent = vals[i]; b.classList.toggle('on', i === cur); });
      const close = (res) => {
        if (done) return; done = true;
        document.removeEventListener('keydown', onKey, true);
        ov.classList.add('out');
        setTimeout(() => ov.remove(), 230);
        resolve(res);
      };
      const type = (d) => {
        msg.textContent = '';
        if (d === 'x') { vals[cur] = vals[cur].slice(0, -1); }
        else if (vals[cur].length < maxLen) { vals[cur] = (vals[cur] + d).replace(/^0+(?=\d)/, ''); }
        paint();
      };
      const submit = () => {
        const a = +vals[0], b = +vals[1];
        let bad = '';
        if (!vals[0] || !vals[1]) bad = 'Впиши оба множителя';
        else if (a < 2 || b < 2) bad = 'Множители должны быть больше 1';
        else if (a * b !== n) bad = `${a} × ${b} = ${a * b}, а нужно ${n}`;
        if (bad) {
          msg.textContent = bad;
          boxes.forEach((x) => { x.classList.remove('bad'); void x.offsetWidth; x.classList.add('bad'); });
          return;
        }
        close([a, b]);
      };
      function onKey(e) {
        if (/^\d$/.test(e.key)) { type(e.key); e.preventDefault(); }
        else if (e.key === 'Backspace') { type('x'); e.preventDefault(); }
        else if (e.key === 'Enter') { submit(); e.preventDefault(); }
        else if (e.key === 'Escape') { close(null); e.preventDefault(); }
        else if (e.key === 'Tab') { cur = 1 - cur; paint(); e.preventDefault(); }
        e.stopPropagation();
      }
      document.addEventListener('keydown', onKey, true);
      boxes.forEach((b, i) => b.addEventListener('click', () => { cur = i; paint(); }));
      ov.querySelectorAll('.k').forEach((k) => k.addEventListener('click', () => type(k.dataset.d)));
      ov.querySelector('.ok').addEventListener('click', submit);
      ov.querySelector('.no').addEventListener('click', () => close(null));
      ov.addEventListener('pointerdown', (e) => { if (e.target === ov) close(null); });
      paint();
    });
  }

  /* тестовый переключатель: ручное разбиение сразу, без 50 % прогресса */
  const KEYT = 'mg.test.manual';
  const forced = () => { try { return localStorage.getItem(KEYT) === '1'; } catch (e) { return false; } };
  const setForced = (v) => { try { localStorage.setItem(KEYT, v ? '1' : '0'); } catch (e) { /* нет хранилища */ } };
  /* ручной режим: включён тестовой кнопкой или прогресс дошёл до 50 % (4 решённые задачи) */
  const isManual = () => forced() || (parseInt((document.getElementById('solved') || {}).textContent, 10) || 0) >= 4;

  MG.clip = { ask, forced, setForced, isManual };
})();

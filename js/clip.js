/* Планшет для ручного разбиения числа: после 50 % прогресса кувалда не делит число сама —
 * пользователь вводит два множителя. MG.clip.ask(n, fromEl) → Promise<[a, b] | null>. */
(() => {
  'use strict';
  window.MG = window.MG || {};

  const css = document.createElement('style');
  css.textContent = `
    .clip-ov { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; background: rgba(12,10,28,.5); animation: clFade .2s both; }
    .clip-ov.out { animation: clFadeOut .22s both; }
    .clip { position: relative; width: min(90vw, 360px); padding: 38px 14px 16px; border-radius: 24px; background: linear-gradient(#a8744a, #78492a); box-shadow: 0 5px 0 #4a2b15, 0 22px 44px rgba(0,0,0,.45), inset 0 0 0 2px rgba(255,235,200,.18); transform-origin: var(--ox, 50%) var(--oy, 30%); animation: clPop .42s cubic-bezier(.3,1.35,.5,1) both; }
    .clip-ov.out .clip { animation: clAway .22s ease-in both; }
    .clip .metal { position: absolute; left: 50%; top: -14px; width: 118px; height: 46px; margin-left: -59px; border-radius: 12px 12px 8px 8px; background: linear-gradient(#f4f4f4, #a9adb4 55%, #d8dade); box-shadow: 0 3px 0 #4a4d55, inset 0 0 0 2px rgba(255,255,255,.55); }
    .clip .metal::before, .clip .metal::after { content: ''; position: absolute; top: 16px; width: 12px; height: 12px; border-radius: 50%; background: radial-gradient(#6b6e76 35%, #c9ccd3 40%); box-shadow: 0 1px 0 #fff; }
    .clip .metal::before { left: 14px; } .clip .metal::after { right: 14px; }
    .clip .paper { position: relative; padding: 18px 12px 16px; border-radius: 8px; background: #fff8e7 repeating-linear-gradient(#fff8e7 0 27px, #f0dcc0 27px 28px); box-shadow: inset 0 3px 6px rgba(0,0,0,.12); clip-path: polygon(0 0, calc(100% - 56px) 0, calc(100% - 49px) 9px, calc(100% - 41px) 3px, calc(100% - 33px) 15px, calc(100% - 24px) 8px, calc(100% - 15px) 24px, calc(100% - 7px) 17px, 100% 34px, 100% 100%, 0 100%); --pen: #5a463c; --hand: 'Caveat', 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive; font-family: var(--hand); color: var(--pen); }
    .clip .sk { filter: url(#clPencil); }
    .clip .top { display: flex; align-items: center; justify-content: center; gap: 22px; font-weight: 700; font-size: 3.8rem; line-height: 1; }
    .clip .top .hm { width: 54px; height: 54px; transform-origin: 80% 85%; animation: clHit 1.6s ease-in-out infinite; }
    .clip .top .hm svg { width: 100%; height: 100%; }
    .clip .doodle { display: flex; justify-content: center; margin: 2px 0 0; opacity: .9; }
    .clip .doodle svg { width: 120px; height: 14px; }
    .clip .eq { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 14px 0 4px; font-weight: 700; font-size: 3.4rem; line-height: 1; }
    .clip .bx { position: relative; min-width: 64px; height: 68px; padding: 0 8px; box-sizing: border-box; display: grid; place-items: center; border: 2.5px solid var(--pen); border-radius: 22px 17px 24px 16px / 17px 24px 16px 22px; background: rgba(255,255,255,.55); color: #3a2c26; font-family: inherit; font-weight: 700; font-size: 3.5rem; line-height: 1; cursor: pointer; transition: background .15s; -webkit-tap-highlight-color: transparent; }
    .clip .bx::after, .clip .k::after { content: ''; position: absolute; inset: -3px 2px 2px -2px; border: 1.5px solid rgba(90,70,60,.28); border-radius: 22px 18px 24px 17px / 18px 24px 17px 22px; transform: rotate(.7deg); pointer-events: none; }
    .clip .bx.on { border-color: #3d63d9; color: #24409e; background: repeating-linear-gradient(135deg, rgba(61,99,217,.14) 0 1.500px, rgba(255,255,255,.65) 1.500px 6px); }
    .clip .bx.on::after { border-color: rgba(53,86,214,.5); }
    .clip .bx.on:empty::before { content: ''; width: 3px; height: 36px; border-radius: 2px; background: #3556d6; animation: clCaret 1s steps(1) infinite; }
    .clip .bx.bad { animation: clShake .4s; border-color: #d6362d; }
    .clip .msg { min-height: 1.3em; text-align: center; font-weight: 700; font-size: 1.35rem; line-height: 1; color: #d6362d; }
    .clip .pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 8px; padding: 0 6px; }
    .clip .k { position: relative; height: 64px; padding: 0; border: 2.5px solid var(--pen); border-radius: 20px 24px 17px 23px / 23px 17px 24px 20px; background: rgba(255,255,255,.55); color: #3a2c26; font-family: inherit; font-weight: 700; font-size: 3.5rem; line-height: 1; padding: 0 9px 2px 0; cursor: pointer; display: grid; place-items: center; -webkit-tap-highlight-color: transparent; transition: background .1s, transform .1s; }
    .clip .k:nth-child(3n+1) { transform: rotate(-1.2deg); } .clip .k:nth-child(3n+2) { transform: rotate(.8deg); } .clip .k:nth-child(3n) { transform: rotate(-.5deg); }
    .clip .k:active { background: repeating-linear-gradient(135deg, rgba(90,70,60,.2) 0 1.500px, rgba(255,255,255,.55) 1.500px 6px); transform: scale(.95); }
    .clip .k svg { width: 40px; height: 40px; display: block; overflow: visible; }
    .clip .k.go::after { border-color: rgba(42,143,85,.5); }
    .clip .cls { position: absolute; top: 8px; right: 14px; width: 46px; height: 46px; padding: 0; border: 0; background: transparent; cursor: pointer; display: grid; place-items: center; -webkit-tap-highlight-color: transparent; transition: transform .1s; }
    .clip .cls:active { transform: scale(.85); }
    .clip .cls svg { width: 30px; height: 30px; display: block; overflow: visible; }
    .clip .ink2 { opacity: .5; }
    .clip .top .hm { position: relative; }
    .clip .top .hm.swing { animation: clSwing .55s cubic-bezier(.5,0,.6,1) forwards; }
    .clip .top .hm.broke { animation: none; }
    .clip .top .hm.respawn { animation: clRespawn .5s cubic-bezier(.3,1.8,.5,1); }
    .clip .hh { position: absolute; inset: 0; }
    .clip .hh svg { width: 100%; height: 100%; display: block; }
    .clip .hh.a { clip-path: polygon(0 0, 100% 0, 100% 50%, 85% 57%, 70% 46%, 55% 56%, 40% 45%, 25% 55%, 10% 47%, 0 53%); animation: clHalfA .95s cubic-bezier(.4,0,.8,.6) forwards; }
    .clip .hh.b { clip-path: polygon(0 53%, 10% 47%, 25% 55%, 40% 45%, 55% 56%, 70% 46%, 85% 57%, 100% 50%, 100% 100%, 0 100%); animation: clHalfB .95s cubic-bezier(.4,0,.8,.6) forwards; }
    .clip .bang { position: absolute; left: -14px; top: 2px; translate: var(--dx, -60px) var(--dy, 14px); width: 46px; height: 46px; pointer-events: none; animation: clBang .45s ease-out forwards; }
    @keyframes clSwing { 0% { transform: rotate(0); } 34% { transform: rotate(34deg) translate(10px, -8px); } 62%, 100% { transform: translate(var(--dx, -60px), var(--dy, 14px)) rotate(-38deg); } }
    @keyframes clHalfA { 0% { transform: translate(var(--dx, -60px), var(--dy, 14px)) rotate(-38deg); opacity: 1; } 100% { transform: translate(calc(var(--dx, -60px) - 34px), calc(var(--dy, 14px) + 64px)) rotate(-120deg); opacity: 0; } }
    @keyframes clHalfB { 0% { transform: translate(var(--dx, -60px), var(--dy, 14px)) rotate(-38deg); opacity: 1; } 100% { transform: translate(calc(var(--dx, -60px) + 26px), calc(var(--dy, 14px) + 80px)) rotate(50deg); opacity: 0; } }
    @keyframes clJolt { 0% { transform: none; } 18% { transform: translateX(-6px) scale(.9, 1.06) rotate(-4deg); } 45% { transform: translateX(4px) rotate(2deg); } 100% { transform: none; } }
    .clip .top .sk.hit { animation: clJolt .45s ease-out; }
    @keyframes clBang { 0% { transform: scale(.2); opacity: 0; } 30% { opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
    @keyframes clRespawn { 0% { transform: scale(0) rotate(-30deg); } 100% { transform: none; } }
    .so-ov { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 20px; background: rgba(12,10,28,.55); animation: clFade .2s both; }
    .so-ov.out { animation: clFadeOut .22s both; }
    .skip-offer { padding: 20px 18px 18px; width: min(320px, 100%); border: 3px solid #1d1d1f; border-radius: 16px; background: #fff; box-shadow: 0 4px 0 #1d1d1f; text-align: center; font-weight: 700; color: #1d1d1f; animation: clPop .4s cubic-bezier(.3,1.35,.5,1) both; }
    .skip-offer h3 { margin: 0 0 6px; font-size: 1.3rem; font-weight: 900; }
    .skip-offer p { margin: 0 0 16px; font-size: 1rem; line-height: 1.3; }
    .skip-offer .so-row { display: flex; gap: 10px; justify-content: center; }
    .skip-offer button { flex: 1; padding: 11px 10px; border: 3px solid #1d1d1f; border-radius: 12px; font-family: inherit; font-weight: 900; font-size: 1rem; cursor: pointer; box-shadow: 0 3px 0 #1d1d1f; transition: transform .08s, box-shadow .08s; }
    .skip-offer button:active { transform: translateY(3px); box-shadow: 0 0 0 #1d1d1f; }
    .skip-offer .so-go { background: #3fbf6d; color: #fff; } .skip-offer .so-stay { background: #fff; color: #1d1d1f; }
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
      ov.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="clPencil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/></filter></svg>
        <div class="clip" role="dialog" aria-label="Впиши два множителя"><div class="metal"></div><div class="paper">
        <button class="cls" type="button" aria-label="Закрыть"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round"><path class="ink2" pathLength="1" d="M5.500 6.500C9.500 9.500 14 14 19 19.500" stroke="#d6362d" stroke-width="1.400"/><path class="ink" pathLength="1" d="M5 5.500C9 9 14 13.500 18.500 19" stroke="#d6362d" stroke-width="3"/><path class="ink b" pathLength="1" d="M19 5C15 9 10.500 14 5.500 19.500" stroke="#d6362d" stroke-width="3"/></svg></button>
        <div class="top"><span class="sk">${n}</span><span class="hm">${hm}</span></div>
        <div class="sk">
        <div class="doodle"><svg viewBox="0 0 120 14" fill="none" stroke="#c9825b" stroke-width="2" stroke-linecap="round"><path d="M4 8C14 2 22 13 32 7S50 3 60 8 78 12 88 6 106 4 116 8"/></svg></div>
        <div class="eq"><span>${n}</span><span>=</span><button class="bx on" type="button" data-i="0" aria-label="Первый множитель"></button><span>×</span><button class="bx" type="button" data-i="1" aria-label="Второй множитель"></button></div>
        <div class="msg"></div>
        <div class="pad">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((d) => `<button class="k" type="button" data-d="${d}">${d}</button>`).join('')}<button class="k go" type="button" aria-label="Принять"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path class="ink2" pathLength="1" d="M4.500 13.500C7 14.500 8.500 16.500 10 19.500 12.500 13 16 8.500 21 5" stroke="#2a8f55" stroke-width="1.400"/><path class="ink" pathLength="1" d="M4 12.500C6.500 13.500 8.500 16 9.800 19 12 12.500 15.500 8 20.500 4.500" stroke="#2a8f55" stroke-width="3.200"/></svg></button><button class="k" type="button" data-d="0">0</button><button class="k er" type="button" data-d="x" aria-label="Стереть"><svg viewBox="0 0 24 24" fill="none" stroke="#5a463c" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5.500 3.500 12 9 18.500H20.500V5.500Z"/><path d="M12.500 9.500 17 14.500M17 9.500 12.500 14.500"/></svg></button></div>
        </div></div></div>`;
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
      const hmEl = ov.querySelector('.hm');
      let breaking = false;
      function breakHammer() {
        if (!hmEl || breaking) return;
        breaking = true;
        const html = hmEl.innerHTML;
        const numEl = ov.querySelector('.top .sk');
        const r1 = hmEl.getBoundingClientRect(), r2 = numEl.getBoundingClientRect();
        hmEl.style.setProperty('--dx', `${Math.round(r2.right - 4 - r1.left - r1.width * 0.38)}px`);
        hmEl.style.setProperty('--dy', `${Math.round(r2.top + r2.height * 0.5 - r1.top - r1.height * 0.3)}px`);
        hmEl.classList.add('swing');
        setTimeout(() => {
          numEl.classList.remove('hit'); void numEl.offsetWidth; numEl.classList.add('hit');
          hmEl.classList.remove('swing');
          hmEl.classList.add('broke');
          hmEl.innerHTML = `<span class="hh a">${html}</span><span class="hh b">${html}</span><svg class="bang" viewBox="0 0 46 46" fill="none" stroke="#e8a21a" stroke-width="3" stroke-linecap="round"><path d="M23 3V12M23 34V43M3 23H12M34 23H43M9 9 15 15M31 31 37 37M37 9 31 15M15 31 9 37"/></svg>`;
        }, 340);
        setTimeout(() => {
          hmEl.innerHTML = html;
          hmEl.classList.remove('broke');
          hmEl.classList.add('respawn');
          setTimeout(() => { hmEl.classList.remove('respawn'); breaking = false; }, 520);
        }, 1500);
      }
      const submit = () => {
        const a = +vals[0], b = +vals[1];
        let bad = '';
        if (!vals[0] || !vals[1]) bad = 'Впиши оба множителя';
        else if (a < 2 || b < 2) bad = 'Множители должны быть больше 1';
        else if (a * b !== n) bad = `${a} × ${b} = ${a * b}, а нужно ${n}`;
        if (bad) {
          msg.textContent = bad;
          if (vals[0] && vals[1]) breakHammer();
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
      ov.querySelectorAll('.k[data-d]').forEach((k) => k.addEventListener('click', () => type(k.dataset.d)));
      ov.querySelector('.go').addEventListener('click', submit);
      ov.querySelector('.cls').addEventListener('click', () => close(null));
      ov.addEventListener('pointerdown', (e) => { if (e.target === ov) close(null); });
      paint();
    });
  }

  /* тестовый переключатель: ручное разбиение сразу, без 50 % прогресса */
  const KEYT = 'mg.test.manual';
  const forced = () => { try { return localStorage.getItem(KEYT) === '1'; } catch (e) { return false; } };
  const setForced = (v) => { try { localStorage.setItem(KEYT, v ? '1' : '0'); } catch (e) { /* нет хранилища */ } };
  /* ручной режим: включён тестовой кнопкой или решено 3 задачи, начиная с 4-й */
  const isManual = () => forced() || (parseInt((document.getElementById('solved') || {}).textContent, 10) || 0) >= 3;

  MG.clip = { ask, forced, setForced, isManual };
})();

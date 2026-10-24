/* Вертолёт с магнитом: иконка инструмента и эффекты полёта.
 *   MG.heli.icon                       — иконка для панели и курсора
 *   MG.heli.spawn(x, y, { size })      — вертолёт (центр в x, y); возвращает управляющий объект:
 *       arrive(x, y)  — прилетает издалека и зависает в (x, y)
 *       moveTo(x, y, ms) — плавно перелетает
 *       lower(len, ms)   — опускает магнит на len пикселей ниже крюка
 *       raise(ms)        — поднимает магнит
 *       place(x, y)      — мгновенно ставит (для перетаскивания), len(px) — длина верёвки
 *       leave()          — улетает и исчезает
 */
(() => {
  'use strict';
  const MG = window.MG;

  const heliSvg = `<svg viewBox="0 0 64 40" stroke-linejoin="round" stroke-linecap="round">
    <rect x="29.5" y="4.4" width="5" height="5.4" fill="#6b7280"/>
    <g class="hel-rotor"><rect x="5" y="1.6" width="54" height="3.6" rx="1.8" fill="#dfe2ea" stroke="#8b90a0" stroke-width=".9"/></g>
    <path d="M42 15.4 L60 11.4 L61 16.6 L43 24.2Z" fill="#fb923c" stroke="#b45309" stroke-width="1.1"/>
    <path d="M56.8 5.6 L61.8 5.6 L61.8 17 L58.2 14.4Z" fill="#f97316" stroke="#b45309" stroke-width="1"/>
    <ellipse cx="29" cy="21" rx="19" ry="12" fill="#fb923c" stroke="#b45309" stroke-width="1.4"/>
    <path d="M13.2 22 Q13.6 13 26.4 12.4 L26.4 25.4 L14.4 25Z" fill="#38bdf8" stroke="#0369a1" stroke-width="1.1"/>
    <path d="M16.6 18.4 Q18.4 15.6 23 15" fill="none" stroke="#e0f2fe" stroke-width="1.3"/>
    <path d="M33 14 Q41 15 44 22" fill="none" stroke="#fdba74" stroke-width="1.4"/>
    <path d="M20 31.4 L19 36 M38.4 31.6 L39.4 36" fill="none" stroke="#e11d48" stroke-width="2"/>
    <path d="M11.4 36.2 H47" fill="none" stroke="#e11d48" stroke-width="2.8"/></svg>`;

  const magnetSvg = `<svg viewBox="0 0 24 28" stroke-linejoin="round">
    <circle cx="12" cy="2.4" r="1.9" fill="none" stroke="#4b5563" stroke-width="1.2"/>
    <path d="M5 21 V12.4 a7 7 0 0 1 14 0 V21" fill="none" stroke="#9f1239" stroke-width="6.6"/>
    <path d="M5 21 V12.4 a7 7 0 0 1 14 0 V21" fill="none" stroke="#f43f5e" stroke-width="5"/>
    <path d="M3.6 13 a8.4 8.4 0 0 1 6.4 -6" fill="none" stroke="#fda4af" stroke-width="1.3" stroke-linecap="round"/>
    <rect x="1.8" y="20.6" width="6.4" height="6.6" fill="#e5e7eb" stroke="#6b7280" stroke-width="1"/>
    <rect x="15.8" y="20.6" width="6.4" height="6.6" fill="#e5e7eb" stroke="#6b7280" stroke-width="1"/></svg>`;

  /* иконка для панели: вертолёт и магнит под ним */
  const icon = `<svg viewBox="0 0 48 48" stroke-linejoin="round" stroke-linecap="round">
    <g transform="translate(1 0) scale(.72)">${heliSvg.replace(/^<svg[^>]*>/, '').replace('</svg>', '')}</g>
    <path d="M24.4 29 V32.6" stroke="#4b5563" stroke-width="1.4" fill="none"/>
    <g transform="translate(17.8 32) scale(.55)">${magnetSvg.replace(/^<svg[^>]*>/, '').replace('</svg>', '')}</g></svg>`;

  const style = document.createElement('style');
  style.textContent = `
    .heli-fx { position: fixed; left: 0; top: 0; z-index: 62; pointer-events: none; will-change: translate; }
    .heli-fx .hel-body { display: block; width: 100%; filter: drop-shadow(0 6px 6px rgba(0, 0, 0, .25)); transform-origin: 50% 60%; }
    .heli-fx .hel-body svg { display: block; width: 100%; height: auto; overflow: visible; }
    .heli-fx .hang { position: absolute; left: 50%; translate: -50% 0; display: flex; flex-direction: column; align-items: center; }
    .heli-fx .hs { width: 2px; background: #4b5563; height: 0; }
    .heli-fx .hm { width: var(--mw); filter: drop-shadow(0 4px 4px rgba(0, 0, 0, .25)); }
    .heli-fx .hm svg { display: block; width: 100%; height: auto; }
    .hel-rotor { transform-box: fill-box; transform-origin: center; animation: helSpin .12s linear infinite alternate; }
    @keyframes helSpin { from { transform: scaleX(1); } to { transform: scaleX(.42); } }
    body[data-tool="heli"] .stage, body[data-tool="heli"] .stage .mx-term { cursor: var(--cur-heli, pointer) !important; }
  `;
  document.head.append(style);

  function spawn(x, y, { size = 96 } = {}) {
    const T = MG.T;
    const W = size;
    const H = (W * 40) / 64;
    const mw = W * 0.3;
    const el = document.createElement('div');
    el.className = 'heli-fx';
    el.style.width = `${W}px`;
    el.innerHTML = `<div class="hel-body">${heliSvg}</div>
      <div class="hang" style="top:${H * 0.9}px;--mw:${mw}px"><div class="hs"></div><div class="hm">${magnetSvg}</div></div>`;
    document.body.append(el);
    const body = el.querySelector('.hel-body');
    const hs = el.querySelector('.hs');

    let cx = x;
    let cy = y;
    let L = 0;
    const put = (px, py) => { cx = px; cy = py; el.style.translate = `${px - W / 2}px ${py - H / 2}px`; };
    put(x, y);
    el.style.opacity = '0';

    let token = 0;
    let cur = null;
    const fly = async (px, py, ms, easing = 'cubic-bezier(.35,.1,.25,1)') => {
      const my = ++token;
      if (cur) {                                  // новый полёт перехватывает старый: стартуем оттуда, где вертолёт сейчас
        const rr = el.getBoundingClientRect();
        cx = rr.left + W / 2; cy = rr.top + H / 2;
        cur.cancel(); cur = null;
      }
      const fx = cx;
      const fy = cy;
      const dir = Math.sign(px - fx) || 1;
      const a = el.animate([
        { translate: `${fx - W / 2}px ${fy - H / 2}px` },
        { translate: `${px - W / 2}px ${py - H / 2}px` },
      ], { duration: T(ms), easing, fill: 'forwards' });
      cur = a;
      body.animate([
        { rotate: '0deg' }, { rotate: `${dir * 9}deg`, offset: 0.35 }, { rotate: `${dir * 9}deg`, offset: 0.65 }, { rotate: '0deg' },
      ], { duration: T(ms), easing: 'ease-in-out' });
      await a.finished.catch(() => {});
      if (my !== token) return;                   // перехвачен новым полётом
      put(px, py);
      a.cancel();
      cur = null;
    };

    const setLen = (n) => { L = n; hs.style.height = `${n}px`; };
    const api = {
      el,
      get x() { return cx; },
      get y() { return cy; },
      get size() { return W; },
      /* точка крюка: откуда начинается верёвка */
      get hookY() { return cy - H / 2 + H * 0.9; },
      get ropeLen() { return L; },
      get magnetH() { return mw * (28 / 24); },
      place(px, py) { el.style.opacity = '1'; put(px, py); },
      len: setLen,
      async arrive(px, py, ms = 800) {
        if (!cur) put(window.innerWidth + W, -H);
        el.style.opacity = '1';
        await fly(px, py, ms, 'cubic-bezier(.2,.8,.25,1)');
      },
      moveTo(px, py, ms = 500) { return fly(px, py, ms); },
      async lower(len, ms = 480) {
        const a = hs.animate([{ height: `${L}px` }, { height: `${len}px` }], { duration: T(ms), easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
        await a.finished.catch(() => {});
        setLen(len);
        a.cancel();
      },
      async raise(ms = 380) {
        const a = hs.animate([{ height: `${L}px` }, { height: '4px' }], { duration: T(ms), easing: 'ease-in', fill: 'forwards' });
        await a.finished.catch(() => {});
        setLen(4);
        a.cancel();
      },
      async leave(ms = 700) {
        await fly(window.innerWidth + W, -H * 1.4, ms, 'cubic-bezier(.5,0,.9,.5)');
        el.remove();
      },
      remove() { el.remove(); },
    };
    return api;
  }

  /* окраска по знаку числа в магните: положительное — чёрный корпус, отрицательное (горящее) — оранжевый */
  function tint(h, neg, anim = true) {
    const svg = h && h.el && h.el.querySelector('.hel-body svg');
    if (!svg) return;
    const ms = anim ? 450 : 0;
    const set = (sel, prop, val) => svg.querySelectorAll(sel).forEach((e) => {
      e.style.transition = ms ? `fill ${MG.T(ms)}ms ease, stroke ${MG.T(ms)}ms ease` : 'none';
      e.style[prop] = neg ? '' : val;
    });
    set('ellipse, path[fill="#fb923c"], path[fill="#f97316"]', 'fill', '#1c1c20');
    set('ellipse, path[fill="#fb923c"], path[fill="#f97316"]', 'stroke', '#050506');
    set('path[stroke="#e11d48"]', 'stroke', '#4b4e57');
    set('path[stroke="#fdba74"]', 'stroke', '#6b7280');
  }

  MG.heli = { icon, svg: heliSvg, magnet: magnetSvg, spawn, tint };
})();

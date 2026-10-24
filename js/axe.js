/* Топор: срубает единицу в знаменателе — и числитель падает, как дерево.
 *   MG.axe.svg                                   — разметка иконки (её берёт tools.js)
 *   MG.axe.chop({ one, num, bar, onLand })       — Promise: удары, единица раскалывается, числитель падает и встаёт
 *       one — элемент единицы в знаменателе, num — строка числителя (row), bar — черта дроби
 */
(() => {
  'use strict';
  const MG = window.MG;
  const rnd = MG.rnd;

  const svg = `<svg viewBox="0 0 48 48" stroke-linejoin="round" stroke-linecap="round">
    <path d="M23 44.4 L23 12" fill="none" stroke="#4a2a10" stroke-width="5.6"/>
    <path d="M23 44.4 L23 12" fill="none" stroke="#b27437" stroke-width="3.6"/>
    <path d="M21.9 43 L21.9 13" fill="none" stroke="#dba66a" stroke-width="1" opacity=".85"/>
    <ellipse cx="23" cy="44.6" rx="3.3" ry="1.7" fill="#9a6130" stroke="#4a2a10" stroke-width="1.2"/>
    <path d="M14 6 L22 6 Q26 6.8 30 4.6 Q35 2 41.4 1.4 L45 2.6 Q47.2 11 44.4 20.4 L41 19 Q35 15.6 30 14.8 L22 14.6 L14 14 Z" fill="#8d99a8" stroke="#2f3946" stroke-width="1.5" stroke-linejoin="miter"/>
    <path d="M44.2 3.8 Q46.2 11 43.4 19.4 L41.6 18.2 Q44.4 11 42.6 4 Z" fill="#f1f5f9" stroke="none"/>
    <path d="M15.6 7.4 L22 7.4 Q26.4 8.2 30.6 5.8 Q35 3.6 40 3" fill="none" stroke="#d5dee8" stroke-width="1"/>
    <path d="M27.4 8 L27.4 13.4 M16.6 8 L16.6 12.6" fill="none" stroke="#515d6c" stroke-width="1" opacity=".5"/></svg>`;

  /* иконка для панели и курсора — повёрнута, как кувалда */
  const icon = svg.replace(/(<svg[^>]*>)/, '$1<g transform="translate(24 24) rotate(40) scale(.78) translate(-24 -24)">').replace('</svg>', '</g></svg>');

  const style = document.createElement('style');
  style.textContent = `
    .axe-fx { position: fixed; left: 0; top: 0; z-index: 61; pointer-events: none;
      filter: drop-shadow(0 5px 6px rgba(0, 0, 0, .28)); }
    .axe-fx svg { display: block; width: 100%; height: 100%; }
    .chip-fx { position: fixed; z-index: 60; pointer-events: none; border-radius: 2px; }
    .half-fx { position: fixed; z-index: 59; pointer-events: none; margin: 0; }
    .dust-fx { position: fixed; z-index: 58; pointer-events: none; border-radius: 50%;
      background: radial-gradient(circle, rgba(150,140,125,.55), rgba(150,140,125,0) 70%); }
  `;
  document.head.append(style);

  const wait = (a) => a.finished.catch(() => {});

  function chips(x, y, n, dir = -1) {
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i');
      c.className = 'chip-fx';
      const w = rnd(5, 11);
      c.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${rnd(3, 5)}px;background:${['#d9a15f', '#c48742', '#e7bd84'][i % 3]}`;
      document.body.append(c);
      const dx = dir * rnd(20, 110) + rnd(-20, 20);
      const dy = rnd(-70, -10);
      c.animate([
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: `translate(${dx * 0.6}px, ${dy}px) rotate(${rnd(-240, 240)}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy + 90}px) rotate(${rnd(-400, 400)}deg)`, opacity: 0 },
      ], { duration: MG.T(rnd(520, 820)), easing: 'cubic-bezier(.3,.6,.5,1)' }).onfinish = () => c.remove();
    }
  }

  function dust(x, y, n, spread) {
    for (let i = 0; i < n; i++) {
      const d = document.createElement('i');
      d.className = 'dust-fx';
      const s = rnd(26, 60);
      d.style.cssText = `left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px`;
      document.body.append(d);
      const dx = rnd(-spread, spread);
      d.animate([
        { transform: 'translate(0,0) scale(.3)', opacity: 0.9 },
        { transform: `translate(${dx}px, ${rnd(-40, -8)}px) scale(1.5)`, opacity: 0 },
      ], { duration: MG.T(rnd(600, 900)), easing: 'ease-out' }).onfinish = () => d.remove();
    }
  }

  function quake(px = 6) {
    document.body.animate([
      { translate: '0 0' }, { translate: `${px}px ${px * 0.5}px` }, { translate: `${-px}px 0` },
      { translate: `${px * 0.5}px ${-px * 0.4}px` }, { translate: '0 0' },
    ], { duration: MG.T(320), easing: 'ease-out' });
  }

  /* единица раскалывается пополам: две половинки разлетаются и падают */
  function splitOne(one) {
    const r = one.getBoundingClientRect();
    const cs = getComputedStyle(one);
    const make = (clip) => {
      const h = one.cloneNode(true);
      h.className = `${one.className} half-fx`;
      Object.assign(h.style, {
        left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`,
        fontSize: cs.fontSize, clipPath: clip, opacity: '1', transform: 'none', scale: '1', translate: 'none',
        filter: 'none', transition: 'none',
      });
      document.body.append(h);
      return h;
    };
    const L = make('polygon(0 0, 52% 0, 44% 50%, 56% 100%, 0 100%)');
    const R = make('polygon(52% 0, 100% 0, 100% 100%, 56% 100%, 44% 50%)');
    one.style.visibility = 'hidden';
    const fall = (el, dx, rot) => el.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, -14px) rotate(${rot * 0.3}deg)`, opacity: 1, offset: 0.3 },
      { transform: `translate(${dx}px, ${r.height * 1.6}px) rotate(${rot}deg)`, opacity: 0 },
    ], { duration: MG.T(720), easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'forwards' });
    const a = fall(L, -r.width * 0.9, -35);
    const b = fall(R, r.width * 0.9, 38);
    return Promise.all([wait(a), wait(b)]).then(() => { L.remove(); R.remove(); });
  }

  async function chop({ one, num, bar }) {
    const T = MG.T;
    const r = one.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(one).fontSize) || 60;
    const size = Math.max(110, fs * 2.5);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height * 0.55;

    // топор: остриё (36, 15 из 48) должно попасть в центр единицы справа; зеркалим, чтобы лезвие смотрело влево
    const ax = document.createElement('div');
    ax.className = 'axe-fx';
    ax.innerHTML = svg;
    ax.firstChild.style.transform = 'scaleX(-1)';
    const bx = (3 / 48) * size;                      // x режущей кромки в зеркальной иконке
    ax.style.cssText = `width:${size}px;height:${size}px;left:${r.right - r.width * 0.12 - bx}px;top:${cy - (10.5 / 48) * size}px;transform-origin:${(1 - 23 / 48) * 100}% ${(44.4 / 48) * 100}%`;
    document.body.append(ax);
    const pose = (rot, dx = 0, dy = 0) => `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;

    // выезжает и замахивается
    await wait(ax.animate([
      { transform: pose(70, size * 0.9, -size * 0.2), opacity: 0 },
      { transform: pose(50, 0, 0), opacity: 1 },
    ], { duration: T(380), easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' }));

    const hitX = r.right - r.width * 0.2;
    const cracks = [];
    for (let k = 0; k < 3; k++) {
      // замах
      await wait(ax.animate([
        { transform: pose(k ? 12 : 50) }, { transform: pose(62) },
      ], { duration: T(k ? 240 : 160), easing: 'ease-out', fill: 'forwards' }));
      // удар
      await wait(ax.animate([
        { transform: pose(62) }, { transform: pose(-3) },
      ], { duration: T(150), easing: 'cubic-bezier(.6,0,1,.6)', fill: 'forwards' }));
      chips(hitX, cy, 7 + k * 3);
      quake(4 + k * 2);
      one.animate([
        { translate: '0 0', rotate: '0deg' },
        { translate: '-9px 0', rotate: '-5deg', offset: 0.3 },
        { translate: '5px 0', rotate: '3deg', offset: 0.65 },
        { translate: '0 0', rotate: '0deg' },
      ], { duration: T(300), easing: 'ease-out' });
      // трещина
      const cr = document.createElement('i');
      cr.className = 'chip-fx';
      const ch = r.height * (0.5 + k * 0.2);
      cr.style.cssText = `left:${hitX - 1 + (k - 1) * 4}px;top:${cy - ch * 0.5}px;width:3px;height:${ch}px;background:#1a1a1a;opacity:.85;transform:rotate(${(k - 1) * 9}deg);border-radius:2px`;
      document.body.append(cr);
      cracks.push(cr);
      await MG.sleep(k === 2 ? 120 : 90);
    }

    // раскалываем единицу, топор отъезжает
    const splitting = splitOne(one);
    cracks.forEach((c) => c.remove());
    ax.animate([
      { transform: pose(-3), opacity: 1 },
      { transform: pose(20, size * 0.5, size * 0.1), opacity: 0 },
    ], { duration: T(420), easing: 'ease-in', fill: 'forwards' }).onfinish = () => ax.remove();
    chips(hitX, cy, 12);
    await MG.sleep(260);

    // числитель падает вправо, как срубленное дерево: ось — правый нижний угол
    // опору срубили: числитель рушится прямо вниз, на место знаменателя
    const nr = num.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    const dy = Math.max(24, (br.top + br.height / 2) - (nr.top + nr.height / 2));   // числитель опускается на уровень черты
    num.style.transformOrigin = '50% 100%';
    const DUR = 1000;
    // черта падает вместе с числителем (у неё нет опоры)
    const barDrop = bar.animate([
      { translate: '0 0' },
      { translate: '-4px 0', offset: 0.05 },
      { translate: '4px -1px', offset: 0.1 },
      { translate: '0 0', offset: 0.16 },
      { translate: `0 ${dy}px`, offset: 0.55, easing: 'ease-out' },
      { translate: `0 ${dy + 4}px`, offset: 0.62 },
      { translate: `0 ${dy - 8}px`, offset: 0.78 },
      { translate: `0 ${dy}px`, offset: 0.9 },
      { translate: `0 ${dy}px` },
    ], { duration: T(DUR), easing: 'cubic-bezier(.55,0,1,.6)', fill: 'forwards' });
    const drop = num.animate([
      { translate: '0 0', scale: '1 1' },
      { translate: '-4px 0', offset: 0.05 },
      { translate: '4px -1px', offset: 0.1 },
      { translate: '0 0', scale: '1 1', offset: 0.16 },
      { translate: `0 ${dy}px`, scale: '1 1', offset: 0.55, easing: 'ease-out' },
      { translate: `0 ${dy}px`, scale: '1.14 0.7', offset: 0.62 },
      { translate: `0 ${dy - 16}px`, scale: '0.97 1.05', offset: 0.78 },
      { translate: `0 ${dy}px`, scale: '1 1', offset: 0.9 },
      { translate: `0 ${dy}px`, scale: '1 1' },
    ], { duration: T(DUR), easing: 'cubic-bezier(.55,0,1,.6)', fill: 'forwards' });
    // удар о землю
    setTimeout(() => {
      dust(br.left + br.width * 0.1, br.bottom + dy, 3, -80);
      dust(br.right - br.width * 0.1, br.bottom + dy, 3, 80);
      quake(10);
    }, T(DUR * 0.55));
    await Promise.all([wait(drop), wait(barDrop)]);
    await splitting;
    await MG.sleep(350);

    // черта растворяется — остаётся ответ
    await wait(bar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(350), fill: 'forwards' }));
  }

  /* вернуть дробь в исходный вид перед новым раундом */
  function reset(num, bar) {
    [num, bar].forEach((el) => {
      if (!el) return;
      el.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      el.style.transformOrigin = '';
    });
  }

  MG.axe = { svg, icon, chop, reset };
})();

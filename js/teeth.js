/* Зубы: иконка инструмента и анимация «дробная черта — это пасть, она съедает целое».
 *   MG.teeth.icon
 *   MG.teeth.play({ fs, hingeX, y, barW, barH, bar, bites, onBite(k, K) }) → Promise
 *     hingeX — правый край черты (здесь «шарнир» пасти), y — высота черты, bar — настоящая черта (на время скрывается)
 */
(() => {
  'use strict';
  const MG = window.MG;
  const { T, sleep } = MG;
  const INK = '#1d1d1f';

  const icon = `<svg viewBox="0 0 48 48" stroke-linejoin="round" stroke-linecap="round">
    <g transform="translate(24 24) scale(.78) translate(-24.5 -24)">
    <path d="M5.0 6.6 L5.0 18.1 L14.5 11.6 Z M15.5 12.1 L15.5 20.1 L22.5 15.9 Z M22.5 15.9 L22.5 21.4 L27.5 18.5 Z M28.0 18.8 L28.0 22.4 L31.6 20.7 Z " fill="#fff" stroke="${INK}" stroke-width="1.8"/>
    <path d="M7.5 40.1 L7.5 28.6 L16.0 35.6 Z M16.5 35.3 L16.5 27.7 L22.7 32.0 Z M23.2 31.8 L23.2 26.8 L27.8 29.3 Z M28.6 28.9 L28.6 25.6 L32.0 27.1 Z " fill="#fff" stroke="${INK}" stroke-width="1.8"/>
    <path d="M6.5 4.86 L42.5 24.0 L6.5 43.14" fill="none" stroke="${INK}" stroke-width="4.4"/></g></svg>`;

  const style = document.createElement('style');
  style.textContent = `
    .teeth-fx { position: fixed; pointer-events: none; z-index: 70; }
    .teeth-fx .jaw { position: absolute; left: 0; width: 100%; }
    .teeth-fx .jaw svg { display: block; width: 100%; height: 100%; overflow: visible; }
  `;
  document.head.append(style);

  const NS = 'http://www.w3.org/2000/svg';
  /* челюсть: чёрная черта + белые зубы по внутреннему краю (up — зубы вниз).
     Нижние зубы сдвинуты на полшага: острие верхнего зуба попадает во впадину нижнего. */
  function makeJaw(L, barH, tH, up) {
    const tw = Math.max(9, tH * 1.15);
    const n = Math.max(3, Math.floor((L - barH) / tw));
    const step = (L - barH) / n;
    const H = barH + tH;
    const yb = up ? 0 : tH;                    // где лежит чёрная полоса
    const cnt = up ? n : n - 1;
    const off = up ? 0 : step / 2;
    let d = '';
    for (let i = 0; i < cnt; i++) {
      const x0 = barH / 2 + off + i * step;
      d += up
        ? `M${x0} ${barH - 0.5} L${x0 + step / 2} ${H - 1} L${x0 + step} ${barH - 0.5} Z `
        : `M${x0} ${tH + 0.5} L${x0 + step / 2} 1 L${x0 + step} ${tH + 0.5} Z `;
    }
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${L} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = `<path class="tt" d="${d}" fill="#fff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
      + `<rect x="0" y="${yb}" width="${L}" height="${barH}" rx="${barH / 2}" fill="${INK}"/>`;
    return { svg, H };
  }

  async function play(o) {
    const { fs } = o;
    const barH = Math.max(4, o.barH), L = o.barW, tH = fs * 0.2;
    const g = barH + tH * 1.1;                  // расстояние между полосами, когда пасть закрыта: острия заходят во впадины
    const { svg: s1, H } = makeJaw(L, barH, tH, true);
    const { svg: s2 } = makeJaw(L, barH, tH, false);
    const box = document.createElement('div');
    box.className = 'teeth-fx';
    const BH = g + barH;
    Object.assign(box.style, { width: `${L}px`, height: `${BH}px`, left: `${o.hingeX - L}px`, top: `${o.y - BH / 2}px` });
    const up = document.createElement('div'); up.className = 'jaw'; up.style.top = '0'; up.style.height = `${H}px`; up.append(s1);
    const dn = document.createElement('div'); dn.className = 'jaw'; dn.style.top = `${BH - H}px`; dn.style.height = `${H}px`; dn.append(s2);
    up.style.transformOrigin = `100% ${barH / 2}px`;
    dn.style.transformOrigin = `100% ${H - barH / 2}px`;
    const hinge = document.createElement('div');
    Object.assign(hinge.style, { position: 'absolute', right: `${-barH / 2}px`, top: '0', width: `${barH}px`, height: `${BH}px`, background: INK, borderRadius: `${barH / 2}px` });
    box.append(up, dn, hinge);
    document.body.append(box);
    o.bar.style.opacity = '0';
    const OPEN = 24;

    // числитель и знаменатель — «голова», к которой крепятся челюсти: двигаются вместе с ними
    const heads = new Map();
    const track = [];
    if (o.upper) heads.set(up, { el: o.upper, sign: -1 });
    if (o.lower) heads.set(dn, { el: o.lower, sign: 1 });
    heads.forEach((h, jaw) => {
      const r = h.el.getBoundingClientRect();
      h.el.style.transformOrigin = `${o.hingeX - r.left}px ${o.y + h.sign * g / 2 - r.top}px`;
    });
    // состояние: lx — бросок вперёд, split — насколько раздвинуты полосы (0 — слились в обычную черту, 1 — закрытая пасть)
    const cur = { lx: 0, split: 0 };
    const place = (el, s, lx, extra) => `${lx}px ${s}px`;
    const apply = (from, to, ms, easing) => {
      const opt = { duration: ms, easing, fill: 'forwards' };
      const kfBox = [{ translate: `${from.lx}px 0` }, { translate: `${to.lx}px 0` }];
      box.animate(kfBox, opt);
      [[up, -1], [dn, 1]].forEach(([jaw, sg]) => {
        // полосы сходятся к центру, когда split = 0
        const a = sg * -(g / 2) * (1 - from.split), b = sg * -(g / 2) * (1 - to.split);
        jaw.animate([{ translate: `0 ${a}px` }, { translate: `0 ${b}px` }], opt);
        const h = heads.get(jaw);
        if (h) track.push(h.el.animate([
          { translate: `${from.lx}px ${sg * (g / 2) * from.split}px` },
          { translate: `${to.lx}px ${sg * (g / 2) * to.split}px` },
        ], opt));
      });
      Object.assign(cur, to);
    };
    const mv = (el, a, b, ms, easing) => {
      const kf = [{ transform: `rotate(${a}deg)` }, { transform: `rotate(${b}deg)` }];
      const opt = { duration: ms, easing, fill: 'forwards' };
      const h = heads.get(el);
      if (h) track.push(h.el.animate(kf, opt));
      return el.animate(kf, opt);
    };

    // черта раскрывается в пасть
    apply({ lx: 0, split: 0 }, { lx: 0, split: 1 }, T(260), 'ease-out');
    await sleep(260);
    const a0 = mv(up, 0, OPEN, T(420), 'cubic-bezier(.3,1.4,.5,1)');
    mv(dn, 0, -OPEN, T(420), 'cubic-bezier(.3,1.4,.5,1)');
    await a0.finished.catch(() => {});
    await sleep(120);

    const lunge = -fs * 0.3;
    for (let k = 1; k <= o.bites; k++) {
      apply({ lx: 0, split: 1 }, { lx: lunge, split: 1 }, T(230), 'ease-out');
      await sleep(230);
      const c1 = mv(up, OPEN, 0, T(130), 'cubic-bezier(.6,0,1,.6)');
      mv(dn, -OPEN, 0, T(130), 'cubic-bezier(.6,0,1,.6)');
      await c1.finished.catch(() => {});                 // пасть сомкнута: зубы лежат во впадинах
      await o.onBite(k, o.bites);
      apply({ lx: lunge, split: 1 }, { lx: 0, split: 1 }, T(260), 'ease-in-out');
      if (k < o.bites) {
        mv(up, 0, OPEN, T(240), 'ease-out');
        mv(dn, 0, -OPEN, T(240), 'ease-out');
      }
      await sleep(320);
    }
    // зубы прячутся, полосы сливаются — снова обычная черта
    hinge.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(200), fill: 'forwards' });
    box.querySelectorAll('.tt').forEach((t) => t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(240), fill: 'forwards' }));
    apply({ lx: 0, split: 1 }, { lx: 0, split: 0 }, T(260), 'ease-in-out');
    await sleep(300);
    o.bar.style.opacity = '';
    track.forEach((a) => a.cancel());
    heads.forEach((h) => { h.el.style.transformOrigin = ''; });
    box.remove();
  }

  MG.teeth = { icon, play };
})();

/* Инструмент «Стаканчики»: части уравнения сжимаются, стаканчики накрывают их, меняют местами и поднимаются.
 *   MG.cups.icon
 *   MG.cups.play({ fs, ra, rb, shrink(s, ms), slide(dx, ms, ease), swap(s) → { ra, rb }, grow(s, ms) }) → Promise
 *       ra, rb — прямоугольники левой и правой дроби; s — во сколько раз их надо сжать, чтобы влезли под стаканчик
 */
(() => {
  'use strict';
  const MG = window.MG;
  const T = MG.T;

  /* стаканчик вверх дном: узкое донышко сверху, белый ободок снизу */
  const cupBody = (id) => `
    <defs>
      <linearGradient id="${id}" x1="0" x2="1">
        <stop offset="0" stop-color="#a93520"/><stop offset=".22" stop-color="#d6513a"/>
        <stop offset=".6" stop-color="#e0654b"/><stop offset="1" stop-color="#a63420"/>
      </linearGradient>
    </defs>
    <path d="M19 11 Q50 4 81 11 L98 118 Q50 129 2 118 Z" fill="url(#${id})" stroke="#86291a" stroke-width="2.2"/>
    <path d="M26 24 L14 108" stroke="#fff" stroke-opacity=".28" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M2 118 Q50 129 98 118" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/>
    <ellipse cx="50" cy="11" rx="31" ry="7" fill="#c9482f" stroke="#86291a" stroke-width="2"/>
    <ellipse cx="50" cy="11.4" rx="24" ry="4.4" fill="#8c2c1b" opacity=".75"/>`;

  const cupSvg = (id) => `<svg viewBox="0 0 100 132" overflow="visible" stroke-linejoin="round">${cupBody(id)}</svg>`;

  const icon = `<svg viewBox="0 0 48 48" stroke-linejoin="round" stroke-linecap="round">
    <defs><linearGradient id="cupIc" x1="0" x2="1"><stop offset="0" stop-color="#a93520"/><stop offset=".3" stop-color="#d6513a"/><stop offset="1" stop-color="#a63420"/></linearGradient></defs>
    <g transform="translate(3 14) scale(.2)"><path d="M19 11 Q50 4 81 11 L98 118 Q50 129 2 118 Z" fill="url(#cupIc)" stroke="#86291a" stroke-width="7"/>
      <path d="M2 118 Q50 129 98 118" fill="none" stroke="#fff" stroke-width="12"/><ellipse cx="50" cy="11" rx="31" ry="8" fill="#c9482f" stroke="#86291a" stroke-width="6"/></g>
    <g transform="translate(23 3) rotate(12 12 14) scale(.24)"><path d="M19 11 Q50 4 81 11 L98 118 Q50 129 2 118 Z" fill="url(#cupIc)" stroke="#86291a" stroke-width="6"/>
      <path d="M2 118 Q50 129 98 118" fill="none" stroke="#fff" stroke-width="10"/><ellipse cx="50" cy="11" rx="31" ry="8" fill="#c9482f" stroke="#86291a" stroke-width="5"/></g>
    <circle cx="14" cy="42" r="3.4" fill="#facc15" stroke="#b45309" stroke-width="1.3"/></svg>`;

  const style = document.createElement('style');
  style.textContent = `.cups-fx { position: fixed; left: 0; top: 0; z-index: 63; pointer-events: none; }
    .cups-fx svg { display: block; width: 100%; height: 100%; filter: drop-shadow(0 6px 6px rgba(0,0,0,.3)); }
    .cups-shadow { position: fixed; z-index: 57; pointer-events: none; border-radius: 50%;
      background: radial-gradient(ellipse at center, rgba(0,0,0,.28), rgba(0,0,0,0) 70%); }`;
  document.head.append(style);

  async function play({ fs, ra, rb, shrink, slide, swap, grow }) {
    // части уравнения сжимаются так, чтобы поместиться под стаканчик
    const Wc = fs * 2.25, Hc = fs * 2.95;
    const s = Math.min(1, (Wc * 0.74) / Math.max(ra.width, rb.width), (Hc * 0.8) / Math.max(ra.height, rb.height));
    const cA = { x: ra.left + ra.width / 2, y: ra.top + ra.height / 2 };
    const cB = { x: rb.left + rb.width / 2, y: rb.top + rb.height / 2 };
    const mk = (c, id) => {
      const d = document.createElement('div');
      d.className = 'cups-fx';
      d.style.width = `${Wc}px`; d.style.height = `${Hc}px`;
      d.style.left = `${c.x - Wc / 2}px`; d.style.top = `${c.y - Hc / 2}px`;
      d.innerHTML = cupSvg(id);
      document.body.append(d);
      return d;
    };
    const A = mk(cA, 'cupGA'), B = mk(cB, 'cupGB');
    const run = (el, kf, ms, ease = 'cubic-bezier(.5,0,.3,1)') =>
      el.animate(kf, { duration: T(ms), easing: ease, fill: 'forwards' }).finished.catch(() => {});
    const up = -(fs * 3.4 + Hc);

    // 1. части сжимаются, стаканчики опускаются на них
    shrink(s, 450);
    const drop = [{ transform: `translateY(${up}px)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: .55 },
      { transform: 'translateY(-9px)', offset: .75 }, { transform: 'translateY(0)' }];
    await Promise.all([run(A, drop, 700, 'cubic-bezier(.4,.1,.6,1)'), run(B, drop, 700, 'cubic-bezier(.4,.1,.6,1)')]);
    await MG.sleep(120);

    // 2. меняются местами: один стаканчик проходит «над», другой «под»
    const dx = cB.x - cA.x;
    slide(dx, 1000, 'cubic-bezier(.5,0,.3,1)');
    await Promise.all([
      run(A, [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx / 2}px, ${-fs * 0.9}px) scale(1.14)`, offset: .5 },
        { transform: `translate(${dx}px, 0) scale(1)` }], 1000),
      run(B, [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${-dx / 2}px, ${fs * 0.35}px) scale(.9)`, offset: .5 },
        { transform: `translate(${-dx}px, 0) scale(1)` }], 1000),
    ]);

    // 3. пока всё закрыто — части уравнения переставляются
    const n = swap(s);
    const nA = { x: n.rb.left + n.rb.width / 2, y: n.rb.top + n.rb.height / 2 };   // стаканчик A теперь над правой частью
    const nB = { x: n.ra.left + n.ra.width / 2, y: n.ra.top + n.ra.height / 2 };
    const posA = `translate(${nA.x - cA.x}px, ${nA.y - cA.y}px)`;
    const posB = `translate(${nB.x - cB.x}px, ${nB.y - cB.y}px)`;
    await Promise.all([
      run(A, [{ transform: `translate(${dx}px, 0)` }, { transform: posA }], 260, 'ease-out'),
      run(B, [{ transform: `translate(${-dx}px, 0)` }, { transform: posB }], 260, 'ease-out'),
    ]);
    await MG.sleep(220);

    // 4. стаканчики поднимаются, части уравнения распрямляются
    grow(s, 600);
    await Promise.all([
      run(A, [{ transform: posA, opacity: 1 }, { transform: `${posA} translateY(${up}px)`, opacity: 0 }], 750, 'cubic-bezier(.5,0,.8,.5)'),
      run(B, [{ transform: posB, opacity: 1 }, { transform: `${posB} translateY(${up}px)`, opacity: 0 }], 750, 'cubic-bezier(.5,0,.8,.5)'),
    ]);
    A.remove(); B.remove();
  }

  MG.cups = { icon, play };
})();

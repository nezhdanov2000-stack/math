/* Пасть: дробная черта раскрывается как рот и выплёвывает целое.
 *   MG.maw.icon                               — иконка для панели и курсора
 *   MG.maw.spit({ bar, onSpit(cx, cy) })      — анимация на элементе-черте; Promise.
 *     onSpit вызывается, когда рот распахнут: из точки (cx, cy) вылетает целое. */
(() => {
  'use strict';
  const MG = window.MG;
  const { T, sleep, EASE } = MG;
  const INK = '#1d1d1f';

  const icon = `<svg viewBox="0 0 48 48" stroke-linejoin="round" stroke-linecap="round">
    <path d="M4 27 Q24 8 44 27 Q24 47 4 27Z" fill="#7f1d1d" stroke="${INK}" stroke-width="2.6"/>
    <ellipse cx="24" cy="35" rx="9" ry="4.6" fill="#f472b6"/>
    <path d="M9 22.4 L13.6 30 L17 19 Z M18.4 18.6 L23 27.6 L27.6 18.6 Z M31 19 L34.4 30 L39 22.4 Z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
    <path d="M6.6 29.4 L12 28 L10 34.5 Z M38 28 L41.4 29.4 L38 34.5 Z" fill="#fff" stroke="${INK}" stroke-width="1.4"/>
    <circle cx="36" cy="9" r="6.4" fill="#f97316" stroke="${INK}" stroke-width="2"/>
    <text x="36" y="12.6" text-anchor="middle" font-size="10" font-weight="900" fill="#fff" stroke="none" font-family="sans-serif">1</text>
    <path d="M27 14 L31 12 M26 9 L30 8.6 M28 18 L31 16.6" stroke="#f97316" stroke-width="1.8" fill="none"/></svg>`;

  const style = document.createElement('style');
  style.textContent = `
    .maw-fx { position: fixed; z-index: 70; pointer-events: none; }
    .maw-fx svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .maw-in { position: fixed; z-index: 69; pointer-events: none; border-radius: 40% / 30%; background: radial-gradient(#b91c1c, #7f1d1d); transform-origin: 50% 50%; }
    body[data-tool="maw"] .stage, body[data-tool="maw"] .stage .token { cursor: var(--cur-maw, pointer) !important; }
  `;
  document.head.append(style);

  const NS = 'http://www.w3.org/2000/svg';
  /* челюсть: чёрная полоса + белые зубы (up — зубы вниз) */
  function jaw(W, bh, th, up) {
    const tw = Math.max(12, th * 1.2);
    const n = Math.max(3, Math.floor((W - bh) / tw));
    const step = (W - bh) / n;
    const H = bh + th;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const cnt = up ? n : n - 1, off = up ? 0 : step / 2;
    let d = '';
    for (let i = 0; i < cnt; i++) {
      const x0 = bh / 2 + off + i * step;
      d += up ? `M${x0} ${bh - 1} L${x0 + step} ${bh - 1} L${x0 + step / 2} ${H}Z `
              : `M${x0} ${th + 1} L${x0 + step} ${th + 1} L${x0 + step / 2} 0Z `;
    }
    svg.innerHTML = `<path d="${d}" fill="#fff" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`
      + `<rect x="0" y="${up ? 0 : th}" width="${W}" height="${bh}" rx="${bh / 2}" fill="${INK}"/>`;
    return { svg, H };
  }

  async function spit({ bar, onSpit }) {
    const r = bar.getBoundingClientRect();
    const W = Math.max(60, r.width), bh = Math.max(6, r.height), th = Math.max(10, Math.min(24, W * 0.1));
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const up = jaw(W, bh, th, true), dn = jaw(W, bh, th, false);
    const mk = (j, top) => {
      const el = document.createElement('div');
      el.className = 'maw-fx';
      Object.assign(el.style, { left: `${cx - W / 2}px`, top: `${top}px`, width: `${W}px`, height: `${j.H}px` });
      el.append(j.svg);
      document.body.append(el);
      return el;
    };
    const upEl = mk(up, cy - bh / 2), dnEl = mk(dn, cy + bh / 2 - dn.H);
    const gap = th * 2 + 22;
    const inner = document.createElement('div');
    inner.className = 'maw-in';
    Object.assign(inner.style, { left: `${cx - W / 2 + bh}px`, width: `${W - bh * 2}px`, top: `${cy - gap / 2}px`, height: `${gap}px`, opacity: 0 });
    document.body.append(inner);
    bar.style.visibility = 'hidden';

    const opt = (ms) => ({ duration: T(ms), easing: EASE, fill: 'forwards' });
    const a = [
      upEl.animate([{ transform: 'none' }, { transform: `translateY(${-gap / 2}px)` }], opt(230)),
      dnEl.animate([{ transform: 'none' }, { transform: `translateY(${gap / 2}px)` }], opt(230)),
      inner.animate([{ opacity: 0, transform: 'scaleY(.1)' }, { opacity: 1, transform: 'none' }], opt(230)),
    ];
    await sleep(T(150));
    if (onSpit) onSpit(cx, cy);
    await Promise.all(a.map((x) => x.finished.catch(() => {})));
    await sleep(T(260));
    const closeOpt = { duration: T(150), easing: 'cubic-bezier(.6,0,.9,.5)', fill: 'forwards' };
    const c = [
      upEl.animate([{ transform: `translateY(${-gap / 2}px)` }, { transform: 'translateY(2px)' }], closeOpt),
      dnEl.animate([{ transform: `translateY(${gap / 2}px)` }, { transform: 'translateY(-2px)' }], closeOpt),
      inner.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scaleY(.1)' }], closeOpt),
    ];
    await Promise.all(c.map((x) => x.finished.catch(() => {})));
    [upEl, dnEl, inner].forEach((e) => e.remove());
    bar.style.visibility = '';
  }

  MG.maw = { icon, spit };
})();

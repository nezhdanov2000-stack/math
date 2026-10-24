/* Джокер: карта-курсор размером с дробь. Нажал на множитель — джокер превращается в карту с этим числом
 * сверху и снизу (как у игральной карты). Карту кладут на дробь — числа переходят в числитель и знаменатель.
 *   MG.joker.icon                    — иконка для панели и курсора
 *   MG.joker.style(g)                — «призрак» множителя превратить в карту-число
 *   MG.joker.setValue(g, v)          — поменять число на карте
 *   MG.joker.lay(g, { frac, targets, value, color })
 *       g       — карта (position: fixed, как у перетаскивания)
 *       frac    — элемент дроби, на которую кладут карту
 *       targets — спрятанные (opacity: 0) элементы, где появятся числа: верхние получат число с верха карты, нижние — снизу
 *   Промис завершается, когда числа заняли места.
 */
(() => {
  'use strict';
  const MG = window.MG;

  const INK = '#2b2b33';
  /* половина карты (верх): колпак с бубенчиками, лицо, воротник; низ — то же, отражённое */
  const half = `
    <path d="M27 25 Q12 23 13 35" fill="none" stroke="#7f1d1d" stroke-width="6.4"/>
    <path d="M27 25 Q12 23 13 35" fill="none" stroke="#ef4444" stroke-width="3.6"/>
    <path d="M43 25 Q58 23 57 35" fill="none" stroke="${INK}" stroke-width="6.4"/>
    <path d="M43 25 Q58 23 57 35" fill="none" stroke="#4b5563" stroke-width="3.6"/>
    <circle cx="13" cy="36.4" r="3.2" fill="#fbbf24" stroke="#92400e" stroke-width="1.4"/>
    <circle cx="57" cy="36.4" r="3.2" fill="#fbbf24" stroke="#92400e" stroke-width="1.4"/>
    <path d="M25 42 L28.2 46.6 L31.6 42.6 L35 47 L38.4 42.6 L41.8 46.6 L45 42 Z" fill="#fffdf8" stroke="${INK}" stroke-width="2"/>
    <circle cx="35" cy="36" r="9.4" fill="#fcd9b0" stroke="${INK}" stroke-width="2.2"/>
    <path d="M29.6 35.4 q2 -2 4 0 M37 35.4 q2 -2 4 0" fill="none" stroke="${INK}" stroke-width="1.8"/>
    <path d="M30.8 40 q4.2 3.4 8.4 0" fill="none" stroke="#b91c1c" stroke-width="2"/>
    <path d="M35 12.4 C41 12.4 45 19 45 28 H35 Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="2.4"/>
    <path d="M35 12.4 C29 12.4 25 19 25 28 H35 Z" fill="#4b5563" stroke="${INK}" stroke-width="2.4"/>
    <circle cx="35" cy="11.2" r="3.3" fill="#fbbf24" stroke="#92400e" stroke-width="1.5"/>
    <path d="M24.4 28.4 H45.6" stroke="${INK}" stroke-width="5"/>
    <path d="M28 28.4 l2.4 -2.4 l2.4 2.4 l-2.4 2.4z M33.8 28.4 l2.4 -2.4 l2.4 2.4 l-2.4 2.4z M39.6 28.4 l2.4 -2.4 l2.4 2.4 l-2.4 2.4z" fill="#fff" stroke="none"/>`;
  const faceBody = `<rect x="2.5" y="2.5" width="65" height="95" rx="9" fill="#fffdf8" stroke="${INK}" stroke-width="3.4"/>
    <g>${half}</g><g transform="translate(0 100) scale(1 -1)">${half}</g>
    <path d="M9 50 H61" stroke="#d6d3d1" stroke-width="1.6" stroke-dasharray="3 3"/>`;
  const faceSvg = `<svg viewBox="0 0 70 100" stroke-linejoin="round" stroke-linecap="round">${faceBody}</svg>`;

  /* иконка для панели: карта, чуть наклонённая */
  const icon = `<svg viewBox="0 0 48 48" stroke-linejoin="round" stroke-linecap="round">
    <g transform="translate(24 24) rotate(8) scale(.42) translate(-35 -50)">${faceBody}</g></svg>`;

  const style = document.createElement('style');
  style.textContent = `
    .jk-follow { position: fixed; left: 0; top: 0; z-index: 58; pointer-events: none; display: none; opacity: .94; will-change: translate;
      filter: drop-shadow(0 10px 12px rgba(0, 0, 0, .3)); }
    .jk-follow svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .ghost.jcard { overflow: visible !important; background: none !important; border: 0 !important; box-shadow: none !important; }
    .ghost.jcard::before, .ghost.jcard::after { display: none !important; }
    .jk-card { position: absolute; left: 50%; top: 50%; translate: -50% -50%; box-sizing: border-box; border-radius: 12px;
      background: #fffdf8; border: 3.5px solid ${INK}; box-shadow: 0 12px 18px rgba(0, 0, 0, .28); pointer-events: none;
      font-family: inherit; font-weight: 900; line-height: 1; }
    .jk-card::before { content: ''; position: absolute; left: 12%; right: 12%; top: 50%; border-top: 2px dashed #d6d3d1; }
    .jk-n { position: absolute; left: 0; right: 0; text-align: center; }
    .jk-n.t { top: 9%; }
    .jk-n.b { bottom: 9%; }
    .jk-star { position: absolute; left: 50%; top: 50%; translate: -50% -50%; width: 17%; aspect-ratio: 1; border-radius: 50%; background: #fffdf8; z-index: 1; }
    .jk-star::after { content: '★'; position: absolute; inset: 0; display: grid; place-items: center; font-size: 80%; color: #f59e0b; }
    body[data-tool="joker"] .stage, body[data-tool="joker"] .stage * { cursor: none !important; }
  `;
  document.head.append(style);

  /* какого размера карта: как дробь на экране */
  function cardSize() {
    const f = document.querySelector('.stage:not([hidden]) .fr, .stage:not([hidden]) .mx-frac');
    let h = f ? f.getBoundingClientRect().height : 0;
    if (!h || h < 40) h = 120;
    h = Math.max(78, Math.min(130, h * 0.68));
    return { h, w: Math.round(h * 0.7) };
  }

  /* --- карта-курсор --- */
  const follow = document.createElement('div');
  follow.className = 'jk-follow';
  follow.innerHTML = faceSvg;
  document.body.append(follow);
  let fx = -999;
  let fy = -999;
  let shown = false;
  const place = () => {
    const holding = !!document.querySelector('.ghost.jcard');
    const want = document.body.dataset.tool === 'joker' && fx > 0 && !holding;
    if (want !== shown) {
      shown = want;
      follow.style.display = want ? 'block' : 'none';
      if (want) {
        const s = cardSize();
        follow.style.width = `${s.w}px`;
        follow.style.height = `${s.h}px`;
        follow.animate([{ scale: '.6', opacity: 0 }, { scale: '1', opacity: 1 }], { duration: MG.T(180), easing: 'ease-out' });
      }
    }
    if (want) {
      const w = parseFloat(follow.style.width) || 80;
      const h = parseFloat(follow.style.height) || 120;
      follow.style.translate = `${fx - w / 2}px ${fy - h / 2}px`;
      follow.style.rotate = '-5deg';
    }
  };
  window.addEventListener('pointermove', (e) => {
    const over = e.target && e.target.closest && e.target.closest('.stage');
    if (over) { fx = e.clientX; fy = e.clientY; } else { fx = -999; }
    place();
  }, true);
  document.addEventListener('pointerleave', () => { fx = -999; place(); });
  window.addEventListener('toolchange', place);
  setInterval(place, 150);

  /* --- карта-число --- */
  function buildCard(g, v, color) {
    const s = cardSize();
    let card = g.querySelector('.jk-card');
    if (!card) {
      g.textContent = '';
      card = document.createElement('div');
      card.className = 'jk-card';
      card.innerHTML = '<span class="jk-n t"></span><span class="jk-n b"></span><i class="jk-star"></i>';
      g.append(card);
    }
    card.style.width = `${s.w}px`;
    card.style.height = `${s.h}px`;
    card.style.fontSize = `${s.h * 0.24}px`;
    card.querySelectorAll('.jk-n').forEach((n) => { n.textContent = v; n.style.color = color; });
    return card;
  }

  function cardStyle(g) {
    const v = g.textContent.trim();
    const color = (MG.colorOf && MG.colorOf(Number(v))) || INK;
    g.classList.add('jcard');
    const card = buildCard(g, v, color);
    // джокер переворачивается и становится числом
    card.animate([{ scale: '0 1' }, { scale: '1 1' }], { duration: MG.T(260), easing: 'cubic-bezier(.3,1.4,.5,1)' });
    return card;
  }

  function setValue(g, v) {
    const card = g.querySelector('.jk-card');
    if (!card) { g.textContent = String(v); return; }
    const color = (MG.colorOf && MG.colorOf(Number(v))) || INK;
    card.querySelectorAll('.jk-n').forEach((n) => { n.textContent = v; n.style.color = color; });
  }

  async function lay(g, { frac, targets, value, color }) {
    const T = MG.T;
    const sleep = MG.sleep;
    setValue(g, value);
    const gr = g.getBoundingClientRect();
    const fr = frac.getBoundingClientRect();
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(g.style.transform);
    const dx = m ? parseFloat(m[1]) : 0;
    const dy = m ? parseFloat(m[2]) : 0;
    const hx = fr.left + fr.width / 2;
    const hy = fr.top + fr.height / 2;
    const tx = dx + (hx - (gr.left + gr.width / 2));
    const ty = dy + (hy - (gr.top + gr.height / 2));
    g.style.transition = 'none';

    // 1. карта ложится на дробь
    await g.animate([
      { transform: g.style.transform || 'none' },
      { transform: `translate(${tx}px, ${ty}px) scale(1) rotate(-3deg)` },
    ], { duration: T(420), easing: 'cubic-bezier(.3,.8,.3,1)', fill: 'forwards' }).finished.catch(() => {});
    await sleep(120);

    // 2. числа слетают с карты — верхнее в числитель, нижнее в знаменатель
    const cr = g.getBoundingClientRect();
    const mid = fr.top + fr.height / 2;
    const cards = g.querySelector('.jk-card');
    const nfs = parseFloat(cards ? cards.style.fontSize : '') || 28;
    const flights = targets.map((el, i) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.55;
      const top = cy < mid;
      const sx = cr.left + cr.width / 2;
      const sy = top ? cr.top + cr.height * 0.19 : cr.bottom - cr.height * 0.19;
      const tfs = parseFloat(getComputedStyle(el).fontSize) || nfs;
      const c = document.createElement('i');
      c.textContent = value;
      Object.assign(c.style, {
        position: 'fixed', zIndex: 61, left: `${sx}px`, top: `${sy}px`, fontStyle: 'normal', fontWeight: 900, lineHeight: 1,
        fontSize: `${tfs}px`, color, pointerEvents: 'none', translate: '-50% -50%', textShadow: '0 0 6px rgba(255,255,255,.9)',
      });
      document.body.append(c);
      const s0 = nfs / tfs;
      const a = c.animate([
        { transform: `scale(${s0}) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${(cx - sx) * 0.5}px, ${(cy - sy) * 0.5 - 24}px) scale(${(s0 + 1) / 2 + 0.2}) rotate(0deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${cx - sx}px, ${cy - sy}px) scale(1) rotate(0deg)`, opacity: 1 },
      ], { duration: T(620), delay: T(i * 140), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
      return a.finished.catch(() => {}).then(() => {
        c.remove();
        el.style.opacity = '';
        el.style.transformOrigin = '50% 60%';
        el.animate([
          { scale: '.35', opacity: 0 }, { scale: '1.22', opacity: 1, offset: 0.55 }, { scale: '1', opacity: 1 },
        ], { duration: T(380), easing: 'cubic-bezier(.3,1.4,.5,1)' }).onfinish = () => { el.style.transformOrigin = ''; };
        MG.burst(el, color, 7);
      });
    });

    // 3. карта, отдав числа, растворяется
    g.animate([
      { transform: `translate(${tx}px, ${ty}px) scale(1) rotate(-3deg)`, opacity: 1 },
      { transform: `translate(${tx}px, ${ty - 18}px) scale(1.12) rotate(-3deg)`, opacity: 0 },
    ], { duration: T(520), delay: T(260), easing: 'ease-in', fill: 'forwards' }).onfinish = () => g.remove();

    await Promise.all(flights);
    await sleep(200);
    g.remove();
  }

  /* клик по числу: карта остаётся в руке без зажатой кнопки; следующее нажатие — положить на дробь (или сброс) */
  let disarm = () => {};
  function armSticky(finish) {
    disarm();
    const done = (ev) => { disarm(); finish(ev); };
    const onDown = (e) => {
      e.stopPropagation();
      e.preventDefault();
      done({ type: e.button > 0 ? 'pointercancel' : 'pointerup', clientX: e.clientX, clientY: e.clientY });
    };
    const onKey = (e) => { if (e.key === 'Escape') done({ type: 'pointercancel', clientX: -1, clientY: -1 }); };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    disarm = () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
      disarm = () => {};
    };
  }

  MG.joker = { armSticky, icon, face: faceSvg, style: cardStyle, setValue, lay };
})();

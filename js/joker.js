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
 *
 * Общие возможности, которые режим может включить у себя (по умолчанию выключены, остальные режимы их не видят):
 *   const sl = MG.joker.slot(host) — карта-джокер в элементе host (например, рядом с примером на планшете):
 *       sl.set('25') — джокер переворачивается и становится картой с числом; sl.set('') — обратно джокер;
 *       sl.rect() — где карта на экране;  sl.el — элемент;  sl.hide() — спрятать (карта ушла в руку).
 *   MG.joker.hold(rect, value, { frac, check, onLay, say, onDrop }) — карта с числом из rect взлетает в руку
 *       и ходит за пальцем/мышью; тап по дроби frac() — положить:
 *       check(value) — «проверка множителя»: true — можно; строка — нельзя: карта трясётся и рассыпается,
 *                 строка показывается подсказкой через say(text); потом зовётся onDrop()
 *       onLay(card, value) — карта положена (режим сам зовёт MG.joker.lay и пересчитывает дробь)
 *       тап мимо дроби — карта остаётся в руке, пока выбран джокер; сменили инструмент — карта исчезает (onDrop).
 *   MG.joker.holding() — есть ли карта в руке.
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
    .jk-slot { position: relative; display: inline-block; width: 86px; height: 122px; flex: none; rotate: -6deg; }
    .jk-slot .f, .jk-slot .b { position: absolute; inset: 0; border-radius: 12px; filter: drop-shadow(0 10px 12px rgba(0,0,0,.3)); }
    .jk-slot .f svg { width: 100%; height: 100%; display: block; }
    .jk-slot .b { display: none; box-sizing: border-box; background: #fffdf8; border: 3.5px solid ${INK}; font-family: var(--ui-font, 'Nunito', system-ui, sans-serif); font-weight: 900; line-height: 1; color: ${INK}; }
    .jk-slot.num .f { display: none; } .jk-slot.num .b { display: block; }
    .jk-slot .b::before { content: ''; position: absolute; left: 12%; right: 12%; top: 50%; border-top: 2px dashed #d6d3d1; }
    .jk-slot .b i { position: absolute; left: 0; right: 0; text-align: center; font-style: normal; font-size: 30px; }
    .jk-slot .b i.t { top: 9%; } .jk-slot .b i.u { bottom: 9%; }
    .jk-slot .b .st { position: absolute; left: 50%; top: 50%; translate: -50% -50%; font-size: 15px; color: #f59e0b; background: #fffdf8; padding: 0 3px; }
    .jk-smoke { position: absolute; left: 50%; top: 50%; width: 200%; height: 170%; translate: -50% -50%; pointer-events: none; z-index: 2; overflow: visible; }
    .jk-smoke circle { transform-box: fill-box; transform-origin: center; }
    .jk-smoke circle.o { fill: #c3c6d2; stroke: #c3c6d2; stroke-width: 6; }
    .jk-smoke circle.i { fill: #fbfbfd; }
    .jk-smoke .ln { stroke: #b8bbc8; stroke-width: 3; stroke-linecap: round; fill: none; }
    @keyframes jkPop { 0% { scale: .5; } 60% { scale: 1.25; } }
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

  /* ---------- карта-джокер на планшете: при вводе числа переворачивается в карту с этим числом ---------- */
  function slot(host) {
    const el = document.createElement('span');
    el.className = 'jk-slot';
    el.innerHTML = `<span class="f">${faceSvg}</span><span class="b"><i class="t"></i><b class="st">★</b><i class="u"></i></span>`;
    host.append(el);
    const nums = [...el.querySelectorAll('.b i')];
    el.animate([{ scale: '.4', opacity: 0 }, { scale: '1.08', opacity: 1, offset: 0.6 }, { scale: '1' }], { duration: MG.T(420), easing: 'ease-out' });
    /* «техника замены»: хлопок дыма, карта исчезает — на её месте другая */
    const poof = (big) => {
      el.querySelectorAll('.jk-smoke').forEach((x) => x.remove());
      const NS = 'http://www.w3.org/2000/svg';
      const sv = document.createElementNS(NS, 'svg');
      sv.setAttribute('class', 'jk-smoke'); sv.setAttribute('viewBox', '-100 -100 200 200');
      const k = big ? 1 : 0.7;
      const puffs = [[0, 0, 50], [-40, -34, 36], [38, -38, 38], [-44, 30, 36], [42, 32, 36], [0, -60, 32], [-4, 58, 34], [62, -4, 28], [-64, -4, 28], [-58, -52, 20], [60, 56, 20]];
      let h = '';
      for (const cl of ['o', 'i']) puffs.forEach(([x, y, r], n) => { h += `<circle class="${cl}" data-n="${n}" cx="${x * k}" cy="${y * k}" r="${r * k}"/>`; });   // контур снизу, заливка сверху — один пушистый клуб
      [[0, -1], [0.87, -0.5], [0.87, 0.5], [0, 1], [-0.87, 0.5], [-0.87, -0.5]].forEach(([dx, dy]) => { h += `<path class="ln" d="M${dx * 80 * k} ${dy * 80 * k} L${dx * 98 * k} ${dy * 98 * k}"/>`; });
      sv.innerHTML = h;
      el.append(sv);
      const D = MG.T(big ? 650 : 420);
      sv.querySelectorAll('circle').forEach((c) => { const n = +c.dataset.n; c.animate(
        [{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1.1)', opacity: 1, offset: 0.35 }, { transform: `translate(${(n % 3 - 1) * 6}px, -10px) scale(1.25)`, opacity: 0 }],
        { duration: D + n * 25, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' }); });
      sv.querySelectorAll('.ln').forEach((l) => l.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, offset: 0.2 }, { opacity: 0, transform: 'scale(1.25)' }], { duration: D * 0.6, fill: 'forwards' }));
      setTimeout(() => sv.remove(), D + 300);
      return MG.T(big ? 150 : 100);                 // через столько дым закроет карту — тогда её и меняем
    };
    let cur = '', swapT = 0;
    return {
      el,
      set(v) {
        v = String(v || '');
        if (v === cur) return;
        const was = cur; cur = v;
        const big = !v !== !was;                    // джокер ↔ карта с числом — большой хлопок, смена числа — маленький
        clearTimeout(swapT);
        swapT = setTimeout(() => {
          if (v) {
            const color = (MG.colorOf && MG.colorOf(Number(v))) || INK;
            nums.forEach((n) => { n.textContent = v; n.style.color = color; n.style.fontSize = `${v.length > 2 ? 24 : 30}px`; });
          }
          el.classList.toggle('num', !!v);
          const card = v ? el.querySelector('.b') : el.querySelector('.f');
          card.animate([{ scale: '.6', rotate: '8deg' }, { scale: '1.1', rotate: '-3deg', offset: 0.6 }, { scale: '1', rotate: '0deg' }], { duration: MG.T(380), easing: 'cubic-bezier(.3,1.5,.5,1)' });
        }, poof(big));
        if (MG.snd && MG.snd.play) MG.snd.play(big ? 'whoosh' : 'pop', { dur: 0.25 });
      },
      rect: () => el.getBoundingClientRect(),
      hide() { el.style.visibility = 'hidden'; },
    };
  }

  /* ---------- карта с числом в руке: тап по дроби — положить ---------- */
  let held = null;
  function hold(from, v, { frac, check, onLay, say, onDrop }) {
    if (held) held.drop(false);
    const s = cardSize();
    const g = document.createElement('div');
    g.className = 'ghost';
    const cx0 = from.left + from.width / 2, cy0 = from.top + from.height / 2;
    Object.assign(g.style, { position: 'fixed', left: `${cx0 - s.w / 2}px`, top: `${cy0 - s.h / 2}px`, width: `${s.w}px`, height: `${s.h}px`, zIndex: 60, pointerEvents: 'none', transition: 'none' });
    g.textContent = String(v);
    document.body.append(g);
    const card = cardStyle(g);
    card.getAnimations().forEach((a) => a.cancel());
    card.animate([{ scale: String(from.height / s.h) }, { scale: '1' }], { duration: MG.T(380), easing: 'cubic-bezier(.3,1.3,.5,1)' });
    let px = cx0, py = cy0 - 10;
    const put = () => { g.style.transform = `translate(${px - cx0}px, ${py - cy0}px) scale(1.06) rotate(-4deg)`; };
    put();
    const onMove = (e) => { px = e.clientX; py = e.clientY; put(); };
    window.addEventListener('pointermove', onMove);
    const off = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('toolchange', onTool); disarm(); held = null; };
    const poof = (shake) => {
      const from = g.style.transform || 'none';
      const kf = shake
        ? [{ transform: from }, { transform: `${from} translateX(-10px) rotate(-7deg)`, offset: 0.15 }, { transform: `${from} translateX(10px) rotate(7deg)`, offset: 0.3 }, { transform: `${from} translateX(-6px)`, offset: 0.42 }, { transform: `${from} translateX(0)`, opacity: 1, offset: 0.6 }, { transform: `${from} scale(.4) rotate(20deg)`, opacity: 0 }]
        : [{ transform: from }, { transform: `${from} scale(.5)`, opacity: 0 }];
      g.animate(kf, { duration: MG.T(shake ? 800 : 260), easing: 'ease-in', fill: 'forwards' }).onfinish = () => g.remove();
    };
    const drop = (shake) => { off(); poof(shake); if (onDrop) onDrop(); };
    const onTool = () => { if (document.body.dataset.tool !== 'joker') drop(false); };
    window.addEventListener('toolchange', onTool);
    const arm = () => armSticky((ev) => {
      if (held !== me) return;
      if (ev.type !== 'pointerup') { drop(false); return; }
      const f = frac && frac();
      const fr = f && f.getBoundingClientRect();
      const P = 24;
      const onFrac = fr && ev.clientX > fr.left - P && ev.clientX < fr.right + P && ev.clientY > fr.top - P && ev.clientY < fr.bottom + P;
      if (!onFrac) {                                   // мимо: карта остаётся в руке (если только не нажали на панель инструментов)
        const t = document.elementFromPoint(ev.clientX, ev.clientY);
        if (t && t.closest && t.closest('.toolbar')) { drop(false); if (t.closest('button')) t.closest('button').click(); return; }
        px = ev.clientX; py = ev.clientY; put(); arm(); return;
      }
      const ok = check ? check(v) : true;
      if (ok !== true) {
        if (MG.snd && MG.snd.play) MG.snd.play('nope', { dur: 0.3 });
        drop(true); if (say && typeof ok === 'string') say(ok); return;
      }
      off();
      onLay(g, v);
    });
    const me = { g, drop };
    held = me;
    arm();
    return me;
  }

  MG.joker = { armSticky, icon, face: faceSvg, style: cardStyle, setValue, lay, slot, hold, holding: () => !!held };
})();

/* Общие инструменты для всех режимов: математика, анимации, FLIP, подсказки. */
(() => {
  'use strict';

  const MG = (window.MG = { modes: {}, active: null });

  /* ============================================================
   * Математика
   * ============================================================ */
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);

  function spf(n) {               // наименьший простой делитель
    for (let p = 2; p * p <= n; p++) if (n % p === 0) return p;
    return n;
  }
  const isPrime = (n) => n > 1 && spf(n) === n;

  function factorize(n) {
    const out = [];
    while (n > 1) { const p = spf(n); out.push(p); n /= p; }
    return out;
  }

  /* ============================================================
   * Утилиты
   * ============================================================ */
  const $ = (s) => document.querySelector(s);
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = (ms) => (REDUCED ? 1 : ms);
  const sleep = (ms) => new Promise((r) => setTimeout(r, T(ms)));
  const EASE = 'cubic-bezier(.3,.7,.2,1)';
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));   // случайное целое из [a, b]
  const rnd = (a, b) => a + Math.random() * (b - a);                   // случайное дробное из [a, b)
  const pick = (arr) => arr[ri(0, arr.length - 1)];                   // случайный элемент массива

  /* центр элемента или DOMRect в экранных координатах */
  function center(x) {
    const r = x instanceof Element ? x.getBoundingClientRect() : x;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* дождаться конца Web Animation; отменённая анимация — не ошибка */
  const wait = (anim) => (anim && anim.finished ? anim.finished.catch(() => {}) : Promise.resolve());

  /* уровень по числу решённых задач: +1 за каждые 3, не выше cap */
  const levelOf = (solved, cap = 6) => Math.min(cap, 1 + Math.floor(solved / 3));

  /* штраф за ошибку инструментом: на сколько исчезает инструмент и когда вернуть подсказку */
  const PENALTY = { tool: 4000, hint: 3800 };

  /* подсказка под сценой с анимацией смены текста.
   *   const hint = MG.hinter(el);  hint.set('…');  hint.text — что показано сейчас;  hint.reset() — забыть текст */
  function hinter(el) {
    let shown = '';
    return {
      get text() { return shown; },
      reset() { shown = ''; },
      set(text) {
        shown = text;
        el.classList.add('swap');
        setTimeout(() => {
          if (shown === text) el.textContent = text;
          el.classList.remove('swap');
        }, T(150));
      },
    };
  }

  /* эффекты рисуются прямо в <body> (position: fixed). При выходе из режима всё,
   * что не относится к каркасу страницы, убираем — иначе зависшие ленты, вертолёты
   * и призраки остаются поверх следующего экрана. */
  const KEEP = '#splash, #home, .top, .stage, .toolbar, .jk-follow, script, style, link';
  function sweepFx() {
    [...document.body.children].forEach((el) => { if (!el.matches(KEEP)) el.remove(); });
  }

  const COLORS = {
    2: '#3b82f6', 3: '#ef4444', 5: '#10b981', 7: '#f59e0b',
    11: '#8b5cf6', 13: '#06b6d4', 17: '#ec4899', 19: '#84cc16',
  };
  const EXTRA = ['#f97316', '#14b8a6', '#a855f7', '#e11d48', '#0ea5e9'];
  const colorOf = (p) => COLORS[p] || EXTRA[p % EXTRA.length];

  function setStats(level, solved) {
    $('#level').textContent = level;
    $('#solved').textContent = solved;
  }

  /* маленькая дробь в тексте результата */
  const mf = (a, b) => `<span class="mf"><i>${a}</i><i>${b}</i></span>`;

  /* ширина строки с учётом внешних отступов (offsetWidth не зависит от transform) */
  function rowWidth(row) {
    const kids = [...row.children];
    if (!kids.length) return 0;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const sum = kids.reduce((w, k) => {
      const cs = getComputedStyle(k);
      return w + k.offsetWidth + (parseFloat(cs.marginLeft) || 0) + (parseFloat(cs.marginRight) || 0);
    }, 0);
    return sum + gap * (kids.length - 1);
  }

  /* ============================================================
   * FLIP: плавное перемещение остальных элементов при изменении раскладки
   * ============================================================ */
  const FLIP_SEL = '.token, .glyph';

  function snapshot() {
    const m = new Map();
    document.querySelectorAll(FLIP_SEL).forEach((e) => m.set(e, e.getBoundingClientRect()));
    return m;
  }

  function play(first, skip = new Set(), dur = 520) {
    document.querySelectorAll(FLIP_SEL).forEach((e) => {
      if (skip.has(e)) return;
      const a = first.get(e);
      if (!a) return;
      e.getAnimations().filter((an) => an.id === 'flip').forEach((an) => an.cancel());
      const b = e.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      const an = e.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: T(dur), easing: EASE },
      );
      an.id = 'flip';
    });
  }

  /* «призрак» элемента: копия в том же месте экрана, не зависящая от раскладки */
  function ghost(el) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const g = el.cloneNode(true);
    g.removeAttribute('id');
    g.removeAttribute('tabindex');
    g.className = `${el.className.replace(/\b(dot|lead|peek)\b/g, '')} ghost`;
    Object.assign(g.style, {
      position: 'fixed',
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
      margin: '0',
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      zIndex: 30,
      pointerEvents: 'none',
    });
    document.body.append(g);
    return g;
  }

  /* ============================================================
   * Эффекты
   * ============================================================ */
  function burst(el, color, n = 10) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    for (let i = 0; i < n; i++) {
      const d = document.createElement('i');
      d.className = 'spark';
      d.style.background = color;
      d.style.left = `${cx}px`;
      d.style.top = `${cy}px`;
      document.body.append(d);
      const ang = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 70;
      const an = d.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(0)`, opacity: 0 },
      ], { duration: T(550 + Math.random() * 350), easing: 'cubic-bezier(.1,.7,.3,1)' });
      an.onfinish = () => d.remove();
    }
  }

  function popIn(el, delay = 0) {
    el.animate([
      { scale: '.4', opacity: 0 },
      { scale: '1.12', opacity: 1, offset: 0.6 },
      { scale: '1', opacity: 1 },
    ], { duration: T(520), delay: T(delay), fill: 'backwards', easing: EASE });
  }

  function bump(el) {
    el.animate([{ scale: '1.2' }, { scale: '1' }], { duration: T(420), easing: EASE });
  }

  function shake(el) {
    el.animate([
      { translate: '0 0' }, { translate: '-7px 0' }, { translate: '7px 0' },
      { translate: '-4px 0' }, { translate: '0 0' },
    ], { duration: T(320), easing: 'ease-out' });
  }

  /* «это число неделимое»: встряска, кольцо и всплывающая подпись */
  function indivisible(el, label) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    shake(el);
    el.animate([
      { backgroundColor: 'rgba(29,29,31,0)' },
      { backgroundColor: 'rgba(29,29,31,.16)', offset: 0.3 },
      { backgroundColor: 'rgba(29,29,31,0)' },
    ], { duration: T(750) });

    const ring = document.createElement('i');
    ring.className = 'ring';
    const size = Math.max(r.width, r.height) * 1.05;
    Object.assign(ring.style, { left: `${cx}px`, top: `${cy}px`, width: `${size}px`, height: `${size}px` });
    document.body.append(ring);
    ring.animate([
      { scale: '.7', opacity: 0.7 },
      { scale: '2', opacity: 0 },
    ], { duration: T(650), easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => ring.remove();

    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.textContent = label;
    Object.assign(tag.style, { left: `${cx}px`, top: `${r.top - 6}px` });
    document.body.append(tag);
    tag.animate([
      { opacity: 0, translate: '-50% 6px' },
      { opacity: 1, translate: '-50% -4px', offset: 0.22 },
      { opacity: 1, translate: '-50% -8px', offset: 0.75 },
      { opacity: 0, translate: '-50% -20px' },
    ], { duration: T(1400), easing: 'ease-out' }).onfinish = () => tag.remove();
  }

  /* ракета: «призрак» множителя летит по дуге-фонтанчику к цели и оставляет огненный след.
   * dir = -1 — дуга над строкой (числитель), +1 — под строкой (знаменатель).
   * Возвращает Promise, который завершается при «посадке». */
  function rocket(g, from, to, { dir = -1, delay = 0, duration = 880, color = '#3b82f6' } = {}) {
    return new Promise((resolve) => {
      const x0 = from.left + from.width / 2;
      const y0 = from.top + from.height / 2;
      const x1 = to.left + to.width / 2;
      const y1 = to.top + to.height / 2;
      const lift = Math.max(80, Math.hypot(x1 - x0, y1 - y0) * 0.6);
      const cx = (x0 + x1) / 2;
      const cy = dir < 0 ? Math.min(y0, y1) - lift : Math.max(y0, y1) + lift;
      const flame = ['#fbbf24', '#f97316', '#ffffff', color];

      g.style.filter = `drop-shadow(0 0 10px ${color})`;
      const t0 = performance.now() + T(delay);
      const dur = T(duration);
      let finished = false;
      let lastEmit = 0;
      const done = () => { if (!finished) { finished = true; g.remove(); resolve(); } };

      function frame(now) {
        if (finished) return;
        if (now < t0) { requestAnimationFrame(frame); return; }
        const u = Math.min(1, (now - t0) / dur);
        const t = u ** 1.45;                       // разгон: старт плавный, к цели — быстро
        const m = 1 - t;
        const x = m * m * x0 + 2 * m * t * cx + t * t * x1;
        const y = m * m * y0 + 2 * m * t * cy + t * t * y1;
        const vx = 2 * m * (cx - x0) + 2 * t * (x1 - cx);
        const vy = 2 * m * (cy - y0) + 2 * t * (y1 - cy);
        const len = Math.hypot(vx, vy) || 1;
        const tilt = Math.max(-35, Math.min(35, (vx / len) * 40));
        g.style.transform = `translate(${x - x0}px, ${y - y0}px) rotate(${tilt}deg) scale(${1 - 0.18 * t})`;

        if (now - lastEmit > 18) {                 // след из искр позади ракеты
          lastEmit = now;
          for (let k = 0; k < 2; k++) {
            const p = document.createElement('i');
            const s = 5 + Math.random() * 7;
            p.className = 'trail';
            Object.assign(p.style, {
              left: `${x - (vx / len) * (6 + k * 10) - s / 2}px`,
              top: `${y - (vy / len) * (6 + k * 10) - s / 2}px`,
              width: `${s}px`,
              height: `${s}px`,
              background: flame[ri(0, 3)],
            });
            document.body.append(p);
            p.animate([
              { transform: 'translate(0,0) scale(1)', opacity: 0.95 },
              { transform: `translate(${(Math.random() - 0.5) * 16}px, ${(Math.random() - 0.5) * 16}px) scale(0)`, opacity: 0 },
            ], { duration: T(380 + Math.random() * 320), easing: 'ease-out' }).onfinish = () => p.remove();
          }
        }
        if (u < 1) requestAnimationFrame(frame); else done();
      }
      requestAnimationFrame(frame);
      setTimeout(done, T(delay + duration) + 600);   // страховка, если вкладка в фоне
    });
  }

  /* взрыв: вспышка, ударная волна и искры вокруг элемента */
  function explode(el, color) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const size = Math.max(r.width, r.height);

    const flash = document.createElement('div');
    flash.className = 'flash';
    Object.assign(flash.style, {
      left: `${cx}px`, top: `${cy}px`, width: `${size * 2.4}px`, height: `${size * 2.4}px`,
      background: `radial-gradient(circle, #fff 0%, ${color} 38%, transparent 70%)`,
    });
    const ring = document.createElement('i');
    ring.className = 'shock';
    Object.assign(ring.style, {
      left: `${cx}px`, top: `${cy}px`, width: `${size * 1.1}px`, height: `${size * 1.1}px`,
      borderColor: color,
    });
    document.body.append(flash, ring);
    flash.animate([{ scale: '.2', opacity: 1 }, { scale: '1.5', opacity: 0 }],
      { duration: T(520), easing: 'ease-out' }).onfinish = () => flash.remove();
    ring.animate([{ scale: '.4', opacity: 0.9 }, { scale: '2.8', opacity: 0 }],
      { duration: T(680), easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => ring.remove();

    burst(el, color, 22);
    burst(el, '#fbbf24', 14);
    burst(el, '#ffffff', 8);
  }

  /* ============================================================
   * Кувалда: удар по числу, трещины, осколки
   * ============================================================ */
  const HAMMER_SVG = `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="93" y="14" width="14" height="132" rx="7" fill="#a16207"/>
      <rect x="93" y="14" width="5" height="132" rx="2.5" fill="#ca8a04" opacity=".75"/>
      <rect x="50" y="126" width="100" height="56" rx="9" fill="#3f3f46"/>
      <rect x="50" y="126" width="100" height="16" rx="8" fill="#71717a"/>
      <rect x="50" y="126" width="14" height="56" rx="6" fill="#27272a"/>
      <rect x="136" y="126" width="14" height="56" rx="6" fill="#27272a"/>
    </svg>`;

  function impact(el, color) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const size = Math.max(r.width, r.height);

    // ударная волна
    const ring = document.createElement('i');
    ring.className = 'shock';
    Object.assign(ring.style, {
      left: `${cx}px`, top: `${cy}px`, width: `${size}px`, height: `${size}px`, borderColor: '#71717a',
    });
    document.body.append(ring);
    ring.animate([{ scale: '.5', opacity: 0.8 }, { scale: '2.2', opacity: 0 }],
      { duration: T(420), easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => ring.remove();

    // трещины
    const S = size * 1.5;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'cracks');
    svg.setAttribute('viewBox', `${-S} ${-S} ${2 * S} ${2 * S}`);
    Object.assign(svg.style, { left: `${cx - S}px`, top: `${cy - S}px`, width: `${2 * S}px`, height: `${2 * S}px` });
    const cracks = [];
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + Math.random() * 0.7;
      const len = S * (0.5 + Math.random() * 0.45);
      let d = 'M0 0';
      for (let k = 1; k <= 5; k++) {
        const t = (k / 5) * len;
        const j = (Math.random() - 0.5) * S * 0.18;
        d += ` L${Math.cos(ang) * t - Math.sin(ang) * j} ${Math.sin(ang) * t + Math.cos(ang) * j}`;
      }
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', '#1d1d1f');
      p.setAttribute('stroke-width', '2.6');
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
      svg.append(p);
      cracks.push(p);
    }
    document.body.append(svg);
    cracks.forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration: T(140), easing: 'ease-out', fill: 'forwards' });
    });
    svg.animate([{ opacity: 1 }, { opacity: 1, offset: 0.45 }, { opacity: 0 }],
      { duration: T(700) }).onfinish = () => svg.remove();

    // осколки с гравитацией
    const tints = [color, '#1d1d1f', '#71717a'];
    for (let i = 0; i < 18; i++) {
      const d = document.createElement('i');
      d.className = 'shard';
      const s = 4 + Math.random() * 9;
      Object.assign(d.style, {
        left: `${cx}px`, top: `${cy}px`, width: `${s}px`, height: `${s}px`,
        background: tints[ri(0, 2)],
        clipPath: `polygon(${Math.random() * 40}% 0, 100% ${Math.random() * 60}%, ${30 + Math.random() * 50}% 100%)`,
      });
      document.body.append(d);
      const ang = Math.random() * Math.PI * 2;
      const sp = 70 + Math.random() * 150;
      const vx = Math.cos(ang) * sp;
      const vy = Math.sin(ang) * sp - 70;
      const rot = (Math.random() - 0.5) * 720;
      const frames = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        frames.push({
          transform: `translate(${vx * t}px, ${vy * t + 340 * t * t}px) rotate(${rot * t}deg)`,
          opacity: 1 - t * t,
        });
      }
      d.animate(frames, { duration: T(650 + Math.random() * 400), easing: 'linear' })
        .onfinish = () => d.remove();
    }

    // встряска сцены
    const stage = document.querySelector('.stage:not([hidden])');
    if (stage) {
      stage.animate([
        { translate: '0 0' }, { translate: '-6px 4px' }, { translate: '5px -4px' },
        { translate: '-3px 2px' }, { translate: '0 0' },
      ], { duration: T(280), easing: 'ease-out' });
    }
  }

  /* кувалда замахивается и бьёт по элементу; Promise завершается в момент удара */
  function smash(el) {
    return new Promise((resolve) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const cs = getComputedStyle(el);
      const sc = (parseFloat(cs.fontSize) * 1.25) / 100;
      const color = cs.color;

      const h = document.createElement('div');
      h.className = 'hammer';
      h.innerHTML = HAMMER_SVG;
      Object.assign(h.style, {
        left: `${cx - 100 * sc}px`, top: `${cy - 155 * sc}px`,
        width: `${200 * sc}px`, height: `${200 * sc}px`,
      });
      document.body.append(h);

      let fired = false;
      const hit = () => {
        if (fired) return;
        fired = true;
        impact(el, color);
        h.animate([{ rotate: '3deg', opacity: 1 }, { rotate: '-38deg', opacity: 0 }],
          { duration: T(300), easing: 'ease-out', fill: 'forwards' }).onfinish = () => h.remove();
        resolve();
      };
      const swing = h.animate([
        { rotate: '-55deg', opacity: 0, easing: 'ease-out' },
        { rotate: '-100deg', opacity: 1, offset: 0.35, easing: 'cubic-bezier(.7,0,1,.55)' },
        { rotate: '3deg', opacity: 1 },
      ], { duration: T(460), fill: 'forwards' });
      swing.onfinish = hit;
      setTimeout(hit, T(460) + 300);
    });
  }

  /* после удара число рассыпается на две части, они разлетаются в стороны */
  function crumble(restEl, partEl, src) {
    const b = partEl.getBoundingClientRect();
    const dx = src.left + src.width / 2 - (b.left + b.width / 2);
    const dy = src.top + src.height / 2 - (b.top + b.height / 2);
    const spring = 'cubic-bezier(.3,1.45,.5,1)';
    partEl.animate([
      { translate: `${dx}px ${dy}px`, scale: '1.3', rotate: '-18deg', opacity: 0.2 },
      { translate: '0 0', scale: '1', rotate: '0deg', opacity: 1 },
    ], { duration: T(640), easing: spring });
    restEl.animate([
      { scale: '1.2', rotate: '16deg' },
      { scale: '1', rotate: '0deg' },
    ], { duration: T(640), easing: spring });
  }

  Object.assign(MG, {
    gcd, spf, isPrime, factorize,
    $, T, sleep, EASE, ri, rnd, pick, center, wait, levelOf, PENALTY, hinter, sweepFx,
    colorOf, setStats, mf, rowWidth,
    snapshot, play, ghost, burst, popIn, bump, shake, indivisible, rocket, explode,
    smash, crumble,
  });
})();

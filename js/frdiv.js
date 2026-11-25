/* Режим «Деление уголком» (frdiv), остров II «Перевод дробей» раздела «Десятичные дроби».
 * Инструмент — динамит (tnt): одна шашка со шнуром.
 *
 * 1) На экране дробь «3/8». Игрок берёт динамит и нажимает на дробь — выезжает планшет (MG.clip.askDec):
 *    числитель делится на знаменатель уголком; после целых в частном ставится запятая и сносятся нули,
 *    пока остаток не станет 0. Ошибка в шаге — клетка трясётся, на планшете подсказка.
 * 2) Деление верное — планшет уезжает, связка динамита в руке (takeTnt); тап по дроби — динамит встаёт к ней,
 *    искра бежит по шнуру, взрыв (blast — анимацию можно заменить, не трогая остальное) — на месте дроби 0,375.
 * 3) Дробь с целой частью: делится только дробная часть, целая встаёт перед запятой: 2 3/8 = 2,375.
 * 8 примеров в 4 стадии: знаменатели 2, 4, 5 → 8, 20, 25 → неправильные дроби → целая часть и 16, 40. */
(() => {
  'use strict';
  const MG = window.MG;
  const { $, T, sleep, ri, setStats } = MG;
  const snd = (n, o) => { if (MG.snd && MG.snd.play) MG.snd.play(n, o); };

  const view = $('#fv-view');
  const after = $('#fv-after');
  const resultText = $('#fv-resultText');
  const nextBtn = $('#fv-next');
  if (!view) return;
  const hint = MG.hinter($('#fv-hint'));
  const NAME = 'frdiv', TOOL = 'tnt';

  /* раскладка дроби — общие классы .fd-* из frdec.js; здесь только динамит и взрыв */
  const css = document.createElement('style');
  css.textContent = `
    .fv-tnt { position: absolute; z-index: 5; pointer-events: none; }
    .fv-hand { position: fixed; left: 0; top: 0; z-index: 60; pointer-events: none; }
    .fv-hand svg { width: 100%; height: 100%; display: block; overflow: visible; filter: drop-shadow(0 10px 10px rgba(0,0,0,.3)); }
    .fv-tnt svg { width: 100%; height: 100%; display: block; overflow: visible; filter: drop-shadow(0 8px 8px rgba(0,0,0,.3)); }
    .fv-spark { position: absolute; width: 7px; height: 7px; background: #fbbf24; pointer-events: none; z-index: 6; }
    .fv-px { position: absolute; pointer-events: none; z-index: 7; }
    .fv-flash { position: absolute; border-radius: 50%; pointer-events: none; z-index: 6;
      background: radial-gradient(circle, #fffbe6 0 30%, #fde047 45%, rgba(249,115,22,.55) 65%, rgba(249,115,22,0) 72%); }
    .fv-dec { position: absolute; left: 0; right: 0; text-align: center; font-weight: 900; line-height: 1; color: #16a34a; z-index: 4; }
  `;
  document.head.append(css);

  /* ---------- примеры ---------- */
  const TOTAL = 8;
  let state = null, solved = 0, lastKey = '';
  const lvlOf = () => Math.min(4, 1 + Math.floor(solved / 2));
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const pickN = (lo, hi, d) => { for (let i = 0; i < 50; i++) { const n = ri(lo, hi); if (gcd(n, d) === 1) return n; } return lo; };
  const pickOf = (a) => a[ri(0, a.length - 1)];

  function pick() {
    const L = lvlOf(), second = solved % 2 === 1;
    if (solved === 0 && !lastKey) return { w: 0, n: 1, d: 2 };
    for (let i = 0; i < 100; i++) {
      let t;
      if (L === 1) { const d = pickOf([2, 4, 5]); t = { w: 0, n: pickN(1, d - 1, d), d }; }
      else if (L === 2) { const d = pickOf([8, 20, 25]); t = { w: 0, n: pickN(1, d - 1, d), d }; }
      else if (L === 3) { const d = pickOf([2, 4, 5, 8]); t = { w: 0, n: pickN(d + 1, 3 * d - 1, d), d }; }
      else if (!second) { const d = pickOf([4, 8, 20, 25]); t = { w: ri(1, 9), n: pickN(1, d - 1, d), d }; }   // целая часть
      else { const d = pickOf([16, 40]); t = { w: 0, n: pickN(1, d - 1, d), d }; }
      const key = `${t.w} ${t.n}/${t.d}`;
      if (key === lastKey) continue;
      return t;
    }
    return { w: 0, n: 3, d: 8 };
  }
  const label = (t) => `${t.w ? `${t.w} ` : ''}${t.n}/${t.d}`;
  /* w + n/d в десятичной записи (дробь конечная) */
  function decOf(t) {
    let k = 0;
    while ((t.n * 10 ** k) % t.d && k < 6) k++;
    const D = 10 ** k, N = t.w * D + (t.n * D) / t.d;
    const ip = String(Math.floor(N / D)), fp = k ? String(N % D).padStart(k, '0') : '';
    return fp ? `${ip},${fp}` : ip;
  }

  /* ---------- раскладка ---------- */
  const mk = (tag, cls, txt, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; if (parent) parent.append(e); return e; };
  function layout(st) {
    const vw = Math.max(260, view.clientWidth), vh = Math.max(360, view.clientHeight);
    const len = Math.max(String(st.task.n).length, String(st.task.d).length) + 4 + (st.task.w ? 2 : 0);
    const fs = Math.max(30, Math.min(64, Math.floor((vw - 24) / (len * 0.62))));
    view.style.setProperty('--fd-fs', `${fs}px`);
    view.style.setProperty('--fd-top', `${Math.round(Math.min(vh * 0.2, 120))}px`);
    const r = st.row.getBoundingClientRect(), vr = view.getBoundingClientRect();
    view.parentElement.style.setProperty('--fd-after', `${view.offsetTop + (r.bottom - vr.top) + 30}px`);
  }
  function draw(st) {
    st.row.replaceChildren();
    if (st.task.w) mk('span', 'fd-w', String(st.task.w), st.row);
    st.fr = mk('div', 'fr fd-fr', undefined, st.row);
    mk('div', 'fd-num', String(st.task.n), st.fr);
    mk('div', 'fd-bar', undefined, st.fr);
    mk('div', 'fd-den', String(st.task.d), st.fr);
    layout(st);
  }

  function newRound() {
    window.dispatchEvent(new Event('mg:round'));
    if (state && state.dropHand && state.hand) state.dropHand();
    const task = pick();
    lastKey = `${task.w} ${task.n}/${task.d}`;
    after.classList.remove('show');
    view.replaceChildren();
    if (MG.tools.current()) MG.tools.clear();
    const st = { task, busy: false, done: false, asking: false };
    state = st;
    st.row = mk('div', 'fd-row fracs', undefined, view);
    draw(st);
    st.row.animate([{ opacity: 0, translate: '0 12px' }, { opacity: 1, translate: '0 0' }], { duration: T(350), easing: 'ease-out' });
    st.row.addEventListener('click', () => {
      if (MG.tools.current() === TOOL) openTablet(st); else if (MG.tools.need) MG.tools.need(TOOL);
    });
    setStats(lvlOf(), solved);
    hint.set(task.w
      ? `Возьми динамит и раздели уголком ${task.n} на ${task.d} — целая часть ${task.w} встанет перед запятой`
      : `Возьми динамит и раздели уголком ${task.n} на ${task.d}`);
  }

  let sayT = 0;
  function bubble(text, ms = 2600) {
    view.querySelectorAll('.dc-say').forEach((e) => e.remove());
    clearTimeout(sayT);
    const b = mk('div', 'dc-say', text, view);
    const r = state.row.getBoundingClientRect(), vr = view.getBoundingClientRect();
    b.style.left = `${vr.width / 2}px`; b.style.top = `${r.bottom - vr.top + 16}px`;
    sayT = setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 320); }, T(ms));
  }

  /* планшет: деление уголком; всё верно — взрыв */
  async function openTablet(st) {
    if (st !== state || st.done || st.busy || st.asking || st.hand) return;
    st.asking = true;
    view.querySelectorAll('.dc-say').forEach((e) => e.classList.add('out'));
    const res = await MG.clip.askDec(st.task.n, st.task.d, st.row, { w: st.task.w || 0 });
    st.asking = false;
    if (state !== st || st.done || !res) return;
    st.busy = true;
    await sleep(350);
    if (state !== st) return;
    blast(st, decOf(st.task), null);                         // динамит сам падает к дроби (takeTnt — вариант «в руку»)
  }

  /* ---------- динамит в руке: ходит за пальцем/мышью, тап по дроби — положить ---------- */
  const tntSvg = () => (MG.tools.icon(TOOL) || '').replace('<svg ', '<svg preserveAspectRatio="xMidYMid meet" ');
  const sizeOf = (st) => Math.round(Math.max(90, Math.min(140, st.row.getBoundingClientRect().height * 0.9)));
  function takeTnt(st) {
    const S = sizeOf(st);
    const g = mk('div', 'fv-hand', undefined, document.body);
    g.innerHTML = tntSvg();
    Object.assign(g.style, { width: `${S}px`, height: `${S}px` });
    const tb = document.querySelector(`.toolbar .tool[data-id="${TOOL}"]`);
    const r0 = tb ? tb.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight - 80, width: 0, height: 0 };
    const fr = st.row.getBoundingClientRect();
    let px = r0.left + r0.width / 2, py = Math.min(r0.top - S * 0.2, fr.bottom + S * 0.9);
    const put = () => { g.style.transform = `translate(${px - S / 2}px, ${py - S / 2}px) rotate(-12deg)`; };
    put();
    g.animate([{ scale: '.3', opacity: 0 }, { scale: '1.12', opacity: 1, offset: 0.6 }, { scale: '1', opacity: 1 }], { duration: T(420), easing: 'ease-out' });
    snd('pop');
    st.hand = g;
    bubble('Положи динамит на дробь', 2400);
    const onMove = (e) => { px = e.clientX; py = e.clientY; put(); };
    window.addEventListener('pointermove', onMove);
    const arm = () => MG.joker.armSticky((ev) => {
      if (state !== st || st.hand !== g) return;
      if (ev.type !== 'pointerup') { arm(); return; }
      const f = st.row.getBoundingClientRect(), P = 28;
      const onFrac = ev.clientX > f.left - P && ev.clientX < f.right + P && ev.clientY > f.top - P && ev.clientY < f.bottom + P;
      if (!onFrac) {
        const t = document.elementFromPoint(ev.clientX, ev.clientY);
        px = ev.clientX; py = ev.clientY; put(); arm();
        if (t && t.closest && t.closest('.toolbar button, #home-btn, .after button')) t.closest('button').click();
        return;
      }
      window.removeEventListener('pointermove', onMove);
      st.hand = null; st.busy = true;
      view.querySelectorAll('.dc-say').forEach((x) => x.classList.add('out'));
      blast(st, decOf(st.task), g);
    });
    arm();
    st.dropHand = () => { window.removeEventListener('pointermove', onMove); g.remove(); st.hand = null; };
  }

  /* ---------- динамит прислоняется к дроби, шнур догорает, взрыв → десятичная дробь ---------- */
  async function blast(st, dec, hand) {
    const vr = view.getBoundingClientRect(), fr = st.row.getBoundingClientRect();
    const cx = fr.left + fr.width / 2 - vr.left, cy = fr.top + fr.height / 2 - vr.top;
    const fs = parseFloat(getComputedStyle(st.row).fontSize) || 56;
    const S = sizeOf(st);
    /* 1. динамит из руки встаёт к дроби справа, чуть наклонившись */
    const bx = Math.min(vr.width - S * 0.55, fr.right - vr.left + S * 0.4), by = fr.bottom - vr.top - S / 2;
    const box = mk('div', 'fv-tnt', undefined, view);
    box.innerHTML = tntSvg();
    Object.assign(box.style, { width: `${S}px`, height: `${S}px`, left: `${bx - S / 2}px`, top: `${by - S / 2}px` });
    if (hand) {                                                // из руки — дугой к дроби
      const hr = hand.getBoundingClientRect();
      hand.remove();
      const hx = hr.left + hr.width / 2 - vr.left - bx, hy = hr.top + hr.height / 2 - vr.top - by;
      await box.animate([
        { transform: `translate(${hx}px, ${hy}px) rotate(-12deg)` },
        { transform: `translate(${hx * 0.4}px, ${hy * 0.4 - 40}px) rotate(-4deg)`, offset: 0.55 },
        { transform: 'translate(0, 0) rotate(-8deg) scale(1.05, .92)', offset: 0.85 },
        { transform: 'translate(0, 0) rotate(-8deg)' },
      ], { duration: T(520), easing: 'cubic-bezier(.4,0,.4,1)', fill: 'forwards' }).finished.catch(() => {});
    } else {                                                   // сам падает сверху, крутясь, и встаёт к дроби
      snd('whoosh', { dur: 0.3 });
      await box.animate([
        { transform: `translateY(${-by - S}px) rotate(-200deg)` },
        { transform: 'translateY(0) rotate(-8deg) scale(1.08, .88)', offset: 0.62 },
        { transform: 'translateY(-18px) rotate(-14deg)', offset: 0.8 },
        { transform: 'translateY(0) rotate(-8deg)' },
      ], { duration: T(760), easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' }).finished.catch(() => {});
      if (state !== st) return;
      st.row.animate([{ translate: '0 0' }, { translate: '-3px 2px' }, { translate: '0 0' }], { duration: T(200) });
    }
    if (state !== st) return;
    snd('pop');
    /* 2. шнур горит: искра бежит по шнуру к шашкам, шнур укорачивается */
    const sv = box.querySelector('svg'), fz = sv.querySelector('.fz'), fz2 = sv.querySelector('.fz2'), sp = sv.querySelector('.sp');
    const len = fz.getTotalLength();
    const FUSE = T(1500), t0 = performance.now();
    let lastSpark = 0;
    snd('tick');
    await new Promise((res) => {
      (function frame(now) {
        if (state !== st) { res(); return; }
        const t = Math.min(1, (now - t0) / FUSE), l = len * (1 - t);
        fz.style.strokeDasharray = `${l} ${len}`;
        if (fz2) { fz2.style.opacity = t < 1 ? '1' : '0'; fz2.style.clipPath = 'none'; fz2.style.strokeDashoffset = '0'; fz2.setAttribute('stroke-dasharray', Array(Math.max(1, Math.round(l / 2.6))).fill('1.2 1.4').join(' ') + ` 0 ${len}`); }
        const pt = fz.getPointAtLength(l);
        sp.setAttribute('transform', `translate(${pt.x} ${pt.y}) rotate(${(now / 3) % 360}) scale(${1 + Math.sin(now / 40) * 0.25})`);
        if (now - lastSpark > 45) {
          lastSpark = now;
          const m = fz.getScreenCTM(), sx = m.a * pt.x + m.c * pt.y + m.e - vr.left, sy = m.b * pt.x + m.d * pt.y + m.f - vr.top;
          for (let i = 0; i < 2; i++) {
            const q = mk('i', 'fv-spark', undefined, view);
            Object.assign(q.style, { left: `${sx - 3}px`, top: `${sy - 3}px`, background: Math.random() < 0.5 ? '#fde047' : '#f97316' });
            q.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${(Math.random() - 0.5) * 36}px, ${-8 - Math.random() * 22}px) scale(.3)`, opacity: 0 }], { duration: T(380), easing: 'ease-out' }).onfinish = () => q.remove();
          }
        }
        if (t > 0.7) box.style.translate = `${(Math.random() - 0.5) * 4}px ${(Math.random() - 0.5) * 3}px`;
        if (t < 1) requestAnimationFrame(frame); else res();
      })(t0);
    });
    if (state !== st) return;
    /* 3. взрыв: вспышка, пиксельные осколки и дым, экран трясётся */
    snd('boom');
    box.remove();
    st.row.style.visibility = 'hidden';
    const R = S * 1.2;
    const fl = mk('div', 'fv-flash', undefined, view);
    Object.assign(fl.style, { left: `${cx - R}px`, top: `${cy - R}px`, width: `${R * 2}px`, height: `${R * 2}px` });
    fl.animate([{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1)', opacity: 1, offset: 0.35 }, { transform: 'scale(1.15)', opacity: 0 }], { duration: T(520), easing: 'ease-out', fill: 'forwards' }).onfinish = () => fl.remove();
    const COL = ['#c0392b', '#8e2a1f', '#e35d4a', '#3b2a20', '#fbbf24', '#f97316', '#9ca3af', '#6b7280'];
    for (let i = 0; i < 34; i++) {
      const p = mk('i', 'fv-px', undefined, view);
      const sz = 6 + Math.round(Math.random() * 10), a = Math.random() * Math.PI * 2, sp = S * (0.6 + Math.random() * 1.1);
      Object.assign(p.style, { left: `${cx - sz / 2}px`, top: `${cy - sz / 2}px`, width: `${sz}px`, height: `${sz}px`, background: COL[i % COL.length] });
      const dx = Math.cos(a) * sp, dy = Math.sin(a) * sp * 0.8;
      p.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx * 0.7}px, ${dy * 0.7 - 20}px) rotate(${(Math.random() - 0.5) * 300}deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy + 60}px) rotate(${(Math.random() - 0.5) * 600}deg)`, opacity: 0 },
      ], { duration: T(700 + Math.random() * 400), easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).onfinish = () => p.remove();
    }
    for (let i = 0; i < 9; i++) {                                    // клубы дыма — серые квадраты
      const p = mk('i', 'fv-px', undefined, view);
      const sz = 22 + Math.round(Math.random() * 22), a = (i / 9) * Math.PI * 2;
      Object.assign(p.style, { left: `${cx - sz / 2}px`, top: `${cy - sz / 2}px`, width: `${sz}px`, height: `${sz}px`, background: i % 2 ? '#d4d4d8' : '#e4e4e7' });
      p.animate([
        { transform: 'translate(0,0) scale(.3)', opacity: 0.95 },
        { transform: `translate(${Math.cos(a) * S * 0.55}px, ${Math.sin(a) * S * 0.4 - 24}px) scale(1.2)`, opacity: 0 },
      ], { duration: T(1100), delay: T(80), easing: 'ease-out', fill: 'both' }).onfinish = () => p.remove();
    }
    const stage = view.closest('.stage');
    if (stage) stage.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-7px,4px)' }, { transform: 'translate(6px,-5px)' }, { transform: 'translate(-4px,2px)' }, { transform: 'translate(0,0)' }], { duration: T(380) });
    await sleep(260);
    if (state !== st) return;
    /* 4. на месте дроби — десятичная */
    const out = mk('div', 'fv-dec', dec, view);
    out.style.fontSize = `${Math.round(fs * 1.15)}px`;
    out.style.top = `${cy - fs * 0.6}px`;
    out.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1.18)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: T(520), easing: 'cubic-bezier(.3,1.4,.5,1)' });
    await sleep(600);
    if (state !== st) return;
    finish(st, out, dec);
  }

  function finish(st, el, dec) {
    st.done = true; st.busy = true;
    snd('pop');
    if (MG.burst) MG.burst(el, '#16a34a', 14);
    solved++;
    setStats(lvlOf(), solved);
    resultText.textContent = `${label(st.task)} = ${dec}`;
    layout(st);
    after.classList.add('show');
    if (solved >= TOTAL) setTimeout(offerDone, T(1200));
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  function offerDone() {
    if (document.querySelector('.so-ov')) return;
    const ov = document.createElement('div');
    ov.className = 'so-ov';
    ov.innerHTML = '<div class="skip-offer" role="dialog"><h3>Уровень пройден!</h3><p>Ты научился делить уголком и переводить дроби в десятичные. Идём дальше.</p><div class="so-row"><button type="button" class="so-go">На карту</button></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('.so-go').addEventListener('click', () => {
      try { localStorage.setItem(`mg.solved.${NAME}`, String(Math.max(TOTAL, solved))); } catch (err) { /* нет хранилища */ }
      ov.remove();
      const home = document.getElementById('home-btn');
      if (home) home.click();
    });
  }

  nextBtn.addEventListener('click', () => {
    if (solved >= TOTAL) { offerDone(); return; }
    const o = document.querySelector('.so-ov'); if (o) o.remove();
    newRound();
  });
  window.addEventListener('toolchange', (e) => {
    if (MG.active !== MG.modes[NAME] || e.detail.tool !== TOOL || !state || state.done) return;
    setTimeout(() => { if (MG.tools.current() === TOOL) openTablet(state); }, T(200));
  });
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (MG.active === MG.modes[NAME] && state) layout(state); }, 150); });

  MG.modes[NAME] = {
    total: TOTAL,
    levelUp() { solved = Math.min(TOTAL, (Math.floor(solved / 2) + 1) * 2); if (solved >= TOTAL) { setStats(lvlOf(), solved); offerDone(); return; } newRound(); },
    start() {
      if (MG.tools.current()) MG.tools.clear();
      if (!state || state.done) newRound(); else { setStats(lvlOf(), solved); layout(state); }
    },
    skip() { if (solved >= TOTAL) { offerDone(); return; } newRound(); },
    stop() { if (state && state.dropHand && state.hand) state.dropHand(); if (state && (state.busy || state.done)) state = null; },
    /* подсказка-палец (coach.js): динамит → дробь → на планшете цифры по шагам деления */
    coachStep() {
      const st = state;
      if (!st || st.done || st.busy) return null;
      const ov = document.querySelector('.clip-ov.dec:not(.out)');
      if (ov) {
        const want = ov.dataset.want;
        const key = want ? ov.querySelector(`.k[data-d="${want}"]`) : null;
        return key ? { tool: TOOL, el: key, text: ov.dataset.tip || 'Набери цифру' } : null;
      }
      if (st.asking) return null;
      if (st.hand) return { tool: TOOL, el: st.fr, text: 'Положи динамит на дробь' };
      return { tool: TOOL, el: st.fr, text: `Нажми динамитом на дробь и раздели ${st.task.n} на ${st.task.d} уголком` };
    },
    _state: () => state,
  };
})();

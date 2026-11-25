/* Режим «Деление десятичных дробей» (decdiv), остров III «Деление» раздела «Десятичные дроби».
 * Пример 12,5 : 0,05 решается знакомыми инструментами:
 * 1) Гамбургер (burger): выбрал инструмент — под примером бургер собирается и уезжает вправо, снова и снова: булки с числами собирают начинку «÷»
 *    (помидор, котлета, огурец); появляются места над и под «÷», ученик сам перетаскивает делимое в числитель, делитель в знаменатель.
 * 2) Джокер (joker): планшет «на что умножаем» (MG.clip.askMul), карта с числом кладётся на дробь: 12,5·100 / 0,05·100.
 *    Множитель — только наименьший, который убирает обе запятые (10, 100 или 1000); иначе карта рассыпается с подсказкой.
 * 3) Гарпун (harpoon): по числителю, потом по знаменателю — ружьё из dec10.js (MG.harpoon.embed) прямо на строке
 *    числа: зарядить «1» и нули, «БАХ!», катушкой подтянуть запятую → 1250 / 5.
 * 4) Кувалда (hammer) разбивает числа на множители, 5) ластик (glove) стирает пары одинаковых сверху и снизу,
 *    6) молния (bolt) перемножает оставшиеся множители: 2·5·5·5 = 250, 7) топор (axe) срубает 1 в знаменателе — ответ 250.
 * 8 примеров в 4 стадии: по одному знаку (×10) → по два (×100) → до трёх (×1000) → разное число знаков и целые делимые. */
(() => {
  'use strict';
  const MG = window.MG;
  const { $, T, sleep, ri, setStats, burst, isPrime, spf, gcd, colorOf, snapshot, play, popIn, smash, crumble, indivisible } = MG;
  const snd = (n, o) => { if (MG.snd && MG.snd.play) MG.snd.play(n, o); };

  const view = $('#dd-view');
  const after = $('#dd-after');
  const resultText = $('#dd-resultText');
  const nextBtn = $('#dd-next');
  if (!view) return;
  const hint = MG.hinter($('#dd-hint'));
  const NAME = 'decdiv', BURGER = 'burger', JOKER = 'joker', HARP = 'harpoon', HAMMER = 'hammer', GLOVE = 'glove', BOLT = 'bolt', AXE = 'axe';
  const INK = '#1d1d1f', BLUE = '#3f63c9';

  const css = document.createElement('style');
  css.textContent = `
    #mode-decdiv .fd-row { transition: font-size .45s ease; }
    .dd-drag { cursor: grab; touch-action: none; user-select: none; border-radius: 10px; transition: opacity .2s; }
    .dd-drag.took { opacity: .25; }
    .dd-ghost { position: fixed; z-index: 70; pointer-events: none; font-weight: 900; color: ${INK}; line-height: 1; white-space: nowrap; filter: drop-shadow(0 6px 8px rgba(0,0,0,.25)); }
    .dd-slot { opacity: 0; }
    .dd-slot.show { opacity: 1; }
    .dd-slot { position: absolute; z-index: 2; box-sizing: border-box; border: 2.5px dashed rgba(29,29,31,.28); border-radius: 12px; pointer-events: none; transition: border-color .2s, background .2s, opacity .3s; }
    .dd-slot.on { border-color: rgba(63,99,201,.6); background: rgba(63,99,201,.06); animation: ddPulse 1s ease-in-out infinite; }
    .dd-slot.hov { border-color: #3f63c9; background: rgba(63,99,201,.16); }
    .dd-slot.show.done { opacity: 0; }
    @keyframes ddPulse { 50% { transform: scale(1.06); } }
    .dd-gbar { position: absolute; z-index: 1; translate: -50% 0; border-radius: 999px; background: ${INK}; transition: width .55s cubic-bezier(.3,1.2,.4,1); pointer-events: none; }
    .dd-burger { position: absolute; left: 50%; translate: -50% 0; width: min(76%, 300px); aspect-ratio: 300 / 140; pointer-events: none; opacity: .95; }
    .dd-burger svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .dd-burger g { transform-box: view-box; }
    .dd-burger .all, .dd-burger .btx, .dd-burger .bty, .dd-burger .bbx, .dd-burger .bby, .dd-burger .tm, .dd-burger .cu { animation: 5.2s linear infinite; }
    .dd-burger .all { animation-name: ddAll; } .dd-burger .btx { animation-name: ddBtx; } .dd-burger .bty { animation-name: ddBty; } .dd-burger .bbx { animation-name: ddBbx; } .dd-burger .bby { animation-name: ddBby; } .dd-burger .tm { animation-name: ddTm; } .dd-burger .cu { animation-name: ddCu; }
    /* булки летят по плавной дуге: по горизонтали и по вертикали — отдельные движения со своими плавными разгонами */
    @keyframes ddAll { 0% { transform: translate(-40px, 0); opacity: 0; animation-timing-function: ease-out; } 7%, 70% { transform: translate(0, 0); opacity: 1; animation-timing-function: ease-in-out; } 74% { transform: translate(-8px, 0) rotate(-3deg); animation-timing-function: cubic-bezier(.5,0,.8,.6); } 94% { transform: translate(200px, 0); opacity: 1; animation-timing-function: linear; } 100% { transform: translate(240px, 0); opacity: 0; } }
    @keyframes ddBtx { 0%, 7% { transform: translateX(-100px); animation-timing-function: cubic-bezier(.42,0,.58,1); } 52%, 100% { transform: translateX(0); } }
    @keyframes ddBbx { 0%, 7% { transform: translateX(100px); animation-timing-function: cubic-bezier(.42,0,.58,1); } 52%, 100% { transform: translateX(0); } }
    @keyframes ddBty { 0%, 7% { transform: translateY(0); animation-timing-function: cubic-bezier(.3,.6,.5,1); } 30% { transform: translateY(-40px); animation-timing-function: cubic-bezier(.45,0,.4,1); } 58%, 100% { transform: translateY(-14px); } }
    @keyframes ddBby { 0%, 7% { transform: translateY(0); animation-timing-function: cubic-bezier(.3,.6,.5,1); } 30% { transform: translateY(40px); animation-timing-function: cubic-bezier(.45,0,.4,1); } 58%, 100% { transform: translateY(14px); } }
    @keyframes ddTm { 0%, 44% { transform: translate(0, -18px) scale(1); opacity: 1; animation-timing-function: ease-in-out; } 58%, 100% { transform: translate(0, -10px) scale(0); opacity: 0; } }
    @keyframes ddCu { 0%, 44% { transform: translate(0, 18px) scale(1); opacity: 1; animation-timing-function: ease-in-out; } 58%, 100% { transform: translate(0, 10px) scale(0); opacity: 0; } }
    .dd-ex { position: absolute; left: 0; right: 0; top: var(--fd-top, 22%); display: flex; align-items: center; justify-content: center; gap: .32em; font-size: var(--fd-fs, 56px); font-weight: 900; color: ${INK}; line-height: 1; white-space: nowrap; }
    .dd-sign { width: .62em; height: .62em; display: block; }
    .dd-sign svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .dd-lay { position: absolute; inset: 0; pointer-events: none; font-weight: 900; color: ${INK}; line-height: 1; z-index: 3; }
    .dd-lay .n { position: absolute; white-space: nowrap; }
    .dd-lay .bar { position: absolute; border-radius: 999px; background: ${INK}; margin: 0; min-width: 0; transition: none; }
    .dd-lay .dot { position: absolute; border-radius: 50%; background: ${INK}; }
    .dd-lay .hk { position: absolute; overflow: visible; }
    .dd-lay .hk svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .dd-tf { position: absolute; left: 0; right: 0; top: var(--fd-top, 22%); display: flex; justify-content: center; --gap: .5em; }
    .dd-tf .fraction { width: auto; font-size: var(--dd-tfs, 56px); }
    .dd-tf .row { width: auto; padding: 0 .2em; }
    .dd-hp { position: absolute; inset: 0; z-index: 4; display: none; }
    .dd-ans { position: absolute; left: 0; right: 0; text-align: center; font-weight: 900; color: #16a34a; line-height: 1; }
    #mode-decdiv .fd-num.hpd, #mode-decdiv .fd-den.hpd { color: #b9b9b2; }
  `;
  document.head.append(css);

  /* ---------- примеры ---------- */
  const TOTAL = 8;
  let state = null, solved = 0, lastKey = '';
  const lvlOf = () => Math.min(4, 1 + Math.floor(solved / 2));
  const decs = (s) => (s.split(',')[1] || '').length;
  /* целое v / 10^d → строка с запятой, без нулей в конце */
  function fmt(v, d) {
    if (!d) return String(v);
    const s = String(v).padStart(d + 1, '0');
    const ip = s.slice(0, -d), fp = s.slice(-d).replace(/0+$/, '');
    return fp ? `${ip},${fp}` : ip;
  }
  const nFac = (n) => { let c = 0; for (let p = 2; n > 1; ) { if (n % p === 0) { n /= p; c++; } else p++; } return c; };
  function make(a, b) {
    const z = Math.max(decs(a), decs(b)), p = 10 ** z;
    const toInt = (s) => Number((s.replace(',', '') + '0'.repeat(z - decs(s))));
    const N = toInt(a), Dn = toInt(b);
    return { a, b, z, p, N, Dn, Q: N / Dn };
  }
  const pickOf = (arr) => arr[ri(0, arr.length - 1)];
  function pick() {
    const L = lvlOf(), second = solved % 2 === 1;
    if (solved === 0 && !lastKey) return make('7,5', '0,5');
    for (let i = 0; i < 400; i++) {
      let db, k, Q, ok;
      if (L === 1) { db = 1; k = pickOf([2, 3, 4, 5, 6, 8, 12, 15, 25]); Q = ri(2, 30); ok = (q) => (q * k) % 10 !== 0; }
      else if (L === 2) { db = 2; k = pickOf([4, 5, 15, 25, 35, 45, 75, 125]); Q = ri(2, 60); ok = (q) => (q * k) % 100 !== 0; }
      else if (L === 3) { db = 3; k = pickOf([4, 5, 8, 25, 75, 125, 375]); Q = ri(2, 40); ok = (q) => (q * k) % 1000 !== 0; }
      else if (!second) { db = 2; k = pickOf([4, 5, 25, 75, 125]); Q = ri(2, 60); ok = (q) => (q * k) % 100 === 0; }   // целое делимое: 4 : 0,25
      else { db = pickOf([2, 3]); k = db === 2 ? pickOf([4, 5, 25, 75]) : pickOf([8, 25, 125, 375]); Q = ri(2, 40); ok = (q) => (q * k) % 10 ** (db - 1) === 0 && (q * k) % 10 ** db !== 0; }   // у делимого меньше знаков
      if (!ok(Q)) continue;
      const t = make(fmt(Q * k, db), fmt(k, db));
      if (t.Dn < 2 || t.N > 99999 || nFac(t.N) > 7 || t.z !== Math.max(decs(t.a), decs(t.b))) continue;
      if (`${t.a}:${t.b}` === lastKey) continue;
      if (L === 2 && i < 40 && solved === 2) return make('12,5', '0,05');
      return t;
    }
    return make('12,5', '0,05');
  }

  /* ---------- раскладка ---------- */
  const mk = (tag, cls, txt, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; if (parent) parent.append(e); return e; };
  function layout(st) {
    const vw = Math.max(260, view.clientWidth), vh = Math.max(360, view.clientHeight);
    const t = st.task;
    const len = st.phase === 'hook' ? t.a.length + t.b.length + 5.5 : Math.max(t.a.length, t.b.length) + 4;   // перетаскивание: между числами и «÷» широкие промежутки
    const fs = Math.max(28, Math.min(60, Math.floor((vw - 24) / (len * 0.62))));
    view.style.setProperty('--fd-fs', `${fs}px`);
    view.style.setProperty('--fd-top', `${Math.round(Math.min(vh * 0.2, 120))}px`);
    const el = st.tf || st.row || st.ex;
    if (!el) return;
    const r = el.getBoundingClientRect(), vr = view.getBoundingClientRect();
    view.parentElement.style.setProperty('--fd-after', `${view.offsetTop + (r.bottom - vr.top) + 30}px`);
  }
  const SIGN = `<svg viewBox="0 0 20 20"><rect x="1.5" y="8.7" width="17" height="2.6" rx="1.3" fill="${INK}"/><circle cx="10" cy="3.6" r="2.2" fill="${INK}"/><circle cx="10" cy="16.4" r="2.2" fill="${INK}"/></svg>`;

  function drawEx(st) {
    st.ex = mk('div', 'dd-ex', undefined, view);
    st.aEl = mk('span', '', st.task.a, st.ex);
    st.sign = mk('span', 'dd-sign', undefined, st.ex); st.sign.innerHTML = SIGN;
    st.bEl = mk('span', '', st.task.b, st.ex);
    [st.aEl, st.bEl].forEach((el, i) => { el.classList.add('dd-drag'); el.addEventListener('pointerdown', (e) => dragStart(st, el, i === 0 ? 'num' : 'den', e)); });
  }
  /* дробь из крюка: та же раскладка, что в frdec (.fd-*) */
  function drawFrac(st) {
    st.row = mk('div', 'fd-row fracs', undefined, view);
    st.fr = mk('div', 'fr fd-fr', undefined, st.row);
    st.numEl = mk('div', 'fd-num', undefined, st.fr); st.numV = mk('span', '', st.task.a, st.numEl);
    st.barEl = mk('div', 'fd-bar', undefined, st.fr);
    st.denEl = mk('div', 'fd-den', undefined, st.fr); st.denV = mk('span', '', st.task.b, st.denEl);
    st.row.addEventListener('click', (e) => onFracClick(st, e));
  }

  function newRound() {
    window.dispatchEvent(new Event('mg:round'));
    dropHeld(state);
    if (harp) harp.stop();
    if (state && state.kit) state.kit.destroy();
    const task = pick();
    lastKey = `${task.a}:${task.b}`;
    after.classList.remove('show');
    view.replaceChildren();
    if (MG.tools.current()) MG.tools.clear();
    const st = { task, phase: 'hook', busy: false, done: false, hp: { num: false, den: false } };
    state = st;
    drawEx(st);
    layout(st);
    setupDrag(st);
    st.ex.animate([{ opacity: 0, translate: '0 12px' }, { opacity: 1, translate: '0 0' }], { duration: T(350), easing: 'ease-out' });
    setStats(lvlOf(), solved);
    hint.set('Возьми гамбургер — он покажет, как записать деление дробью');
  }

  let sayT = 0;
  function bubble(text, ms = 2600) {
    view.querySelectorAll('.dc-say').forEach((e) => e.remove());
    clearTimeout(sayT);
    const st = state;
    const b = mk('div', 'dc-say', text, view);
    const el = st && (st.tf || st.row || st.ex);
    const r = el ? el.getBoundingClientRect() : view.getBoundingClientRect(), vr = view.getBoundingClientRect();
    b.style.left = `${vr.width / 2}px`; b.style.top = `${r.bottom - vr.top + 16}px`;
    sayT = setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 320); }, T(ms));
  }
  const quiet = () => view.querySelectorAll('.dc-say').forEach((e) => e.classList.add('out'));

  /* ---------- 1. деление → дробь: ученик сам перетаскивает числа; под примером крутится «бургер» ---------- */
  /* Невидимая дробь стоит так, что её черта — на месте «÷»; пунктирные места над и под чертой — куда класть числа. */
  function setupDrag(st) {
    drawFrac(st);
    st.row.style.visibility = 'hidden';
    st.numEl.style.visibility = 'hidden'; st.denEl.style.visibility = 'hidden';
    st.ex.style.gap = '1.15em';                                       // числа по бокам — не налезают на места над и под чертой
    const vr = view.getBoundingClientRect();
    const bar = st.barEl.getBoundingClientRect(), ex = st.ex.getBoundingClientRect(), sg = st.sign.getBoundingClientRect();
    /* строка примера встаёт так, чтобы «÷» оказался на месте черты */
    st.ex.style.top = `${bar.top + bar.height / 2 - vr.top - ex.height / 2}px`;
    st.ex.style.translate = `${bar.left + bar.width / 2 - (sg.left + sg.width / 2)}px 0`;
    st.slots = {};
    ['num', 'den'].forEach((k) => {
      const v = (k === 'num' ? st.numV : st.denV).getBoundingClientRect();
      const sl = mk('div', 'dd-slot', undefined, view);
      const w = Math.max(v.width * 1.25, 60), h = v.height * 1.1;
      Object.assign(sl.style, { left: `${v.left + v.width / 2 - vr.left - w / 2}px`, top: `${v.top + v.height / 2 - vr.top - h / 2}px`, width: `${w}px`, height: `${h}px` });
      st.slots[k] = sl;
    });
    st.placed = { num: false, den: false };
    /* черта «÷» — отдельный элемент: плавно растёт под числа, которые кладут в дробь */
    {
      const sg2 = st.sign.getBoundingClientRect(), br = st.barEl.getBoundingClientRect();
      st.sign.querySelector('rect').style.opacity = '0';
      const g = mk('div', 'dd-gbar', undefined, view);
      st.gW0 = sg2.width * 0.86; st.gWmax = br.width;
      Object.assign(g.style, { left: `${br.left + br.width / 2 - vr.left}px`, top: `${br.top - vr.top}px`, height: `${br.height}px`, width: `${st.gW0}px` });
      st.gbar = g;
    }
    if (MG.tools.current() === BURGER) burger(st);
  }
  /* бургер-подсказка под примером: булки (с числами) расходятся и собирают начинку «÷» — помидор, котлету, огурец */
  function burger(st) {
    if (st.burger || st.phase !== 'hook') return;
    Object.values(st.slots).forEach((s2) => s2.classList.add('show'));
    snd('pop');
    const vr = view.getBoundingClientRect(), d = st.denV.getBoundingClientRect();
    const box = mk('div', 'dd-burger', undefined, view);
    box.style.top = `${d.bottom - vr.top + 34}px`;
    const fsz = (s2) => (s2.length > 4 ? 13 : 15);
    box.innerHTML = `<svg viewBox="-150 -70 300 140" aria-hidden="true"><g class="all">
      <g class="btx"><g class="bty"><path d="M-40 6 Q-40 -26 0 -26 Q40 -26 40 6 Z" fill="#eca45c" stroke="#2b2b33" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M-24 -14 Q-12 -21 4 -20" fill="none" stroke="#f8cf9c" stroke-width="3" stroke-linecap="round"/>
        <text x="0" y="-1" text-anchor="middle" font-weight="900" font-size="${fsz(st.task.a)}" fill="#2b2b33">${st.task.a}</text></g></g>
      <g class="tm"><circle r="9" fill="#c2553a" stroke="#7a2c1c" stroke-width="2.4"/><circle r="5" fill="none" stroke="#f0a08a" stroke-width="1.6"/></g>
      <g class="pt"><rect x="-38" y="-5" width="76" height="10" rx="5" fill="#8a5a1c" stroke="#5a3510" stroke-width="2.4"/><path d="M-30 -1 H30" stroke="#b07a2e" stroke-width="2" stroke-dasharray="6 5"/></g>
      <g class="cu"><circle r="9" fill="#dbe9b4" stroke="#7a9a4a" stroke-width="2.2"/><path d="M-3 -2 l1 1 M3 -3 l-1 1 M0 3 l0 1.5 M-4 3 l1 -1 M4 2 l-1 -1" stroke="#7a9a4a" stroke-width="1.4" stroke-linecap="round"/></g>
      <g class="bbx"><g class="bby"><path d="M-40 -6 H40 Q40 22 18 22 H-18 Q-40 22 -40 -6 Z" fill="#eca45c" stroke="#2b2b33" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M14 -6 H22 M26 -6 H31" stroke="#fff" stroke-width="2.6"/>
        <text x="0" y="13" text-anchor="middle" font-weight="900" font-size="${fsz(st.task.b)}" fill="#2b2b33">${st.task.b}</text></g></g></g>
    </svg>`;
    st.burger = box;
    box.animate([{ opacity: 0, scale: '.7' }, { opacity: 1, scale: '1' }], { duration: T(300), easing: 'ease-out' });
    hint.set('Смотри на гамбургер: верхняя булка — делимое, нижняя — делитель. Перетащи числа на места');
  }
  function dragStart(st, el, kind, e) {
    if (st !== state || st.phase !== 'hook' || st.busy || st.placed[kind] || st.drag) return;
    e.preventDefault();
    if (MG.tools.current() !== BURGER) { if (MG.tools.need) MG.tools.need(BURGER); return; }
    quiet();
    const r = el.getBoundingClientRect();
    const g = mk('div', 'dd-ghost', el.textContent, document.body);
    g.style.fontSize = getComputedStyle(el).fontSize;
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    const move = (x, y) => { g.style.left = `${x - dx}px`; g.style.top = `${y - dy}px`; };
    move(e.clientX, e.clientY);
    g.animate([{ scale: '1' }, { scale: '1.12' }], { duration: T(150), fill: 'forwards' });
    el.classList.add('took');
    Object.values(st.slots).forEach((s2) => s2.classList.add('on'));
    growBar(st, r.width);
    snd('tick');
    const over = (x, y) => Object.entries(st.slots).find(([k, s2]) => { if (st.placed[k]) return false; const q = s2.getBoundingClientRect(), P = 18; return x > q.left - P && x < q.right + P && y > q.top - P && y < q.bottom + P; });
    const onMove = (ev) => {
      move(ev.clientX, ev.clientY);
      const o = over(ev.clientX, ev.clientY);
      Object.entries(st.slots).forEach(([k, s2]) => s2.classList.toggle('hov', !!o && o[0] === k));
    };
    const back = (shake) => {
      const g0 = g.getBoundingClientRect();
      const a = g.animate(shake
        ? [{ transform: 'none' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-4px)' }, { transform: `translate(${r.left - g0.left}px, ${r.top - g0.top}px)`, scale: '1' }]
        : [{ transform: 'none' }, { transform: `translate(${r.left - g0.left}px, ${r.top - g0.top}px)`, scale: '1' }], { duration: T(shake ? 600 : 320), easing: 'ease-in-out', fill: 'forwards' });
      a.onfinish = () => { g.remove(); el.classList.remove('took'); };
      growBar(st, 0);
    };
    const onUp = (ev) => {
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      st.drag = null;
      Object.values(st.slots).forEach((s2) => s2.classList.remove('on', 'hov'));
      if (state !== st) { g.remove(); return; }
      const o = over(ev.clientX, ev.clientY);
      if (!o) { back(false); return; }
      if (o[0] !== kind) {
        snd('nope', { dur: 0.3 });
        back(true);
        bubble(kind === 'num' ? `${st.task.a} — делимое, его делят: оно идёт наверх, в числитель` : `${st.task.b} — делитель, на него делят: он идёт вниз, в знаменатель`, 2800);
        return;
      }
      place(st, kind, el, g);
    };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
    st.drag = { el, g };
  }
  /* ширина черты: под самым широким из уже положенных (и перетаскиваемого) чисел */
  function growBar(st, dragW) {
    if (!st.gbar) return;
    const placedW = ['num', 'den'].filter((k) => st.placed[k]).map((k) => (k === 'num' ? st.numV : st.denV).getBoundingClientRect().width);
    const both = st.placed.num && st.placed.den;
    const w = both ? st.gWmax : Math.min(st.gWmax, Math.max(st.gW0, dragW * 1.08, ...placedW.map((x) => x * 1.08)));
    st.gbar.style.width = `${w}px`;
  }
  async function place(st, kind, el, g) {
    st.placed[kind] = true;
    const v = (kind === 'num' ? st.numV : st.denV).getBoundingClientRect(), g0 = g.getBoundingClientRect();
    await g.animate([{ transform: 'none', scale: '1.12' }, { transform: `translate(${v.left - g0.left}px, ${v.top - g0.top}px)`, scale: '1' }], { duration: T(260), easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
    g.remove();
    if (state !== st) return;
    el.style.visibility = 'hidden';
    const box = kind === 'num' ? st.numEl : st.denEl;
    box.style.visibility = 'visible';
    box.animate([{ scale: '1.15 .85' }, { scale: '.95 1.05' }, { scale: '1' }], { duration: T(300), easing: 'ease-out' });
    st.slots[kind].classList.add('done');
    growBar(st, 0);
    snd('pop');
    if (!st.placed.num || !st.placed.den) { hint.set(`Теперь перетащи ${kind === 'num' ? `делитель ${st.task.b} вниз, в знаменатель` : `делимое ${st.task.a} наверх, в числитель`}`); return; }
    /* оба на месте: точки «÷» тают, остаётся черта дроби; бургер уезжает */
    st.busy = true;
    const dots = st.sign.querySelectorAll('circle');
    dots.forEach((c) => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(300), fill: 'forwards' }));
    if (st.burger) st.burger.animate([{ opacity: 1 }, { opacity: 0, translate: '0 20px' }], { duration: T(400), fill: 'forwards' }).onfinish = () => { if (st.burger) { st.burger.remove(); st.burger = null; } };
    await sleep(560);                                                  // черта дорастает до полной ширины
    if (state !== st) return;
    st.row.style.visibility = ''; st.numEl.style.visibility = ''; st.denEl.style.visibility = '';
    if (st.gbar) { st.gbar.remove(); st.gbar = null; }
    Object.values(st.slots).forEach((s2) => s2.remove());
    st.ex.remove(); st.ex = null;
    st.phase = 'joker'; st.busy = false;
    layout(st);
    hint.set(`Возьми джокера: на что умножить, чтобы у обоих чисел ушла запятая? (${st.task.b} — ${decs(st.task.b)} ${znak(decs(st.task.b))} после запятой)`);
    bubble('Деление записано дробью. Теперь возьми джокера', 2600);
  }
  const znak = (n) => (n === 1 ? 'знак' : n < 5 ? 'знака' : 'знаков');

  /* ---------- 2. джокер ---------- */
  function onFracClick(st, e) {
    if (st !== state || st.done || st.busy) return;
    const tool = MG.tools.current();
    if (st.phase === 'joker') { if (tool === JOKER) openTablet(st); else if (MG.tools.need) MG.tools.need(JOKER); return; }
    if (st.phase === 'harp') {
      if (tool !== HARP) { if (MG.tools.need) MG.tools.need(HARP); return; }
      const br = st.barEl.getBoundingClientRect();
      const side = e.clientY < br.top + br.height / 2 ? 'num' : 'den';
      if (st.hp[side]) { bubble(side === 'num' ? 'В числителе запятой уже нет — теперь знаменатель' : 'В знаменателе запятой уже нет — теперь числитель', 2200); return; }
      runHarp(st, side);
    }
  }
  function checkMul(st, v) {
    const t = st.task, p = t.p;
    const longest = decs(t.a) >= decs(t.b) ? t.a : t.b;
    if (v === p) return true;
    if (![10, 100, 1000, 10000].includes(v)) return `Умножай на 10, 100 или 1000 — тогда запятая просто сдвинется`;
    if (v < p) return `×${v} мало: у ${longest} ${t.z} ${znak(t.z)} после запятой — запятая не уйдёт`;
    return `Хватит ${p}: у ${longest} ${t.z} ${znak(t.z)} после запятой`;
  }
  async function openTablet(st) {
    if (st !== state || st.phase !== 'joker' || st.busy || st.asking || MG.joker.holding() || Date.now() - (st.dropAt || 0) < 500) return;
    st.asking = true;
    quiet();
    let sl = null;
    const v = await MG.clip.askMul(st.task.a, st.task.b, st.row, {
      maxLen: 4,
      slot: (el) => { sl = MG.joker.slot(el); },
      onType: (x) => { if (sl) sl.set(x); },
    });
    st.asking = false;
    if (state !== st || st.done || !v || !sl) return;
    const r = sl.rect();
    sl.hide();
    st.held = MG.joker.hold(r, v, {
      frac: () => st.fr,
      check: (x) => checkMul(st, x),
      onLay: (card, x) => { st.held = null; applyJoker(st, card, x); },
      say: (t) => bubble(t, 3200),
      onDrop: () => { st.held = null; st.dropAt = Date.now(); },
    });
  }
  function dropHeld(st) {
    if (st && st.held) { const h = st.held; st.held = null; h.drop(false); }
  }
  async function applyJoker(st, card, v) {
    st.busy = true; quiet();
    const add = (box) => { const dt = mk('span', 'fd-dot', '·', box); dt.style.opacity = '0'; const m = mk('span', 'fd-m', String(v), box); m.style.opacity = '0'; return m; };
    const mt = add(st.numEl), md = add(st.denEl);
    layout(st);
    await MG.joker.lay(card, { frac: st.fr, targets: [mt, md], value: v, color: '#d97706' });
    if (state !== st) return;
    [st.numEl, st.denEl].forEach((b) => b.querySelector('.fd-dot').animate([{ opacity: 0 }, { opacity: 1 }], { duration: T(200), fill: 'forwards' }));
    await sleep(400);
    if (state !== st) return;
    st.phase = 'harp'; st.busy = false;
    hint.set('Возьми гарпун и нажми на числитель, потом на знаменатель — запятая сдвинется на столько цифр, сколько нулей');
    bubble('Теперь гарпун: нажми им на числитель', 2600);
  }

  /* ---------- 3. гарпун (ружьё из dec10.js) ---------- */
  let harp = null, hpWorld = null;
  function ensureHarp() {
    if (!hpWorld) hpWorld = mk('div', 'hp-world dd-hp');
    if (!hpWorld.isConnected) view.append(hpWorld);
    if (!harp) {
      harp = MG.harpoon.embed({
        name: 'decdiv-hp', view, world: hpWorld, sign: '·',
        y: (rh) => (state && state.hpRowY !== undefined ? state.hpRowY - rh / 2 : 100),
        active: () => MG.active === MG.modes[NAME] && !!state && state.phase === 'harp',
        hint: { set: (t) => hint.set(t) },
      });
    }
    return harp;
  }
  async function runHarp(st, side) {
    st.busy = true; quiet();
    const box = side === 'num' ? st.numEl : st.denEl;
    const vr = view.getBoundingClientRect(), r = box.getBoundingClientRect();
    st.hpRowY = r.top + r.height / 2 - vr.top;
    st.hpSide = side;
    const h = ensureHarp();
    hpWorld.style.display = 'block';
    box.style.visibility = 'hidden';
    const str = side === 'num' ? st.task.a : st.task.b;
    const ans = await h.run(str, st.task.z);
    h.stop();
    hpWorld.style.display = 'none';
    if (state !== st) return;
    st.hpSide = null;
    st.hp[side] = true;
    const val = side === 'num' ? st.task.N : st.task.Dn;
    box.replaceChildren(); mk('span', '', String(val), box);
    box.style.visibility = '';
    box.firstChild.animate([{ opacity: 0, scale: '.6' }, { opacity: 1, scale: '1.15', offset: 0.6 }, { opacity: 1, scale: '1' }], { duration: T(380), easing: 'ease-out' });
    snd('pop');
    layout(st);
    st.busy = false;
    if (String(ans) !== String(val)) console.warn('decdiv: harpoon answer', ans, val);
    if (!st.hp.num || !st.hp.den) {
      hint.set(`Теперь нажми гарпуном на ${st.hp.num ? 'знаменатель' : 'числитель'}`);
      bubble(`Готово! Теперь ${st.hp.num ? 'знаменатель' : 'числитель'}`, 2000);
      return;
    }
    await sleep(500);
    if (state !== st) return;
    toFactor(st);
  }

  /* ---------- 4–6. кувалда → ластик → молния (общий кусок fkit.js), 7. топор срубает 1 ---------- */
  function toFactor(st) {
    st.phase = 'factor';
    const r0 = st.fr.getBoundingClientRect();
    const fs0 = parseFloat(getComputedStyle(st.row).fontSize) || 56;
    st.row.remove(); st.row = null;
    st.tf = mk('div', 'dd-tf', undefined, view);
    const fr = mk('div', 'fraction', undefined, st.tf);
    st.rows = { num: mk('div', 'row', undefined, fr), den: null };
    st.bar = mk('div', 'bar', undefined, fr);
    st.rows.den = mk('div', 'row', undefined, fr);
    st.frac = fr;
    fitFont(st, fs0);
    st.kit = MG.fkit.make({
      frac: fr, rows: st.rows, bar: st.bar, num: [st.task.N], den: [st.task.Dn],
      live: () => state === st && !st.done,
      bubble: (t) => bubble(t, 2400),
      onChange: () => updateFactorHint(st),
      onTool: (tl, tok) => { if (tl === AXE) { axeClick(st, tok); return true; } if (canAxe(st)) { if (MG.tools.need) MG.tools.need(AXE); return true; } return false; },
    });
    st.sides = st.kit.sides;
    layout(st);
    const r1 = fr.getBoundingClientRect();
    fr.animate([{ transform: `translate(${r0.left - r1.left}px, ${r0.top - r1.top}px)` }, { transform: 'none' }], { duration: T(350), easing: 'ease-out' });
    updateFactorHint(st);
  }
  function fitFont(st, fs0) {
    const vw = Math.max(260, view.clientWidth);
    const nf = Math.max(nFac(st.task.N), nFac(st.task.Dn), 1);
    const chars = nf * 2.6;
    const fs = Math.max(26, Math.min(fs0 || 60, Math.floor((vw - 24) / (chars * 0.62))));
    view.style.setProperty('--dd-tfs', `${fs}px`);
  }
  const canAxe = (st) => st.kit && st.kit.tool() === null && st.kit.prod('den') === 1;
  const nextFactorTool = (st) => (canAxe(st) ? AXE : st.kit.tool());
  /* топор: в знаменателе осталась 1 — срубаем её, числитель падает и встаёт: это ответ */
  async function axeClick(st, tok) {
    if (!canAxe(st)) {
      indivisible(tok.el, !st.kit.reduced() ? 'сначала сократи дробь — сотри пары ластиком' : st.sides.num.toks.length > 1 ? 'сначала перемножь числитель молнией' : 'топор рубит единицу в знаменателе');
      return;
    }
    if (tok.side !== 'den') { indivisible(tok.el, 'руби единицу в знаменателе'); return; }
    if (st.chopping) return;
    st.chopping = true;
    await MG.axe.chop({ one: st.sides.den.toks[0].el, num: st.rows.num, bar: st.bar });
    if (state !== st) return;
    finish(st);
  }
  function updateFactorHint(st) {
    if (st.phase !== 'factor' || st.done) return;
    hint.set(canAxe(st) ? 'В знаменателе 1 — сруби её топором' : st.kit.hint());
  }

  async function finish(st) {
    st.done = true; st.busy = true;
    const vr = view.getBoundingClientRect(), fr = st.frac.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(st.frac).fontSize) || 56;
    /* дробь «250 / 1» превращается в ответ */
    st.frac.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.85)' }], { duration: T(300), fill: 'forwards' });
    await sleep(300);
    if (state !== st) return;
    const out = mk('div', 'dd-ans', String(st.task.Q), view);
    out.style.fontSize = `${Math.round(fs * 1.15)}px`;
    out.style.top = `${fr.top - vr.top + fr.height / 2 - fs * 0.6}px`;
    out.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: T(480), easing: 'ease-out' });
    snd('pop'); burst(out, '#16a34a', 14);
    solved++;
    setStats(lvlOf(), solved);
    resultText.textContent = `${st.task.a} : ${st.task.b} = ${st.task.Q}`;
    layout(st);
    after.classList.add('show');
    if (solved >= TOTAL) setTimeout(offerDone, T(1200));
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  function offerDone() {
    if (document.querySelector('.so-ov')) return;
    const ov = document.createElement('div');
    ov.className = 'so-ov';
    ov.innerHTML = '<div class="skip-offer" role="dialog"><h3>Уровень пройден!</h3><p>Ты научился делить десятичные дроби. Идём дальше.</p><div class="so-row"><button type="button" class="so-go">На карту</button></div></div>';
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
    if (MG.active !== MG.modes[NAME] || !state || state.done) return;
    if (e.detail.tool === BURGER && state.phase === 'hook') burger(state);
    if (e.detail.tool === JOKER && state.phase === 'joker') setTimeout(() => { if (MG.tools.current() === JOKER) openTablet(state); }, T(200));
    if (e.detail.tool === HARP && state.phase === 'harp' && state.hpSide && harp) harp.gunIn();
  });
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (MG.active === MG.modes[NAME] && state && !state.busy) layout(state); }, 150); });

  MG.modes[NAME] = {
    total: TOTAL,
    levelUp() { solved = Math.min(TOTAL, (Math.floor(solved / 2) + 1) * 2); if (solved >= TOTAL) { setStats(lvlOf(), solved); offerDone(); return; } newRound(); },
    start() {
      if (MG.tools.current()) MG.tools.clear();
      if (!state || state.done || state.busy) newRound(); else { setStats(lvlOf(), solved); layout(state); }
    },
    skip() { if (solved >= TOTAL) { offerDone(); return; } newRound(); },
    stop() { dropHeld(state); if (harp) harp.stop(); if (state && state.kit) state.kit.destroy(); if (state && (state.busy || state.done)) state = null; },
    /* подсказка-палец (coach.js): крюк → джокер (планшет, карта) → гарпун (ружьё) → кувалда → ластик → молния */
    coachStep() {
      const st = state;
      if (!st || st.done) return null;
      if (st.phase === 'hook') {
        if (st.busy || st.drag) return null;
        const k = st.placed && !st.placed.num ? 'num' : 'den';
        return { tool: BURGER, el: k === 'num' ? st.aEl : st.bEl, text: k === 'num' ? `Перетащи ${st.task.a} наверх, в числитель` : `Перетащи ${st.task.b} вниз, в знаменатель` };
      }
      if (st.phase === 'joker') {
        if (st.busy) return null;
        if (MG.joker.holding()) return { tool: JOKER, el: st.fr, text: 'Положи карту на дробь' };
        const ov = document.querySelector('.clip-ov.mul:not(.out)');
        const ms = String(st.task.p);
        if (ov) {
          const t = ov.dataset.v || '';
          const key = t === ms ? ov.querySelector('.go') : ms.startsWith(t) ? ov.querySelector(`.k[data-d="${ms[t.length]}"]`) : ov.querySelector('.k[data-d="x"]');
          return { tool: JOKER, el: key, text: `Набери ${ms}: столько знаков после запятой — ${st.task.z}` };
        }
        if (st.asking) return null;
        return { tool: JOKER, el: st.fr, text: `Нажми джокером на дробь и умножь на ${ms}` };
      }
      if (st.phase === 'harp') {
        if (st.hpSide && harp) {
          const hs = harp.state();
          if (!hs) return null;
          if (hs.phase === 'load') { const m = (hs.mEls || []).find((x) => !x.classList.contains('took')); return m ? { tool: HARP, el: m, text: 'Перетащи цифру в ружьё' } : null; }
          if (hs.phase === 'aim' && hs.fire) return { tool: HARP, el: hs.fire, text: 'Жми «БАХ!»' };
          if (hs.phase === 'pull' && !hs.busy) return { tool: HARP, el: hs.reel, text: 'Крути катушку' };
          return null;
        }
        if (st.busy) return null;
        const side = st.hp.num ? 'den' : 'num';
        return { tool: HARP, el: side === 'num' ? st.numEl : st.denEl, text: `Нажми гарпуном на ${side === 'num' ? 'числитель' : 'знаменатель'}` };
      }
      if (st.phase === 'factor') {
        if (canAxe(st)) return st.chopping ? null : { tool: AXE, el: st.sides.den.toks[0].el, text: 'Сруби топором единицу' };
        return st.kit.coach();
      }
      return null;
    },
    _state: () => state,
  };
})();

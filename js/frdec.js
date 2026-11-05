/* Режим «Обыкновенная → десятичная» (frdec), остров II «Перевод дробей» раздела «Десятичные дроби».
 * Инструмент — джокер: планшет «на что умножаем» (MG.clip.askMul) + карта (MG.joker.slot / MG.joker.hold).
 *
 * 1) На экране дробь «3/4». Игрок берёт джокера — выезжает планшет, дробь уходит в карточку «3/4 = 3·□ / 4·□»,
 *    рядом карта-джокер; игрок набирает множитель (25) — джокер переворачивается в карту «25». Галочка — карта в руке.
 * 2) Карту кладёт на дробь: числа слетают в числитель и знаменатель — «3·25 / 4·25»; перемножает сам игрок молнией
 *    (bolt): тап по числителю — 75, по знаменателю — 100 (boltHit).
 *    Множитель проверяется (check): новый знаменатель должен делить 1000, иначе 10, 100 или 1000 уже не получится —
 *    тогда карта трясётся и рассыпается, а под дробью подсказка. Тап по дроби с джокером — снова планшет.
 * 3) Знаменатель стал 10, 100 или 1000 — игрок берёт прожектор (projector) и нажимает на нули знаменателя (toDecimal):
 *    единица становится переключателем, щёлкает, нули светят вверх — цифры над ними краснеют; переключатель
 *    превращается в запятую, впереди встаёт 0 (или целая часть): 0,75. Ноль в конце (0,50) игрок стирает ластиком (glove).
 *    Если ещё нет (1/2 · 2 = 2/4) — можно положить джокера ещё раз.
 * 8 примеров в 4 стадии: знаменатели 2, 4, 5 → 20, 25, 50 → 8, 125, 40, 200 → неправильные дроби и дроби с целой частью. */
(() => {
  'use strict';
  const MG = window.MG;
  const { $, T, sleep, ri, setStats, burst } = MG;
  const snd = (n, o) => { if (MG.snd && MG.snd.play) MG.snd.play(n, o); };

  const view = $('#fd-view');
  const after = $('#fd-after');
  const resultText = $('#fd-resultText');
  const nextBtn = $('#fd-next');
  if (!view) return;
  const hint = MG.hinter($('#fd-hint'));
  const NAME = 'frdec', TOOL = 'joker', BOLT = 'bolt', PROJ = 'projector', GLOVE = 'glove';
  const INK = '#1d1d1f';

  const css = document.createElement('style');
  css.textContent = `
    .fd-mode { justify-content: flex-start; gap: 6px; position: relative; }
    .fd-view { position: relative; width: min(100%, 460px); flex: 1 1 auto; min-height: 380px; overflow: hidden; }
    .fd-row { position: absolute; left: 0; right: 0; top: var(--fd-top, 22%); display: flex; align-items: center; justify-content: center; gap: .3em; font-size: var(--fd-fs, 56px); font-weight: 900; color: ${INK}; line-height: 1; }
    .fd-w { font-size: 1.15em; }
    .fd-pj { position: absolute; inset: 0; pointer-events: none; font-weight: 900; color: ${INK}; line-height: 1; }
    .fd-pj .fd-pd { position: absolute; display: block; height: 1em; text-align: center; font-variant-numeric: tabular-nums; pointer-events: auto; cursor: inherit; }
    .fd-pj .fd-pd.z { transition: color .2s, text-shadow .2s; }
    .fd-pj .fd-pd.z.lit { color: #f59e0b; text-shadow: 0 0 10px #fde047, 0 0 22px rgba(253,224,71,.8); }
    .fd-pj .fd-pbar { position: absolute; border-radius: 4px; background: ${INK}; transform-origin: 50% 50%; }
    .fd-pj .fd-sw { position: absolute; display: block; z-index: 2; filter: drop-shadow(0 3px 3px rgba(0,0,0,.25)); }
    .fd-pj .fd-sw svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .fd-pj .fd-beam { position: absolute; transform-origin: 50% 100%; pointer-events: none; mix-blend-mode: multiply; clip-path: polygon(0 0, 100% 0, 68% 100%, 32% 100%);
      background: linear-gradient(to top, rgba(253,224,71,.95), rgba(253,186,116,.55) 55%, rgba(253,186,116,.1)); }
    .fd-fr { display: flex; flex-direction: column; align-items: center; padding: .05em .2em; border-radius: 14px; transition: background .2s; }
    .fd-fr.over { background: rgba(245, 158, 11, .14); }
    .fd-num, .fd-den { display: flex; align-items: baseline; gap: .06em; white-space: nowrap; }
    .fd-bar { align-self: stretch; height: .085em; min-width: 1.4em; margin: .14em 0; border-radius: 999px; background: ${INK}; }
    .fd-dot { color: #9a9a9a; padding: 0 .04em; }
    .fd-m { color: #d97706; }
    .fd-dec { font-size: 1.15em; letter-spacing: .02em; }
    .fd-mode .dc-say { translate: -50% 0; }
    .fd-mode .dc-say::after { top: -6px; bottom: auto; }
    .fd-mode .after { position: absolute; left: 50%; top: var(--fd-after, 60%); z-index: 7; width: min(92%, 380px); translate: -50% 10px; min-height: 0; }
    .fd-mode .after.show { translate: -50% 0; }
  `;
  document.head.append(css);

  /* ---------- примеры ---------- */
  const TOTAL = 8;
  let state = null, solved = 0, lastKey = '';
  const lvlOf = () => Math.min(4, 1 + Math.floor(solved / 2));
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const isP10 = (d) => d === 10 || d === 100 || d === 1000;
  const pickN = (lo, hi, d) => { for (let i = 0; i < 50; i++) { const n = ri(lo, hi); if (gcd(n, d) === 1) return n; } return lo; };
  const pickOf = (a) => a[ri(0, a.length - 1)];
  /* наименьший множитель до 10, 100 или 1000 — для подсказки-пальца */
  const bestMul = (d) => { for (const p of [10, 100, 1000]) if (p % d === 0) return p / d; return 1; };

  function pick() {
    const L = lvlOf(), second = solved % 2 === 1;
    if (solved === 0 && !lastKey) return { w: 0, n: 1, d: 2 };
    for (let i = 0; i < 100; i++) {
      let t;
      if (L === 1) { const d = pickOf([2, 4, 5]); t = { w: 0, n: pickN(1, d - 1, d), d }; }
      else if (L === 2) { const d = pickOf([20, 25, 50]); t = { w: 0, n: pickN(1, d - 1, d), d }; }
      else if (L === 3) { const d = pickOf([8, 125]); t = { w: 0, n: pickN(1, d - 1, d), d }; }
      else {
        const d = pickOf([2, 4, 5, 8, 20, 25]);
        t = second ? { w: ri(1, 9), n: pickN(1, d - 1, d), d } : { w: 0, n: pickN(d + 1, 3 * d - 1, d), d };   // целая часть / неправильная
      }
      const key = `${t.w} ${t.n}/${t.d}`;
      if (key === lastKey) continue;
      return t;
    }
    return { w: 0, n: 3, d: 4 };
  }
  const label = (t) => `${t.w ? `${t.w} ` : ''}${t.n}/${t.d}`;
  /* десятичная запись w + n/D (D = 10, 100, 1000), без лишних нулей в конце */
  function decStr(w, n, D) {
    const k = String(D).length - 1, N = w * D + n;
    let ip = String(Math.floor(N / D)), fp = String(N % D).padStart(k, '0').replace(/0+$/, '');
    return fp ? `${ip},${fp}` : ip;
  }

  /* ---------- раскладка ---------- */
  const mk = (tag, cls, txt, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; if (parent) parent.append(e); return e; };
  function layout(st) {
    const vw = Math.max(260, view.clientWidth), vh = Math.max(360, view.clientHeight);
    const len = Math.max(String(st.n).length, String(st.d).length) + 4 + (st.task.w ? 2 : 0);
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
    st.numEl = mk('div', 'fd-num', undefined, st.fr); mk('span', '', String(st.n), st.numEl);
    mk('div', 'fd-bar', undefined, st.fr);
    st.denEl = mk('div', 'fd-den', undefined, st.fr); mk('span', '', String(st.d), st.denEl);
    layout(st);
  }

  function newRound() {
    window.dispatchEvent(new Event('mg:round'));
    dropHeld(state);
    const task = pick();
    lastKey = `${task.w} ${task.n}/${task.d}`;
    after.classList.remove('show');
    view.replaceChildren();
    if (MG.tools.current()) MG.tools.clear();
    const st = { task, n: task.n, d: task.d, busy: false, done: false, laid: 0 };
    state = st;
    st.row = mk('div', 'fd-row fracs', undefined, view);
    draw(st);
    st.row.animate([{ opacity: 0, translate: '0 12px' }, { opacity: 1, translate: '0 0' }], { duration: T(350), easing: 'ease-out' });
    st.row.addEventListener('click', (e) => {                // тап по дроби: джокер — планшет, молния — посчитать произведение
      const tool = MG.tools.current();
      if (tool === BOLT) { boltHit(st, e); return; }
      if (tool === PROJ) { projHit(st, e); return; }
      if (tool === GLOVE) { eraseHit(st, e); return; }
      if (tool === TOOL) {
        if (pending(st)) { bubble('Сначала посчитай молнией: нажми на числитель и знаменатель', 2600); return; }
        if (st.proj) { bubble('Знаменатель уже ' + st.d + ' — возьми прожектор и нажми на нули', 2600); return; }
        openTablet(st); return;
      }
      if (MG.tools.need) MG.tools.need(st.erase ? GLOVE : st.proj ? PROJ : pending(st) ? BOLT : TOOL);
    });
    setStats(lvlOf(), solved);
    hint.set('Возьми джокера и набери на планшете, на что умножить дробь');
  }

  /* планшет «на что умножаем»: джокер рядом с примером превращается в карту с набранным числом; галочка — карта в руке */
  async function openTablet(st) {
    if (st !== state || st.done || st.busy || st.asking || pending(st) || st.proj || MG.joker.holding() || Date.now() - (st.dropAt || 0) < 500) return;
    st.asking = true;
    view.querySelectorAll('.dc-say').forEach((e) => e.classList.add('out'));
    let sl = null;
    const v = await MG.clip.askMul(st.n, st.d, st.row, {
      w: st.task.w || 0,
      slot: (el) => { sl = MG.joker.slot(el); },
      onType: (t) => { if (sl) sl.set(t); },
    });
    st.asking = false;
    if (state !== st || st.done || !v || !sl) return;
    const r = sl.rect();
    sl.hide();
    st.held = MG.joker.hold(r, v, {
      frac: () => st.fr,
      check: (x) => checkMul(st, x),
      onLay: (card, x) => { st.held = null; apply(st, card, x); },
      say: (t) => bubble(t, 3200),
      onDrop: () => { st.held = null; st.dropAt = Date.now(); },
    });
  }
  function dropHeld(st) {
    if (st && st.held) { const h = st.held; st.held = null; h.drop(false); }
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

  /* проверка множителя: новый знаменатель должен делить 1000 — иначе 10, 100 или 1000 уже не получится */
  function checkMul(st, v) {
    if (st.busy || st.done) return 'Подожди немного';
    if (v < 2) return 'На 1 умножать бесполезно — дробь не изменится';
    const nd = st.d * v;
    if (nd > 1000 || 1000 % nd !== 0) return `×${v}: знаменатель станет ${nd} — из него уже не получится 10, 100 или 1000`;
    return true;
  }

  /* карта легла: числа слетают в числитель и знаменатель, перемножаются */
  async function apply(st, card, v) {
    st.busy = true;
    world().querySelectorAll('.dc-say').forEach((e) => e.classList.add('out'));
    const add = (box) => { mk('span', 'fd-dot', '·', box); const m = mk('span', 'fd-m', String(v), box); m.style.opacity = '0'; return m; };
    const mt = add(st.numEl), md = add(st.denEl);
    layout(st);
    st.numEl.querySelector('.fd-dot').style.opacity = '0'; st.denEl.querySelector('.fd-dot').style.opacity = '0';
    await MG.joker.lay(card, { frac: st.fr, targets: [mt, md], value: v, color: '#d97706' });
    if (state !== st) return;
    [st.numEl, st.denEl].forEach((b) => b.querySelector('.fd-dot').animate([{ opacity: 0 }, { opacity: 1 }], { duration: T(200), fill: 'forwards' }));
    await sleep(500);
    if (state !== st) return;
    /* дальше считает сам игрок: молния по числителю и по знаменателю — «3·25» → «75» */
    st.n *= v; st.d *= v; st.laid += 1;
    st.zap = { num: true, den: true };
    st.busy = false;
    layout(st);
    hint.set('Возьми молнию и нажми на числитель и на знаменатель — она перемножит числа');
    if (MG.tools.current() !== BOLT) bubble('Теперь возьми молнию и посчитай числитель и знаменатель', 2800);
  }
  const pending = (st) => !!(st.zap && (st.zap.num || st.zap.den));

  /* молния: бьёт в числитель или знаменатель — множители сгорают, остаётся произведение */
  async function boltHit(st, e) {
    if (st !== state || st.done || st.busy || st.zapping) return;
    if (!pending(st)) { bubble('Здесь считать пока нечего — сначала умножь дробь джокером', 2400); return; }
    if (e.target.closest('.fd-w')) { bubble('Целая часть не меняется — нажми молнией на числитель или знаменатель', 2400); return; }
    const br = st.fr.querySelector('.fd-bar').getBoundingClientRect();
    const kind = e.clientY < br.top + br.height / 2 ? 'num' : 'den';
    if (!st.zap[kind]) { bubble(kind === 'num' ? 'Числитель уже посчитан — теперь знаменатель' : 'Знаменатель уже посчитан — теперь числитель', 2200); return; }
    st.zapping = true;
    const box = kind === 'num' ? st.numEl : st.denEl, val = kind === 'num' ? st.n : st.d;
    const r = box.getBoundingClientRect();
    const m = document.createElement('div');
    Object.assign(m.style, { position: 'fixed', pointerEvents: 'none', width: '2px', height: '2px', left: `${r.left + r.width / 2}px`, top: `${r.top + r.height / 2}px` });
    document.body.append(m);
    await MG.lightning([m], { reveal: false, color: '#facc15' });
    m.remove();
    if (state !== st) return;
    [...box.children].forEach((c) => c.animate([{ filter: 'brightness(1)', opacity: 1, scale: '1' }, { filter: 'brightness(4)', opacity: 0, scale: '.5' }], { duration: T(320), easing: 'ease-in', fill: 'forwards' }));
    await sleep(340);
    if (state !== st) return;
    box.replaceChildren();
    const sp = mk('span', '', String(val), box);
    sp.animate([{ opacity: 0, scale: '.5' }, { opacity: 1, scale: '1.2', offset: 0.6 }, { opacity: 1, scale: '1' }], { duration: T(360), easing: 'ease-out' });
    burst(sp, '#facc15', 8);
    snd('pop');
    st.zap[kind] = false;
    layout(st);
    st.zapping = false;
    if (pending(st)) { hint.set(`Теперь нажми молнией на ${st.zap.num ? 'числитель' : 'знаменатель'}`); return; }
    st.busy = true;
    await sleep(500);
    if (state !== st) return;
    if (isP10(st.d)) { ready(st); return; }
    st.busy = false;
    hint.set('Возьми джокера и набери на планшете, на что умножить дробь');
    bubble(`Знаменатель ${st.d} — ещё не 10, 100 или 1000. Возьми джокера и умножь ещё раз`, 3000);
  }
  const world = () => view;

  /* ---------- прожектор: дробь со знаменателем 10, 100, 1000 → десятичная запись ---------- */
  function ready(st) {
    st.proj = true; st.busy = false;
    hint.set('Возьми прожектор и нажми на нули знаменателя — они посветят на цифры');
    bubble(`Знаменатель ${st.d}! Возьми прожектор и нажми на нули`, 2800);
  }
  async function projHit(st, e) {
    if (st !== state || st.done || st.busy) return;
    if (!st.proj) {
      bubble(pending(st) ? 'Сначала посчитай молнией: нажми на числитель и знаменатель' : `Прожектор включается, когда знаменатель 10, 100 или 1000. Сейчас ${st.d} — умножь джокером`, 2800);
      return;
    }
    const br = st.fr.querySelector('.fd-bar').getBoundingClientRect();
    if (e.clientY < br.top + br.height / 2 || e.target.closest('.fd-w')) { bubble('Нажми прожектором на нули в знаменателе', 2200); return; }
    st.proj = false; st.busy = true;
    view.querySelectorAll('.dc-say').forEach((x) => x.classList.add('out'));
    await toDecimal(st);
  }

  /* анимация (можно заменить, не трогая остальное): нули расходятся под цифры, единица — переключатель, щёлк —
     нули светят вверх, цифры над ними краснеют; переключатель становится запятой, впереди встаёт 0 / целая часть */
  async function toDecimal(st) {
    const RED = '#dc2626';
    const N = String(st.n), k = String(st.d).length - 1, len = N.length;
    const vr = view.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(st.row).fontSize) || 56;
    const probe = mk('span', '', '0', st.row); probe.style.fontVariantNumeric = 'tabular-nums';
    const dw = probe.getBoundingClientRect().width || fs * 0.62; probe.remove();
    const nr = st.numEl.getBoundingClientRect(), dr = st.denEl.getBoundingClientRect(), brr = st.fr.querySelector('.fd-bar').getBoundingClientRect();
    const rr = st.row.getBoundingClientRect(), wEl = st.row.querySelector('.fd-w');
    const wr = wEl && wEl.getBoundingClientRect();
    const X = (x) => x - vr.left, Y = (y) => y - vr.top;
    const yN = Y(nr.top + nr.height / 2), yD = Y(dr.top + dr.height / 2), yB = Y(brr.top + brr.height / 2);
    /* куда встанут разряды */
    const W = st.task.w ? String(st.task.w) : '';
    const intLen = len > k ? len - k : (W ? W.length : 1);
    const g = dw * 0.62;
    const total = intLen * dw + g + k * dw;
    const cx = X(rr.left + rr.width / 2);
    const X0 = cx - total / 2 + intLen * dw;                  // левый край промежутка под запятую
    const colF = (j) => X0 + g + j * dw + dw / 2, colI = (i) => X0 - (intLen - i) * dw + dw / 2;
    const L = mk('div', 'fd-pj', undefined, view);
    L.style.fontSize = `${fs}px`;
    L.addEventListener('click', (ev) => { if (MG.tools.current() === GLOVE) eraseHit(st, ev); else if (MG.tools.need) MG.tools.need(st.erase ? GLOVE : PROJ); });
    const put = (txt, x, y, cls = '') => { const e2 = mk('span', `fd-pd ${cls}`, txt, L); Object.assign(e2.style, { left: `${x - dw / 2}px`, top: `${y - fs / 2}px`, width: `${dw}px` }); return e2; };
    const from = (el, x0, y0, x1, y1, ms, delay = 0) => el.animate([{ transform: `translate(${x0 - x1}px, ${y0 - y1}px)` }, { transform: 'none' }], { duration: T(ms), delay: T(delay), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'backwards' });
    /* числитель: цифры по своим разрядам */
    const nX0 = X(nr.left + nr.width / 2) - len * dw / 2 + dw / 2;
    const numD = N.split('').map((ch, i) => {
      const c = i - (len - k);
      const x1 = c >= 0 ? colF(c) : colI(i);
      const el = put(ch, x1, yN, c >= 0 ? 'fr' : 'in');
      from(el, nX0 + i * dw, yN, x1, yN, 550);
      return { el, c };
    });
    /* знаменатель: единица и нули */
    const D = String(st.d), dX0 = X(dr.left + dr.width / 2) - D.length * dw / 2 + dw / 2;
    const oneX = colF(0) - dw;                                // единица остаётся в знаменателе — слева от нулей
    const one = put('1', oneX, yD, 'one');
    from(one, dX0, yD, oneX, yD, 550);
    const zeros = [];
    for (let j = 0; j < k; j++) { const z = put('0', colF(j), yD, 'z'); from(z, dX0 + (j + 1) * dw, yD, colF(j), yD, 550, 40 * j); zeros.push(z); }
    const bar = mk('div', 'fd-pbar', undefined, L);
    const bx0 = X0 - dw * 0.15, bx1 = X0 + g + k * dw + dw * 0.15;
    Object.assign(bar.style, { left: `${bx0}px`, width: `${bx1 - bx0}px`, top: `${yB - brr.height / 2}px`, height: `${brr.height}px` });
    bar.animate([{ transform: `translateX(${X(brr.left) - bx0}px)`, width: `${brr.width}px` }, { transform: 'none', width: `${bx1 - bx0}px` }], { duration: T(550), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'backwards' });
    let wSp = null;
    if (wEl) { wSp = mk('span', 'fd-pd in', W, L); Object.assign(wSp.style, { left: `${X(wr.left)}px`, top: `${Y(wr.top + wr.height / 2) - fs / 2}px`, width: 'auto', fontSize: getComputedStyle(wEl).fontSize }); }
    st.row.style.visibility = 'hidden';
    snd('whoosh', { dur: 0.3 });
    await sleep(650);
    if (state !== st) return;

    /* единица → переключатель, щёлк */
    one.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '.3' }], { duration: T(220), fill: 'forwards' });
    const sw = mk('span', 'fd-sw', undefined, L);
    const swH = fs * 0.95, swW = swH * 0.58;
    Object.assign(sw.style, { left: `${oneX - swW / 2}px`, top: `${yD - swH / 2}px`, width: `${swW}px`, height: `${swH}px` });
    sw.innerHTML = '<svg viewBox="0 0 20 34"><rect x="1.5" y="1.5" width="17" height="31" rx="4" fill="#fffdf8" stroke="#1d1d1f" stroke-width="2.6"/><rect x="6" y="6" width="8" height="22" rx="3" fill="#e5e1d8" stroke="#1d1d1f" stroke-width="1.6"/><g class="lv"><rect x="5" y="20" width="10" height="7" rx="2.5" fill="#1d1d1f"/></g></svg>';
    sw.animate([{ opacity: 0, scale: '.3' }, { opacity: 1, scale: '1.15', offset: 0.7 }, { opacity: 1, scale: '1' }], { duration: T(300), easing: 'ease-out' });
    await sleep(450);
    if (state !== st) return;
    sw.querySelector('.lv').animate([{ transform: 'none' }, { transform: 'translateY(-13px)' }], { duration: T(110), easing: 'cubic-bezier(.5,1.8,.5,1)', fill: 'forwards' });
    sw.animate([{ rotate: '0deg' }, { rotate: '-8deg' }, { rotate: '4deg' }, { rotate: '0deg' }], { duration: T(260) });
    snd('tick');
    await sleep(140);
    if (state !== st) return;

    /* нули светят вверх */
    snd('zap');
    const topY = yN - fs * 0.62, botY = yD - fs * 0.32;
    const beams = zeros.map((z, j) => {
      const b = mk('div', 'fd-beam', undefined, L);
      Object.assign(b.style, { left: `${colF(j) - dw * 0.62}px`, width: `${dw * 1.24}px`, top: `${topY}px`, height: `${botY - topY}px` });
      b.animate([{ scale: '1 0', opacity: 0 }, { scale: '1 1', opacity: 1 }], { duration: T(300), delay: T(j * 30), easing: 'ease-out', fill: 'backwards' });
      z.classList.add('lit');
      return b;
    });
    await sleep(320);
    if (state !== st) return;
    const fr = [];
    for (let j = 0; j < k; j++) {
      let d = numD.find((x) => x.c === j);
      let el;
      if (d) { el = d.el; }
      else { el = put('0', colF(j), yN, 'fr'); el.animate([{ opacity: 0, scale: '.4' }, { opacity: 1, scale: '1' }], { duration: T(320), easing: 'ease-out' }); }
      el.style.transition = `color ${T(260)}ms`; el.style.color = RED;
      el.animate([{ textShadow: '0 0 0 rgba(253,224,71,0)' }, { textShadow: '0 0 18px rgba(253,224,71,1)' }, { textShadow: '0 0 0 rgba(253,224,71,0)' }], { duration: T(700) });
      fr.push(el);
    }
    await sleep(700);
    if (state !== st) return;

    /* свет гаснет, нули и черта уходят, переключатель становится запятой */
    beams.forEach((b) => b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(300), fill: 'forwards' }));
    zeros.forEach((z) => z.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '.25' }], { duration: T(450), easing: 'ease-in', fill: 'forwards' }));
    bar.animate([{ opacity: 1, scale: '1 1' }, { opacity: 0, scale: '1 .2' }], { duration: T(500), easing: 'ease-in', fill: 'forwards' });
    const comma = put(',', X0 + g / 2, yN, 'cm');
    /* переключатель едет из знаменателя на место запятой и по пути превращается в неё */
    const mx = X0 + g / 2 - oneX, my = yN + fs * 0.28 - yD;
    sw.animate([
      { transform: 'none', opacity: 1 },
      { transform: `translate(${mx * 0.55}px, ${my * 0.5 - fs * 0.25}px) rotate(-12deg) scale(.85)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${mx}px, ${my}px) rotate(20deg) scale(.3)`, opacity: 0 },
    ], { duration: T(700), easing: 'cubic-bezier(.45,0,.3,1)', fill: 'forwards' });
    comma.animate([{ opacity: 0, scale: '.3' }, { opacity: 0, scale: '.3', offset: 0.7 }, { opacity: 1, scale: '1.25', offset: 0.88 }, { opacity: 1, scale: '1' }], { duration: T(820), easing: 'ease-out' });
    await sleep(840);
    if (state !== st) return;

    /* впереди — ноль или целая часть */
    const lead = [];
    if (len <= k) {
      if (wSp) {
        const r0 = wSp.getBoundingClientRect();
        wSp.style.fontSize = ''; wSp.style.width = `${dw * W.length}px`;
        const x1 = colI(0) - dw / 2;
        wSp.style.left = `${x1}px`; wSp.style.top = `${yN - fs / 2}px`;
        wSp.animate([{ transform: `translate(${X(r0.left) - x1}px, ${Y(r0.top) - (yN - fs / 2)}px)` }, { transform: 'none' }], { duration: T(520), easing: 'cubic-bezier(.4,0,.2,1)' });
        lead.push(wSp);
      } else {
        const z0 = put('0', colI(0), yN, 'in');
        z0.animate([{ opacity: 0, scale: '.3' }, { opacity: 1, scale: '1.25', offset: 0.6 }, { opacity: 1, scale: '1' }], { duration: T(420), easing: 'ease-out' });
        lead.push(z0);
      }
      snd('pop');
    }
    /* десятичная дробь встаёт по центру прежней дроби */
    const dy = (yN + yD) / 2 - yN;
    L.animate([{ transform: 'none' }, { transform: `translateY(${dy}px)` }], { duration: T(500), delay: T(250), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    await sleep(800);
    if (state !== st) return;
    st.pj = { L, fr };
    if (fr[fr.length - 1].textContent === '0') {
      st.erase = true; st.busy = false;
      hint.set('Ноль в конце десятичной дроби ничего не меняет — сотри его ластиком');
      bubble('Ноль в конце не нужен — возьми ластик и сотри его', 2800);
      return;
    }
    done(st);
  }
  function done(st) {
    st.dec = decStr(st.task.w, st.n, st.d);
    finish(st, st.pj.fr[st.pj.fr.length - 1]);
  }
  /* ластик: стирает ноль в конце десятичной дроби */
  async function eraseHit(st, e) {
    if (st !== state || st.done || st.busy) return;
    if (!st.erase) { bubble('Ластиком стирают ноль в конце десятичной дроби — здесь пока нечего стирать', 2400); return; }
    const fr = st.pj.fr, last = fr[fr.length - 1];
    const hit = e.target.closest && e.target.closest('.fd-pd');
    if (hit !== last) { bubble('Стирай ноль в самом конце — он ничего не меняет', 2200); return; }
    st.busy = true;
    if (MG.tools.erase) await MG.tools.erase(last); else last.style.opacity = '0';
    if (state !== st) return;
    fr.pop(); last.remove();
    if (fr[fr.length - 1].textContent === '0') { st.busy = false; bubble('Ещё ноль в конце — сотри и его', 2000); return; }
    st.erase = false;
    await sleep(250);
    if (state !== st) return;
    done(st);
  }

  function finish(st, el) {
    st.done = true; st.busy = true;
    dropHeld(st);
    snd('pop'); burst(el, '#16a34a', 16);
    solved++;
    setStats(lvlOf(), solved);
    resultText.textContent = `${label(st.task)} = ${st.dec}`;
    layout(st);
    after.classList.add('show');
    if (solved >= TOTAL) setTimeout(offerDone, T(1200));
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  function offerDone() {
    if (document.querySelector('.so-ov')) return;
    const ov = document.createElement('div');
    ov.className = 'so-ov';
    ov.innerHTML = '<div class="skip-offer" role="dialog"><h3>Уровень пройден!</h3><p>Ты научился переводить обыкновенные дроби в десятичные. Идём дальше.</p><div class="so-row"><button type="button" class="so-go">На карту</button></div></div>';
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
    if (pending(state)) { bubble('Сначала посчитай молнией: нажми на числитель и знаменатель', 2600); return; }
    if (state.proj) { bubble('Знаменатель уже ' + state.d + ' — возьми прожектор и нажми на нули', 2600); return; }
    setTimeout(() => { if (document.body.dataset.tool === TOOL) openTablet(state); }, T(200));
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
    stop() { dropHeld(state); if (state && (state.busy || state.done)) state = null; },
    /* подсказка-палец (coach.js): джокер → планшет: набрать множитель и галочка → положить карту на дробь */
    coachStep() {
      const st = state;
      if (!st || st.done || st.busy) return null;
      const m = bestMul(st.d), ms = String(m);
      if (st.erase && st.pj) return { tool: GLOVE, toolText: 'Возьми ластик — он сотрёт ноль в конце', el: st.pj.fr[st.pj.fr.length - 1], text: 'Сотри ластиком ноль в конце' };
      if (st.proj) return { tool: PROJ, el: st.denEl, text: 'Нажми прожектором на нули знаменателя' };
      if (MG.joker.holding()) return { tool: TOOL, el: st.fr, text: 'Положи карту на дробь' };
      if (pending(st)) {
        const kind = st.zap.num ? 'num' : 'den';
        return st.zapping ? null : { tool: BOLT, el: kind === 'num' ? st.numEl : st.denEl, text: kind === 'num' ? 'Нажми молнией на числитель — она перемножит числа' : 'Теперь нажми молнией на знаменатель' };
      }
      const ov = document.querySelector('.clip-ov.mul:not(.out)');
      if (ov) {                                        // открыт планшет: палец по клавишам
        const t = ov.dataset.v || '';
        const key = t === ms ? ov.querySelector('.go') : ms.startsWith(t) ? ov.querySelector(`.k[data-d="${ms[t.length]}"]`) : ov.querySelector('.k[data-d="x"]');
        return { tool: TOOL, el: key, text: `Набери ${m}: ${st.d} · ${m} = ${st.d * m}` };
      }
      if (st.asking) return null;
      return { tool: TOOL, el: st.fr, text: `Нажми на дробь и умножь на ${m} — знаменатель станет ${st.d * m}` };
    },
    _state: () => state,
  };
})();

/* Режим «Умножение в столбик» (decmul), остров II раздела «Десятичные дроби». Пока — целые числа.
 * Инструмент — бульдозер с ведром краски (dozer).
 *
 * У каждой цифры нижнего множителя свой цвет: единицы — фиолетовые, десятки — красные, сотни — синие.
 * 1) Игрок выбирает бульдозер и нажимает на цветную цифру нижнего числа — бульдозер заливает ведро этой краской
 *    и въезжает справа в свой ряд. Цифра десятков красит, начиная с десятков: клетку единиц бульдозер
 *    проезжает с закрытым ведром (так виден сдвиг), сотни — две клетки.
 * 2) Ряд считает игрок на планшете: «6 × 2 = ?». После верной цифры ведро опрокидывается — цифра
 *    появляется в клетке ряда, перенос пишется маленькой цифрой над верхним числом и прибавляется к следующей.
 *    Цифры можно выбирать в любом порядке — ряд всё равно встанет на своё место.
 * 3) Когда покрашены все ряды, их складываем в столбик на том же планшете.
 * 4) Финал: цифры превращаются в блоки, большой бульдозер сносит всё, наверху — пример с ответом.
 * 8 примеров: обезьяна (×1 цифра), человек (×2), профессор (×2, больше), робот (×3). */
(() => {
  'use strict';
  const MG = window.MG;
  const { $, T, sleep, ri, setStats, burst } = MG;
  const snd = (n, o) => { if (MG.snd && MG.snd.play) MG.snd.play(n, o); };

  const view = $('#dm-view');
  const world = $('#dm-world');
  const after = $('#dm-after');
  const resultText = $('#dm-resultText');
  const nextBtn = $('#dm-next');
  if (!view || !world) return;
  const hint = MG.hinter($('#dm-hint'));

  /* цвета цифр нижнего множителя: единицы, десятки, сотни */
  const COL = ['#7b4bc4', '#e0362d', '#2f9bd6'];
  const CNAME = ['Фиолетовая', 'Красная', 'Синяя'];
  const PLACE = ['единицы', 'десятки', 'сотни'];

  const css = document.createElement('style');
  css.textContent = `
    #mode-decmul { justify-content: flex-start; gap: 6px; position: relative; }
    .dm-view { position: relative; width: min(100%, 440px); flex: 1 1 auto; min-height: 380px; overflow: hidden; }
    .dm-world { position: absolute; left: 0; top: 0; width: 100%; transition: transform 1s cubic-bezier(.5,0,.25,1); }
    .dm-d { position: absolute; left: 0; top: 0; z-index: 3; box-sizing: border-box; width: var(--cw); height: var(--rh); display: grid; place-items: center;
      font-weight: 900; font-size: calc(var(--cw) * .95); line-height: 1; color: #1d1d1f; border: 3px solid transparent; border-radius: 6px;
      transition: background-color .35s, border-color .35s, box-shadow .35s, font-size .35s, color .45s; }
    .dm-d.pick { cursor: pointer; touch-action: none; }
    .dm-d.pick:not(.used) { animation: dmBreath 1.6s ease-in-out infinite; }
    .dm-d.used { opacity: .45; }
    .dm-d.blk { background: #efe9dd; border-color: var(--e, #8a8d99); box-shadow: inset 0 -4px 0 rgba(0,0,0,.08); font-size: calc(var(--cw) * .82); }
    .dm-d.blk.fd { background: #c9ccd3; }
    .dm-c { position: absolute; left: 0; top: 0; z-index: 3; width: var(--cw); height: var(--rh); display: grid; place-items: center; font-weight: 900; font-size: calc(var(--cw) * .95); line-height: 1; transition: color .45s; }
    .dm-c::after { content: ''; position: absolute; left: 16%; right: 16%; bottom: 5px; border-bottom: 3px dashed rgba(29,29,31,.2); }
    .dm-c.on::after { border-bottom: 3px solid #3d63d9; }
    .dm-c.on:empty::before { content: ''; position: absolute; left: 50%; top: 24%; width: 3px; height: 52%; margin-left: -1.5px; border-radius: 2px; background: #3556d6; animation: dcCaret 1s steps(1) infinite; }
    .dm-c.full::after { display: none; }
    .dm-c.bad { animation: dcShake .4s; }
    .dm-c.bad::after { border-bottom-color: #d6362d; }
    .dm-sign { position: absolute; left: 0; top: 0; z-index: 3; width: var(--cw); height: var(--rh); display: grid; place-items: center; font-weight: 900; font-size: calc(var(--cw) * .9); color: #1d1d1f; transition: opacity .3s; }
    .dm-line { position: absolute; left: 0; top: 0; z-index: 3; height: 3px; border-radius: 2px; background: #1d1d1f; transform-origin: 100% 50%; transition: opacity .3s; }
    .dm-band { position: absolute; z-index: 2; border-radius: 14px; background: rgba(79,107,237,.13); opacity: 0; transition: left .35s cubic-bezier(.3,.7,.2,1), top .35s, height .35s, opacity .3s; pointer-events: none; }
    .dm-band.on { opacity: 1; }
    .dm-rig { position: absolute; left: 0; top: 0; z-index: 5; pointer-events: none; display: flex; align-items: flex-end; transition: left 1.1s cubic-bezier(.3,.1,.25,1); }
    .dm-rig.snap { transition: none; }
    .dm-rig svg { display: block; overflow: visible; flex: none; }
    .dm-rig .trk, .dm-dozer .trk { animation: dmTrk .35s linear infinite paused; }
    .dm-rig.go .trk, .dm-dozer.go .trk { animation-play-state: running; }
    .dm-rig.go .body, .dm-dozer.go .body { animation: dmRumble .12s linear infinite; }
    .dm-rig.go .can { animation: dmWob .3s ease-in-out infinite; transform-origin: 50% 100%; }
    .dm-dozer { position: absolute; left: 0; top: 0; z-index: 5; pointer-events: none; }
    .dm-dozer svg { display: block; width: 100%; height: 100%; overflow: visible; }
    @keyframes dmWob { 50% { rotate: -5deg; } }
    .dm-drop { position: absolute; z-index: 6; width: 12px; height: 16px; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; pointer-events: none; }
    .dm-ex { position: absolute; left: 0; top: 0; z-index: 3; display: flex; align-items: center; height: var(--rh); white-space: nowrap; transform-origin: 0 50%; }
    .dm-ex span { display: block; width: var(--cw); text-align: center; font-weight: 900; font-size: calc(var(--cw) * .95); line-height: var(--rh); color: #1d1d1f; }
    .dm-ex .ans { color: var(--ok); }
    #mode-decmul .after { position: absolute; left: 50%; top: var(--dm-after, 50%); z-index: 7; width: min(92%, 380px); translate: -50% 10px; min-height: 0; }
    #mode-decmul .after.show { translate: -50% 0; }
    body[data-tool="dozer"] .stage, body[data-tool="dozer"] .stage .dm-d.pick { cursor: var(--cur-dozer, pointer) !important; }
    @keyframes dmBreath { 50% { scale: 1.08; } }
    @keyframes dmTrk { to { stroke-dashoffset: -8; } }
    @keyframes dmRumble { 50% { transform: translateY(-.8px); } }
  `;
  document.head.append(css);

  /* бульдозер смотрит влево: отвал спереди (слева); перед отвалом он катит банку с краской (как на наброске) */
  const DOZER = (w) => `<svg viewBox="0 0 66 46" width="${w}" height="${w * 46 / 66}" stroke-linejoin="round" stroke-linecap="round">
    <g class="body">
      <rect x="15" y="20" width="38" height="14" rx="3" fill="#f6c13a" stroke="#7a5a0a" stroke-width="2"/>
      <rect x="33" y="5" width="18" height="16" rx="2.5" fill="#f6c13a" stroke="#7a5a0a" stroke-width="2"/>
      <rect x="36" y="8" width="12" height="8" rx="1.5" fill="#cfe4f5" stroke="#7a5a0a" stroke-width="1.5"/>
      <path d="M20 22 h10 M20 27 h10" stroke="#c8961e" stroke-width="1.6"/>
      <path d="M15 27 L8 31" stroke="#4a4f5c" stroke-width="3"/>
      <path d="M3 16 Q9 27 3 41 L10 41 Q15 28 10 16Z" fill="#9aa1ad" stroke="#4a4f5c" stroke-width="2"/>
      <rect x="53" y="22" width="8" height="10" rx="1.5" fill="#9aa1ad" stroke="#4a4f5c" stroke-width="1.6"/>
    </g>
    <rect x="12" y="33" width="44" height="12" rx="6" fill="#3b3f4a" stroke="#22252c" stroke-width="2"/>
    <rect class="trk" x="14" y="35" width="40" height="8" rx="4" fill="none" stroke="#6b7080" stroke-width="2" stroke-dasharray="3 5"/>
    <circle cx="19" cy="39" r="3" fill="#6b7080"/><circle cx="49" cy="39" r="3" fill="#6b7080"/><circle cx="34" cy="39" r="2.4" fill="#6b7080"/>
  </svg>`;
  const CAN = (color, w) => `<svg class="can" viewBox="0 0 30 34" width="${w}" height="${w * 34 / 30}" stroke-linejoin="round">
    <path d="M6 7 Q15 -3 24 7" fill="none" stroke="#4a4f5c" stroke-width="2"/>
    <path d="M4 9 L26 9 L24 32 L6 32Z" fill="#dfe3ea" stroke="#4a4f5c" stroke-width="2"/>
    <rect x="7" y="17" width="16" height="9" rx="1.5" fill="${color}" opacity=".9"/>
    <path d="M7.5 10 Q7 17 9.5 19.5 Q12 17 11.5 10Z" fill="${color}"/>
    <ellipse cx="15" cy="9" rx="11" ry="3.2" fill="${color}" stroke="#4a4f5c" stroke-width="1.8"/>
  </svg>`;

  /* ---------- примеры ---------- */
  const TOTAL = 8;
  let state = null, solved = 0, lastKey = '';
  const lvlOf = () => Math.min(4, 1 + Math.floor(solved / 2));
  const numN = (len) => { let s = String(ri(1, 9)); for (let i = 1; i < len; i++) s += ri(0, 9); return +s; };
  const multN = (len) => { let s = ''; for (let i = 0; i < len; i++) s += ri(2, 9); return +s; };   // без 0 и 1 в множителе

  function makeTask(a, b) {
    const A = String(a), B = String(b), m = B.length;
    const rows = [];
    for (let k = 0; k < m; k++) {
      const d = +B[m - 1 - k], steps = [];
      let c = 0;
      for (let i = 0; i < A.length; i++) {
        const x = +A[A.length - 1 - i], v = x * d + c;
        steps.push({ q: k + i, x, d, cin: c, v, exp: String(v % 10) });
        c = Math.floor(v / 10);
      }
      if (c) steps.push({ q: k + A.length, rest: true, exp: String(c), cin: c });
      rows.push({ k, d, steps, prod: a * d });
    }
    const total = a * b, S = String(total);
    /* сложение рядов по столбцам */
    const sum = [];
    if (m > 1) {
      let c = 0;
      for (let q = 0; q < S.length; q++) {
        const parts = rows.map((r) => r.steps.find((s) => s.q === q)).filter(Boolean).map((s) => +s.exp);
        const v = parts.reduce((x, y) => x + y, 0) + c;
        sum.push({ q, parts, cin: c, v, exp: String(v % 10), cout: v >= 10 });
        c = Math.floor(v / 10);
      }
    }
    const cols = Math.max(S.length, ...rows.map((r) => r.k + r.steps.length), A.length);
    return { a, b, A, B, m, rows, sum, total, S, cols };
  }

  function pick() {
    const L = lvlOf();
    if (solved === 0 && !lastKey) return makeTask(546, 2);
    if (L === 4 && solved === 6) return makeTask(546, 732);
    for (let i = 0; i < 200; i++) {
      let a, b;
      if (L === 1) { a = numN(ri(2, 3)); b = multN(1); }
      else if (L === 2) { a = numN(2); b = multN(2); }
      else if (L === 3) { a = numN(3); b = multN(2); }
      else { a = numN(3); b = multN(3); }
      if (`${a}x${b}` === lastKey) continue;
      return makeTask(a, b);
    }
    return makeTask(546, 7);
  }

  /* ---------- геометрия ---------- */
  let G = null;
  const qx = (q) => G.right - q * G.cw - G.cw / 2;          // центр клетки разряда q (0 — единицы)
  function geom(tk) {
    const vw = Math.max(260, view.clientWidth), vh = Math.max(360, view.clientHeight);
    const R = 2 + tk.m + (tk.m > 1 ? 1 : 0);                   // строк в столбике
    const viewTop = view.getBoundingClientRect().top;
    const budget = Math.max(200, innerHeight - 372 - viewTop);
    let cw = Math.min(46, (vw - 12) / (tk.cols + 3.9), (vw - 30) / (tk.A.length + tk.B.length + 3.2), (budget - 26) / (R * 1.28 + 0.6));
    cw = Math.max(22, Math.floor(cw));
    const rh = Math.round(cw * 1.28);
    const exTop = 26;
    const colTop = exTop + rh + 46;
    const right = Math.min(Math.round((vw + tk.cols * cw + cw) / 2), Math.round(vw - 2.6 * cw - 4));   // справа место для банки и бульдозера
    const Y = { a: colTop, b: colTop + rh };
    const line1 = Y.b + rh + 3;
    for (let k = 0; k < tk.m; k++) Y[`p${k}`] = line1 + 6 + k * rh;
    const line2 = Y[`p${tk.m - 1}`] + rh + 3;
    Y.s = tk.m > 1 ? line2 + 6 : Y.p0;
    const bottom = Y.s + rh;
    const camY = Math.max(0, colTop - Math.round(cw * 0.7) - 6);
    const WH = Math.max(vh, camY + vh + 10);
    return { vw, vh, cw, rh, exTop, colTop, right, Y, line1, line2, bottom, camY, WH };
  }

  /* ---------- элементы ---------- */
  const mk = (cls, txt) => { const e = document.createElement('div'); e.className = cls; if (txt !== undefined) e.textContent = txt; world.append(e); return e; };
  const at = (el, q, r) => { el._q = q; el._r = r; return el; };
  function placeAll(st) {
    world.querySelectorAll('.dm-d, .dm-c, .dm-sign').forEach((el) => {
      if (el._r === undefined) return;
      el.style.left = `${(el._q === 'x' ? G.right - G.cw * (st.task.cols + 0.9) : qx(el._q)) - G.cw / 2}px`;
      el.style.top = `${G.Y[el._r] + (el === st.plus && st.task.m === 2 ? G.rh / 2 : 0)}px`;
    });
    const lw = (st.task.cols + 1.2) * G.cw;
    [[st.line1, G.line1], [st.line2, G.line2]].forEach(([l, y]) => { if (l) Object.assign(l.style, { left: `${G.right - lw}px`, top: `${y}px`, width: `${lw + 6}px` }); });
    if (st.ex) placeEx(st);
    if (st.cur) placeBand(st);
    (st.rigs || []).forEach((rg) => placeRig(rg, rg._at, true));
  }
  function placeEx(st) {
    const ex = st.ex;
    ex.style.transform = 'none';
    const w = ex.offsetWidth, sc = Math.min(1, (G.vw - 16) / w);
    ex.style.transform = `translate(${Math.round((G.vw - w * sc) / 2)}px, ${G.exTop}px) scale(${sc.toFixed(3)})`;
    view.parentElement.style.setProperty('--dm-after', `${view.offsetTop + G.exTop + G.rh + 26}px`);
  }

  function layout(st) {
    G = geom(st.task);
    world.style.height = `${G.WH}px`;
    world.style.setProperty('--cw', `${G.cw}px`);
    world.style.setProperty('--rh', `${G.rh}px`);
    placeAll(st);
    world.classList.add('snap');
    world.style.transform = st.cam ? `translateY(${-G.camY}px)` : '';
    void world.offsetWidth;
    world.classList.remove('snap');
  }

  /* ---------- раунд ---------- */
  function clearWorld() { world.querySelectorAll('*').forEach((e) => { if (e.parentElement === world) e.remove(); }); }

  function newRound() {
    window.dispatchEvent(new Event('mg:round'));
    const task = pick();
    lastKey = `${task.a}x${task.b}`;
    closeTab();
    after.classList.remove('show');
    clearWorld();
    if (MG.tools.current() === 'dozer') MG.tools.clear();
    const st = { task, phase: 'wait', busy: false, cells: {}, cam: false, rigs: [], marks: [] };
    state = st;
    /* пример наверху: 546 × 732 */
    const ex = mk('dm-ex');
    task.A.split('').forEach((d) => ex.append(Object.assign(document.createElement('span'), { textContent: d })));
    ex.append(Object.assign(document.createElement('span'), { textContent: '×' }));
    task.B.split('').forEach((d) => ex.append(Object.assign(document.createElement('span'), { textContent: d })));
    st.ex = ex;
    world.style.transform = '';
    layout(st);
    ex.animate([{ opacity: 0, translate: '0 12px' }, { opacity: 1, translate: '0 0' }], { duration: T(350), easing: 'ease-out' });
    setStats(lvlOf(), solved);
    sayPick();
  }

  /* столбик появляется только после нажатия на бульдозер: множители съезжают из примера */
  async function showColumn(st) {
    if (st.phase !== 'wait') return;
    st.phase = 'build'; st.busy = true;
    const task = st.task;
    st.aEls = task.A.split('').map((d, i) => at(mk('dm-d', d), task.A.length - 1 - i, 'a'));
    st.bEls = task.B.split('').map((d, i) => { const q = task.B.length - 1 - i, el = at(mk('dm-d', d), q, 'b'); el._col = COL[q]; return el; });   // краской подсвечивается только цифра, с которой работаем
    st.times = at(mk('dm-sign', '×'), 'x', 'b');
    st.line1 = mk('dm-line');
    placeAll(st);
    const exSpans = [...st.ex.children];
    [...st.aEls, ...st.bEls].forEach((el, i) => {
      const src = exSpans[i < st.aEls.length ? i : i + 1].getBoundingClientRect(), dst = el.getBoundingClientRect();
      el.animate([{ transform: `translate(${src.left - dst.left}px, ${src.top - dst.top}px)`, color: '#1d1d1f' }, { transform: 'none' }],
        { duration: T(700), delay: T(i * 50), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'backwards' });
    });
    [st.times, st.line1].forEach((e) => e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T(400), delay: T(550), fill: 'backwards' }));
    snd('whoosh', { dur: 0.5 });
    await sleep(1000);
    if (state !== st) return;
    startRow(st, 0);
  }

  function sayPick() {
    const st = state;
    if (!st || st.phase !== 'wait') return;
    hint.set('Выбери бульдозер с краской');
  }

  /* облачко с объяснением (общие подсказки .hint в игре скрыты) */
  let sayT = 0;
  function bubble(text, y, ms = 2600) {
    world.querySelectorAll('.dc-say').forEach((e) => e.remove());
    clearTimeout(sayT);
    const b = mk('dc-say', text);
    b.style.left = `${G.vw / 2}px`; b.style.top = `${y}px`;
    sayT = setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 320); }, T(ms));
  }

  /* ---------- бульдозер с банкой ---------- */
  const CANW = () => G.cw * 0.78, DOZW = () => G.cw * 1.55;
  /* банка ряда k встаёт в клетку разряда k−1: для единиц — справа от столбика, для десятков — в пустую клетку единиц (это и есть сдвиг) */
  function placeRig(rg, where, instant) {
    rg._at = where;
    if (instant) rg.classList.add('snap');
    const cwid = CANW(), h = Math.max(cwid * 34 / 30, DOZW() * 46 / 66);
    rg.style.top = `${G.Y[`p${rg._k}`] + G.rh - h + 1}px`;
    rg.style.height = `${h}px`;
    rg.style.left = `${where === 'in' ? G.vw + 30 : where === 'away' ? G.vw + 60 : qx(rg._k - 1) - cwid / 2}px`;
    if (instant) { void rg.offsetWidth; rg.classList.remove('snap'); }
  }
  const canCenter = (rg) => { const c = rg.querySelector('.can').getBoundingClientRect(), w = world.getBoundingClientRect(); return { x: c.left - w.left + c.width / 2, y: c.top - w.top + c.height * 0.25 }; };

  async function startRow(st, k) {
    const tk = st.task, row = tk.rows[k], r = `p${k}`;
    st.phase = 'row'; st.busy = true; st.row = row; st.si = 0; st.miss = 0;
    hint.set(`${CNAME[k]} ${row.d}: умножаем ${tk.a} на ${row.d}`);
    /* текущая цифра нижнего числа окрашивается краской своего ряда */
    const bEl = st.bEls[tk.B.length - 1 - k];
    bEl.style.color = COL[k];
    bEl.animate([{ scale: '1' }, { scale: '1.3' }, { scale: '1' }], { duration: T(400), easing: 'ease-out' });
    /* клетки ряда */
    st.cells[k] = row.steps.map((s) => { const c = at(mk('dm-c'), s.q, r); c.style.color = COL[k]; c._col = COL[k]; return c; });
    placeAll(st);
    st.cells[k].forEach((c, i) => c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T(250), delay: T(i * 40), fill: 'backwards' }));
    /* камера к столбику */
    if (!st.cam) { st.cam = true; world.style.transform = `translateY(${-G.camY}px)`; await sleep(800); if (state !== st) return; }
    /* бульдозер выкатывает банку краски цвета цифры и останавливается */
    const rg = mk('dm-rig');
    rg._k = k;
    rg.innerHTML = CAN(COL[k], CANW()) + DOZER(DOZW());
    st.rigs.push(rg);
    placeRig(rg, 'in', true);
    rg.classList.add('go');
    snd('whoosh', { dur: 1 });
    placeRig(rg, k);
    await sleep(1150);
    if (state !== st) return;
    rg.classList.remove('go');
    rg.animate([{ translate: '0 0' }, { translate: '-4px 0' }, { translate: '2px 0' }, { translate: '0 0' }], { duration: T(300), easing: 'ease-out' });
    snd('tick');
    const cc = canCenter(rg);
    puff(cc.x - G.cw * 0.4, G.Y[r] + G.rh - 6);
    if (k > 0) {
      bubble(`${CNAME[k]} ${row.d} — это ${PLACE[k]}: банка встаёт в клетку ${k === 1 ? 'единиц' : 'десятков'}, ${k === 1 ? 'её' : 'клетки справа'} не красим`, G.Y[r] + G.rh + 62, 3200);
      await sleep(500);
      if (state !== st) return;
    }
    st.busy = false;
    openTab(st, `${tk.a} × ${row.d} =`);
    paintCur(st);
  }

  function dropPaint(x0, y0, x1, y1, color) {
    const d = mk('dm-drop'); d.style.background = color;
    d.style.left = `${x0 - 6}px`; d.style.top = `${y0}px`;
    const a = d.animate([{ translate: '0 0', scale: '.4' }, { translate: `${(x1 - x0) * 0.5}px ${Math.min(y0, y1) - y0 - 40}px`, scale: '1', offset: 0.45 }, { translate: `${x1 - x0}px ${y1 - y0}px`, scale: '.7', opacity: 0.7 }],
      { duration: T(420), easing: 'ease-in-out', fill: 'forwards' });
    a.onfinish = () => d.remove();
    return a.finished.catch(() => {});
  }

  /* ---------- планшет ---------- */
  function openTab(st, pv) {
    if (st.tab) { st.tab.querySelector('.dc-pv span').textContent = pv; return; }
    const tab = document.createElement('div');
    tab.className = 'dc-tab dm-tab';
    tab.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="dcPencil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/></filter></svg>
      <div class="clip" role="dialog" aria-label="Считай в столбик"><div class="metal"></div><div class="paper"><div class="pencil">
      <div class="dc-pv"><span>${pv}</span> <b></b></div>
      <div class="msg"></div>
      <div class="pad">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((d) => `<button class="k" type="button" data-d="${d}">${d}</button>`).join('')}<button class="k z" type="button" data-d="0" style="grid-column: span 3">0</button></div>
      </div></div></div>`;
    document.body.append(tab);
    st.tab = tab;
    tab.querySelectorAll('.k').forEach((k) => k.addEventListener('click', () => type(st, k.dataset.d, k)));
  }
  function closeTab() {
    document.querySelectorAll('.dm-tab:not(.out)').forEach((t) => { t.classList.add('out'); setTimeout(() => t.remove(), 360); });
    if (state) state.tab = null;
  }
  const say = (st, t, calm) => { if (!st.tab) return; const m = st.tab.querySelector('.msg'); m.textContent = t || ''; m.style.color = calm ? 'var(--pen)' : ''; };

  const curSteps = (st) => (st.phase === 'sum' ? st.task.sum : st.row.steps);
  const curCells = (st) => (st.phase === 'sum' ? st.sumCells : st.cells[st.row.k]);
  /* подсветка: в сложении — весь столбец; в умножении — только то, что умножаем (цифра сверху и цифра множителя)
   * и клетка, куда пишем. Сплошной столбец врал бы: в ряду десятков под цифрой сверху стоит не та цифра */
  const box = (el, q, top, h, on) => { if (!on) { el.classList.remove('on'); return; } Object.assign(el.style, { left: `${qx(q) - G.cw / 2}px`, width: `${G.cw}px`, top: `${top}px`, height: `${h}px` }); el.classList.add('on'); };
  function placeBand(st) {
    const s = curSteps(st)[Math.min(st.si, curSteps(st).length - 1)];
    if (!st.band2) { st.band2 = mk('dm-band'); st.band3 = mk('dm-band'); }
    if (st.phase === 'sum') {
      const top = G.colTop - G.cw * 0.5, bot = G.Y.s + G.rh + 4;
      box(st.band, s.q, top, bot - top, true);
      box(st.band2, 0, 0, 0, false); box(st.band3, 0, 0, 0, false);
      return;
    }
    const k = st.row.k, pad = 3;
    box(st.band, s.q, G.Y[`p${k}`] - pad, G.rh + pad * 2, true);                            // куда пишем
    box(st.band2, s.q - k, G.Y.a - pad, G.rh + pad * 2, !s.rest);                           // цифра сверху
    box(st.band3, k, G.Y.b - pad, G.rh + pad * 2, !s.rest);                                 // цифра множителя
  }
  function paintCur(st) {
    if (!st.band) st.band = mk('dm-band');
    st.cur = true;
    const steps = curSteps(st), cells = curCells(st);
    cells.forEach((c, i) => c.classList.toggle('on', i === st.si));
    if (st.si < steps.length) placeBand(st); else [st.band, st.band2, st.band3].forEach((b) => b && b.classList.remove('on'));
    if (st.tab) st.tab.querySelector('.dc-pv b').textContent = steps.map((s, i) => (i < st.si ? s.exp : '_')).reverse().join('');
  }

  function hintFor(st, s, miss) {
    if (st.phase === 'sum') {
      const ex = `${s.parts.join(' + ')}${s.cin ? ` + ${s.cin} (перенос)` : ''}`;
      if (miss > 1) return s.v >= 10 ? `${ex} = ${s.v}: пишем ${s.exp}, ${Math.floor(s.v / 10)} переносим` : `${ex} = ${s.v}`;
      return `${ex} = ?`;
    }
    if (s.rest) return miss > 1 ? `Цифры сверху кончились, остался перенос ${s.cin} — пиши ${s.cin}` : 'Цифры сверху кончились, но остался перенос — запиши его';
    const ex = `${s.x} × ${s.d}${s.cin ? ` + ${s.cin}` : ''}`;
    const why = s.cin ? ` (${s.cin} — перенос сверху)` : '';
    if (miss > 1) return s.v >= 10 ? `${ex} = ${s.v}: пишем ${s.exp}, а ${Math.floor(s.v / 10)} переносим наверх` : `${ex} = ${s.v}`;
    return s.v >= 10 ? `${ex} = ?${why} Пиши только последнюю цифру` : `${ex} = ?${why}`;
  }

  async function type(st, ch, key) {
    if (state !== st || !st.tab || st.lock || (st.phase !== 'row' && st.phase !== 'sum') || st.busy) return;
    const steps = curSteps(st), cells = curCells(st), s = steps[st.si], c = cells[st.si];
    if (ch !== s.exp) {
      st.miss += 1;
      snd('nope');
      say(st, hintFor(st, s, st.miss));
      c.classList.remove('bad'); void c.offsetWidth; c.classList.add('bad');
      if (key) { key.classList.remove('bad'); void key.offsetWidth; key.classList.add('bad'); }
      return;
    }
    st.lock = true; st.miss = 0;
    say(st, '');
    c.classList.remove('on', 'bad');
    if (st.phase === 'row') {
      /* капля краски летит из банки в клетку — цифра появляется цветом ряда */
      const cc = canCenter(st.rigs[st.rigs.length - 1]);
      await dropPaint(cc.x, cc.y, qx(s.q), G.Y[`p${st.row.k}`] + G.rh * 0.45, COL[st.row.k]);
      if (state !== st) return;
      c.textContent = s.exp; c.classList.add('full');
      c.animate([{ scale: '.2', opacity: 0, filter: 'blur(2px)' }, { scale: '1.25', opacity: 1, filter: 'blur(0)' }, { scale: '1' }], { duration: T(360), easing: 'ease-out' });
      snd('pop');
      /* перенос — маленькой цифрой над верхним числом, над следующим разрядом */
      st.marks.forEach((m) => m.remove()); st.marks = [];
      const next = steps[st.si + 1];
      if (next && next.cin && !next.rest) {
        const m = mk('dc-mark', String(next.cin));
        m.style.left = `${qx(next.q)}px`; m.style.top = `${G.Y.a - G.cw * 0.38}px`;   // перенос — над тем столбцом, куда будем писать
        st.marks.push(m);
      }
      st.si += 1;
      paintCur(st);
      if (st.si >= steps.length) { st.lock = false; await rowDone(st); return; }
    } else {
      c.textContent = s.exp; c.classList.add('full');
      const fall = G.Y.s - G.colTop;
      c.animate([{ transform: `translateY(${-fall * 0.4}px) scale(.7)`, opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'none' }], { duration: T(380), easing: 'ease-out' });
      snd('pop');
      if (s.cout) {
        const m = mk('dc-mark', String(Math.floor(s.v / 10)));
        m.style.left = `${qx(s.q + 1)}px`; m.style.top = `${G.Y.p0 - G.cw * 0.12}px`;
      }
      st.si += 1;
      paintCur(st);
      if (st.si >= steps.length) { st.lock = false; finish(st); return; }
    }
    st.lock = false;
  }

  async function rowDone(st) {
    const tk = st.task;
    st.busy = true;
    [st.band, st.band2, st.band3].forEach((b) => b && b.classList.remove('on'));
    st.marks.forEach((m) => m.remove()); st.marks = [];
    /* ряд готов — его цифры и цифра множителя снова чёрные, чтобы не отвлекать */
    await sleep(350);
    if (state !== st) return;
    st.bEls[tk.B.length - 1 - st.row.k].style.color = '';
    st.cells[st.row.k].forEach((c) => { c.style.color = '#1d1d1f'; });
    await sleep(300);
    if (state !== st) return;
    if (st.row.k + 1 < tk.m) { await startRow(st, st.row.k + 1); return; }
    if (tk.m === 1) { finish(st); return; }
    /* все ряды покрашены — складываем */
    st.phase = 'sum'; st.si = 0; st.miss = 0;
    st.plus = at(mk('dm-sign', '+'), 'x', `p${Math.floor((tk.m - 1) / 2)}`);
    st.line2 = mk('dm-line');
    st.sumCells = tk.sum.map((s) => at(mk('dm-c'), s.q, 's'));
    placeAll(st);
    [st.plus, st.line2, ...st.sumCells].forEach((e, i) => e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T(300), delay: T(i * 30), fill: 'backwards' }));
    openTab(st, 'Сложи ряды:');
    say(st, 'Теперь складываем ряды в столбик', true);
    st.busy = false;
    paintCur(st);
  }

  /* до бульдозера: нажатие на пример напоминает про инструмент */
  world.addEventListener('pointerdown', (e) => {
    const st = state;
    if (!st || st.phase !== 'wait') return;
    if (MG.tools.need('dozer')) showColumn(st);
  });

  window.addEventListener('keydown', (e) => {
    const st = state;
    if (!st || !st.tab || MG.active !== MG.modes.decmul || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^\d$/.test(e.key)) { type(st, e.key); e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* ---------- финал: цифры превращаются в блоки, большой бульдозер сносит всё ---------- */
  async function finish(st) {
    st.phase = 'done';
    closeTab();
    [st.band, st.band2, st.band3].forEach((b) => b && b.classList.remove('on'));
    hint.set('');
    const tk = st.task;
    const ans = tk.m > 1 ? st.sumCells : st.cells[0];
    await sleep(250);
    if (state !== st) return;
    ans.forEach((c, i) => setTimeout(() => { c.style.color = 'var(--ok)'; c.animate([{ scale: '1' }, { scale: '1.25' }, { scale: '1' }], { duration: T(320) }); }, T(i * 60)));
    burst(ans[ans.length - 1], '#16a34a', 14);
    solved++;
    setStats(lvlOf(), solved);
    await sleep(1000);
    if (state !== st) return;
    /* бульдозеры с банками уезжают */
    st.rigs.forEach((rg, i) => setTimeout(() => { rg.classList.add('go'); rg.style.transitionDuration = '.9s'; placeRig(rg, 'away'); }, T(i * 150)));
    if (st.rigs.length) snd('whoosh', { dur: 0.8 });
    await sleep(1000 + st.rigs.length * 150);
    if (state !== st) return;
    st.rigs.forEach((rg) => rg.remove()); st.rigs = [];
    /* знаки и черты исчезают, цифры обрастают стенами */
    world.querySelectorAll('.dm-sign, .dm-line, .dc-mark, .dc-say').forEach((e) => e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(300), fill: 'forwards' }));
    const digits = [...world.querySelectorAll('.dm-d, .dm-c')].filter((e) => e.textContent.trim());
    digits.sort((a, b) => b.offsetTop - a.offsetTop || b.offsetLeft - a.offsetLeft);
    digits.forEach((el, i) => setTimeout(() => {
      if (state !== st) return;
      el.classList.remove('pick', 'used', 'on');
      el.style.opacity = '1';
      if (!el.classList.contains('dm-d')) el.classList.add('dm-d');
      el.style.setProperty('--e', ans.includes(el) ? '#6b7080' : el._col || getComputedStyle(el).color);
      if (el._col && !ans.includes(el)) el.style.color = el._col;              // в финале блоки снова цветные
      el.classList.add('blk');
      if (ans.includes(el)) { el.classList.add('fd'); el.style.color = '#2f333d'; }
      el.animate([{ scale: '1' }, { scale: '1.15' }, { scale: '1' }], { duration: T(300) });
      snd('tick');
    }, T(i * 45)));
    await sleep(digits.length * 45 + 600);
    if (state !== st) return;
    /* большой бульдозер едет справа налево и сталкивает блоки */
    const big = mk('dm-dozer');
    big.innerHTML = DOZER(100);
    big.classList.add('go');
    const bw = G.cw * 4.4, bh = bw * 46 / 66;
    Object.assign(big.style, { width: `${bw}px`, height: `${bh}px`, top: `${G.bottom - bh + 4}px`, transition: 'none', left: `${G.vw + 10}px` });
    snd('whoosh', { dur: 1.2 });
    const run = big.animate([{ left: `${G.vw + 10}px` }, { left: `${-bw - 40}px` }], { duration: T(2600), easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' });
    const hit = new Set();
    let first = true;
    (function watch() {
      if (state !== st || !big.isConnected) return;
      const bx = big.getBoundingClientRect().left;
      digits.forEach((el, i) => {
        if (hit.has(el)) return;
        const r = el.getBoundingClientRect();
        if (bx > r.right - 4) return;
        hit.add(el);
        if (first) { first = false; snd('smash'); shake(); }
        else if (hit.size % 4 === 0) snd('crumble');
        const up = 30 + ((i * 53) % 70), dx = -(140 + ((i * 37) % 120)), rot = -(((i * 71) % 300) + 120);
        el.animate([{ translate: '0 0', rotate: '0deg', opacity: 1 }, { translate: `${dx * 0.35}px ${-up}px`, rotate: `${rot * 0.4}deg`, offset: 0.35 },
          { translate: `${dx}px ${G.bottom + 120 - el.offsetTop}px`, rotate: `${rot}deg`, opacity: 0 }], { duration: T(1100 + (i % 4) * 120), easing: 'cubic-bezier(.25,.6,.6,1)', fill: 'forwards' });
        puff(r.left - world.getBoundingClientRect().left + r.width / 2, r.top - world.getBoundingClientRect().top + r.height / 2);
      });
      requestAnimationFrame(watch);
    })();
    await run.finished.catch(() => {});
    if (state !== st) return;
    big.remove();
    await sleep(300);
    if (state !== st) return;
    world.querySelectorAll('.dm-d, .dm-c, .dm-sign, .dm-line, .dc-mark, .dc-say, .dm-band, .dc-dust').forEach((e) => e.remove());
    /* камера к примеру: дописываем «= ответ» */
    st.cam = false;
    world.style.transform = '';
    await sleep(900);
    if (state !== st) return;
    const eq = Object.assign(document.createElement('span'), { textContent: '=' });
    st.ex.append(eq);
    const ansSpans = tk.S.split('').map((d) => { const s = Object.assign(document.createElement('span'), { className: 'ans', textContent: d }); st.ex.append(s); return s; });
    placeEx(st);
    eq.animate([{ scale: '.3', opacity: 0 }, { scale: '1.2', opacity: 1 }, { scale: '1' }], { duration: T(350), easing: 'ease-out', fill: 'backwards' });
    ansSpans.forEach((s, i) => s.animate([{ scale: '.3', opacity: 0 }, { scale: '1.2', opacity: 1 }, { scale: '1' }], { duration: T(400), delay: T(200 + i * 60), easing: 'ease-out', fill: 'backwards' }));
    setTimeout(() => { if (state === st) { snd('pop'); burst(ansSpans[ansSpans.length - 1], '#16a34a', 14); } }, T(300 + ansSpans.length * 60));
    resultText.textContent = `${tk.a} × ${tk.b} = ${tk.total}`;
    after.classList.add('show');
    if (solved >= TOTAL) setTimeout(offerDone, T(900));
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }
  function puff(x, y) {
    const p = mk('dc-dust'), sz = 16 + Math.random() * 18;
    Object.assign(p.style, { width: `${sz}px`, height: `${sz}px`, left: `${x - sz / 2}px`, top: `${y - sz / 2}px` });
    p.animate([{ scale: '.3', opacity: 0 }, { scale: '1', opacity: .95, offset: 0.15 }, { scale: '2', opacity: 0, translate: '-30px -16px' }], { duration: T(900), easing: 'ease-out', fill: 'forwards' }).onfinish = () => p.remove();
  }
  function shake() {
    world.animate([{ translate: '0 0' }, { translate: '-7px 4px' }, { translate: '6px -3px' }, { translate: '-4px 2px' }, { translate: '0 0' }], { duration: T(360), easing: 'ease-out' });
  }

  function offerDone() {
    if (document.querySelector('.so-ov')) return;
    const ov = document.createElement('div');
    ov.className = 'so-ov';
    ov.innerHTML = '<div class="skip-offer" role="dialog"><h3>Уровень пройден!</h3><p>Ты научился умножать в столбик. Идём дальше.</p><div class="so-row"><button type="button" class="so-go">На карту</button></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('.so-go').addEventListener('click', () => {
      try { localStorage.setItem('mg.solved.decmul', String(Math.max(TOTAL, solved))); } catch (err) { /* нет хранилища */ }
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
    if (MG.active !== MG.modes.decmul || e.detail.tool !== 'dozer') return;
    const st = state;
    if (st && st.phase === 'wait') showColumn(st);
  });
  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (MG.active === MG.modes.decmul && state && !state.busy && !state.lock && state.phase !== 'done') layout(state); }, 150);
  });

  MG.modes.decmul = {
    total: TOTAL,
    levelUp() { solved = Math.min(TOTAL, (Math.floor(solved / 2) + 1) * 2); if (solved >= TOTAL) { setStats(lvlOf(), solved); offerDone(); return; } newRound(); },
    start() {
      if (MG.tools.current() === 'dozer') MG.tools.clear();
      if (!state) newRound();
      else { setStats(lvlOf(), solved); layout(state); if ((state.phase === 'row' || state.phase === 'sum') && !state.tab) openTab(state, state.phase === 'sum' ? 'Сложи ряды:' : `${state.task.a} × ${state.row.d} =`); if (state.tab) paintCur(state); sayPick(); }
    },
    skip() { if (solved >= TOTAL) { offerDone(); return; } newRound(); },
    stop() {
      const st = state;
      if (st && (st.busy || st.lock || st.phase === 'done')) state = null;   // недоигранная анимация — при возвращении новый пример
      closeTab();
    },
    _state: () => state,
  };
})();

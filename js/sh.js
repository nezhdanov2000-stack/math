/* Режим «Уравнения → Перенос через «=»»: 2x + 7 = 5 + x.
 * Вертолёт тащит слагаемое за барьер (знак «=» превращается в барьер): за барьером слагаемое меняет знак
 * (отрицательные горят). Дальше молния приводит подобные, а если перед x остался множитель —
 * конвейер переносит его через «=» делителем, и молния считает дробь.
 */
(() => {
  'use strict';

  const { $, T, sleep, ri, setStats, burst, popIn, bump, shake } = window.MG;

  const stage = $('#sh-stage');
  const boxes = { L: $('#sh-L'), R: $('#sh-R') };
  const eqEl = $('#sh-eq');
  const hint = $('#sh-hint');
  const after = $('#sh-after');
  const resultText = $('#sh-resultText');
  const nextBtn = $('#sh-next');

  let st = null;
  let solved = 0;
  let lastKey = '';
  let uid = 0;
  const levelOf = (s) => Math.min(6, 1 + Math.floor(s / 3));
  const MINUS = '−';
  const fmt = (n) => (n < 0 ? `${MINUS}${-n}` : String(n));

  /* ---------- генерация: a·x + b = c + d·x, ответ целый ---------- */
  function pick() {
    if (solved === 0 && lastKey === '') return { a: 2, b: 7, c: 5, d: 1, lx: true, rx: false, x0: -2 };   // как на эскизе
    for (let i = 0; i < 3000; i++) {
      const k = solved < 4 ? 1 : ri(1, 3);
      const x0 = ri(-9, 9);
      if (!x0) continue;
      const d = ri(1, 4);
      const a = d + k;
      const b = ri(1, 12);
      const c = b + k * x0;
      if (c < 1 || c > 24) continue;
      const key = `${a}.${b}.${c}.${d}`;
      if (key === lastKey) continue;
      return { a, b, c, d, lx: Math.random() < 0.6, rx: Math.random() < 0.4, x0 };
    }
    return { a: 3, b: 4, c: 10, d: 1, lx: true, rx: false, x0: 3 };
  }

  /* ---------- слагаемые ---------- */
  function mkTerm(side, kind, v) {
    const el = document.createElement('div');
    el.className = 'sh-t';
    el.style.touchAction = 'none';
    const op = document.createElement('div');
    op.className = 'sh-op';
    const t = { id: ++uid, side, kind, v, den: 1, el, op };
    el.addEventListener('pointerdown', (e) => onDown(t, e));
    el.addEventListener('click', () => onTermClick(t));
    op.addEventListener('click', () => onOpClick(t));
    return t;
  }

  const bodyHTML = (t) => {
    const a = Math.abs(t.v);
    if (t.kind === 'x') return `<span class="co">${a === 1 ? '' : a}</span><span class="vx">x</span>`;
    if (t.den > 1) return `<span class="sh-fr"><i>${a}</i><i>${t.den}</i></span>`;
    return String(a);
  };

  /* огонь для отрицательных (фильтр и искры — из режима смешанных чисел) */
  function ignite(el) {
    if (el.classList.contains('mx-burn')) return;
    el.classList.add('mx-burn');
    const n = Math.max(2, Math.round(el.getBoundingClientRect().width / 28));
    for (let k = 0; k < n; k++) {
      const em = document.createElement('i');
      em.className = 'mx-ember';
      Object.assign(em.style, { left: `${8 + Math.random() * 84}%`, top: `${20 + Math.random() * 30}%`, animationDelay: `${-Math.random() * 1.2}s`, animationDuration: `${0.9 + Math.random() * 0.8}s` });
      em.style.setProperty('--dx', `${(Math.random() - 0.5) * 0.5}em`);
      el.append(em);
    }
  }
  function extinguish(el) {
    el.classList.remove('mx-burn');
    el.querySelectorAll('.mx-ember').forEach((e) => e.remove());
  }

  function paint(t, first) {
    const neg = t.v < 0;
    t.el.innerHTML = `${first && neg ? `<span class="un">${MINUS}</span>` : ''}${bodyHTML(t)}`;
    t.el.classList.toggle('neg', neg);
    t.op.textContent = neg ? MINUS : '+';
    t.op.classList.toggle('neg', neg);
    t.op.classList.toggle('hid', first);
    t.el.classList.remove('mx-burn');
    t.op.classList.remove('mx-burn');
    if (neg) { ignite(t.el); if (!first) ignite(t.op); }
  }

  function render() {
    ['L', 'R'].forEach((side) => {
      const box = boxes[side];
      const list = st.sides[side];
      box.replaceChildren();
      if (!list.length) {
        const z = document.createElement('div');
        z.className = 'sh-t sh-zero';
        z.textContent = '0';
        box.append(z);
        return;
      }
      list.forEach((t, i) => {
        paint(t, i === 0);
        if (i > 0) box.append(t.op);
        box.append(t.el);
      });
    });
  }

  /* плавное перестроение: элементы едут на новые места */
  const flipEls = () => [...stage.querySelectorAll('.sh-t, .sh-op, .sh-eq')];
  function snap() {
    const m = new Map();
    flipEls().forEach((e) => m.set(e, e.getBoundingClientRect()));
    return m;
  }
  function playFlip(first, skip = new Set(), dur = 520) {
    flipEls().forEach((e) => {
      if (skip.has(e) || e.style.visibility === 'hidden') return;
      const a = first.get(e);
      if (!a) return;
      const b = e.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      e.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: T(dur), easing: 'cubic-bezier(.3,.7,.2,1)' });
    });
  }
  function reflow(fn, skip) {
    const first = snap();
    fn();
    playFlip(first, skip);
  }

  const fontPx = () => parseFloat(getComputedStyle(stage).fontSize);
  function fitFont() {
    const avail = Math.min(window.innerWidth * 0.94, 980) - 20;
    stage.style.fontSize = `${Math.max(26, Math.min(64, avail / 13))}px`;
  }
  window.addEventListener('resize', () => { if (st && !$('#mode-shift').hidden) fitFont(); });

  /* ============================================================
   * Состояние решения
   * ============================================================ */
  const movable = (t) => (t.kind === 'x' && t.side === 'R') || (t.kind === 'n' && t.side === 'L');
  const all = () => [...st.sides.L, ...st.sides.R];

  function computePhase() {
    if (all().some(movable)) return 'T';
    if (st.sides.L.length > 1 || st.sides.R.length > 1) return 'C';
    const x = st.sides.L[0], n = st.sides.R[0];
    if (x && n && x.kind === 'x' && n.kind === 'n') {
      if (Math.abs(x.v) > 1) return 'D';
      if (n.den > 1) return 'F';
      return 'done';
    }
    return 'C';
  }

  let shownHint = '';
  function setHint(text) {
    shownHint = text;
    hint.classList.add('swap');
    setTimeout(() => {
      if (shownHint === text) hint.textContent = text;
      hint.classList.remove('swap');
    }, T(150));
  }
  function defaultHint() {
    if (!st || st.finished) return '';
    switch (st.phase) {
      case 'T': return 'Возьми вертолёт и перенеси слагаемые через барьер: x — влево, числа — вправо. За барьером знак слагаемого меняется на противоположный';
      case 'C': return 'Приведи подобные: возьми молнию и ударь по знаку между двумя слагаемыми одного вида';
      case 'D': return `Перед x стоит ${Math.abs(st.sides.L[0].v)}. Возьми конвейер и нажми на это число — оно переедет через «=» и станет делителем`;
      case 'F': return 'Осталось поделить: ударь молнией по дроби';
      default: return '';
    }
  }
  function autoTool() {
    if (!st || st.finished) return;
    const map = { T: { heli: true }, C: { bolt: true }, D: { conveyor: true }, F: { bolt: true } }[st.phase];
    if (map) window.MG.tools.auto('shift', map);
  }
  function updateHint() {
    const t = defaultHint();
    if (t !== shownHint) setHint(t);
    autoTool();
  }
  function flashHint(text, ms = 3600) {
    setHint(text);
    const s = st;
    setTimeout(() => { if (st === s) updateHint(); }, ms);
  }

  /* ============================================================
   * Раунд
   * ============================================================ */
  function newRound() {
    const sp = pick();
    lastKey = `${sp.a}.${sp.b}.${sp.c}.${sp.d}`;
    after.classList.remove('show');
    eqEl.style.visibility = '';
    const L = [mkTerm('L', 'x', sp.a), mkTerm('L', 'n', sp.b)];
    if (!sp.lx) L.reverse();
    const R = [mkTerm('R', 'n', sp.c), mkTerm('R', 'x', sp.d)];
    if (sp.rx) R.reverse();
    st = { sp, sides: { L, R }, phase: 'T', busy: false, finished: false };
    fitFont();
    render();
    [...stage.querySelectorAll('.sh-t, .sh-op:not(.hid)')].forEach((e, i) => popIn(e, i * 50));
    st.phase = computePhase();
    setStats(levelOf(solved), solved);
    shownHint = '';
    updateHint();
  }

  /* ============================================================
   * Барьер: «=» превращается в две вертикальные фиолетовые линии с вращающимися стрелками
   * ============================================================ */
  const sty = document.createElement('style');
  sty.textContent = `
    .sh-wall { position: fixed; left: 0; top: 0; width: 0; height: 100vh; z-index: 2; pointer-events: none; }
    .sh-wall > * { position: absolute; top: 0; height: 100%; translate: -50% 0; }
    .sh-field { overflow: hidden;
      background: linear-gradient(to right, rgba(139,92,246,.05), rgba(139,92,246,.30), rgba(139,92,246,.05));
      -webkit-mask-image: linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent);
      mask-image: linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent);
      animation: shBreath 2.3s ease-in-out infinite; }
    .sh-stripes { position: absolute; left: 0; right: 0; top: -56px; height: calc(100% + 56px); will-change: transform;
      background: repeating-linear-gradient(to bottom, rgba(196,181,253,0) 0 26px, rgba(196,181,253,.5) 26px 30px, rgba(196,181,253,0) 30px 56px);
      animation: shFlow 1.4s linear infinite; }
    .sh-spark { position: absolute; top: auto; bottom: 0; height: auto; border-radius: 50%; background: #ede9fe;
      box-shadow: 0 0 8px 2px #a78bfa; animation: shRise linear infinite; will-change: transform; }
    .sh-piv { position: fixed; width: 0; height: 0; z-index: 3; pointer-events: none; }
    .sh-bar { position: absolute; border-radius: 999px; will-change: transform; }
    .sh-gw { position: absolute; inset: 0; }
    .sh-gl { position: absolute; inset: -1px; border-radius: 999px; box-shadow: 0 0 12px 3px #8b5cf6, 0 0 2px 1px #ddd6fe; animation: shGlow 1.15s ease-in-out infinite; }
    .sh-bar.b2 .sh-gl { animation-delay: -.57s; }
    .sh-wave { position: fixed; z-index: 14; pointer-events: none; translate: -50% -50%; border-radius: 50%; border: 3px solid #c4b5fd; box-shadow: 0 0 22px #8b5cf6, inset 0 0 18px #a78bfa; }
    @keyframes shGlow { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
    @keyframes shFlow { to { transform: translateY(56px); } }
    @keyframes shBreath { 0%, 100% { opacity: .6; } 50% { opacity: 1; } }
    @keyframes shRise { from { transform: translateY(0); opacity: 0; } 10% { opacity: 1; } 85% { opacity: .9; } to { transform: translateY(-100vh); opacity: 0; } }
  `;
  document.head.append(sty);

  /* «=» переворачивается на месте и превращается в два фиолетовых луча на всю высоту окна.
   * Всё идёт одним непрерывным кадровым рядом (поворот, растяжение, раздвижение, свечение — перекрываются),
   * а при закрытии те же анимации просто проигрываются в обратную сторону. */
  async function openBarrier(cx, cy, eqW, fs) {
    const gap = Math.max(28, fs * 0.5), th = Math.max(4, fs * 0.085);
    const w0 = eqW * 0.85, h0 = eqW * 0.175, g0 = eqW * 0.4;
    const VH = window.innerHeight * 2.2;
    const ink = '#1f2937', P = '#a78bfa';
    const Z = 1150;

    const wall = document.createElement('div');
    wall.className = 'sh-wall';
    wall.style.left = `${cx}px`;
    const field = document.createElement('div');
    field.className = 'sh-field';
    field.style.width = `${gap}px`;
    field.innerHTML = '<div class="sh-stripes"></div>';
    wall.append(field);
    for (let i = 0; i < 26; i++) {
      const sp = document.createElement('i');
      sp.className = 'sh-spark';
      const z = 2 + Math.random() * 3;
      Object.assign(sp.style, { width: `${z}px`, height: `${z}px`, left: `${(Math.random() - 0.5) * (gap + th * 2)}px`, animationDuration: `${2.2 + Math.random() * 2.6}s`, animationDelay: `${-Math.random() * 4}s` });
      wall.append(sp);
    }
    const piv = document.createElement('div');
    piv.className = 'sh-piv';
    piv.style.left = `${cx}px`; piv.style.top = `${cy}px`;
    const bars = [-1, 1].map((sg, i) => {
      const bar = document.createElement('div');
      bar.className = `sh-bar${i ? ' b2' : ''}`;
      Object.assign(bar.style, { left: `${-VH / 2}px`, top: `${-th / 2}px`, width: `${VH}px`, height: `${th}px`, background: ink });
      bar.innerHTML = '<div class="sh-gw"><div class="sh-gl"></div></div>';
      piv.append(bar);
      return { bar, sg, gw: bar.firstChild };
    });
    document.body.append(wall, piv);
    eqEl.style.visibility = 'hidden';

    const A = (el, kf, delay, dur, ease) => el.animate(kf, {
      duration: T(dur), delay: T(delay), endDelay: T(Math.max(0, Z - delay - dur)), easing: ease, fill: 'both',
    });
    const anims = [
      A(piv, [{ rotate: '0deg' }, { rotate: '90deg' }], 0, 600, 'cubic-bezier(.5,0,.15,1)'),
      A(wall, [{ opacity: 0 }, { opacity: 1 }], 560, 590, 'ease-out'),
    ];
    bars.forEach(({ bar, sg, gw }) => {
      anims.push(
        A(bar, [{ translate: `0 ${sg * g0 / 2}px` }, { translate: `0 ${sg * gap / 2}px` }], 280, 870, 'cubic-bezier(.25,.6,.2,1)'),
        A(bar, [{ scale: `${w0 / VH} ${h0 / th}` }, { scale: '1 1' }], 300, 850, 'cubic-bezier(.5,0,.15,1)'),
        A(bar, [{ backgroundColor: ink }, { backgroundColor: P }], 60, 480, 'ease-in-out'),
        A(gw, [{ opacity: 0 }, { opacity: 1 }], 520, 630, 'ease-out'),
      );
    });
    const play = (rev) => Promise.all(anims.map((a) => {
      if (rev) a.reverse();
      return a.finished.catch(() => {});
    }));
    await play(false);
    return {
      x: cx, y: cy,
      flash(y) {                       // слагаемое пересекло барьер: вспышка и расходящаяся волна
        const w = document.createElement('div');
        w.className = 'sh-wave';
        Object.assign(w.style, { left: `${cx}px`, top: `${y}px`, width: `${fs * 0.5}px`, height: `${fs * 0.5}px` });
        document.body.append(w);
        w.animate([{ scale: 0.2, opacity: 1 }, { scale: 4.5, opacity: 0 }], { duration: T(650), easing: 'ease-out' }).finished.then(() => w.remove()).catch(() => w.remove());
        bars.forEach(({ gw }) => gw.animate([{ scale: '1 3.2' }, { scale: '1 1' }], { duration: T(520), easing: 'ease-out' }));
      },
      async close() {
        await play(true);
        eqEl.style.visibility = '';
        wall.remove(); piv.remove();
      },
    };
  }

  /* ============================================================
   * Вертолёт тащит слагаемое
   * ============================================================ */
  const centerOf = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  const unionRect = (els) => {
    const rs = els.map((e) => e.getBoundingClientRect());
    const l = Math.min(...rs.map((r) => r.left)), tp = Math.min(...rs.map((r) => r.top));
    const rr = Math.max(...rs.map((r) => r.right)), bt = Math.max(...rs.map((r) => r.bottom));
    return { left: l, top: tp, right: rr, bottom: bt, width: rr - l, height: bt - tp };
  };

  function makeGhost(t, v, withOp) {
    const g = document.createElement('div');
    g.className = 'sh-ghost';
    g.style.fontSize = `${fontPx()}px`;
    const neg = v < 0;
    const probe = { kind: t.kind, v, den: t.den };
    g.innerHTML = `${withOp ? `<div class="sh-op${neg ? ' neg' : ''}">${neg ? MINUS : '+'}</div>` : ''}<div class="sh-t${neg ? ' neg' : ''}">${withOp ? '' : (neg ? `<span class="un">${MINUS}</span>` : '')}${bodyHTML(probe)}</div>`;
    document.body.append(g);
    if (neg) g.querySelectorAll('.sh-op, .sh-t').forEach(ignite);
    return g;
  }
  function setGhostSign(g, t, v, withOp) {
    const neg = v < 0;
    const op = g.querySelector('.sh-op');
    const tt = g.querySelector('.sh-t');
    if (op) { op.textContent = neg ? MINUS : '+'; op.classList.toggle('neg', neg); }
    tt.classList.toggle('neg', neg);
    [op, tt].filter(Boolean).forEach((e) => { if (neg) ignite(e); else extinguish(e); });
    // знак без оператора — внутри числа
    const un = tt.querySelector('.un');
    if (!withOp) {
      if (neg && !un) tt.insertAdjacentHTML('afterbegin', `<span class="un">${MINUS}</span>`);
      if (!neg && un) un.remove();
    }
  }

  function onTermClick(t) {
    if (!st || st.finished || st.busy) return;
    const tools = window.MG.tools;
    if (st.phase === 'D' && t.kind === 'x') { divideStart(t); return; }
    if (st.phase === 'F' && t.kind === 'n' && t.den > 1) { computeFraction(t); return; }
    if (tools.current() === 'bolt' && !(t.kind === 'n' && t.den > 1)) {
      flashHint('Молния бьёт по знаку между слагаемыми: нажми на «+» или «−» между двумя подобными');
    }
  }

  async function onDown(t, e) {
    if (!st || st.finished || st.busy || e.button) return;
    const tools = window.MG.tools;
    if (tools.current() !== 'heli') return;                 // другими инструментами слагаемое не потащишь
    e.preventDefault();
    const me = st;
    me.busy = true;
    const fs = fontPx();
    const list = me.sides[t.side];
    const first = list[0] === t;
    const group = first ? [t.el] : [t.op, t.el];
    const r0 = unionRect(group);
    const c0 = centerOf(r0);
    const origin = t.side;
    const vFlip = -t.v;
    const ghostEl = makeGhost(t, t.v, !first);
    const gw = r0.width, gh = r0.height;
    const placeGhost = (x, y) => { ghostEl.style.left = `${x - ghostEl.offsetWidth / 2}px`; ghostEl.style.top = `${y - ghostEl.offsetHeight / 2}px`; };
    placeGhost(c0.x, c0.y);
    group.forEach((el) => el.classList.add('lifted'));

    // вертолёт прилетает, барьер вырастает вместо «=»
    const heli = window.MG.heli.spawn(window.innerWidth + 100, c0.y - fs * 3, { size: fs * 1.9 });
    const L0 = fs * 0.55;
    const hOff = () => 0.4 * (heli.size * 40 / 64) + L0 + heli.magnetH + ghostEl.offsetHeight / 2;
    const paintHeli = (v, anim) => window.MG.heli.tint(heli, v < 0, anim);
    paintHeli(t.v, false);
    heli.len(L0);
    const er = eqEl.getBoundingClientRect();
    const bc = centerOf(er);
    const barrierP = openBarrier(bc.x, bc.y, er.width, fs);
    let barrierRef = null;
    barrierP.then((b) => { barrierRef = b; });
    let ready = false, alive = true;
    let px = c0.x, py = c0.y;
    let flipped = false;
    const arrival = heli.arrive(c0.x, c0.y - hOff(), 700).then(() => { ready = true; heli.place(px, py - hOff()); placeGhost(px, py); });

    const move = (ev) => {
      px = ev.clientX; py = ev.clientY;
      if (!ready || !alive) return;
      heli.place(px, py - hOff());
      placeGhost(px, py);
      const side = px < bc.x ? 'L' : 'R';
      const f = side !== origin;
      if (f !== flipped) {
        flipped = f;
        setGhostSign(ghostEl, t, flipped ? vFlip : t.v, !first);
        burst(ghostEl, flipped ? (vFlip < 0 ? '#f97316' : '#60a5fa') : '#a78bdc', 12);
        if (barrierRef) barrierRef.flash(py);
        paintHeli(flipped ? vFlip : t.v, true);
        bump(ghostEl);
      }
    };
    const up = async () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      alive = false;
      await arrival;
      const barrier = await barrierP;
      if (st !== me) { ghostEl.remove(); heli.remove(); return; }
      if (!flipped) await cancelDrag(); else await commitDrag();

      async function cancelDrag() {
        const back = ghostEl.animate([{ translate: '0 0' }, { translate: `${c0.x - px}px ${c0.y - py}px` }], { duration: T(260), easing: 'ease-in-out', fill: 'forwards' });
        await back.finished.catch(() => {});
        ghostEl.remove();
        group.forEach((el) => el.classList.remove('lifted'));
        heli.leave(600);
        await barrier.close({ cx: bc.x, cy: bc.y, eqW: er.width });
        me.busy = false;
        updateHint();
      }

      async function commitDrag() {
        // модель: слагаемое переходит в другую часть и меняет знак
        me.sides[origin].splice(me.sides[origin].indexOf(t), 1);
        t.v = vFlip;
        t.side = origin === 'L' ? 'R' : 'L';
        const dst = me.sides[t.side];
        let at = dst.length;
        const lastLike = dst.map((x) => x.kind).lastIndexOf(t.kind);
        if (lastLike >= 0) at = lastLike + 1; else if (t.kind === 'x') at = 0;
        dst.splice(at, 0, t);
        group.forEach((el) => el.classList.remove('lifted'));
        let nr = null;
        reflow(() => {
          render();
          t.el.style.opacity = '0'; t.op.style.opacity = '0';
        }, new Set([t.el, t.op]));
        const grp2 = dst[0] === t ? [t.el] : [t.op, t.el];
        nr = unionRect(grp2);
        const tc = centerOf(nr);
        const cur = { x: parseFloat(ghostEl.style.left) + ghostEl.offsetWidth / 2, y: parseFloat(ghostEl.style.top) + ghostEl.offsetHeight / 2 };
        // ghost садится на своё место; форма у «первого» слагаемого другая — подгоняем под него
        const land = ghostEl.animate([{ translate: '0 0' }, { translate: `${tc.x - cur.x}px ${tc.y - cur.y}px` }], { duration: T(420), easing: 'cubic-bezier(.3,.8,.3,1)', fill: 'forwards' });
        await land.finished.catch(() => {});
        ghostEl.remove();
        t.el.style.opacity = ''; t.op.style.opacity = '';
        bump(t.el);
        burst(t.el, vFlip < 0 ? '#f97316' : '#60a5fa', 10);
        heli.leave(650);
        await sleep(220);
        const er2 = eqEl.getBoundingClientRect();
        await barrier.close({ cx: er2.left + er2.width / 2, cy: er2.top + er2.height / 2, eqW: er2.width });
        me.busy = false;
        me.phase = computePhase();
        updateHint();
        checkDone();
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  /* ============================================================
   * Молния: приводим подобные
   * ============================================================ */
  function onOpClick(t) {
    if (!st || st.finished || st.busy) return;
    const tools = window.MG.tools;
    if (!tools.need('bolt')) return;
    const list = st.sides[t.side];
    const i = list.indexOf(t);
    const p = list[i - 1];
    if (!p) return;
    if (p.kind !== t.kind) {
      shake(p.el); shake(t.el);
      flashHint(`${p.kind === 'x' ? 'x' : 'Число'} и ${t.kind === 'x' ? 'x' : 'число'} — не подобные слагаемые. Складывать можно только x с x и числа с числами`);
      return;
    }
    merge(p, t);
  }

  async function merge(p, t) {
    const me = st;
    me.busy = true;
    const sum = p.v + t.v;
    const list = me.sides[p.side];
    const i = list.indexOf(p);
    const els = [p.el, t.op, t.el];
    await Promise.all(els.map((e) => e.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '.4' }], { duration: T(260), fill: 'forwards' }).finished.catch(() => {})));
    if (st !== me) return;
    list.splice(i, 2);
    let nt = null;
    if (sum !== 0) {
      nt = mkTerm(p.side, p.kind, sum);
      list.splice(i, 0, nt);
    }
    reflow(() => {
      render();
      if (nt) { nt.el.style.opacity = '0'; nt.op.style.opacity = '0'; }
    }, nt ? new Set([nt.el, nt.op]) : new Set());
    if (nt) {
      const reveal = [nt.el];
      if (list[0] !== nt) nt.op.style.opacity = '';
      await window.MG.lightning(reveal, { color: sum < 0 ? '#fb923c' : '#fde047' });
      nt.el.style.opacity = '';
    } else {
      await sleep(300);
    }
    if (st !== me) return;
    me.busy = false;
    me.phase = computePhase();
    updateHint();
    checkDone();
  }

  /* ============================================================
   * Деление: множитель при x уезжает через «=» делителем, молния считает дробь
   * ============================================================ */
  async function divideStart(t) {
    const me = st;
    if (!window.MG.tools.need('conveyor')) return;
    const nTerm = me.sides.R[0];
    const co = t.el.querySelector('.co');
    if (!co) return;
    me.busy = true;
    setHint('');
    const fs = fontPx();
    const R = (el) => el.getBoundingClientRect();
    const sr = R(co);
    const c0 = centerOf(sr);
    const g = window.MG.ghost(co);
    g.style.zIndex = 65;
    const er = R(eqEl);
    const dest = centerOf(R(nTerm.el));
    let ang = Math.atan2(dest.y - c0.y, dest.x - c0.x);
    ang = Math.sign(ang || 1) * Math.max(40, Math.min(65, Math.abs(ang) * 180 / Math.PI)) * Math.PI / 180;
    const belt = await window.MG.conveyor.open({ fs, cx: er.left + er.width / 2, cy: er.top + er.height / 2, eqW: er.width, ang, eqEl });
    co.style.visibility = 'hidden';
    const fly = (pts, ms, ease) => g.animate(pts.map((p) => ({ transform: `translate(${p.x - c0.x}px, ${p.y - c0.y}px)` })), { duration: T(ms), easing: ease, fill: 'forwards' }).finished.catch(() => {});
    const arc = (p, q, h) => ({ x: (p.x + q.x) / 2, y: Math.min(p.y, q.y) - h });
    await fly([c0, arc(c0, belt.start, fs * 0.5), belt.start], 520, 'cubic-bezier(.3,.7,.4,1)');
    await fly([belt.start, belt.end], 1000, 'linear');
    const tc = dest;
    await fly([belt.end, arc(belt.end, tc, fs * 0.6), tc], 600, 'cubic-bezier(.3,.7,.4,1)');
    g.remove();
    const k = Math.abs(t.v);
    reflow(() => {
      t.v = Math.sign(t.v) * 1;
      nTerm.den = k;
      render();
    });
    bump(nTerm.el);
    burst(nTerm.el, '#facc15', 12);
    const er2 = eqEl.getBoundingClientRect();
    await belt.close({ cx: er2.left + er2.width / 2, cy: er2.top + er2.height / 2, eqW: er2.width });
    if (st !== me) return;
    me.busy = false;
    me.phase = computePhase();
    updateHint();
    checkDone();
  }

  async function computeFraction(t) {
    const me = st;
    if (!window.MG.tools.need('bolt')) return;
    me.busy = true;
    const q = t.v / t.den;
    t.v = q; t.den = 1;
    reflow(() => { render(); t.el.style.opacity = '0'; }, new Set([t.el]));
    await window.MG.lightning([t.el], { color: q < 0 ? '#fb923c' : '#fde047' });
    t.el.style.opacity = '';
    if (st !== me) return;
    me.busy = false;
    me.phase = computePhase();
    updateHint();
    checkDone();
  }

  /* ============================================================
   * Финал
   * ============================================================ */
  async function checkDone() {
    const me = st;
    if (!me || me.finished || me.phase !== 'done') return;
    me.finished = true;
    setHint('');
    await sleep(300);
    if (st !== me) return;
    const ans = me.sides.R[0].v;
    resultText.innerHTML = `x = ${fmt(ans)}`;
    solved++;
    setStats(levelOf(solved), solved);
    [...boxes.L.querySelectorAll('.sh-t'), ...boxes.R.querySelectorAll('.sh-t')].forEach((e) => burst(e, '#16a34a', 10));
    after.classList.add('show');
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  nextBtn.addEventListener('click', newRound);

  window.MG.modes.shift = {
    start() {
      if (!st) newRound();
      else setStats(levelOf(solved), solved);
    },
    skip: newRound,
    setSolved(n) { solved = n; lastKey = 'x'; },
  };
})();

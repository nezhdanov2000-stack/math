/* Режим 5: целое минус дробь — «занять» единицу.
 *
 *   5 − 1/2
 *   1. Нажми на 5: от пятёрки отщипывается единица и становится дробью 1/1 → 4 1/1 − 1/2.
 *   2. Знаменатели разные. Перетащи знаменатель вычитаемой дроби на 1/1:
 *      она умножится на него и станет 2/2 → 4 2/2 − 1/2.
 *   3. Знаменатели равны — числители вычитаются: 4 (2 − 1)/2 = 4 1/2.
 */
(() => {
  'use strict';

  const {
    gcd, $, T, sleep, EASE, ri, colorOf, setStats, mf, rowWidth,
    snapshot, play, ghost, burst, popIn, indivisible,
  } = window.MG;

  const stage = $('#mode-borrow');
  const fracsEl = $('#w-fracs');
  const hint = $('#w-hint');
  const after = $('#w-after');
  const resultText = $('#w-resultText');
  const nextBtn = $('#w-next');
  const ACCENT = '#4f6bed';

  /* state = { spec:{N,a,b}, whole, f1, f2, op, phase:'start'|'borrowed', finished, busy, fontFit }
   * frac  = { el, numRow, bar, denRow, num:[tok], den:[tok] }
   * tok   = { kind:'num', value, frac, zone:'whole'|'num'|'den', el, role }                  */
  let state = null;
  let solved = 0;
  let lastKey = '';

  const levelOf = (s) => window.MG.levelOf(s, 5);   // уровень: +1 за каждые 3 задачи, не выше 5

  /* ---------- задачи ---------- */
  const LEVELS = [
    { N: [2, 6], B: [2, 4] },
    { N: [2, 9], B: [2, 6] },
    { N: [3, 12], B: [2, 9] },
    { N: [4, 20], B: [3, 12] },
    { N: [5, 30], B: [4, 16] },
  ];
  function pickSpec() {
    if (solved === 0 && lastKey === '') return { N: 5, a: 1, b: 2 };         // как на эскизе
    const c = LEVELS[levelOf(solved) - 1];
    for (let i = 0; i < 200; i++) {
      const b = ri(c.B[0], c.B[1]);
      const as = [];
      for (let a = 1; a < b; a++) if (gcd(a, b) === 1) as.push(a);
      const a = as[ri(0, as.length - 1)];
      const N = ri(c.N[0], c.N[1]);
      if (`${N}-${a}/${b}` !== lastKey) return { N, a, b };
    }
    return { N: 5, a: 1, b: 2 };
  }

  /* ---------- токены и раскладка ---------- */
  function makeTok(value, frac, zone) {
    const el = document.createElement('div');
    el.className = 'token';
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.textContent = value;
    const tok = { kind: 'num', value, frac, zone, el, role: null };
    el.addEventListener('click', () => onClick(tok));
    el.addEventListener('pointerdown', (e) => onPointerDown(tok, e));
    return tok;
  }
  const setVal = (tok, v) => { tok.value = v; tok.el.textContent = v; };

  function makeGlyph(text, cls) {
    const el = document.createElement('div');
    el.className = `glyph ${cls}`;
    el.textContent = text;
    return { kind: 'glyph', el };
  }

  function buildFrac(n, d) {
    const el = document.createElement('div');
    el.className = 'fr';
    const numRow = document.createElement('div');
    const bar = document.createElement('div');
    const denRow = document.createElement('div');
    numRow.className = 'row';
    bar.className = 'bar';
    denRow.className = 'row';
    el.append(numRow, bar, denRow);
    const frac = { el, numRow, bar, denRow, num: [], den: [] };
    el._frac = frac;
    frac.num.push(makeTok(n, frac, 'num'));
    frac.den.push(makeTok(d, frac, 'den'));
    return frac;
  }

  function renderRow(row, items) {
    const keep = new Set(items.map((i) => i.el));
    [...row.children].forEach((c) => { if (!keep.has(c)) c.remove(); });
    items.forEach((it, i) => {
      if (row.children[i] !== it.el) row.insertBefore(it.el, row.children[i] || null);
      const prev = items[i - 1];
      it.el.classList.toggle('dot', !!prev && prev.kind === 'num' && it.kind === 'num');
    });
  }

  function fitBar(F, instant) {
    const fs = parseFloat(getComputedStyle(fracsEl).fontSize);
    const w = Math.max(rowWidth(F.numRow), rowWidth(F.denRow)) + fs * 0.4;
    if (instant) F.bar.classList.add('instant');
    F.bar.style.width = `${w}px`;
    if (instant) { void F.bar.offsetWidth; F.bar.classList.remove('instant'); }
  }

  function render() {
    [state.f1, state.f2].filter(Boolean).forEach((F) => {
      renderRow(F.numRow, F.num);
      renderRow(F.denRow, F.den);
      fitBar(F);
    });
  }

  function fitFontSize() {
    const { N, b } = state.spec;
    const d = (x) => String(x).length * 0.68;
    const w = d(N) + 0.7 + (d(b) + 0.8) * 2 + 1.8 + 0.6;
    const avail = Math.min(window.innerWidth * 0.94, 900) - 24;
    state.fontFit = avail / w;
    applyFontSize();
  }
  function applyFontSize() {
    if (!state) return;
    fracsEl.style.fontSize = `${Math.max(26, Math.min(64, state.fontFit))}px`;
    [state.f1, state.f2].filter(Boolean).forEach((F) => fitBar(F, true));
  }
  window.addEventListener('resize', () => {
    if (state && !stage.hidden && !state.finished) fitFontSize();
  });

  /* ---------- роли и цвета ---------- */
  function refreshRoles() {
    const st = state;
    const t = st.f2.den[0];
    const drag = st.phase === 'borrowed' && !st.finished && st.f1 && st.f1.den[0].value !== t.value;
    t.role = drag ? 'drag' : null;
    t.el.classList.toggle('paired', drag);
    t.el.classList.toggle('drag', drag);
    t.el.classList.add('dcol');
    t.el.style.setProperty('--c', colorOf(t.value));
    st.whole.el.classList.toggle('big', st.phase === 'start' && !st.finished);
  }

  /* ---------- подсказки ---------- */
  const hints = window.MG.hinter(hint);          // подсказка с анимацией смены текста
  const setHint = (text) => hints.set(text);
  function updateHint() {
    let t = '';
    if (state && !state.finished) {
      t = state.ready
        ? 'Знаменатели одинаковые. Возьми поршни и нажми на дроби — они сожмут их в одну дробь'
        : state.phase === 'start'
        ? 'Возьми клешню и нажми на целое число — от него отщипнётся единица в виде дроби'
        : 'Знаменатели разные. Возьми джокера, схвати им знаменатель вычитаемой дроби и перетащи на дробь с единицей — она умножится на него';
    }
    if (t !== hints.text) setHint(t);
    if (state && !state.finished) {
      window.MG.tools.auto('borrow', { claw: state.phase === 'start', joker: state.phase === 'borrowed' && !state.ready, press: !!state.ready, glove: window.MG.tools.current() === 'glove' });
    }
  }

  /* ---------- раунд ---------- */
  function newRound() {
    clearSel();
    const spec = pickSpec();
    lastKey = `${spec.N}-${spec.a}/${spec.b}`;
    fracsEl.innerHTML = '';
    after.classList.remove('show');

    const whole = makeTok(spec.N, null, 'whole');
    const op = makeGlyph('−', 'sign op');
    const f2 = buildFrac(spec.a, spec.b);
    state = { spec, whole, f1: null, f2, op, phase: 'start', finished: false, busy: false, fontFit: 60 };
    fracsEl.append(whole.el, op.el, f2.el);

    fitFontSize();
    render();
    f2.bar && fitBar(f2, true);
    refreshRoles();

    let k = 0;
    fracsEl.querySelectorAll('.token, .glyph').forEach((el) => popIn(el, 70 * k++));
    setStats(levelOf(solved), solved);
    hints.reset();
    updateHint();
  }

  /* ---------- клики ---------- */
  function onClick(tok) {
    if (!state || state.finished || state.busy) return;
    if (window.MG.tools.current() === 'glove') { eraseClick(tok); return; }   // ластик стирает числа джокера
    if (['press', 'bolt'].includes(window.MG.tools.current())) return;   // клики поршней и молнии — отдельно
    if (window.MG.tools.current() === 'joker' && tok.role === 'drag') return;   // карту берут нажатием на множитель
    if (tok.zone === 'whole') {
      if (state.phase === 'start') { if (window.MG.tools.need('claw')) borrow(); }
      else indivisible(tok.el, 'единицу уже отщипнули');
      return;
    }
    if (tok.role === 'drag') return;
    if (tok.frac === state.f2 && tok.zone === 'den' && state.phase === 'start') {
      indivisible(tok.el, 'сначала отщипни единицу от целого');
    }
  }

  /* ---------- отщипываем единицу ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  };
  const eOut = (t) => 1 - (1 - t) ** 3;
  const eIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* покадровая анимация: fn(p), p от 0 до 1 */
  function tween(ms, fn) {
    return new Promise((res) => {
      const t0 = performance.now();
      const d = T(ms);
      (function frame(now) {
        const p = Math.min(1, (now - t0) / d);
        fn(p);
        if (p < 1) requestAnimationFrame(frame); else res();
      })(t0);
    });
  }

  async function borrow() {
    const st = state;
    if (st.busy || st.phase !== 'start') return;
    st.busy = true;
    st.whole.el.classList.remove('big');
    const W = st.whole;
    const fs = parseFloat(getComputedStyle(fracsEl).fontSize);
    const r = W.el.getBoundingClientRect();
    const INK = '#1d1d1f';

    // точка, за которую хватаем: правый верхний край цифры; тянем почти вверх
    const A = { x: r.right - fs * 0.12, y: r.top + fs * 0.34 };
    const u = { x: 0.2, y: -0.98 };
    const perp = { x: -u.y, y: u.x };
    const L = fs * 1.1;

    /* --- декорации: тянущаяся «масса», кусочек-единица, клешня автомата --- */
    const back = mk('svg', { class: 'fx fx-back' });
    const front = mk('svg', { class: 'fx fx-front' });
    const neck = mk('path', { fill: 'none', stroke: INK, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    const stub = mk('path', { fill: 'none', stroke: INK, 'stroke-linecap': 'round' });
    back.append(neck, stub);

    const cs = fs * 1.45;                               // размер клешни
    const STEEL = '#cfd8e3';
    const DARK = '#3b4656';
    const cableO = mk('line', { stroke: DARK, 'stroke-width': cs * 0.06, 'stroke-linecap': 'round' });
    const cableI = mk('line', { stroke: '#8d9aad', 'stroke-width': cs * 0.025, 'stroke-linecap': 'round' });
    const head = mk('g', {});
    const cap = mk('rect', { fill: '#566377', stroke: DARK, 'stroke-width': cs * 0.03 });
    const hub = mk('rect', { fill: '#aab6c6', stroke: DARK, 'stroke-width': cs * 0.035 });
    const band = mk('rect', { fill: '#ef4444' });
    const prongs = [-1, 1].map(() => ({
      o: mk('path', { fill: 'none', stroke: DARK, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': cs * 0.115 }),
      i: mk('path', { fill: 'none', stroke: STEEL, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': cs * 0.065 }),
      pad: mk('circle', { fill: '#ef4444', stroke: DARK, 'stroke-width': cs * 0.025, r: cs * 0.045 }),
      joint: mk('circle', { fill: '#566377', stroke: DARK, 'stroke-width': cs * 0.02, r: cs * 0.05 }),
    }));
    head.append(cap, ...prongs.flatMap((p) => [p.o, p.i]), hub, band, ...prongs.flatMap((p) => [p.joint, p.pad]));
    front.append(cableO, cableI, head);

    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = '1';
    chip.style.fontSize = `${fs * 0.52}px`;
    chip.style.opacity = '0';
    document.body.append(back, chip, front);
    const cleanup = () => { back.remove(); front.remove(); chip.remove(); W.el.style.transformOrigin = ''; W.el.style.scale = ''; };

    const setNeck = (P, w, sag) => {
      const mx = (A.x + P.x) / 2 + perp.x * sag;
      const my = (A.y + P.y) / 2 + perp.y * sag;
      neck.setAttribute('d', `M${A.x} ${A.y} Q${mx} ${my} ${P.x} ${P.y}`);
      neck.setAttribute('stroke-width', Math.max(0, w));
    };
    const setStub = (len, w) => {
      stub.setAttribute('d', `M${A.x} ${A.y} L${A.x + u.x * len + 0.01} ${A.y + u.y * len}`);
      stub.setAttribute('stroke-width', Math.max(0, w));
    };

    /* клешня: Tc — точка, где смыкаются кончики; aDeg — угол раскрытия «пальцев» */
    const K = { px: 0.2, l1: 0.38, l2: 0.42, phi: (62 * Math.PI) / 180, hubH: 0.3, hubW: 0.58 };
    const tipDrop = (a) => cs * (K.l1 * Math.cos(a) + K.l2 * Math.cos(K.phi - a));
    const setClaw = (Tc, aDeg, sway = 0) => {
      const a = (aDeg * Math.PI) / 180;
      const py = Tc.y - tipDrop(a);                       // высота шарниров
      const cx = Tc.x;
      const hubTop = py + cs * 0.05 - cs * K.hubH;
      const capTop = hubTop - cs * 0.2;
      cableO.setAttribute('x1', cx); cableO.setAttribute('y1', -30);
      cableO.setAttribute('x2', cx); cableO.setAttribute('y2', capTop);
      cableI.setAttribute('x1', cx - cs * 0.012); cableI.setAttribute('y1', -30);
      cableI.setAttribute('x2', cx - cs * 0.012); cableI.setAttribute('y2', capTop);
      cap.setAttribute('x', cx - cs * 0.09); cap.setAttribute('y', capTop);
      cap.setAttribute('width', cs * 0.18); cap.setAttribute('height', cs * 0.22);
      cap.setAttribute('rx', cs * 0.04);
      hub.setAttribute('x', cx - cs * K.hubW / 2); hub.setAttribute('y', hubTop);
      hub.setAttribute('width', cs * K.hubW); hub.setAttribute('height', cs * K.hubH);
      hub.setAttribute('rx', cs * 0.09);
      band.setAttribute('x', cx - cs * K.hubW / 2 + cs * 0.03); band.setAttribute('y', hubTop + cs * 0.1);
      band.setAttribute('width', cs * (K.hubW - 0.06)); band.setAttribute('height', cs * 0.06);
      [-1, 1].forEach((sg, i) => {
        const pv = { x: cx + sg * cs * K.px, y: py };
        const el = { x: pv.x + sg * Math.sin(a) * cs * K.l1, y: pv.y + Math.cos(a) * cs * K.l1 };
        const tip = { x: el.x + sg * Math.sin(a - K.phi) * cs * K.l2, y: el.y + Math.cos(a - K.phi) * cs * K.l2 };
        const d = `M${pv.x} ${pv.y} L${el.x} ${el.y} L${tip.x} ${tip.y}`;
        prongs[i].o.setAttribute('d', d);
        prongs[i].i.setAttribute('d', d);
        prongs[i].pad.setAttribute('cx', tip.x); prongs[i].pad.setAttribute('cy', tip.y);
        prongs[i].joint.setAttribute('cx', pv.x); prongs[i].joint.setAttribute('cy', pv.y);
      });
      head.setAttribute('transform', `rotate(${sway} ${cx} ${capTop})`);
    };
    const setChip = (P, scale, op = 1) => {
      chip.style.opacity = op;
      chip.style.transform = `translate(${P.x}px, ${P.y}px) translate(-50%, -50%) scale(${scale})`;
    };
    const OPEN = 50;
    const CLOSED = 13;

    setNeck(A, 0, 0);
    setStub(0, 0);
    setClaw({ x: A.x, y: A.y - fs * 3 }, OPEN);

    // 1. клешня спускается на тросе, раскрыв «пальцы», и смыкается на уголке цифры
    await tween(620, (p) => {
      const e = eIO(Math.min(1, p / 0.7));
      const close = p < 0.7 ? 0 : eOut((p - 0.7) / 0.3);
      setClaw({ x: A.x, y: lerp(A.y - fs * 3, A.y, e) }, lerp(OPEN, CLOSED, close));
    });
    if (state !== st) { cleanup(); return; }

    // 2. тянет вверх: масса вытягивается тонкой шейкой, цифра тянется следом
    W.el.style.transformOrigin = '25% 85%';
    let P = A;
    await tween(700, (p) => {
      const e = eIO(p);
      const s = L * e;
      P = { x: A.x + u.x * s, y: A.y + u.y * s };
      setNeck(P, lerp(fs * 0.2, fs * 0.05, p ** 0.7), Math.sin(p * Math.PI) * fs * 0.07 * (1 - p));
      setClaw(P, CLOSED, Math.sin(p * 9) * 1.2 * p);
      setChip({ x: P.x, y: P.y - fs * 0.06 }, lerp(0.3, 1, eOut(p)));
      W.el.style.scale = `${1 + 0.07 * e} ${1 - 0.05 * e}`;
    });
    if (state !== st) { cleanup(); return; }

    // 3. обрыв: шейка отскакивает в цифру, цифра дрожит, теперь это 4; клешню чуть подбросило
    neck.setAttribute('d', '');
    W.el.style.scale = '';
    W.el.animate([
      { scale: '1.07 .95' }, { scale: '.94 1.06', offset: 0.25 }, { scale: '1.04 .97', offset: 0.5 },
      { scale: '.99 1.01', offset: 0.75 }, { scale: '1 1' },
    ], { duration: T(420) });
    setVal(W, st.spec.N - 1);
    burst(W.el, INK, 6);
    const Pend = P;
    await tween(320, (p) => {
      const k = Math.sin(p * Math.PI);
      setStub(lerp(fs * 0.32, 0, eOut(p)), fs * 0.1 * (1 - p));
      setClaw({ x: Pend.x, y: Pend.y - fs * 0.07 * k }, CLOSED, -4 * k * (1 - p));
      setChip({ x: Pend.x, y: Pend.y - fs * 0.06 - fs * 0.07 * k }, 1 + 0.1 * k);
    });
    stub.setAttribute('d', '');
    if (state !== st) { cleanup(); return; }

    // место под дробь 1/1: остальное сдвигается
    const first = snapshot();
    const f1 = buildFrac(1, 1);
    st.f1 = f1;
    fracsEl.insertBefore(f1.el, st.op.el);
    render();
    const n1 = f1.num[0].el;
    const d1 = f1.den[0].el;
    [n1, d1, f1.bar].forEach((e) => { e.style.opacity = '0'; });
    play(first, new Set([n1, d1]));
    await sleep(80);

    // 4. едет по рельсам к дроби, единица в клешне растёт
    const tr = n1.getBoundingClientRect();
    const target = { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2 };
    const k = fs / (fs * 0.52);
    const from = { x: Pend.x, y: Pend.y - fs * 0.06 };
    const dxy = { x: target.x - from.x, y: target.y - from.y };
    let lastX = from.x;
    let sway = 0;
    await tween(820, (p) => {
      const e = eIO(p);
      const lift = Math.sin(p * Math.PI) * fs * 0.35;
      const C = { x: from.x + dxy.x * e, y: from.y + dxy.y * e - lift };
      sway = lerp(sway, Math.max(-6, Math.min(6, (lastX - C.x) * 1.2)), 0.25);
      lastX = C.x;
      setChip(C, lerp(1, k, e));
      setClaw({ x: C.x, y: C.y + fs * 0.06 }, lerp(CLOSED, 26, e), sway);
    });
    if (state !== st) { cleanup(); return; }

    // 5. раскрывается: единица встаёт на место, клешня уезжает вверх
    n1.style.opacity = '';
    chip.style.opacity = '0';
    burst(n1, INK, 8);
    const Pl = { x: target.x, y: target.y + fs * 0.06 };
    tween(300, (p) => setClaw(Pl, lerp(26, OPEN, eOut(p)), 0))
      .then(() => tween(520, (p) => setClaw({ x: Pl.x, y: lerp(Pl.y, Pl.y - fs * 4, p * p) }, OPEN, 0)))
      .then(cleanup);

    d1.style.opacity = '';
    popIn(d1, 120);
    f1.bar.style.opacity = '';
    f1.bar.animate([{ scale: '0 1' }, { scale: '1 1' }], { duration: T(420), easing: EASE, delay: T(120), fill: 'backwards' });
    await sleep(560);
    if (state !== st) return;

    st.phase = 'borrowed';
    st.busy = false;
    refreshRoles();
    updateHint();
  }

  /* ---------- перетаскивание знаменателя ---------- */
  let drag = null;
  const validTarget = (tok, F) => state.phase === 'borrowed' && F === state.f1 && tok.role === 'drag';
  function fracAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const fr = el && el.closest('.fr');
    return fr ? fr._frac : null;
  }

  function onPointerDown(tok, e) {
    if (!state || state.finished || state.busy || tok.role !== 'drag' || e.button > 0) return;
    if (window.MG.tools.current() !== 'joker') return;   // остальные инструменты обрабатывают клик сами
    e.preventDefault();
    const g = ghost(tok.el);
    window.MG.joker.style(g);                       // джокер становится картой с числом
    g.classList.add('dragging');
    g.style.zIndex = 60;
    g.style.transition = 'none';
    tok.el.style.opacity = '.3';
    drag = { tok, g, sx: e.clientX, sy: e.clientY, moved: false };
    [state.f1, state.f2].forEach((F) => {
      F.el.classList.remove('ok', 'no', 'src', 'over');
      F.el.classList.add(F === state.f1 ? 'ok' : 'src');
    });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  function onMove(e) {
    if (!drag) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    drag.g.style.transform = `translate(${dx}px, ${dy}px) scale(1.15)`;
    const over = fracAt(e.clientX, e.clientY);
    state.f1.el.classList.toggle('over', over === state.f1);
  }

  function onUp(e) {
    if (!drag) return;
    if (e.type === 'pointerup' && drag && !drag.moved && !drag.sticky) { drag.sticky = true; drag.moved = true; window.MG.joker.armSticky((ev) => onUp(ev)); return; }   // клик: карта остаётся в руке
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    const { tok, g, moved } = drag;
    drag = null;
    [state.f1, state.f2].forEach((F) => F.el.classList.remove('ok', 'no', 'src', 'over'));

    const target = e.type === 'pointerup' ? fracAt(e.clientX, e.clientY) : null;
    if (target && validTarget(tok, target)) { applyDrop(tok, g); return; }

    tok.el.style.opacity = '';
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(g.style.transform);
    const dx = m ? parseFloat(m[1]) : 0;
    const dy = m ? parseFloat(m[2]) : 0;
    g.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(1.15)` },
      { transform: 'translate(0, 0) scale(1)' },
    ], { duration: T(320), easing: EASE }).onfinish = () => g.remove();
    if (!moved) indivisible(tok.el, 'перетащи на дробь с единицей');
  }

  /* ластик: выбери два одинаковых множителя — сверху и снизу — и они сотрутся (на их месте останется 1), как в сокращении дробей */
  let sel = [];
  function clearSel() { sel.forEach((t) => t.el.classList.remove('sel')); sel = []; }
  window.addEventListener('toolchange', (e) => { if (e.detail.tool !== 'glove') clearSel(); });
  const fracOf = (tok) => [state.f1, state.f2].find((f) => f && (f.num.includes(tok) || f.den.includes(tok)));

  function eraseClick(tok) {
    const st = state;
    if (!st || st.finished || st.busy || st.calc) return;
    if (!fracOf(tok)) return;
    const i = sel.indexOf(tok);
    if (i >= 0) { tok.el.classList.remove('sel'); sel.splice(i, 1); return; }
    tok.el.classList.add('sel');
    sel.push(tok);
    if (sel.length < 2) return;
    const [a, b] = sel;
    clearSel();
    const F = fracOf(a);
    if (F && F === fracOf(b) && a.zone !== b.zone && a.value === b.value && a.value > 1) { cancelPair(a, b); return; }
    [a, b].forEach((t) => window.MG.shake(t.el));
    setHint('Эти множители сократить нельзя — ластик исчез на несколько секунд');
    setTimeout(() => { if (state) updateHint(); }, window.MG.PENALTY.hint);
    window.MG.tools.disable('glove', window.MG.PENALTY.tool);
  }

  async function cancelPair(a, b) {
    const st = state;
    st.busy = true;
    await Promise.all([window.MG.erase(a.el), window.MG.erase(b.el, 120)]);
    if (state !== st) return;
    [a, b].forEach((t) => {
      setVal(t, 1);
      t.el.style.webkitMaskImage = '';
      t.el.style.maskImage = '';
      t.el.classList.remove('dcol');
      t.el.style.removeProperty('--c');
      popIn(t.el);
    });
    st.dropped = 0;
    refreshRoles();
    st.busy = false;
    if (st.phase === 'borrowed' && st.f1) st.ready = st.f1.den[0].value === st.f2.den[0].value;
    updateHint();
  }

  async function applyDrop(src, g) {
    const st = state;
    const F = st.f1;
    const p = src.value;
    const color = colorOf(p);
    src.el.style.opacity = '';

    // 1/1 → p/p: обе части умножились на p
    const first = snapshot();
    st.dropped = p;
    const toks = [F.num[0], F.den[0]];
    toks.forEach((t) => {
      setVal(t, p);
      t.el.classList.add('dcol');
      t.el.style.setProperty('--c', color);
    });
    render();
    refreshRoles();
    updateHint();
    toks.forEach((t) => { t.el.style.opacity = '0'; });   // числа появятся в момент удара молнии
    play(first, new Set(toks.map((t) => t.el)));

    st.busy = true;
    await window.MG.joker.lay(g, { frac: F.el, targets: toks.map((t) => t.el), value: p, color });   // из облака растут числа
    st.busy = false;

    await sleep(560);
    if (state === st && F.den[0].value === st.f2.den[0].value) ready();
  }

  /* знаменатели сравнялись: дальше работают поршни */
  function ready() {
    state.ready = true;
    updateHint();
  }

  /* ---------- поршни: нажать на дроби с одинаковыми знаменателями ---------- */
  function pressClick(e) {
    if (!state || state.finished || state.busy) return;
    if (window.MG.tools.current() !== 'press') return;
    if (!state.ready) {
      indivisible(e.target.closest('.token') || state.f2.den[0].el, 'знаменатели ещё разные — сначала приведи их к общему');
      return;
    }
    state.busy = true;
    finish();
  }
  fracsEl.addEventListener('click', pressClick);

  /* поршни сжимают дроби: они сливаются в одну, знаменатели — в один */
  async function squeeze() {
    const st = state;
    await window.MG.press([state.f1.el, state.op.el, state.f2.el], {
      onPeak: () => {
        if (state !== st) return [];
        const F0 = st.f1;
        const F2 = st.f2;
        const items = [...F0.num, st.op, ...F2.num];
        renderRow(F0.numRow, items);
        F2.el.remove();
        F0.num = items;
        fitBar(F0, true);
        return [F0.el];
      },
    });
  }

  /* ---------- молния: посчитать числитель ---------- */
  function boltClick(e) {
    if (!state || window.MG.tools.current() !== 'bolt') return;
    if (state.calc) { finishCalc(); return; }
    if (state.finished || state.busy) return;
    indivisible(e.target.closest('.token') || state.f2.den[0].el, 'считать пока нечего');
  }
  fracsEl.addEventListener('click', boltClick);

  function waitCalc() {
    const st = state;
    st.calc = true;
    window.MG.tools.pick('bolt');
    setHint('Числитель — это пример. Возьми молнию и нажми на него — она посчитает');
  }

  /* ---------- финал: числители вычитаются ---------- */
  async function evalNumerator() {
    const st = state;
    const F0 = st.f1;
    const items = F0.num;
    const { a, b } = st.spec;
    await window.MG.lightning([F0.numRow], { reveal: false, color: '#facc15' });   // молния бьёт в пример
    if (state !== st) return;
    items.forEach((it) => it.el.animate([
      { filter: 'brightness(1)', opacity: 1, scale: '1' },
      { filter: 'brightness(4)', opacity: 0, scale: '.5' },
    ], { duration: T(320), easing: 'ease-in', fill: 'forwards' }));
    await sleep(340);
    if (state !== st) return;

    items.forEach((it) => it.el.remove());
    const merged = makeTok(b - a, F0, 'num');
    F0.num = [merged];
    render();
    popIn(merged.el);
    window.MG.burst(merged.el, '#facc15', 12);
    await sleep(560);
  }

  async function finish() {
    const st = state;
    st.finished = true;
    refreshRoles();
    setHint('');
    await sleep(250);
    await squeeze();
    if (state !== st) return;
    waitCalc();
  }

  /* дроби слились — остаётся посчитать числитель: это делает молния */
  async function finishCalc() {
    const st = state;
    st.calc = false;
    setHint('');
    await evalNumerator();
    if (state !== st) return;

    const { N, a, b } = st.spec;
    fracsEl.querySelectorAll('.token, .glyph').forEach((el) => {
      el.classList.add('final');
      el.classList.remove('dcol');
      el.style.removeProperty('--c');
    });
    resultText.innerHTML = `${N} − ${mf(a, b)} = ${N - 1} ${mf(b - a, b)}`;
    solved++;
    setStats(levelOf(solved), solved);
    after.classList.add('show');
    fracsEl.querySelectorAll('.token').forEach((el) => burst(el, '#16a34a', 10));
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  nextBtn.addEventListener('click', newRound);

  window.MG.modes.borrow = {
    start() {
      if (!state) newRound();
      else setStats(levelOf(solved), solved);
    },
    skip: newRound,
  };
})();

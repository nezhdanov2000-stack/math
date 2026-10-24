/* Режим «Целое × дробь»: дождевое облако превращает целое в дробь (под ним вырастает единица),
 * мост соединяет дроби, дальше — сокращение крест-накрест.
 * См. замечание в mul.js: четыре режима умножения/деления — почти одинаковые копии.
 */
(() => {
  'use strict';

  const {
    gcd, spf, isPrime, factorize, $, T, sleep, EASE, ri, colorOf, setStats, mf, rowWidth,
    snapshot, play, burst, popIn, indivisible, smash, crumble,
  } = window.MG;

  /* ============================================================
   * DOM
   * ============================================================ */
  const stage = $('#wf-stage');
  const pairEl = $('#wf-pair');
  const dotEl = $('#wf-dot');
  const fractionEl = $('#wf-fraction');
  const rows = { num: $('#wf-num'), den: $('#wf-den') };
  const bar = $('#wf-bar');
  const hint = $('#wf-hint');
  const after = $('#wf-after');
  const resultText = $('#wf-resultText');
  const nextBtn = $('#wf-next');

  /* ============================================================
   * Состояние
   * ============================================================ */
  let state = null;     // текущий раунд
  let solved = 0;
  let lastPair = '';
  let uid = 0;

  const levelOf = (s) => window.MG.levelOf(s, 6);   // уровень: +1 за каждые 3 задачи, не выше 6

  /* ---------- генерация примера: n · c/d ---------- */
  function pickPair() {
    if (solved === 0 && lastPair === '') return [2, 1, 5];        // как на эскизе
    const lvl = levelOf(solved);
    const maxV = [12, 20, 36, 60, 100, 150][lvl - 1];
    for (let i = 0; i < 4000; i++) {
      const n = ri(2, maxV), c = ri(1, Math.max(2, Math.round(maxV / 2))), d = ri(2, maxV);
      if (gcd(c, d) !== 1) continue;                            // дробь несократима
      const g = gcd(n, d);
      if (g === 1) continue;                                    // есть что сокращать
      if (d / g === 1) continue;                                // ответ — не целое
      if (factorize(n * c).length > 6 || factorize(d).length > 6) continue;
      if (`${n}·${c}/${d}` === lastPair) continue;
      return [n, c, d];
    }
    return [6, 1, 9];
  }

  /* ============================================================
   * Токены (числа и множители)
   * ============================================================ */
  function makeTok(value, side) {
    const el = document.createElement('div');
    el.className = 'token';
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    const tok = { id: ++uid, value, side, el, paired: false, gone: false };
    paint(tok);
    el.addEventListener('click', () => onTokenClick(tok));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTokenClick(tok); }
    });
    el.addEventListener('mouseenter', () => peek(tok, true));
    el.addEventListener('mouseleave', () => peek(tok, false));
    return tok;
  }

  function paint(tok) {
    tok.el.textContent = tok.value;
    const composite = tok.value > 1 && !isPrime(tok.value);
    tok.el.classList.toggle('big', composite);
    tok.el.classList.toggle('prime', isPrime(tok.value));
    tok.el.classList.toggle('one', tok.value === 1);
  }

  /* Привести порядок DOM в соответствие с массивом */
  function sync(side) {
    const row = rows[side.key];
    side.toks.forEach((t, i) => {
      if (row.children[i] !== t.el) row.insertBefore(t.el, row.children[i] || null);
    });
    markLead();
    fitBar();
  }

  function markLead() {
    Object.values(rows).forEach((row) =>
      [...row.children].forEach((c, i) => c.classList.toggle('lead', i === 0)));
  }

  /* ---------- ширина дробной черты ---------- */
  function fitBar(instant) {
    const fs = parseFloat(getComputedStyle(fractionEl).fontSize);
    const w = Math.max(rowWidth(rows.num), rowWidth(rows.den)) + fs * 0.5;
    if (instant) bar.classList.add('instant');
    bar.style.width = `${w}px`;
    if (instant) { void bar.offsetWidth; bar.classList.remove('instant'); }
  }

  /* чёрточки двух исходных дробей */
  function fitPairBars() {
    if (!state || !state.A) return;
    const fs = parseFloat(getComputedStyle(stage).fontSize);
    state.A.forEach((f) => {
      const w = Math.max(f.num.offsetWidth, f.den.offsetWidth) + fs * 0.5;
      f.bar.style.width = `${w}px`;
    });
  }

  /* Размер шрифта под самую широкую запись (когда всё разложено) */
  function fitFontSize(n, d) {
    const est = (x) => {
      const f = factorize(x);
      if (!f.length) return 1;
      return f.reduce((w, p) => w + 0.62 * String(p).length + 0.46, 0) + 0.95 * (f.length - 1);
    };
    const avail = Math.min(window.innerWidth * 0.94, 760) - 24;
    const em = Math.max(est(n), est(d), 3);
    state.fontFit = avail / em;
    applyFontSize();
  }
  function applyFontSize() {
    if (!state) return;
    const px = Math.max(24, Math.min(68, state.fontFit));
    stage.style.fontSize = `${px}px`;
    fitBar(true);
    fitPairBars();
    if (state.aligned && state.phase === 'A') alignCols();
    placeWhole();
  }
  window.addEventListener('resize', () => {
    if (state && !$('#mode-whole').hidden) fitFontSize(state.n, state.d);
  });

  /* ============================================================
   * Подсказки
   * ============================================================ */
  const hints = window.MG.hinter(hint);          // подсказка с анимацией смены текста
  const setHint = (text) => hints.set(text);
  function defaultHint() {
    if (!state || state.finished) return '';
    if (state.phase === 'C') return 'Возьми облако и нажми на целое число — под ним вырастет единица, и целое станет дробью';
    if (state.phase === 'A') return 'Теперь у нас две дроби. Возьми мост и нажми на крестик между дробями — они соединятся в одну дробь';
    const anyPair = ['num', 'den'].some((k) =>
      state.sides[k].toks.some((t) => t.paired && !t.gone));
    return anyPair
      ? 'Возьми ластик и выбери два одинаковых цветных числа — сверху и снизу. Ошибёшься — ластик исчезнет'
      : 'Возьми кувалду и ударь по числу — оно разобьётся на два множителя. Простое число не делится.';
  }
  function autoTool() {
    if (!state || state.finished) return;
    if (state.phase === 'C') { window.MG.tools.auto('whole', { rain: true }); return; }
    if (state.phase === 'A') { window.MG.tools.auto('whole', { bridge: true }); return; }
    const toks = [...state.sides.num.toks, ...state.sides.den.toks].filter((t) => !t.gone && t.value !== 1);
    window.MG.tools.auto('whole', {
      hammer: toks.some((t) => !isPrime(t.value) && !t.paired),
      glove: toks.some((t) => t.paired),
    });
  }
  function updateHint() {
    const t = defaultHint();
    if (t !== hints.text) setHint(t);
    autoTool();
  }

  /* ============================================================
   * Раунд
   * ============================================================ */
  function newRound() {
    clearSel();
    const [a, c, d] = pickPair();
    const b = 1;
    lastPair = `${a}·${c}/${d}`;
    const n = a * c;
    const m = d;

    Object.values(rows).forEach((r) => { r.innerHTML = ''; });
    after.classList.remove('show');

    // исходные две дроби
    pairEl.style.visibility = '';
    pairEl.style.display = '';
    pairEl.classList.remove('armed');
    dotEl.style.opacity = '';
    bar.style.opacity = '';
    bar.classList.remove('instant');
        const A = [...pairEl.querySelectorAll('.mulf')].map((f, i) => {
      const num = f.querySelector('.rn');
      const den = f.querySelector('.rd');
      const mk = (v) => { const el = document.createElement('div'); el.className = 'token lead'; el.textContent = v; return el; };
      num.innerHTML = ''; den.innerHTML = '';
      const nel = mk(i ? c : a);
      const del = mk(i ? d : 1);
      num.append(nel); den.append(del);
      return { num, den, nel, del, bar: f.querySelector('.bar') };
    });

    const st = {
      n, d: m, a, b, c, dd: d, A, phase: 'C', busy: false, finished: false, pending: 0, fontFit: 60,
      sides: {
        num: { key: 'num', toks: [makeTok(a, 'num'), makeTok(c, 'num')] },
        den: { key: 'den', toks: [makeTok(1, 'den'), makeTok(d, 'den')] },
      },
    };
    state = st;

    // готовая дробь (пока скрыта) — сюда переедут числа после моста
    fractionEl.classList.add('nodots', 'hidden');
    sync(st.sides.num);
    sync(st.sides.den);
    fitFontSize(n, m);
    alignCols();
    st.aligned = true;
    fitPairBars();
    popIn(A[0].nel);
    popIn(A[1].nel, 90);
    popIn(A[0].del, 140);
    popIn(A[1].del, 230);

    setStats(levelOf(solved), solved);
    hints.reset();
    updateHint();
    // целое стоит посередине, дробная черта и единица ещё не появились
    A[0].bar.style.transform = 'scaleX(0)';
    A[0].bar.style.translate = '';
    A[0].del.style.visibility = 'hidden';
    placeWhole();
    pairEl.classList.toggle('armed', window.MG.tools.current() === 'rain');
  }

  /* целое стоит на уровне знака ×, т.е. на месте будущей дробной черты */
  function wholeDy() {
    const A0 = state.A[0];
    const nb = A0.nel.getBoundingClientRect();
    const bb = A0.bar.getBoundingClientRect();
    return (bb.top + bb.height / 2) - (nb.top + nb.height / 2);
  }
  function placeWhole() {
    if (!state || state.phase !== 'C' || state.busy) return;
    state.A[0].nel.style.translate = '0 0';
    state.A[0].nel.style.translate = `0 ${wholeDy()}px`;
  }

  /* столбцы одинаковой ширины: точки умножения сверху и снизу стоят строго друг под другом */
  function alignCols() {
    const { num, den } = state.sides;
    Object.values(state.sides).forEach((s) => s.toks.forEach((t) => { t.el.style.minWidth = ''; }));
    [0, 1].forEach((i) => {
      const w = Math.max(num.toks[i].el.offsetWidth, den.toks[i].el.offsetWidth);
      [num.toks[i], den.toks[i]].forEach((t) => { t.el.style.minWidth = `${w}px`; t.el.style.textAlign = 'center'; });
    });
    fitBar(true);
  }
  function relax() {
    if (!state || !state.aligned) return;
    state.aligned = false;
    Object.values(state.sides).forEach((s) => s.toks.forEach((t) => { t.el.style.minWidth = ''; t.el.style.textAlign = ''; }));
    fitBar(true);
  }

  /* ---------- деление числа на два множителя (автопилот) ---------- */
  async function splitOnce(tok) {
    if (tok.smashing) return;
    const st = state;
    tok.smashing = true;
    await smash(tok.el);                              // кувалда бьёт по числу
    tok.smashing = false;
    if (state !== st || st.finished || tok.gone || tok.value < 4 || isPrime(tok.value)) return;
    splitStep(st.sides[tok.side], tok);
    refreshPairs();
    updateHint();
  }

  /* число рассыпается: наименьший простой множитель + остаток */
  function splitStep(side, big) {
    const first = snapshot();
    relax();
    const p = spf(big.value);
    const prime = makeTok(p, side.key);
    side.toks.splice(side.toks.indexOf(big), 0, prime);
    big.value /= p;
    paint(big);
    sync(side);

    const src = first.get(big.el);
    play(first, new Set([prime.el]));
    crumble(big.el, prime.el, src);
  }

  /* ---------- пары ---------- */
  function setPaired(tok, on) {
    tok.paired = on;
    tok.el.classList.toggle('paired', on);
    if (on) tok.el.style.setProperty('--c', colorOf(tok.value));
  }

  function refreshPairs() {
    const live = (side) => state.sides[side].toks
      .filter((t) => !t.gone && t.value > 1);       // сокращаются любые одинаковые числа, не только простые
    const A = live('num');
    const B = live('den');
    [...A, ...B].forEach((t) => setPaired(t, false));
    new Set([...A, ...B].map((t) => t.value)).forEach((p) => {
      const a = A.filter((t) => t.value === p);
      const b = B.filter((t) => t.value === p);
      const k = Math.min(a.length, b.length);
      a.slice(0, k).forEach((t) => setPaired(t, true));
      b.slice(0, k).forEach((t) => setPaired(t, true));
    });
  }

  function partnerOf(tok) {
    const other = tok.side === 'num' ? 'den' : 'num';
    return state.sides[other].toks
      .find((t) => t.paired && !t.gone && t.value === tok.value) || null;
  }

  function peek(tok, on) {
    if (!state || state.finished || !tok.paired || tok.gone) return;
    tok.el.classList.toggle('peek', on);
    const p = partnerOf(tok);
    if (p) p.el.classList.toggle('peek', on);
  }

  /* ---------- клики ---------- */
  function onTokenClick(tok) {
    if (!state || state.finished || state.phase !== 'B' || tok.gone || tok.value === 1) return;
    const tools = window.MG.tools;
    if (tools.current() === 'glove') { gloveClick(tok); return; }   // перчатка: выбираем пару
    if (!isPrime(tok.value)) {                              // составное → кувалда делит
      if (tok.paired && tools.current() !== 'hammer') { tools.need('glove'); return; }   // одинаковые числа сразу сокращаются ластиком
      if (tools.need('hammer')) splitOnce(tok);
      return;
    }
    if (tok.paired) { tools.need('glove'); return; }        // сокращать надо перчаткой
    indivisible(tok.el, `${tok.value} — неделимое`);
  }


  /* ---------- перчатка: выбрать два множителя, которые сокращаются ---------- */
  let sel = [];
  function clearSel() { sel.forEach((t) => t.el.classList.remove('sel')); sel = []; }
  window.addEventListener('toolchange', (e) => { if (e.detail.tool !== 'glove') clearSel(); });

  function gloveClick(tok) {
    if (state.pending > 0) return;
    const i = sel.indexOf(tok);
    if (i >= 0) { tok.el.classList.remove('sel'); sel.splice(i, 1); return; }
    tok.el.classList.add('sel');
    sel.push(tok);
    if (sel.length < 2) return;
    const [a, b] = sel;
    clearSel();
    if (a.side !== b.side && a.value === b.value && a.value > 1 && !a.gone && !b.gone) { cancelPair(a, b); return; }
    [a, b].forEach((t) => window.MG.shake(t.el));
    setHint('Эти множители сократить нельзя — ластик исчез на несколько секунд');
    setTimeout(() => { if (state) updateHint(); }, window.MG.PENALTY.hint);
    window.MG.tools.disable('glove', window.MG.PENALTY.tool);
    autoTool();                               // не оставаться с бесполезным инструментом в руках
  }

  /* ---------- сокращение пары ---------- */
  async function cancelPair(tok, given) {
    const st = state;
    const partner = given || partnerOf(tok);
    if (!partner) return;

    tok.gone = partner.gone = true;
    st.pending++;
    [tok, partner].forEach((t) => t.el.classList.remove('peek'));

    // щелчок Таноса: оба множителя рассыпаются пылью
    await Promise.all([window.MG.erase(tok.el), window.MG.erase(partner.el, 120)]);
    if (state !== st) return;

    const first = snapshot();
    relax();
    const fresh = [];
    [tok, partner].forEach((t) => {
      const s = st.sides[t.side];
      s.toks.splice(s.toks.indexOf(t), 1);
      t.el.remove();
    });
    ['num', 'den'].forEach((k) => {
      const s = st.sides[k];
      if (!s.toks.length) { const one = makeTok(1, k); s.toks.push(one); fresh.push(one); }
      sync(s);
    });
    play(first, new Set(fresh.map((f) => f.el)));
    fresh.forEach((f) => popIn(f.el));

    st.pending--;
    refreshPairs();
    updateHint();
    await sleep(580);
    if (state === st) checkFinish();
  }

  /* ---------- мост: две дроби становятся одной ---------- */
  async function connect() {
    const st = state;
    if (!st || st.phase !== 'A' || st.busy) return;
    st.busy = true;
    pairEl.classList.remove('armed');
    if (st.aligned) { alignCols(); fitPairBars(); }
    const fs = parseFloat(getComputedStyle(stage).fontSize);
    const R = (el) => el.getBoundingClientRect();
    const [f1, f2] = st.A;
    const b1 = R(f1.bar), b2 = R(f2.bar), dr = R(dotEl);
    const mid = (side) => {
      const t = st.sides[side].toks.map((x) => R(x.el));
      const rr = R(rows[side]);
      return { x: (t[0].right + t[1].left) / 2, y: rr.top + rr.height / 2 };
    };
    const bb = R(bar);
    const from = new Map();
    st.sides.num.toks.forEach((t, i) => from.set(t.el, R(st.A[i].nel)));
    st.sides.den.toks.forEach((t, i) => from.set(t.el, R(st.A[i].del)));
    const to = new Map([...from.keys()].map((el) => [el, R(el)]));

    const fy = bb.top + bb.height / 2;
    const hh = (Math.abs(mid('num').y - fy) + Math.abs(mid('den').y - fy)) / 2;
    dotEl.style.opacity = '0';
    bar.classList.add('instant');
    bar.style.width = `${b2.right - b1.left}px`;   // общая черта пока такая же, как три отрезка
    await window.MG.bridge.play({
      fs,
      dot: { x: dr.left + dr.width / 2, y: dr.top + dr.height / 2 },
      left: b1.right, right: b2.left,
      barY: b1.top + b1.height / 2, barH: b1.height,
      final: { left: b1.right - 1, top: b1.top, width: b2.left - b1.right + 2, height: b1.height },
      area: { left: b1.left - fs * 0.1, right: b2.right + fs * 0.1, top: R(f1.num).top, bottom: R(f1.den).bottom },
      sun: { x: mid('num').x, y: fy - hh }, ref: { x: mid('den').x, y: fy + hh },
      onSwap() {
        if (state !== st) return;             // мост доиграл уже после «Пропустить»
        pairEl.querySelectorAll('.token').forEach((t) => { t.style.visibility = 'hidden'; });   // черты дробей остаются
        fractionEl.classList.remove('hidden');
        bar.style.opacity = '0';
        from.forEach((fr, el) => {
          const tr = to.get(el);
          el.animate([
            { transform: `translate(${fr.left + fr.width / 2 - tr.left - tr.width / 2}px, ${fr.top + fr.height / 2 - tr.top - tr.height / 2}px)` },
            { transform: 'none' },
          ], { duration: T(520 * 2.7), easing: 'cubic-bezier(.5,0,.2,1)' });
        });
      },
      onBar() {
        if (state !== st) return;
        bar.style.opacity = '';
        bar.classList.remove('instant');
        fitBar();                       // чёрта плавно подстраивается под дробь
        fractionEl.classList.remove('nodots');
        pairEl.style.display = 'none';
      },
    });
    if (state !== st) return;
    st.phase = 'B';
    st.busy = false;
    refreshPairs();
    updateHint();
    await sleep(250);
    if (state === st) checkFinish();
  }

  /* ---------- облако: целое → дробь n/1 ---------- */
  async function grow() {
    const st = state;
    if (!st || st.phase !== 'C' || st.busy) return;
    st.busy = true;
    pairEl.classList.remove('armed');
    const fs = parseFloat(getComputedStyle(stage).fontSize);
    const R = (el) => el.getBoundingClientRect();
    const f1 = st.A[0];
    const nr = R(f1.nel), dr = R(f1.del), br = R(f1.bar);
    const dy = wholeDy();
    const cx = (R(f1.num).left + R(f1.num).right) / 2;
    const numTop = nr.top + dy;                         // где сейчас стоит целое
    const soilTop = dr.top + dr.height * 0.88;
    const lift = soilTop - (dr.top + dr.height * 0.2);      // на столько черта с целым стоят ниже своего места
    const lifted = [f1.nel, f1.bar];
    const move = (el, rem, ms) => {
      const from = el.style.translate || '0 0';
      el.style.translate = `0 ${rem}px`;
      if (ms) el.animate([{ translate: from }, { translate: `0 ${rem}px` }], { duration: ms, easing: 'cubic-bezier(.2,.9,.3,1.25)' });
    };
    await window.MG.rain.play({
      fs, cx, rainX: cx,
      cloudY: nr.top - dy - fs * 1.05,
      digitEl: f1.del, digitRect: dr,
      soilX: dr.left + dr.width / 2, soilTop, lift,
      endY: soilTop - fs * 0.1,
      onStart() {
        if (state !== st) return;                 // дождь доиграл уже после «Пропустить»
        move(f1.nel, lift, T(700));
        f1.bar.style.translate = `0 ${lift}px`;
        f1.bar.style.transform = '';
        f1.bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
          { duration: T(700), easing: 'cubic-bezier(.3,0,.2,1)', fill: 'backwards' });
      },
      setLift(rem, ms) { if (state === st) lifted.forEach((el) => move(el, rem, ms)); },
      endLift() { if (state === st) lifted.forEach((el) => { el.style.translate = ''; }); },
      onReveal() {
        if (state !== st) return;
        f1.del.style.visibility = '';
        popIn(f1.del);
        burst(f1.del, '#16a34a', 10);
      },
    });
    if (state !== st) return;
    st.phase = 'A';
    st.busy = false;
    updateHint();
    pairEl.classList.toggle('armed', window.MG.tools.current() === 'bridge');
  }

  pairEl.addEventListener('click', (e) => {
    if (!state || state.busy || state.finished) return;
    if (state.phase === 'C') {
      if (!window.MG.tools.need('rain')) return;
      if (e.target.closest('.mulf') === pairEl.children[0]) grow();
      return;
    }
    if (state.phase !== 'A') return;
    if (!window.MG.tools.need('bridge')) return;
    connect();
  });
  window.addEventListener('toolchange', (e) => {
    if (!pairEl || !state) return;
    const want = state.phase === 'C' ? 'rain' : state.phase === 'A' ? 'bridge' : '';
    pairEl.classList.toggle('armed', e.detail.tool === want && !state.busy);
  });

  /* ---------- финал ---------- */
  function checkFinish() {
    if (!state || state.finished || state.phase !== 'B' || state.pending > 0) return;
    // дробь несократима, когда у числителя и знаменателя нет общих делителей
    const prod = (k) => state.sides[k].toks
      .filter((t) => !t.gone).reduce((x, t) => x * t.value, 1);
    if (gcd(prod('num'), prod('den')) === 1) finish();
  }

  async function collapse(side) {
    if (side.toks.length < 2) return;
    const st = state;
    const row = rows[side.key];
    const product = side.toks.reduce((x, t) => x * t.value, 1);
    const rr = row.getBoundingClientRect();
    const cx = rr.left + rr.width / 2;

    const outs = side.toks.map((t) => {
      const r = t.el.getBoundingClientRect();
      const dx = cx - (r.left + r.width / 2);
      return t.el.animate([
        { transform: 'none', opacity: 1 },
        { transform: `translateX(${dx}px) scale(.6)`, opacity: 0 },
      ], { duration: T(480), easing: 'cubic-bezier(.6,0,.4,1)', fill: 'forwards' });
    });
    await Promise.all(outs.map((a) => a.finished.catch(() => {})));
    if (state !== st) return;                 // раунд сменился во время анимации

    side.toks.forEach((t) => t.el.remove());
    const merged = makeTok(product, side.key);
    side.toks = [merged];
    row.append(merged.el);
    markLead();
    fitBar();
    popIn(merged.el);
  }

  async function finish() {
    const st = state;
    st.finished = true;
    setHint('');
    await sleep(200);

    await Promise.all([collapse(st.sides.num), collapse(st.sides.den)]);
    if (state !== st) return;

    const rn = st.sides.num.toks[0].value;
    const rd = st.sides.den.toks[0].value;
    Object.values(st.sides).forEach((s) => s.toks.forEach((t) => {
      t.el.classList.add('final');
      t.el.classList.remove('big', 'paired');
    }));

    resultText.innerHTML = `${st.a} · ${mf(st.c, st.dd)} = ${mf(rn, rd)}`;
    solved++;
    setStats(levelOf(solved), solved);

    after.classList.add('show');
    ['num', 'den'].forEach((k) => burst(st.sides[k].toks[0].el, '#16a34a', 14));
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  /* ============================================================
   * Кнопки и регистрация режима
   * ============================================================ */
  nextBtn.addEventListener('click', newRound);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (state && state.aligned && state.phase !== 'B') { alignCols(); fitPairBars(); } });
  }

  window.MG.modes.whole = {
    start() {
      if (!state) newRound();
      else setStats(levelOf(solved), solved);
    },
    skip: newRound,
  };
})();

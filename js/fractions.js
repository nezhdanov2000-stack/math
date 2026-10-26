/* Режим 1: сокращение числовых дробей («автопилот»).
 *
 * Поток игры:
 *   1. Клик по составному числу → оно делится на ДВА множителя (наименьший простой × остаток).
 *   2. Клик по множителю можно повторять: составной делится дальше,
 *      простой проигрывает анимацию «неделимое».
 *   3. Как только в числителе и знаменателе есть одинаковые простые множители,
 *      они подсвечиваются одним цветом (цвет = простое число).
 *   4. Клик по цветному множителю → он и его пара исчезают.
 *   5. Общих множителей не осталось → остатки «схлопываются» в числа, показывается результат.
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
  const fractionEl = $('#fraction');
  const rows = { num: $('#num'), den: $('#den') };
  const bar = $('#bar');
  const hint = $('#hint');
  const after = $('#after');
  const resultText = $('#resultText');
  const nextBtn = $('#next');

  /* ============================================================
   * Состояние
   * ============================================================ */
  let state = null;     // текущий раунд
  let solved = 0;
  let lastPair = '';
  let uid = 0;

  const levelOf = (s) => window.MG.levelOf(s, 6);   // уровень: +1 за каждые 3 задачи, не выше 6

  /* ---------- генерация дроби ---------- */
  function pickFraction() {
    if (solved === 0 && lastPair === '') return [15, 21];     // как на эскизе
    const lvl = levelOf(solved);
    const maxN = [60, 120, 300, 900, 2500, 6000][lvl - 1];
    for (let i = 0; i < 3000; i++) {
      const g = ri(2, Math.max(3, Math.floor(Math.sqrt(maxN) * 1.5)));
      const aMax = Math.floor(maxN / g);
      if (aMax < 2) continue;
      let a = ri(2, aMax);
      const b = ri(2, aMax);
      if (lvl >= 3 && Math.random() < 0.12) a = 1;            // иногда числитель целиком сокращается
      if (a === b || gcd(a, b) !== 1) continue;
      const n = g * a;
      const d = g * b;
      if (factorize(n).length > 6 || factorize(d).length > 6) continue;
      if (`${n}/${d}` === lastPair) continue;
      return [n, d];
    }
    return [15, 21];
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
    fractionEl.style.fontSize = `${px}px`;
    fitBar(true);
  }
  window.addEventListener('resize', () => {
    if (state && !$('#mode-cancel').hidden) fitFontSize(state.n, state.d);
  });

  /* ============================================================
   * Подсказки
   * ============================================================ */
  const hints = window.MG.hinter(hint);          // подсказка с анимацией смены текста
  const setHint = (text) => hints.set(text);
  function defaultHint() {
    if (!state || state.finished) return '';
    const anyPair = ['num', 'den'].some((k) =>
      state.sides[k].toks.some((t) => t.paired && !t.gone));
    return anyPair
      ? 'Возьми ластик и выбери два одинаковых цветных множителя — сверху и снизу. Ошибёшься — ластик исчезнет'
      : (manual() ? 'Возьми кувалду, нажми на число и впиши два множителя. Простое число не делится.' : 'Возьми кувалду и ударь по числу — оно разобьётся на два множителя. Простое число не делится.');
  }
  function autoTool() {
    if (!state || state.finished) return;
    const toks = [...state.sides.num.toks, ...state.sides.den.toks].filter((t) => !t.gone && t.value !== 1);
    window.MG.tools.auto('cancel', {
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
    const [n, d] = pickFraction();
    lastPair = `${n}/${d}`;

    Object.values(rows).forEach((r) => { r.innerHTML = ''; });
    after.classList.remove('show');

    const st = {
      n, d, finished: false, pending: 0, fontFit: 60,
      sides: {
        num: { key: 'num', toks: [makeTok(n, 'num')] },
        den: { key: 'den', toks: [makeTok(d, 'den')] },
      },
    };
    state = st;

    sync(st.sides.num);
    sync(st.sides.den);
    fitFontSize(n, d);
    popIn(st.sides.num.toks[0].el);
    popIn(st.sides.den.toks[0].el, 110);

    setStats(levelOf(solved), solved);
    hints.reset();
    updateHint();
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

  /* после 50 % прогресса кувалда не делит сама: множители вводит пользователь */
  const manual = () => (window.MG.clip ? window.MG.clip.isManual() : false);
  async function askSplit(tok) {
    if (tok.smashing || tok.asking || !window.MG.clip) return;
    const st = state;
    tok.asking = true;
    const r = await window.MG.clip.ask(tok.value, tok.el);
    tok.asking = false;
    if (!r || state !== st || st.finished || tok.gone) return;
    tok.smashing = true;
    await smash(tok.el);
    tok.smashing = false;
    if (state !== st || st.finished || tok.gone) return;
    splitStep(st.sides[tok.side], tok, r[0]);
    refreshPairs();
    updateHint();
  }

  /* число рассыпается: наименьший простой множитель + остаток */
  function splitStep(side, big, forced) {
    const first = snapshot();
    const p = forced || spf(big.value);
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
      .filter((t) => !t.gone && t.value > 1);
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
    if (!state || state.finished || tok.gone || tok.value === 1) return;
    const tools = window.MG.tools;
    if (tools.current() === 'glove') { gloveClick(tok); return; }   // перчатка: выбираем пару
    if (!isPrime(tok.value) && !tok.paired) {               // составное без пары → кувалда делит
      if (tools.need('hammer')) { if (manual()) askSplit(tok); else splitOnce(tok); }
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

  /* ---------- финал ---------- */
  function checkFinish() {
    if (!state || state.finished || state.pending > 0) return;
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

    resultText.innerHTML = `${mf(st.n, st.d)} = ${mf(rn, rd)}`;
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

  window.MG.modes.cancel = {
    start() {
      if (!state) newRound();
      else setStats(levelOf(solved), solved);
    },
    skip: newRound,
  };
})();

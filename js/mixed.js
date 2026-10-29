/* Режим «Смешанные числа»: сложение и вычитание с целыми частями.
 *
 * Выражение — список слагаемых, у каждого свой знак. Слагаемое бывает:
 *   whole  — целое число            { w }
 *   frac   — дробь                  { num: [{ s, f: [множители] }], den: [множители] }
 *   mixed  — смешанное число        { w, n, d }
 * Инструменты:
 *   пасть — дробная черта раскрывается и выплёвывает целые из неправильной дроби
 *   вертолёт — отрывает целое от дроби,
 *              склеивает обратно в смешанное число и переставляет слагаемые магнитом
 *   джокер   — карта с множителем сверху и снизу ложится на дробь (знаменатели выравниваются)
 *   поршни   — сжимают соседние дроби с одинаковыми знаменателями в одну
 *   молния   — считает: сумму целых, произведения, числитель и знаменатель
 */
(() => {
  'use strict';

  const MG = window.MG;
  const { gcd, spf, isPrime, $, T, sleep, EASE, ri, colorOf, setStats, mf, burst, popIn, indivisible, shake, ghost } = MG;

  const expr = $('#x-expr');
  const hintEl = $('#x-hint');
  const after = $('#x-after');
  const resultText = $('#x-resultText');
  const nextBtn = $('#x-next');

  /* ============================================================
   * Стили
   * ============================================================ */
  const css = document.createElement('style');
  css.textContent = `
    #mode-mixed .mx-expr {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
      width: min(96vw, 1040px); min-height: 3.6em; font-size: 70px; font-weight: 900; line-height: 1.1;
    }
    .mx-term { position: relative; display: inline-flex; align-items: center; padding: .08em .1em; border-radius: .3em;
      user-select: none; touch-action: none; transition: background-color .2s, opacity .2s; }
    .mx-term.lifted, .mx-op.lifted { opacity: .25; }
    .mx-burn { filter: url(#mx-fire); }
    .mx-burn.lifted { filter: none; }
    .mx-op.mx-burn { position: relative; }
    .mx-ember { position: absolute; width: .07em; height: .07em; border-radius: 50%; background: #fbbf24; box-shadow: 0 0 .06em #f97316;
      pointer-events: none; opacity: 0; animation: mxEmber 1.2s ease-out infinite; }
    @keyframes mxEmber {
      0% { transform: translate(0, 0) scale(1); opacity: 0; }
      15% { opacity: 1; }
      100% { transform: translate(var(--dx, 0), -.9em) scale(.3); opacity: 0; }
    }
    .mx-op { display: inline-block; padding: 0 .28em; font-weight: 900; user-select: none; }
    .mx-op.un { padding: 0 .12em 0 .05em; }
    .mx-op.glue { border-radius: .3em; }
    .mx-w, .mx-wn { position: relative; padding: 0 .06em; }
    .mx-frac { display: inline-flex; flex-direction: column; align-items: center; font-size: .66em; margin-left: .06em; }
    .mx-term.mx-fr > .mx-frac { margin-left: 0; }
    .mx-numrow, .mx-denrow { display: flex; align-items: center; justify-content: center; line-height: 1.12; }
    .mx-bar { align-self: stretch; height: .09em; min-width: 1.2em; margin: .08em .02em; background: currentColor; border-radius: 999px; }
    .mx-n { position: relative; display: inline-block; padding: 0 .04em; }
    .mx-dot { opacity: .55; padding: 0 .2em; }
    .mx-nop { padding: 0 .26em; }
    .mx-term.final, .mx-term.final .mx-op { color: var(--ok); }
    .mx-frac.ok, .mx-frac.over { opacity: 1; }
    .mx-frac.over { scale: 1.1; }
    .mx-frac.no { opacity: .35; }
    .mx-frac.src { opacity: .8; }
    .mx-term.glue-target { outline: 4px dashed #f97316; outline-offset: 6px; border-radius: 14px; background: rgba(249,115,22,.12); }
    .mx-term.glue-bad { outline: 4px dashed #ef4444; outline-offset: 6px; border-radius: 14px; background: rgba(239,68,68,.1); }
    .mx-caret { position: fixed; z-index: 55; width: 5px; border-radius: 3px; background: #f97316; pointer-events: none; opacity: .9; }
    body[data-tool="joker"] .mx-denrow .mx-n { cursor: none; }
    .mx-n.sel { scale: 1.16; text-shadow: 0 0 .28em rgba(245,158,11,.9), 0 0 .6em rgba(245,158,11,.5); }
    body[data-tool="glove"] .stage .mx-term, body[data-tool="glove"] .stage .mx-n { cursor: var(--cur-glove, pointer) !important; }
    body[data-tool="joker"] .stage .mx-term, body[data-tool="press"] .stage .mx-term, body[data-tool="bolt"] .stage .mx-term { cursor: inherit; }
  `;
  document.head.append(css);

  /* ============================================================
   * Модель
   * ============================================================ */
  let state = null;
  let solved = 0;
  let uid = 0;
  let lastKey = '';
  let suppressClick = false;

  const lcm = (a, b) => (a / gcd(a, b)) * b;
  const prod = (a) => a.reduce((x, y) => x * y, 1);
  const levelOf = (s) => MG.levelOf(s, 4);   // уровень: +1 за каждые 3 задачи, не выше 4

  const mkWhole = (w, sign = 1) => ({ id: ++uid, kind: 'whole', sign, w });
  const mkFrac = (n, d, sign = 1) => ({ id: ++uid, kind: 'frac', sign, num: [{ s: 1, f: [n] }], den: [d] });
  const mkMixed = (w, n, d, sign = 1) => ({ id: ++uid, kind: 'mixed', sign, w, n, d });

  const denVal = (t) => prod(t.den);
  const atomic = (t) => t.num.length === 1 && t.num[0].f.length === 1 && t.den.length === 1;
  const numVal = (t) => t.num.reduce((x, g) => x + g.s * prod(g.f), 0);
  const isProper = (t) => atomic(t) && t.num[0].s > 0 && prod(t.num[0].f) < t.den[0];
  const pending = (t) => t.kind === 'frac' && (t.num.length > 1 || t.num.some((g) => g.f.length > 1) || t.den.length > 1);

  const idxOf = (id) => state.terms.findIndex((t) => t.id === id);

  /* ============================================================
   * Отрисовка
   * ============================================================ */
  function mkEl(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function fracEl(t) {
    const f = mkEl('span', 'mx-frac');
    const nr = mkEl('span', 'mx-numrow');
    t.num.forEach((g, gi) => {
      if (gi > 0 || g.s < 0) { const o = mkEl('span', 'mx-nop', g.s > 0 ? '+' : '−'); o.dataset.g = gi; nr.append(o); }
      g.f.forEach((v, fi) => {
        if (fi > 0) { const d = mkEl('span', 'mx-dot', '·'); d.dataset.g = gi; nr.append(d); }
        const n = mkEl('span', 'mx-n', String(v));
        n.dataset.g = gi; n.dataset.fi = fi;
        nr.append(n);
      });
    });
    const bar = mkEl('span', 'mx-bar');
    const dr = mkEl('span', 'mx-denrow');
    t.den.forEach((v, di) => {
      if (di > 0) dr.append(mkEl('span', 'mx-dot', '·'));
      const n = mkEl('span', 'mx-n', String(v));
      n.dataset.di = di;
      dr.append(n);
    });
    f.append(nr, bar, dr);
    return f;
  }

  function termEl(t) {
    const e = mkEl('span', `mx-term mx-${t.kind === 'whole' ? 'wh' : t.kind === 'frac' ? 'fr' : 'mixed'}`);
    e.dataset.k = `t${t.id}`;
    e.dataset.id = t.id;
    e.dataset.kind = t.kind;
    if (t.kind === 'whole') e.append(mkEl('span', 'mx-w', String(t.w)));
    else if (t.kind === 'frac') e.append(fracEl(t));
    else {
      e.append(mkEl('span', 'mx-w', String(t.w)));
      e.append(fracEl({ num: [{ s: 1, f: [t.n] }], den: [t.d] }));
    }
    return e;
  }

  function render() {
    expr.innerHTML = '';
    state.terms.forEach((t, i) => {
      if (i > 0 || t.sign < 0) {
        const o = mkEl('span', `mx-op${i === 0 ? ' un' : ''}`, t.sign > 0 ? '+' : '−');
        o.dataset.k = `o${t.id}`;
        o.dataset.opid = t.id;
        expr.append(o);
      }
      expr.append(termEl(t));
    });
    igniteNeg();
  }

  const elOf = (t) => expr.querySelector(`[data-k="t${t.id}"]`);
  const opOf = (t) => expr.querySelector(`[data-k="o${t.id}"]`);

  /* FLIP по ключам: слагаемые и знаки плавно переезжают на новые места */
  function snap() {
    const m = new Map();
    expr.querySelectorAll('[data-k]').forEach((e) => m.set(e.dataset.k, e.getBoundingClientRect()));
    return m;
  }
  function flip(first, skip = new Set(), dur = 620) {
    expr.querySelectorAll('[data-k]').forEach((e) => {
      if (skip.has(e.dataset.k)) return;
      const a = first.get(e.dataset.k);
      if (!a) return;
      const b = e.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      e.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: T(dur), easing: EASE });
    });
  }

  /* ============================================================
   * Генерация задач
   * ============================================================ */
  const PAIRS = [
    [[2, 4], [3, 6], [2, 2], [4, 4], [5, 10], [3, 3], [4, 8]],
    [[2, 3], [3, 4], [2, 5], [4, 6], [3, 5], [6, 9], [2, 6]],
    [[3, 4], [4, 5], [2, 7], [5, 6], [3, 8], [4, 6], [6, 8], [4, 10]],
    [[5, 6], [3, 7], [4, 9], [6, 10], [5, 8], [4, 7], [8, 12], [6, 9]],
  ];

  function genSpec() {
    if (solved === 0 && !lastKey) return { w1: 2, n1: 1, d1: 2, op: 1, w2: 3, n2: 1, d2: 4, ...result(2, 1, 2, 1, 3, 1, 4) };
    const lvl = levelOf(solved);
    for (let i = 0; i < 800; i++) {
      let [d1, d2] = MG.pick(PAIRS[Math.min(lvl, PAIRS.length) - 1]);
      if (Math.random() < 0.5) [d1, d2] = [d2, d1];
      const op = solved >= 2 && Math.random() < 0.4 ? -1 : 1;
      const w1 = ri(op < 0 ? 2 : 1, 4 + lvl * 2);
      const w2 = ri(1, op < 0 ? w1 - 1 : 3 + lvl);
      const n1 = ri(1, d1 - 1);
      const n2 = ri(1, d2 - 1);
      if (d1 < 2 || d2 < 2) continue;
      if (gcd(n1, d1) !== 1 || gcd(n2, d2) !== 1) continue;
      if (op < 0 && n1 * d2 <= n2 * d1) continue;
      const r = result(w1, n1, d1, op, w2, n2, d2);
      if (!r || gcd(r.rn, r.rd) !== 1 || r.rn === 0) continue;
      const spec = { w1, n1, d1, op, w2, n2, d2, ...r };
      if (JSON.stringify([w1, n1, d1, op, w2, n2, d2]) === lastKey) continue;
      return spec;
    }
    return { w1: 3, n1: 1, d1: 3, op: 1, w2: 2, n2: 1, d2: 6, ...result(3, 1, 3, 1, 2, 1, 6) };
  }

  function result(w1, n1, d1, op, w2, n2, d2) {
    const L = lcm(d1, d2);
    const N = n1 * (L / d1) + op * n2 * (L / d2);
    const W = w1 + op * w2;
    if (N <= 0 && op > 0) return null;
    const q = Math.floor(N / L);
    return { rw: W + q, rn: N - q * L, rd: L };
  }

  const mixedHTML = (w, n, d) => `${w} ${mf(n, d)}`;
  const finalHTML = (w, n, d) => (n ? mixedHTML(w, n, d) : `${w}`);

  function newRound() {
    stop();
    const spec = genSpec();
    lastKey = JSON.stringify([spec.w1, spec.n1, spec.d1, spec.op, spec.w2, spec.n2, spec.d2]);
    state = {
      spec,
      busy: false,
      finished: false,
      terms: [mkMixed(spec.w1, spec.n1, spec.d1, 1), mkMixed(spec.w2, spec.n2, spec.d2, spec.op)],
    };
    after.classList.remove('show');
    render();
    expr.querySelectorAll('.mx-term, .mx-op').forEach((e, i) => popIn(e, i * 70));
    setStats(levelOf(solved), solved);
    hints.reset();
    updateHint();
  }

  /* ============================================================
   * Подсказки и автоподбор инструмента
   * ============================================================ */
  const hints = MG.hinter(hintEl);               // подсказка с анимацией смены текста
  function setHint(text) {
    if (text === hints.text) return;
    hints.set(text);
  }

  const runs = (pred) => {
    const out = [];
    let cur = [];
    state.terms.forEach((t, i) => {
      if (pred(t)) cur.push(i);
      else { if (cur.length) out.push(cur); cur = []; }
    });
    if (cur.length) out.push(cur);
    return out;
  };

  function plan() {
    const T0 = state.terms;
    const has = { heli: false, hammer: false, joker: false, press: false, bolt: false, glove: MG.tools.current() === 'glove' };
    const mixed = T0.some((t) => t.kind === 'mixed');
    const wholeRuns = runs((t) => t.kind === 'whole');
    const fracRuns = runs((t) => t.kind === 'frac');
    const scattered = wholeRuns.length > 1 || fracRuns.length > 1;
    const fr = T0.filter((t) => t.kind === 'frac');
    const diff = fr.some((t) => denVal(t) !== denVal(fr[0]));   // знаменатели разные (дроби не обязательно рядом)
    const equal = fracRuns.some((r) => r.length > 1 && r.some((i, k) => k && denVal(T0[i]) === denVal(T0[r[k - 1]])));
    const calc = wholeRuns.some((r) => r.length > 1) || T0.some(pending);
    const improper = T0.some((t) => t.kind === 'frac' && atomic(t) && t.num[0].s > 0 && prod(t.num[0].f) >= t.den[0]);
    let glue = false;
    T0.forEach((t, i) => {
      const n = T0[i + 1];
      if (t.kind === 'whole' && n && n.kind === 'frac' && n.sign === t.sign && isProper(n)) glue = true;
    });
    has.heli = mixed || scattered || glue;
    has.maw = improper;
    has.joker = diff;
    has.press = equal;
    has.bolt = calc;
    has.hammer = T0.some((t) => t.kind === 'frac' && (t.den.some((v) => v > 3 && !isPrime(v)) || t.num.some((g) => g.f.some((v) => v > 3 && !isPrime(v)))));

    let hint = '';
    if (mixed) hint = 'Нажми вертолётом на число — вертолёт прилетит к нему. Нажми ещё раз — оторвёшь целое, или зажми и неси';
    else if (scattered) hint = 'Целые к целым, дроби к дробям: возьми вертолёт и перетащи слагаемое магнитом на новое место';
    else if (diff) hint = 'Знаменатели разные. Возьми джокера, нажми на знаменатель — джокер станет картой с этим числом. Положи карту на другую дробь, и она получит недостающий множитель';
    else if (equal) hint = 'Знаменатели одинаковые. Поршни сожмут соседние дроби в одну';
    else if (calc) hint = 'Молния считает: суммы целых, произведения, числитель и знаменатель — нажми ей на то, что нужно посчитать';
    else if (improper) hint = 'Дробь неправильная: возьми пасть и нажми на дробь — она выплюнет целые';
    else if (glue) hint = 'Осталось собрать ответ: нажми вертолётом на плюс между целым и дробью';
    return { hint, has };
  }

  function updateHint() {
    if (!state || state.finished) { setHint(''); return; }
    const { hint, has } = plan();
    setHint(hint);
    MG.tools.auto('mixed', has);
  }

  /* ============================================================
   * Общие эффекты
   * ============================================================ */
  const centerOf = (els) => {
    const rs = els.map((e) => e.getBoundingClientRect());
    return {
      x: (Math.min(...rs.map((r) => r.left)) + Math.max(...rs.map((r) => r.right))) / 2,
      y: (Math.min(...rs.map((r) => r.top)) + Math.max(...rs.map((r) => r.bottom))) / 2,
    };
  };

  /* молния бьёт в центры групп, старые элементы испаряются */
  async function zap(groups) {
    const marks = groups.map((els) => {
      const c = centerOf(els);
      const m = document.createElement('div');
      Object.assign(m.style, { position: 'fixed', pointerEvents: 'none', width: '2px', height: '2px', left: `${c.x}px`, top: `${c.y}px` });
      document.body.append(m);
      return m;
    });
    await MG.lightning(marks, { reveal: false, color: '#facc15' });
    marks.forEach((m) => m.remove());
    groups.flat().forEach((e) => e.animate([
      { filter: 'brightness(1)', opacity: 1, scale: '1' },
      { filter: 'brightness(4)', opacity: 0, scale: '.5' },
    ], { duration: T(320), easing: 'ease-in', fill: 'forwards' }));
    await sleep(340);
  }

  /* ============================================================
   * Вертолёт: клики и перетаскивание
   * ============================================================ */
  /* горение: огонь над группой элементов (слагаемое + его знак) */
  let burnTerm = null;
  if (!document.getElementById('mx-fire-defs')) {
    const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sv.id = 'mx-fire-defs';
    sv.setAttribute('width', '0'); sv.setAttribute('height', '0');
    sv.style.cssText = 'position:absolute;pointer-events:none';
    sv.innerHTML = `<defs><filter id="mx-fire" x="-30%" y="-55%" width="160%" height="210%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.028 0.075" numOctaves="2" seed="3" result="n">
        <animate attributeName="seed" values="1;2;3;4;5;6;7;8" dur="0.8s" repeatCount="indefinite" calcMode="discrete"/>
      </feTurbulence>
      <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="f1"/>
      <feOffset in="f1" dy="-9" result="f1u"/>
      <feDisplacementMap in="f1u" in2="n" scale="38" xChannelSelector="R" yChannelSelector="G" result="d1"/>
      <feGaussianBlur in="d1" stdDeviation="2.2" result="b1"/>
      <feFlood flood-color="#e8380d"/><feComposite in2="b1" operator="in" result="outer"/>
      <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="f2"/>
      <feOffset in="f2" dy="-5" result="f2u"/>
      <feDisplacementMap in="f2u" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G" result="d2"/>
      <feGaussianBlur in="d2" stdDeviation="1.6" result="b2"/>
      <feFlood flood-color="#ff9a1f"/><feComposite in2="b2" operator="in" result="mid"/>
      <feOffset in="SourceAlpha" dy="-2" result="f3u"/>
      <feDisplacementMap in="f3u" in2="n" scale="14" xChannelSelector="R" yChannelSelector="G" result="d3"/>
      <feGaussianBlur in="d3" stdDeviation="1.2" result="b3"/>
      <feFlood flood-color="#ffe066"/><feComposite in2="b3" operator="in" result="inner"/>
      <feMerge><feMergeNode in="outer"/><feMergeNode in="mid"/><feMergeNode in="inner"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter></defs>`;
    document.body.append(sv);
  }
  function clearBurn() {
    document.querySelectorAll('.mx-ember').forEach((b) => b.remove());
    document.querySelectorAll('.mx-burn').forEach((e) => e.classList.remove('mx-burn'));
    burnTerm = null;
  }
  function igniteEls(els) {
    els = els.filter(Boolean);
    els.forEach((el) => {
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
    });
    return els;
  }
  /* отрицательные слагаемые (вместе со своим минусом) горят всегда: на телефоне нет наведения */
  function igniteNeg() {
    if (!state || state.finished) return;
    state.terms.forEach((t) => { if (t.sign < 0) igniteEls([elOf(t), opOf(t)]); });
  }


  /* ============================================================
   * Выбор числа и сессия вертолёта: клик по числу — вертолёт летит к нему;
   * выбрал другое — вертолёт не улетает, а перелетает.
   * ============================================================ */
  let sel = null;          // выбранное число: { id, part }
  let downWasSel = false;  // нажатие пришло на уже выбранное число — значит, это «второй клик»
  function clearSel() { sel = null; }
  let hs = null;   // сессия вертолёта: { h, fresh, seq, idle, flying }
  function takeHeli(r) {
    if (!hs) {
      const h = MG.heli.spawn(window.innerWidth, -60, { size: Math.max(86, Math.min(112, r.height * 0.9)) });
      hs = { h, fresh: true, seq: 0, idle: 0, flying: false };
    }
    clearTimeout(hs.idle);
    return hs;
  }
  /* летит в точку; false — если за это время выбрали другое число (полёт перехвачен) */
  async function flyTo(x, y, ms = 650) {
    const s = hs;
    const my = ++s.seq;
    clearTimeout(s.idle);
    s.flying = true;
    const h = s.h;
    if (s.fresh) { s.fresh = false; await h.arrive(x, y, ms); }
    else {
      if (h.ropeLen > 8) await h.raise(220);
      if (my === s.seq) await h.moveTo(x, y, Math.min(ms, 560));
    }
    if (my === s.seq) s.flying = false;
    return my === s.seq && hs === s;
  }
  async function leaveHeli() {
    const s = hs;
    if (!s) return;
    hs = null;
    clearTimeout(s.idle);
    await s.h.raise(260);
    await s.h.leave();
  }
  function scheduleIdle(ms = 9000) {
    if (!hs) return;
    const s = hs;
    clearTimeout(s.idle);
    s.idle = setTimeout(() => { if (hs === s && !s.flying && !hdrag && !(state && state.busy)) { clearSel(); leaveHeli(); } }, ms);
  }
  window.addEventListener('toolchange', (e) => { if (e.detail.tool !== 'heli') { clearSel(); if (hs && !(state && state.busy) && !hdrag) leaveHeli(); } });
  /* клик мимо чисел — снимает выбор, вертолёт улетает */
  document.addEventListener('pointerdown', (e) => {
    if (!sel || hdrag || (state && state.busy) || MG.tools.current() !== 'heli') return;
    if (e.target.closest('.mx-term, .tool, .toolbar, button')) return;
    clearSel();
    leaveHeli();
  });

  /* вертолёт прилетает к якорю, слагаемые перестраиваются, магнит поднимается */
  async function heliAssist(anchor, mutate, afterFollow) {
    const st = state;
    const r = anchor.getBoundingClientRect();
    const s0 = takeHeli(r);
    const h = s0.h;
    const hy = r.top - h.size * 0.62 - 26;
    const ok = await flyTo(r.left + r.width / 2, Math.max(60, hy));
    if (state !== st) { clearSel(); leaveHeli(); return; }
    if (!ok) return;                      // выбрали другое число — этим занимается новый вызов
    st.busy = true;                       // магнит пошёл вниз — отступать поздно
    clearSel();
    await h.lower(Math.max(20, r.top + r.height * 0.18 - h.hookY - h.magnetH * 0.6), 460);
    if (state !== st) { hs = null; h.remove(); return; }
    const first = snap();
    const info = mutate(first);
    render();
    const fresh = new Set(info.fresh || []);
    flip(first, fresh);
    if (info.carry) igniteEls(info.carry.map((k) => expr.querySelector(`[data-k="${k}"]`)));
    (info.pop || []).forEach((k) => { const e = expr.querySelector(`[data-k="${k}"]`); if (e) popIn(e); });
    const follow = expr.querySelector(`[data-k="${info.follow}"]`);
    if (follow) {
      const nr = follow.getBoundingClientRect();
      h.moveTo(nr.left + nr.width / 2, Math.max(60, nr.top - h.size * 0.62 - 26), 620);
    }
    await sleep(680);
    if (state === st) {
      (info.burst || []).forEach((k) => { const e = expr.querySelector(`[data-k="${k}"]`); if (e) burst(e, '#f97316', 10); });
    }
    await leaveHeli();
    st.busy = false;
    if (state === st) { updateHint(); checkFinish(); }
  }

  function heliClick(e) {
    const termE = e.target.closest('.mx-term');
    const opE = e.target.closest('.mx-op');
    if (opE) { glueAt(Number(opE.dataset.opid), opE); return; }
    if (!termE) return;
    const i = idxOf(Number(termE.dataset.id));
    const t = state.terms[i];
    if (!downWasSel) { scheduleIdle(); return; }      // первый клик только выбирает (вертолёт прилетает), действие — вторым кликом или перетаскиванием
    downWasSel = false;
    if (t.kind === 'mixed') { splitMixed(t, termE); return; }
    clearSel(); scheduleIdle(2500);
    if (t.kind === 'frac' && atomic(t) && t.num[0].s > 0 && prod(t.num[0].f) >= t.den[0]) { indivisible(termE, 'целое из неправильной дроби выплёвывает пасть'); return; }
    if (t.kind === 'frac' && pending(t)) { indivisible(termE, 'сначала посчитай молнией'); return; }
    indivisible(termE, 'перетащи слагаемое магнитом, чтобы поменять местами');
  }

  function splitMixed(t, el) {
    const anchor = el.querySelector('.mx-w') || el;
    const wr = (el.querySelector('.mx-w') || el).getBoundingClientRect();
    const fr = (el.querySelector('.mx-frac') || el).getBoundingClientRect();
    const oldOp = opOf(t);
    const opR = oldOp ? oldOp.getBoundingClientRect() : null;
    heliAssist(anchor, (first) => {
      const i = idxOf(t.id);
      const w = mkWhole(t.w, t.sign);
      const f = mkFrac(t.n, t.d, t.sign);
      state.terms.splice(i, 1, w, f);
      first.set(`t${w.id}`, wr);
      first.set(`t${f.id}`, fr);
      if (opR) { first.set(`o${w.id}`, opR); first.set(`o${f.id}`, opR); }
      const carry = t.sign < 0 ? [`t${w.id}`, `o${w.id}`, `t${f.id}`, `o${f.id}`] : null;
      return { fresh: [], follow: `t${w.id}`, pop: opR ? [] : [`o${f.id}`], burst: [], carry };
    });
  }

  /* пасть: дробная черта раскрывается и выплёвывает целые (по знаменателю за раз) */
  async function treadClick(e) {
    const termE = e.target.closest('.mx-term');
    if (!termE) return;
    const t = state.terms[idxOf(Number(termE.dataset.id))];
    if (t.kind !== 'frac') { indivisible(termE, 'пасть нужна неправильной дроби'); return; }
    if (!atomic(t) || !(t.num[0].s > 0)) { indivisible(termE, 'сначала посчитай молнией — в числителе должно быть одно число'); return; }
    const n = prod(t.num[0].f);
    const d = t.den[0];
    if (n < d) { indivisible(termE, 'дробь правильная — ей нечего выплёвывать'); return; }
    const st = state;
    st.busy = true;
    const old = termE.getBoundingClientRect();
    const barEl = termE.querySelector('.mx-bar');
    let spot = null;
    for (let k = 0, K = Math.min(Math.floor(n / d), 3); k < K; k++) {
      await MG.maw.spit({ bar: barEl, onSpit: (x, y) => { if (!spot) spot = new DOMRect(x - 20, y - 20, 40, 40); } });
      if (state !== st) return;
    }
    const res = { badge: spot || old };
    if (state !== st) return;
    const q = Math.floor(n / d);
    const r = n - q * d;
    const first = snap();
    const i = idxOf(t.id);
    const w = mkWhole(q, t.sign);
    const list = [w];
    first.set(`t${w.id}`, res.badge);
    if (r) { const f = mkFrac(r, d, t.sign); list.push(f); first.set(`t${f.id}`, old); }
    st.terms.splice(i, 1, ...list);
    render();
    flip(first, new Set(), 520);
    const we = elOf(w);
    if (we) { popIn(we); burst(we, '#f97316', 12); }
    await sleep(560);
    st.busy = false;
    if (state === st) { updateHint(); checkFinish(); }
  }

  function glueAt(termId, opEl) {
    const i = idxOf(termId);
    const a = state.terms[i - 1];
    const b = state.terms[i];
    if (!(a && b && a.kind === 'whole' && b.kind === 'frac' && atomic(b) && a.sign === b.sign)) {
      indivisible(opEl, 'склеить можно целое и стоящую рядом дробь с тем же знаком');
      return;
    }
    if (!isProper(b)) { indivisible(opEl, 'дробь неправильная — сначала выдели из неё целое'); return; }
    const ra = elOf(a).getBoundingClientRect();
    heliAssist(opEl, (first) => {
      const m = mkMixed(a.w, prod(b.num[0].f), b.den[0], a.sign);
      state.terms.splice(i - 1, 2, m);
      first.set(`t${m.id}`, ra);
      return { fresh: [`t${m.id}`], follow: `t${m.id}`, pop: [`t${m.id}`], burst: [`t${m.id}`] };
    });
  }

  /* --- перетаскивание слагаемого магнитом: зажал число — вертолёт прилетел, прицепил и носит, пока держишь кнопку --- */
  let hdrag = null;
  const STRING = 36;

  function heliDown(e) {
    const termE = e.target.closest('.mx-term');
    if (!termE || e.button > 0 || hdrag) return;
    e.preventDefault();
    const t = state.terms[idxOf(Number(termE.dataset.id))];
    const d = {
      t, termE, st: state, sx: e.clientX, sy: e.clientY, px: e.clientX, py: e.clientY,
      started: false, attached: false, cancelled: false, g: null, h: null, caret: null, timer: 0,
      part: e.target.closest('.mx-w') ? 'w' : e.target.closest('.mx-frac') ? 'f' : null,   // за какую часть смешанного числа схватили
    };
    const anchor0 = (t.kind === 'mixed' && d.part) ? termE.querySelector(d.part === 'w' ? '.mx-w' : '.mx-frac') : termE;
    downWasSel = !!(sel && sel.id === t.id && sel.part === d.part);
    sel = { id: t.id, part: d.part };
    const ar0 = anchor0.getBoundingClientRect();
    const s0 = takeHeli(ar0);
    MG.heli.tint(s0.h, t.sign < 0, !s0.fresh);
    flyTo(ar0.left + ar0.width / 2, Math.max(50, ar0.top - STRING - s0.h.magnetH * 0.85 - s0.h.size * 0.625 * 0.4 - 4));
    d.timer = setTimeout(() => startCarry(d), 220);   // долгое нажатие — тоже захват
    hdrag = d;
    window.addEventListener('pointermove', heliMove);
    window.addEventListener('pointerup', heliUp);
    window.addEventListener('pointercancel', heliUp);
  }

  function heliMove(e) {
    const d = hdrag;
    if (!d) return;
    d.px = e.clientX;
    d.py = e.clientY;
    if (!d.started && Math.hypot(d.px - d.sx, d.py - d.sy) > 6) startCarry(d);
  }

  /* куда ставить вертолёт, чтобы подвешенное слагаемое оказалось под курсором */
  function carryTarget(d, gh) {
    const h = d.h;
    const Hh = h.size * 0.625;
    return {
      x: d.px,
      y: d.py - gh / 2 - STRING - h.magnetH * 0.85 - Hh * 0.4,
    };
  }

  async function startCarry(d) {
    if (d.started || hdrag !== d) return;
    d.started = true;
    clearTimeout(d.timer);
    const st = state;
    const anchor = (d.t.kind === 'mixed' && d.part) ? d.termE.querySelector(d.part === 'w' ? '.mx-w' : '.mx-frac') : d.termE;
    const ar = anchor.getBoundingClientRect();
    const s0 = takeHeli(ar);
    const h = s0.h;
    d.h = h;
    const Hh = h.size * 0.625;
    // 1. прилетает над числом и опускает магнит
    const ok = await flyTo(ar.left + ar.width / 2, Math.max(50, ar.top - STRING - h.magnetH * 0.85 - Hh * 0.4 - 4), 650);
    if (state !== st) { clearSel(); leaveHeli(); return; }
    if (!ok) return;                                  // выбрали другое число
    if (d.cancelled) { scheduleIdle(); return; }      // отпустили до захвата — вертолёт ждёт нового выбора
    const mySeq = s0.seq;
    await h.lower(STRING, 320);
    if (hs !== s0 || s0.seq !== mySeq) return;       // выбрали другое число
    if (d.cancelled) { await h.raise(220); scheduleIdle(); return; }
    clearSel();

    // 2. магнит схватил: если это смешанное число — отрывается только та часть, за которую схватили
    if (d.t.kind === 'mixed' && d.part) {
      const t = d.t;
      const wr = d.termE.querySelector('.mx-w').getBoundingClientRect();
      const fr = d.termE.querySelector('.mx-frac').getBoundingClientRect();
      const first = snap();
      const i = idxOf(t.id);
      const w = mkWhole(t.w, t.sign);
      const f = mkFrac(t.n, t.d, t.sign);
      const oldOp = opOf(t);
      const opR = oldOp ? oldOp.getBoundingClientRect() : null;
      state.terms.splice(i, 1, w, f);
      first.set(`t${w.id}`, wr);
      first.set(`t${f.id}`, fr);
      if (opR) { first.set(`o${w.id}`, opR); first.set(`o${f.id}`, opR); }
      render();
      flip(first, new Set(), 520);
      const opE = opOf(f);
      if (opE && !opR) popIn(opE);
      d.t = d.part === 'w' ? w : f;
      d.termE = elOf(d.t);
      if (t.sign < 0) { d.burn = [w, f]; igniteEls(d.burn.flatMap((x) => [elOf(x), opOf(x)])); }
    }
    // число поднимается вместе со своим знаком и висит под вертолётом
    d.opE = opOf(d.t);                                // знак на старом месте бледнеет
    const withOp = !!(d.opE && d.t.sign < 0);         // на магнит с числом уходит только минус
    const rt = d.termE.getBoundingClientRect();
    const ro = withOp ? d.opE.getBoundingClientRect() : null;
    const r0 = ro ? { left: Math.min(ro.left, rt.left), top: Math.min(ro.top, rt.top), width: Math.max(ro.right, rt.right) - Math.min(ro.left, rt.left), height: Math.max(ro.bottom, rt.bottom) - Math.min(ro.top, rt.top) } : rt;
    const cs = getComputedStyle(d.termE);
    const g = document.createElement('div');
    g.className = 'ghost';
    Object.assign(g.style, { position: 'fixed', left: `${r0.left}px`, top: `${r0.top}px`, width: `${r0.width}px`, height: `${r0.height}px`, margin: '0', fontSize: cs.fontSize, fontWeight: '900', lineHeight: cs.lineHeight, zIndex: 60, pointerEvents: 'none', display: 'flex', alignItems: 'center', transformOrigin: '50% 0', filter: 'drop-shadow(0 12px 14px rgba(0,0,0,.28))' });
    const clone = (el) => { const c = el.cloneNode(true); c.removeAttribute('data-k'); c.classList.remove('lifted', 'mx-burn'); c.style.flex = 'none'; return c; };
    if (withOp) { d.gOp = clone(d.opE); g.append(d.gOp); }
    d.gTerm = clone(d.termE);
    g.append(d.gTerm);
    document.body.append(g);
    d.g = g;
    if (d.t.sign < 0) { d.gTerm.classList.add('mx-burn'); if (d.gOp) d.gOp.classList.add('mx-burn'); }
    d.termE.classList.add('lifted');
    if (d.opE) d.opE.classList.add('lifted');
    const caret = document.createElement('div');
    caret.className = 'mx-caret';
    document.body.append(caret);
    d.caret = caret;
    d.attached = true;
    const gw = r0.width;
    const gh = r0.height;
    let px = h.x;
    let py = h.y;
    let vx = 0;
    let swing = 0;

    const tick = () => {
      if (d.done || state !== st) return;
      const tg = carryTarget(d, gh);
      const nx = px + (tg.x - px) * 0.22;
      const ny = Math.max(46, py + (tg.y - py) * 0.22);
      vx = nx - px;
      px = nx;
      py = ny;
      swing += (Math.max(-16, Math.min(16, vx * 1.3)) - swing) * 0.25;
      h.place(px, py);
      h.len(STRING);
      // число висит под магнитом
      const top = h.hookY + STRING + h.magnetH * 0.85;
      const dx = px - (r0.left + gw / 2);
      const dy = top - r0.top;
      g.style.transform = `translate(${dx}px, ${dy}px) rotate(${swing}deg)`;
      const gc = glueTarget(d);
      const gt = gc ? gc.t : null;
      const gbad = !!(gc && gc.why);
      if (gt !== d.gt || gbad !== d.gbad) {
        if (d.gt && elOf(d.gt)) elOf(d.gt).classList.remove('glue-target', 'glue-bad');
        d.gt = gt; d.gbad = gbad;
        if (gt && elOf(gt)) elOf(gt).classList.add(gbad ? 'glue-bad' : 'glue-target');
      }
      caret.style.display = gt ? 'none' : '';
      // вставка: куда встанет число
      const idx = insertIndex(d.px, d.t);
      const others = slotsFor(d.t);
      const er = expr.getBoundingClientRect();
      let x;
      if (!others.length) x = er.left + er.width / 2;
      else if (idx === 0) x = others[0].getBoundingClientRect().left - 6;
      else if (idx >= others.length) x = others[others.length - 1].getBoundingClientRect().right + 6;
      else x = (others[idx - 1].getBoundingClientRect().right + others[idx].getBoundingClientRect().left) / 2;
      const rr = others.length ? others[0].getBoundingClientRect() : er;
      Object.assign(caret.style, { left: `${x - 2.5}px`, top: `${rr.top}px`, height: `${rr.height}px` });
      d.raf = requestAnimationFrame(tick);
    };
    d.raf = requestAnimationFrame(tick);
    d.stopLoop = () => { d.done = true; cancelAnimationFrame(d.raf); };
  }

  /* на какое слагаемое навели: целое + дробь (или наоборот) склеиваются в смешанное число */
  function glueTarget(d) {
    if (!d.g) return null;
    const gr = (d.gTerm || d.g).getBoundingClientRect();
    const cx = gr.left + gr.width / 2;
    const cy = gr.top + gr.height / 2;
    const me = d.t;
    if (me.kind !== 'whole' && me.kind !== 'frac') return null;
    const fs = parseFloat(getComputedStyle(expr).fontSize) || 70;
    const padX = fs * 0.5;     // широкая зона: числа вплотную тоже склеиваются
    const padY = fs * 0.4;
    let best = null;
    for (const t of state.terms) {
      if (t === me) continue;
      const okPair = (me.kind === 'whole' && t.kind === 'frac') || (me.kind === 'frac' && t.kind === 'whole');
      if (!okPair) continue;
      const el = elOf(t);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      // пересечение карточки в руке с зоной слагаемого (с запасом по краям) или центр внутри зоны
      const hit = gr.right > r.left - padX && gr.left < r.right + padX && gr.bottom > r.top - padY && gr.top < r.bottom + padY;
      if (!hit) continue;
      const dist = Math.hypot(cx - (r.left + r.width / 2), cy - (r.top + r.height / 2));
      if (!best || dist < best.dist) best = { t, dist };
    }
    if (!best) return null;
    const t = best.t;
    const fr = me.kind === 'frac' ? me : t;
    let why = null;
    if (t.sign !== me.sign) why = 'у целого и дроби разные знаки — склеить нельзя';
    else if (!atomic(fr)) why = 'сначала сведи дробь к одному числу сверху и снизу';
    else if (!isProper(fr)) why = 'дробь неправильная — сначала выдели из неё целое';
    return { t, why };
  }

  function slotsFor(dt) {
    return state.terms.filter((t) => t !== dt).map((t) => elOf(t));
  }

  function insertIndex(x, dt) {
    const others = slotsFor(dt);
    let idx = 0;
    others.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.left + r.width / 2 < x) idx++;
    });
    return idx;
  }

  async function heliUp(e) {
    const d = hdrag;
    if (!d) return;
    window.removeEventListener('pointermove', heliMove);
    window.removeEventListener('pointerup', heliUp);
    window.removeEventListener('pointercancel', heliUp);
    clearTimeout(d.timer);
    if (!d.started) { hdrag = null; return; }          // обычный клик — его обработает click
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 80);
    if (!d.attached) {                                    // магнит ещё не схватил
      d.cancelled = true;
      hdrag = null;
      scheduleIdle();
      return;
    }
    hdrag = null;
    d.stopLoop();
    if (state !== d.st) {                                 // раунд сменился, пока число висело на магните
      if (d.g) d.g.remove();
      if (d.caret) d.caret.remove();
      leaveHeli();
      return;
    }
    d.px = e.clientX;
    d.py = e.clientY;

    const st = state;
    const gc = glueTarget(d);
    const gt = gc && !gc.why ? gc.t : null;
    const gwhy = gc && gc.why;
    if (d.gt && elOf(d.gt)) elOf(d.gt).classList.remove('glue-target', 'glue-bad');
    d.caret.remove();
    if (gt) {
      const whole = d.t.kind === 'whole' ? d.t : gt;
      const fr = d.t.kind === 'whole' ? gt : d.t;
      const gr0 = d.g.getBoundingClientRect();
      const tr = elOf(gt).getBoundingClientRect();
      const first0 = snap();
      first0.set(`t${gt.id}`, tr);
      d.g.remove();
      const lo = Math.min(st.terms.indexOf(d.t), st.terms.indexOf(gt));
      const m = mkMixed(whole.w, prod(fr.num[0].f), fr.den[0], whole.sign);
      st.terms = st.terms.filter((x) => x !== d.t && x !== gt);
      st.terms.splice(lo, 0, m);
      first0.set(`t${m.id}`, tr);
      render();
      flip(first0, new Set([`t${m.id}`]), 460);
      const me = elOf(m);
      if (d.burn && me) igniteEls([me, opOf(m)]);
      if (me) {
        popIn(me);
        burst(me, '#f97316', 12);
        const nr = me.getBoundingClientRect();
        d.h.moveTo(nr.left + nr.width / 2, Math.max(50, nr.top - STRING - d.h.magnetH * 0.85 - d.h.size * 0.25), 460);
      }
      await sleep(480);
      await leaveHeli();
      updateHint();
      checkFinish();
      return;
    }
    const idx = insertIndex(d.px, d.t);
    const cur = st.terms.indexOf(d.t);
    const gr = d.g.getBoundingClientRect();
    if (gwhy) setTimeout(() => { const e2 = elOf(gc.t); if (e2) indivisible(e2, gwhy); }, 400);
    if (idx === cur || gwhy) {
      // не сдвинули — аккуратно возвращаем на место
      const orig = d.termE.getBoundingClientRect();
      d.h.moveTo(orig.left + orig.width / 2, Math.max(50, orig.top - STRING - d.h.magnetH * 0.85 - d.h.size * 0.25), 380);
      await d.g.animate([
        { transform: d.g.style.transform }, { transform: 'translate(0, 0) rotate(0deg)' },
      ], { duration: T(380), easing: EASE }).finished.catch(() => {});
      d.g.remove();
      d.termE.classList.remove('lifted');
      if (d.opE) d.opE.classList.remove('lifted');
      await leaveHeli();
      return;
    }
    // слагаемое переезжает: FLIP стартует из того места, где оно висело на магните
    const first = snap();
    first.set(`t${d.t.id}`, (d.gTerm || d.g).getBoundingClientRect());
    if (d.gOp) first.set(`o${d.t.id}`, d.gOp.getBoundingClientRect());
    d.g.remove();
    st.terms.splice(cur, 1);
    st.terms.splice(idx, 0, d.t);
    render();
    flip(first, new Set(), 520);
    if (d.burn) igniteEls(d.burn.flatMap((x) => [elOf(x), opOf(x)]));
    const el = elOf(d.t);
    if (el) {
      const nr = el.getBoundingClientRect();
      d.h.moveTo(nr.left + nr.width / 2, Math.max(50, nr.top - STRING - d.h.magnetH * 0.85 - d.h.size * 0.25), 520);
      await sleep(540);
      burst(el, '#f97316', 8);
    }
    await leaveHeli();
    updateHint();
    checkFinish();
  }

  /* ============================================================
   * Кувалда: разбивает число в знаменателе на множители
   * ============================================================ */
  function hammerClick(e) {
    const termE = e.target.closest('.mx-term');
    if (!termE) return;
    const t = state.terms[idxOf(Number(termE.dataset.id))];
    if (t.kind === 'mixed') { indivisible(termE, 'сначала раздели вертолётом'); return; }
    if (t.kind !== 'frac') { indivisible(termE, 'кувалда бьёт по числам в дроби'); return; }
    const nE = e.target.closest('.mx-frac .mx-n');
    if (!nE) { indivisible(termE.querySelector('.mx-frac') || termE, 'ударь по числу в числителе или знаменателе'); return; }
    const isDen = !!nE.closest('.mx-denrow');
    const g = Number(nE.dataset.g || 0);
    const idx = Number(isDen ? nE.dataset.di : nE.dataset.fi);
    const list = isDen ? t.den : t.num[g].f;
    const v = list[idx];
    if (!(v > 3 && !isPrime(v))) { indivisible(nE, `${v} — неделимое`); return; }
    splitNum(t, isDen, g, idx, nE, MG.clip && MG.clip.isManual());
  }

  async function splitNum(t, isDen, g, idx, nE, manual) {
    const st = state;
    st.busy = true;
    let forced = 0;
    if (manual) {
      const r = await MG.clip.ask((isDen ? t.den : t.num[g].f)[idx], nE);
      if (!r || state !== st || st.finished) { st.busy = false; return; }
      forced = r[0];
    }
    await MG.smash(nE);
    st.busy = false;
    if (state !== st || st.finished) return;
    const list = isDen ? t.den : t.num[g].f;
    const v = list[idx];
    const p = forced || spf(v);
    const src = nE.getBoundingClientRect();
    const first = snap();
    ensureTags(t);
    const tg = isDen ? t.tD : t.tN;
    if (tg) tg.splice(idx, 1, tg[idx], tg[idx]);
    list.splice(idx, 1, p, v / p);
    render();
    flip(first);
    const flat = isDen ? idx : t.num.slice(0, g).reduce((n, x) => n + x.f.length, 0) + idx;
    const ns = elOf(t).querySelectorAll(isDen ? '.mx-denrow .mx-n' : '.mx-numrow .mx-n');
    MG.crumble(ns[flat + 1], ns[flat], src);
    updateHint();
  }

  /* ============================================================
   * Облако: недостающий множитель
   * ============================================================ */
  let cdrag = null;
  const fracTermsEls = () => state.terms.filter((t) => t.kind === 'frac').map((t) => ({ t, el: elOf(t) }));
  /* домножать можно любую другую дробь с посчитанным числителем: карта несёт ровно то число, которое выбрал игрок,
   * а нужно ли оно — игрок решает сам (неудачный выбор ничем не блокируется) */
  const validTarget = (v, src, tgt) => tgt !== src && tgt.num.length === 1;

  function cloudDown(e) {
    const nE = e.target.closest('.mx-denrow .mx-n');
    const termE = e.target.closest('.mx-term');
    if (!termE || e.button > 0) return;
    const t = state.terms[idxOf(Number(termE.dataset.id))];
    if (t.kind === 'mixed') { indivisible(termE, 'сначала раздели вертолётом'); return; }
    if (t.kind !== 'frac') { indivisible(termE, 'джокер работает со знаменателями дробей'); return; }
    if (!nE) { indivisible(termE.querySelector('.mx-denrow') || termE, 'нажми джокером на знаменатель'); return; }
    e.preventDefault();
    const g = ghost(nE);
    MG.joker.style(g);
    g.classList.add('dragging');
    g.style.zIndex = 60;
    g.style.transition = 'none';
    cdrag = { t, nE, g, sx: e.clientX, sy: e.clientY, moved: false, label: nE.textContent, v: Number(nE.textContent) };
    fracTermsEls().forEach(({ t: ft, el }) => {
      const f = el.querySelector('.mx-frac');
      if (ft === t) f.classList.add('src');
      else f.classList.add(validTarget(cdrag.v, t, ft) ? 'ok' : 'no');
    });
    window.addEventListener('pointermove', cloudMove);
    window.addEventListener('pointerup', cloudUp);
    window.addEventListener('pointercancel', cloudUp);
  }

  function fracAt(x, y) {
    for (const { t, el } of fracTermsEls()) {
      const r = el.getBoundingClientRect();
      if (x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 12 && y <= r.bottom + 12) return t;
    }
    return null;
  }

  function cloudMove(e) {
    if (!cdrag) return;
    const dx = e.clientX - cdrag.sx;
    const dy = e.clientY - cdrag.sy;
    if (Math.hypot(dx, dy) > 4) cdrag.moved = true;
    cdrag.g.style.transform = `translate(${dx}px, ${dy}px) scale(1.15)`;
    const over = fracAt(e.clientX, e.clientY);
    fracTermsEls().forEach(({ t, el }) => el.querySelector('.mx-frac').classList.toggle('over', t === over && validTarget(cdrag.v, cdrag.t, t)));
  }

  async function cloudUp(e) {
    if (e.type === 'pointerup' && cdrag && !cdrag.moved && !cdrag.sticky) { cdrag.sticky = true; cdrag.moved = true; MG.joker.armSticky((ev) => cloudUp(ev)); return; }   // клик: карта остаётся в руке
    window.removeEventListener('pointermove', cloudMove);
    window.removeEventListener('pointerup', cloudUp);
    window.removeEventListener('pointercancel', cloudUp);
    const d = cdrag;
    cdrag = null;
    if (!d) return;
    fracTermsEls().forEach(({ el }) => el.querySelector('.mx-frac').classList.remove('ok', 'no', 'src', 'over'));
    const target = e.type === 'pointerup' ? fracAt(e.clientX, e.clientY) : null;
    if (target && validTarget(d.v, d.t, target)) { applyCloud(d, target); return; }

    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(d.g.style.transform);
    const dx = m ? parseFloat(m[1]) : 0;
    const dy = m ? parseFloat(m[2]) : 0;
    d.g.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(1.15)` }, { transform: 'translate(0, 0) scale(1)' },
    ], { duration: T(320), easing: EASE }).onfinish = () => d.g.remove();
    if (!d.moved) indivisible(d.nE, 'положи карту на другую дробь');
    else if (target && target !== d.t) {
      const el = elOf(target);
      indivisible(el.querySelector('.mx-frac') || el, target.num.length > 1 ? 'сначала посчитай числитель' : 'в этой дроби уже есть такой знаменатель');
    }
  }

  /* ============================================================
   * Ластик: стирает любое число в дроби, сверху или снизу
   * ============================================================ */
  /* метки «это добавил джокер» — параллельно спискам множителей; после подсчёта молнией длина не сходится, и метки сбрасываются */
  function ensureTags(t) {
    if (!t.tD || t.tD.length !== t.den.length) t.tD = t.den.map(() => false);
    if (t.num.length === 1) { if (!t.tN || t.tN.length !== t.num[0].f.length) t.tN = t.num[0].f.map(() => false); } else t.tN = null;
  }

  /* ластик: выбери два одинаковых множителя — один сверху, другой снизу в одной дроби — и они сотрутся (как в сокращении дробей) */
  let gsel = [];
  function clearGsel() { gsel.forEach((x) => x.el.classList.remove('sel')); gsel = []; }
  window.addEventListener('toolchange', (e) => { if (e.detail.tool !== 'glove') clearGsel(); });

  function gloveClick(e) {
    const nE = e.target.closest('.mx-frac .mx-n');
    const termE = e.target.closest('.mx-term');
    if (!termE) return;
    const t = state.terms[idxOf(Number(termE.dataset.id))];
    if (t.kind === 'mixed') { indivisible(termE, 'сначала раздели вертолётом'); return; }
    if (t.kind !== 'frac' || !nE) { indivisible(termE, 'выбери ластиком два одинаковых множителя — сверху и снизу'); return; }
    const isDen = !!nE.closest('.mx-denrow');
    const g = Number(nE.dataset.g || 0);
    const idx = Number(isDen ? nE.dataset.di : nE.dataset.fi);
    const i = gsel.findIndex((x) => x.el === nE);
    if (i >= 0) { nE.classList.remove('sel'); gsel.splice(i, 1); return; }
    const v = Number(nE.textContent);
    nE.classList.add('sel');
    gsel.push({ el: nE, t, isDen, g, idx, v });
    if (gsel.length < 2) return;
    const [a, b] = gsel;
    clearGsel();
    if (a.t === b.t && a.isDen !== b.isDen && a.v === b.v && a.v > 1 && a.t.num.length === 1) { cancelPair(a, b); return; }
    [a.el, b.el].forEach((el) => shake(el));
    setHint('Эти множители сократить нельзя — ластик исчез на несколько секунд');
    setTimeout(() => { if (state) updateHint(); }, MG.PENALTY.hint);
    MG.tools.disable('glove', MG.PENALTY.tool);
  }

  async function cancelPair(a, b) {
    const st = state;
    st.busy = true;
    await Promise.all([MG.erase(a.el), MG.erase(b.el, 120)]);
    if (state !== st) return;
    const t = a.t;
    const first = snap();
    ensureTags(t);
    const den = a.isDen ? a : b;
    const num = a.isDen ? b : a;
    t.den.splice(den.idx, 1);
    t.tD.splice(den.idx, 1);
    t.num[0].f.splice(num.idx, 1);
    t.tN.splice(num.idx, 1);
    const fixes = [];
    if (!t.den.length) { t.den.push(1); t.tD.push(false); fixes.push('.mx-denrow'); }
    if (!t.num[0].f.length) { t.num[0].f.push(1); t.tN.push(false); fixes.push('.mx-numrow'); }
    render();
    flip(first, new Set());
    fixes.forEach((sel) => { const el = elOf(t).querySelector(`${sel} .mx-n`); if (el) popIn(el); });
    st.busy = false;
    updateHint();
  }

  async function applyCloud(d, Y) {
    const st = state;
    const k = d.v;
    ensureTags(Y);
    MG.joker.setValue(d.g, k);
    const first = snap();
    Y.num[0].f.push(k);
    Y.den.push(k);
    Y.tN.push(true);
    Y.tD.push(true);
    render();
    const yEl = elOf(Y);
    const nn = [...yEl.querySelectorAll('.mx-numrow .mx-n')].pop();
    const dn = [...yEl.querySelectorAll('.mx-denrow .mx-n')].pop();
    const dots = [nn.previousElementSibling, dn.previousElementSibling].filter(Boolean);
    [nn, dn, ...dots].forEach((x) => { x.style.opacity = '0'; });
    flip(first, new Set());
    st.busy = true;
    await MG.joker.lay(d.g, { frac: yEl.querySelector('.mx-frac'), targets: [nn, dn], value: k, color: colorOf(k) });
    dots.forEach((x) => { x.style.opacity = ''; });
    st.busy = false;
    await sleep(300);
    if (state === st) updateHint();
  }

  /* ============================================================
   * Поршни
   * ============================================================ */
  function pressClick(e) {
    const opE = e.target.closest('.mx-op');
    const termE = e.target.closest('.mx-term') || (opE && elOf(state.terms[idxOf(Number(opE.dataset.opid))]));
    if (!termE) return;
    const t = state.terms[idxOf(Number(termE.dataset.id))];
    if (t.kind !== 'frac') { indivisible(termE, t.kind === 'mixed' ? 'сначала раздели вертолётом' : 'поршни сжимают дроби'); return; }
    const T0 = state.terms;
    let l = idxOf(t.id);
    let r = l;
    while (l > 0 && T0[l - 1].kind === 'frac' && denVal(T0[l - 1]) === denVal(t)) l--;
    while (r < T0.length - 1 && T0[r + 1].kind === 'frac' && denVal(T0[r + 1]) === denVal(t)) r++;
    if (r === l) {
      const nb = [T0[l - 1], T0[l + 1]].find((x) => x && x.kind === 'frac');
      indivisible(termE, nb ? 'знаменатели ещё разные — выровняй их джокером' : 'рядом нет дроби — переставь слагаемые вертолётом');
      return;
    }
    mergeFracs(l, r);
  }

  async function mergeFracs(l, r) {
    const st = state;
    st.busy = true;
    const group = st.terms.slice(l, r + 1);
    const targets = [];
    group.forEach((t, k) => { targets.push(elOf(t)); if (k) targets.push(opOf(t)); });
    await MG.press(targets, {
      onPeak: () => {
        if (state !== st) return [];
        const first = group[0];
        const groups = first.num.map((g) => ({ s: g.s, f: [...g.f] }));
        group.slice(1).forEach((t) => t.num.forEach((g) => groups.push({ s: g.s * t.sign * first.sign, f: [...g.f] })));
        const merged = { id: ++uid, kind: 'frac', sign: first.sign, num: groups, den: [...first.den] };
        st.terms.splice(l, r - l + 1, merged);
        render();
        return [elOf(merged)];
      },
    });
    st.busy = false;
    if (state === st) { updateHint(); checkFinish(); }
  }

  /* ============================================================
   * Молния
   * ============================================================ */
  function boltClick(e) {
    const opE = e.target.closest('.mx-op');
    const termE = e.target.closest('.mx-term') || (opE && elOf(state.terms[idxOf(Number(opE.dataset.opid))]));
    if (!termE) return;
    const i = idxOf(Number(termE.dataset.id));
    const t = state.terms[i];
    if (t.kind === 'mixed') { indivisible(termE, 'сначала раздели вертолётом'); return; }
    if (t.kind === 'whole') {
      let l = i;
      let r = i;
      while (l > 0 && state.terms[l - 1].kind === 'whole') l--;
      while (r < state.terms.length - 1 && state.terms[r + 1].kind === 'whole') r++;
      if (r === l) { indivisible(termE, 'здесь считать нечего'); return; }
      zapWholes(l, r);
      return;
    }
    // дробь: что нужно посчитать
    const onDen = !!e.target.closest('.mx-denrow');
    const numNeeds = t.num.length > 1 || t.num.some((g) => g.f.length > 1);
    const denNeeds = t.den.length > 1;
    let part = onDen ? 'den' : 'num';
    if (part === 'num' && !numNeeds && denNeeds) part = 'den';
    else if (part === 'den' && !denNeeds && numNeeds) part = 'num';
    if ((part === 'num' && !numNeeds) || (part === 'den' && !denNeeds)) { indivisible(termE.querySelector('.mx-frac') || termE, 'здесь всё уже посчитано'); return; }
    zapFrac(t, part);
  }

  async function zapWholes(l, r) {
    const st = state;
    st.busy = true;
    const run = st.terms.slice(l, r + 1);
    const els = [];
    run.forEach((t, k) => { els.push(elOf(t)); if (k) els.push(opOf(t)); });
    await zap([els]);
    if (state !== st) return;
    const total = run.reduce((x, t) => x + t.sign * t.w, 0);
    const merged = mkWhole(Math.abs(total), total < 0 ? -1 : 1);
    st.terms.splice(l, r - l + 1, merged);
    render();
    const me = elOf(merged);
    popIn(me);
    burst(me, '#facc15', 12);
    await sleep(560);
    st.busy = false;
    if (state === st) { updateHint(); checkFinish(); }
  }

  async function zapFrac(t, part) {
    const st = state;
    st.busy = true;
    const fe = elOf(t);
    let stage;
    if (part === 'den') stage = 'den';
    else stage = t.num.some((g) => g.f.length > 1) ? 'products' : 'sum';

    let groups;
    if (stage === 'den') groups = [[...fe.querySelectorAll('.mx-denrow > *')]];
    else if (stage === 'sum') groups = [[...fe.querySelectorAll('.mx-numrow > *')]];
    else {
      groups = t.num.map((g, gi) => (g.f.length > 1 ? [...fe.querySelectorAll(`.mx-numrow > [data-g="${gi}"]`)].filter((x) => !x.classList.contains('mx-nop')) : null)).filter(Boolean);
    }
    await zap(groups);
    if (state !== st) return;

    if (stage === 'den') t.den = [prod(t.den)];
    else if (stage === 'sum') {
      let v = numVal(t);
      if (v < 0) { t.sign = -t.sign; v = -v; }        // минус уходит в знак слагаемого, а не в числитель: «− −1/3» — тупик
      t.num = [{ s: 1, f: [v] }];
    } else {
      t.num = t.num.map((g) => ({ s: g.s, f: [prod(g.f)] }));
    }
    render();
    const ne = elOf(t);
    const row = ne.querySelector(stage === 'den' ? '.mx-denrow' : '.mx-numrow');
    popIn(row);
    burst(row, '#facc15', 12);
    await sleep(560);
    st.busy = false;
    if (state === st) { updateHint(); checkFinish(); }
  }

  /* ============================================================
   * Конец задачи
   * ============================================================ */
  function checkFinish() {
    if (!state || state.finished || state.busy) return;
    const { spec } = state;
    const t = state.terms;
    if (t.length !== 1 || t[0].sign < 0) return;
    const x = t[0];
    const ok = (x.kind === 'mixed' && spec.rn && x.w === spec.rw && x.n === spec.rn && x.d === spec.rd)
      || (x.kind === 'whole' && !spec.rn && x.w === spec.rw);
    if (ok) finish();
  }

  async function finish() {
    const st = state;
    st.finished = true;
    clearBurn();
    setHint('');
    await sleep(250);
    if (state !== st) return;
    const e = elOf(st.terms[0]);
    e.classList.add('final');
    burst(e, '#16a34a', 16);
    const { w1, n1, d1, op, w2, n2, d2, rw, rn, rd } = st.spec;
    resultText.innerHTML = `${mixedHTML(w1, n1, d1)} ${op > 0 ? '+' : '−'} ${mixedHTML(w2, n2, d2)} = ${finalHTML(rw, rn, rd)}`;
    solved++;
    setStats(levelOf(solved), solved);
    after.classList.add('show');
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  /* ============================================================
   * События
   * ============================================================ */
  const tool = () => MG.tools.current();
  const free = () => state && !state.busy && !state.finished;

  expr.addEventListener('pointerdown', (e) => {
    if (!free()) return;
    if (tool() === 'heli') heliDown(e);
    else if (tool() === 'joker') cloudDown(e);
  });

  expr.addEventListener('click', (e) => {
    if (!free() || suppressClick) return;
    const tl = tool();
    if (tl === 'heli') heliClick(e);
    else if (tl === 'press') pressClick(e);
    else if (tl === 'bolt') boltClick(e);
    else if (tl === 'hammer') hammerClick(e);
    else if (tl === 'maw') treadClick(e);
    else if (tl === 'joker') { /* джокер работает перетаскиванием карты */ }
    else if (tl === 'glove') gloveClick(e);
  });

  nextBtn.addEventListener('click', newRound);

  /* уход из режима или новая задача: снять выбор, убрать вертолёт и указатель вставки */
  function stop() {
    clearSel();
    clearGsel();
    if (hs) { clearTimeout(hs.idle); hs.h.remove(); hs = null; }
    document.querySelectorAll('.heli-fx, .mx-caret').forEach((e) => e.remove());
  }

  MG.modes.mixed = {
    levelUp() { solved = (Math.floor(solved / 3) + 1) * 3; newRound(); },
    start() {
      if (!state) newRound();
      else { setStats(levelOf(solved), solved); updateHint(); }
    },
    skip: newRound,
    stop,
  };
})();

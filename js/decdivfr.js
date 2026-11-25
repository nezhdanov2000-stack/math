/* Режим «Деление через обыкновенные дроби» (decdivfr), остров III «Деление» раздела «Десятичные дроби».
 * Пример 0,3 : 0,4:
 * 1) Облако (rain) по каждому числу — как в «Десятичная → обыкновенная» (MG.decfr.embed): 0,3 → 3/10, 0,4 → 4/10;
 *    целое 3 → 3/1 (под ним вырастает единица). Дроби не сокращаем.
 * 2) Вентилятор (fan) переворачивает делитель (÷ → ×), мост (bridge) соединяет дроби — копия flip()/connect()
 *    из div.js («Деление дробей»), подогнанная под этот экран; дальше кувалда, ластик, молния (MG.fkit, fkit.js).
 * 3) Получилась n/d: d = 1 — топор (axe) срубает единицу, ответ целый; иначе — «дробь → десятичная» из frdec.js
 *    (MG.frdec.embed: джокер, молния, прожектор, ластик): 3/4 → 75/100 → 0,75.
 * 8 примеров в 4 стадии: по одному знаку, общий знаменатель → по одному знаку, разные → по два знака → целые и разное число знаков. */
(() => {
  'use strict';
  const MG = window.MG;
  const { $, T, sleep, ri, setStats, burst, gcd, popIn, indivisible } = MG;
  const snd = (n, o) => { if (MG.snd && MG.snd.play) MG.snd.play(n, o); };

  const view = $('#df-view');
  const after = $('#df-after');
  const resultText = $('#df-resultText');
  const nextBtn = $('#df-next');
  if (!view) return;
  const hint = MG.hinter($('#df-hint'));
  const NAME = 'decdivfr';
  const INK = '#1d1d1f';

  const css = document.createElement('style');
  css.textContent = `
    .df-ex { position: absolute; inset: 0; pointer-events: none; }
    .df-n { position: absolute; display: grid; place-items: center; font-weight: 900; color: ${INK}; line-height: 1; white-space: nowrap; pointer-events: auto; cursor: pointer; touch-action: manipulation; }
    .df-n.done { visibility: hidden; }
    .df-sign { position: absolute; display: grid; place-items: center; }
    .df-sign svg { width: 100%; height: 100%; display: block; overflow: visible; color: ${INK}; }
    .df-cloud { position: absolute; inset: 0; pointer-events: none; }
    .df-cloud * { pointer-events: none !important; }
    .df-pairwrap { position: absolute; left: 0; right: 0; display: flex; justify-content: center; }
    .df-pairwrap .mul-stage { font-size: var(--df-fs, 48px); }
    .df-pairwrap .mul-pair { cursor: pointer; }
    .df-dec { position: absolute; inset: 0; }
    .df-ans { position: absolute; left: 0; right: 0; text-align: center; font-weight: 900; color: #16a34a; line-height: 1; }
    .toolbar.df9 .tool span { display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @media (max-width: 420px) {
      .toolbar.df9 .tool { width: calc((100vw - 40px) / 9); }
      .toolbar.df9 .tool svg { width: 26px; height: 26px; }
      .toolbar.df9 .tool span { font-size: .44rem; display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    }
  `;
  document.head.append(css);

  /* ---------- примеры ---------- */
  const TOTAL = 8;
  let state = null, solved = 0, lastKey = '';
  const lvlOf = () => Math.min(4, 1 + Math.floor(solved / 2));
  const decs = (s) => (s.split(',')[1] || '').length;
  const toInt = (s) => Number(s.replace(',', ''));
  const fmt = (v, d) => { if (!d) return String(v); const s = String(v).padStart(d + 1, '0'); return `${s.slice(0, -d)},${s.slice(-d)}`; };
  const only25 = (n) => { while (n % 2 === 0) n /= 2; while (n % 5 === 0) n /= 5; return n === 1; };
  function make(a, b) {
    const X = toInt(a), p = decs(a), Y = toInt(b), q = decs(b);
    const N = X * 10 ** q, D = 10 ** p * Y, g = gcd(N, D);
    return { a, b, X, p, Y, q, rn: N / g, rd: D / g };
  }
  const ok = (t) => t.X > 0 && t.Y > 0 && only25(t.rd) && t.rd <= 1000 && `${t.a}:${t.b}` !== lastKey && t.a !== t.b;
  const FIRST = [['0,3', '0,4'], ['0,6', '0,2'], ['0,6', '1,5'], ['0,9', '0,6'], ['0,15', '0,6'], ['1,2', '0,08'], ['3', '0,25'], ['2,4', '0,06']];
  let firstRun = true;
  function pick() {
    if (firstRun && FIRST[solved]) return make(...FIRST[solved]);
    const L = lvlOf(), second = solved % 2 === 1;
    for (let i = 0; i < 500; i++) {
      let a, b;
      if (L === 1) { a = fmt(ri(1, 9), 1); b = fmt(ri(1, 9), 1); }
      else if (L === 2) { a = fmt(ri(2, 49), 1); b = fmt(ri(2, 49), 1); if (toInt(a) < 10 && toInt(b) < 10) continue; if (toInt(a) % 10 === 0 || toInt(b) % 10 === 0) continue; }
      else if (L === 3) { const two = ri(0, 1); a = two ? fmt(ri(2, 99), 2) : fmt(ri(2, 49), 1); b = two ? fmt(ri(2, 9), 1) : fmt(ri(2, 99), 2); if (a.endsWith('0') || b.endsWith('0')) continue; }
      else if (!second) { a = String(ri(2, 9)); b = fmt(ri(2, 99), 2); if (b.endsWith('0')) continue; }
      else { a = fmt(ri(2, 49), 1); b = fmt(ri(2, 99), 2); if (a.endsWith('0') || b.endsWith('0')) continue; }
      const t = make(a, b);
      if (ok(t)) return t;
    }
    return make('0,3', '0,4');
  }

  /* ---------- раскладка ---------- */
  const mk = (tag, cls, txt, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; if (parent) parent.append(e); return e; };
  const SIGN = '<svg viewBox="-20 -20 40 40" aria-hidden="true"><path d="M-24 0 H24" stroke="currentColor" stroke-width="9" fill="none"/>'
    + '<circle cx="0" cy="-24" r="4.5" fill="currentColor"/><circle cx="0" cy="24" r="4.5" fill="currentColor"/></svg>';
  const CROSS = '<svg viewBox="-20 -20 40 40" aria-hidden="true"><path d="M-17 17 L17 -17 M17 17 L-17 -17" stroke="currentColor" stroke-width="9" fill="none"/></svg>';
  /* ширина в клетках: «0,3» → дробь 3/10 займёт max(цифр, знаков после запятой + 1) */
  const cellsOf = (s) => Math.max(s.replace(',', '').length, decs(s) + 1) + 0.6;
  function geom(st) {
    const vw = Math.max(260, view.clientWidth), vh = Math.max(380, view.clientHeight);
    const t = st.task, wa = cellsOf(t.a), wb = cellsOf(t.b), ws = 1.4;
    const cw = Math.max(18, Math.floor(Math.min(52, (vw - 24) / (wa + wb + ws))));
    const rh = Math.round(cw * 1.3), fs = cw * 0.88;
    const top = Math.round(Math.max(vh * 0.36, 130));                  // верх строки чисел; над ней — место для тучи
    const x0 = (vw - (wa + wb + ws) * cw) / 2;
    return { vw, vh, cw, rh, fs, top, ax: x0 + wa * cw / 2, sx: x0 + (wa + ws / 2) * cw, bx: x0 + (wa + ws + wb / 2) * cw };
  }
  function layout(st) {
    if (!st) return;
    const r = (st.decView ? st.decView.querySelector('.fd-row') : null) || st.pairWrap || st.ex;
    if (!r) return;
    const rr = r.getBoundingClientRect(), vr = view.getBoundingClientRect();
    view.parentElement.style.setProperty('--fd-after', `${view.offsetTop + (rr.bottom - vr.top) + 30}px`);
  }

  function newRound() {
    window.dispatchEvent(new Event('mg:round'));
    cleanup(state);
    const task = pick();
    lastKey = `${task.a}:${task.b}`;
    after.classList.remove('show');
    view.replaceChildren();
    if (MG.tools.current()) MG.tools.clear();
    const st = { task, phase: 'cloud', busy: false, done: false, conv: { a: null, b: null } };
    state = st;
    const G = st.G = geom(st);
    st.ex = mk('div', 'df-ex', undefined, view);
    const num = (s, x, k) => {
      const e = mk('div', 'df-n', s, st.ex);
      Object.assign(e.style, { left: `${x - G.cw * 2}px`, width: `${G.cw * 4}px`, top: `${G.top}px`, height: `${G.rh}px`, fontSize: `${G.fs}px` });
      e.addEventListener('click', () => onNum(st, k));
      return e;
    };
    st.aEl = num(task.a, G.ax, 'a');
    st.bEl = num(task.b, G.bx, 'b');
    st.sign = mk('div', 'df-sign', undefined, st.ex);
    st.sign.innerHTML = SIGN;
    const sz = G.fs * 0.42;
    Object.assign(st.sign.style, { left: `${G.sx - sz / 2}px`, top: `${G.top + G.rh / 2 - sz / 2}px`, width: `${sz}px`, height: `${sz}px` });
    [st.aEl, st.sign, st.bEl].forEach((e, i) => e.animate([{ opacity: 0, translate: '0 12px' }, { opacity: 1, translate: '0 0' }], { duration: T(350), delay: T(i * 60), easing: 'ease-out', fill: 'backwards' }));
    layout(st);
    setStats(lvlOf(), solved);
    hint.set('Возьми облако и полей каждое число — десятичные дроби станут обыкновенными');
  }
  function cleanup(st) {
    if (!st) return;
    if (st.kit) st.kit.destroy();
    ['ca', 'cb'].forEach((k) => { if (st[k]) st[k].stop(); });
    if (st.fd) st.fd.stop();
  }

  let sayT = 0;
  function bubble(text, ms = 2600) {
    view.querySelectorAll(':scope > .dc-say').forEach((e) => e.remove());
    clearTimeout(sayT);
    const st = state;
    const b = mk('div', 'dc-say', text, view);
    const el = st && (st.pairWrap || st.ex);
    let y = el ? el.getBoundingClientRect().bottom - view.getBoundingClientRect().top + 16 : 200;
    if (st && st.phase === 'cloud' && st.G) y = st.G.top + st.G.rh * 2.6;
    b.style.left = `${view.clientWidth / 2}px`; b.style.top = `${y}px`;
    sayT = setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 320); }, T(ms));
  }
  const quiet = () => view.querySelectorAll(':scope > .dc-say').forEach((e) => e.classList.add('out'));

  /* ---------- 1. облако: десятичная → обыкновенная (decfr.js) ---------- */
  async function onNum(st, k) {
    if (st !== state || st.phase !== 'cloud' || st.busy || st.conv[k]) return;
    if (MG.tools.current() !== 'rain') { if (MG.tools.need) MG.tools.need('rain'); return; }
    st.busy = true; quiet();
    const G = st.G, el = k === 'a' ? st.aEl : st.bEl;
    const world = mk('div', 'bf-world df-cloud', undefined, view);
    const c = MG.decfr.embed({ view, world, cw: G.cw, cx: () => (k === 'a' ? G.ax : G.bx), numTop: () => G.top, hint: { set: (t) => hint.set(t) } });
    st[k === 'a' ? 'ca' : 'cb'] = c;
    el.classList.add('done');
    const res = await c.run(k === 'a' ? st.task.a : st.task.b);
    if (state !== st) return;
    st.conv[k] = res;
    st.cg = c.geom();
    st.busy = false;
    if (!st.conv.a || !st.conv.b) {
      hint.set(`Теперь полей облаком ${k === 'a' ? `делитель ${st.task.b}` : `делимое ${st.task.a}`}`);
      return;
    }
    await sleep(400);
    if (state !== st) return;
    toPair(st);
  }

  /* ---------- 2. пара дробей: вентилятор и мост (как в div.js), потом множители (fkit.js) ---------- */
  function toPair(st) {
    const G = st.G, cg = st.cg;
    const { a: A, b: B } = st.conv;
    const wrap = mk('div', 'df-pairwrap', undefined, view);
    st.pairWrap = wrap;
    /* шрифт пары — чтобы потом, когда всё разложено на множители, дробь влезла в ширину (оценка как в div.js) */
    const est = (x) => { const f = MG.factorize(x); return f.length ? f.reduce((w, p) => w + 0.62 * String(p).length + 0.46, 0) + 0.95 * (f.length - 1) : 1; };
    const em = Math.max(est(A.num * B.den), est(A.den * B.num), 3);
    view.style.setProperty('--df-fs', `${Math.round(Math.max(22, Math.min(G.fs, (G.vw - 24) / em)))}px`);
    wrap.innerHTML = `<div class="mul-stage"><div class="mul-pair">
        <div class="mulf"><div class="row rn"></div><div class="bar"></div><div class="row rd"></div></div>
        <div class="mul-dot"></div>
        <div class="mulf"><div class="row rn"></div><div class="bar"></div><div class="row rd"></div></div>
      </div><div class="fraction nodots hidden"><div class="row"></div><div class="bar"></div><div class="row"></div></div></div>`;
    st.stage = wrap.querySelector('.mul-stage');
    st.pairEl = wrap.querySelector('.mul-pair');
    st.dotEl = wrap.querySelector('.mul-dot');
    st.dotEl.innerHTML = SIGN;
    st.fracEl = wrap.querySelector('.fraction');
    const [rn, rb, rd] = st.fracEl.children;
    st.rows = { num: rn, den: rd }; st.bar = rb;
    st.A = [...st.pairEl.querySelectorAll('.mulf')].map((f, i) => {
      const num = f.querySelector('.rn'), den = f.querySelector('.rd');
      const t = (v) => { const e = document.createElement('div'); e.className = 'token lead'; e.textContent = v; return e; };
      const nel = t(i ? B.num : A.num), del = t(i ? B.den : A.den);
      num.append(nel); den.append(del);
      return { num, den, nel, del, bar: f.querySelector('.bar') };
    });
    st.kit = MG.fkit.make({
      frac: st.fracEl, rows: st.rows, bar: st.bar, num: [A.num, B.den], den: [A.den, B.num],
      live: () => state === st && !st.done && st.phase === 'factor',
      bubble: (t) => bubble(t, 2400),
      onChange: () => factorHint(st),
      onDone: () => reducedDone(st),
      onTool: (tl, tok) => { if (tl === 'axe') { axeClick(st, tok); return true; } if (canAxe(st)) { if (MG.tools.need) MG.tools.need('axe'); return true; } return false; },
    });
    st.A.forEach((f) => { const w = Math.max(f.num.offsetWidth, f.den.offsetWidth) + G.fs * 0.5; f.bar.style.width = `${w}px`; });
    /* пара встаёт так, чтобы её черта была там же, где черты дробей после облака */
    const vr = view.getBoundingClientRect();
    wrap.style.top = '0px';
    const b0 = st.A[0].bar.getBoundingClientRect();
    wrap.style.top = `${cg.barY + cg.bt / 2 - (b0.top + b0.height / 2 - vr.top)}px`;
    ['ca', 'cb'].forEach((k) => { st[k].stop(); st[k] = null; });
    view.querySelectorAll('.df-cloud').forEach((w) => w.remove());
    st.ex.remove(); st.ex = null;
    st.stage.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: T(250) });
    st.pairEl.addEventListener('click', (e) => onPair(st, e));
    st.phase = 'fan';
    layout(st);
    hint.set('Возьми вентилятор и нажми на делитель: деление станет умножением, делитель перевернётся');
    bubble('Обе дроби готовы. Теперь вентилятор — на делитель', 2600);
  }
  function onPair(st, e) {
    if (st !== state || st.busy || st.done) return;
    if (st.phase === 'fan') {
      if (!MG.tools.need('fan')) return;
      const onDivisor = e.target.closest('.mul-dot') || e.target.closest('.mulf') === st.pairEl.children[2];
      if (onDivisor) flip(st); else bubble('Нажми вентилятором на делитель — правую дробь', 2200);
      return;
    }
    if (st.phase === 'bridge') { if (!MG.tools.need('bridge')) return; connect(st); }
  }

  /* копия flip() из div.js: вентилятор снизу, знак ÷ и делитель переворачиваются: ÷ → ×, 4/10 → 10/4 */
  async function flip(st) {
    st.busy = true;
    const fs = parseFloat(getComputedStyle(st.stage).fontSize);
    const R = (el) => el.getBoundingClientRect();
    const f2 = st.A[1];
    const sg = R(st.dotEl);
    const r2 = R(st.pairEl.children[2]);
    const size = fs * 1.5;
    const bottom = Math.max(R(f2.den).bottom, sg.bottom);
    const fx = MG.fan.start({ x: (sg.left + r2.right) / 2, y: bottom + size * 0.62, fs, top: R(f2.nel).top });
    await sleep(700);
    if (state !== st) { fx.stop(); return; }
    const D = T(2000), H = D / 2;
    const parts = [st.dotEl, st.pairEl.children[2]];
    const P = (deg) => `perspective(${Math.round(fs * 11)}px) rotateX(${deg}deg)`;
    const half = (el, from, to, easing) => el.animate([{ transform: P(from) }, { transform: P(to) }], { duration: H, easing, fill: 'forwards' });
    const unflip = () => parts.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    parts.forEach((el) => half(el, 0, 90, 'ease-in'));
    await sleep(H);
    if (state !== st) { unflip(); fx.stop(); return; }
    const tn = f2.nel.textContent;
    f2.nel.textContent = f2.del.textContent;
    f2.del.textContent = tn;
    st.dotEl.innerHTML = CROSS;
    unflip();
    parts.forEach((el) => half(el, -90, 0, 'ease-out'));
    await sleep(H);
    unflip();
    if (state !== st) { fx.stop(); return; }
    await fx.stop();
    if (state !== st) return;
    st.phase = 'bridge'; st.busy = false;
    hint.set('Возьми мост и соедини дроби в одну');
  }

  /* копия connect() из div.js: мост соединяет две дроби в одну (3·10)/(10·4) */
  async function connect(st) {
    st.busy = true;
    const fs = parseFloat(getComputedStyle(st.stage).fontSize);
    const R = (el) => el.getBoundingClientRect();
    const [f1, f2] = st.A;
    const b1 = R(f1.bar), b2 = R(f2.bar), dr = R(st.dotEl);
    const sides = st.kit.sides;
    const mid = (side) => {
      const t = sides[side].toks.map((x) => R(x.el));
      const rr = R(st.rows[side]);
      return { x: (t[0].right + t[1].left) / 2, y: rr.top + rr.height / 2 };
    };
    const bb = R(st.bar);
    const from = new Map();
    sides.num.toks.forEach((t, i) => from.set(t.el, R(st.A[i].nel)));
    sides.den.toks.forEach((t, i) => from.set(t.el, R(st.A[i].del)));
    const to = new Map([...from.keys()].map((el) => [el, R(el)]));
    const fy = bb.top + bb.height / 2;
    const hh = (Math.abs(mid('num').y - fy) + Math.abs(mid('den').y - fy)) / 2;
    st.dotEl.style.opacity = '0';
    st.bar.classList.add('instant');
    const barW = st.bar.style.width;
    st.bar.style.width = `${b2.right - b1.left}px`;
    await MG.bridge.play({
      fs,
      dot: { x: dr.left + dr.width / 2, y: dr.top + dr.height / 2 },
      left: b1.right, right: b2.left,
      barY: b1.top + b1.height / 2, barH: b1.height,
      final: { left: b1.right - 1, top: b1.top, width: b2.left - b1.right + 2, height: b1.height },
      area: { left: b1.left - fs * 0.1, right: b2.right + fs * 0.1, top: R(f1.num).top, bottom: R(f1.den).bottom },
      sun: { x: mid('num').x, y: fy - hh }, ref: { x: mid('den').x, y: fy + hh },
      onSwap() {
        if (state !== st) return;
        st.pairEl.querySelectorAll('.token').forEach((t) => { t.style.visibility = 'hidden'; });
        st.fracEl.classList.remove('hidden');
        st.bar.style.opacity = '0';
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
        st.bar.style.opacity = '';
        st.bar.classList.remove('instant');
        st.bar.style.width = barW;
        st.fracEl.classList.remove('nodots');
        st.pairEl.style.display = 'none';
      },
    });
    if (state !== st) return;
    st.phase = 'factor'; st.busy = false;
    layout(st);
    factorHint(st);
    st.kit.check();
  }
  const canAxe = (st) => st.phase === 'factor' && st.kit && st.kit.tool() === null && st.kit.prod('den') === 1;
  function factorHint(st) {
    if (st.phase !== 'factor' || st.done) return;
    hint.set(canAxe(st) ? 'В знаменателе 1 — сруби её топором: ответ целый' : st.kit.hint());
  }
  /* сократили: знаменатель 1 — нужен топор; иначе дробь → десятичная (frdec.js) */
  function reducedDone(st) {
    if (state !== st || st.done) return;
    if (st.kit.prod('den') === 1) { factorHint(st); bubble('В знаменателе 1 — сруби её топором', 2400); return; }
    toDecimal(st);
  }
  async function axeClick(st, tok) {
    if (!canAxe(st)) { indivisible(tok.el, !st.kit.reduced() ? 'сначала сократи дробь' : 'топор рубит единицу в знаменателе, когда сокращать больше нечего'); return; }
    if (tok.side !== 'den') { indivisible(tok.el, 'руби единицу в знаменателе'); return; }
    if (st.chopping) return;
    st.chopping = true;
    await MG.axe.chop({ one: st.kit.sides.den.toks[0].el, num: st.rows.num, bar: st.bar });
    if (state !== st) return;
    const ans = String(st.kit.prod('num'));
    const vr = view.getBoundingClientRect(), fr = st.fracEl.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(st.fracEl).fontSize) || 48;
    st.fracEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(300), fill: 'forwards' });
    await sleep(300);
    if (state !== st) return;
    const out = mk('div', 'df-ans', ans, view);
    out.style.fontSize = `${Math.round(fs * 1.15)}px`;
    out.style.top = `${fr.top - vr.top + fr.height / 2 - fs * 0.6}px`;
    out.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: T(480), easing: 'ease-out' });
    st.pairWrap = out;
    finish(st, ans, out);
  }

  /* ---------- 3. дробь → десятичная (frdec.js: джокер, молния, прожектор, ластик) ---------- */
  async function toDecimal(st) {
    st.phase = 'dec';
    const n = st.kit.prod('num'), d = st.kit.prod('den');
    st.pairWrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(300), fill: 'forwards' });
    await sleep(320);
    if (state !== st) return;
    st.pairWrap.style.display = 'none';
    st.decView = mk('div', 'fd-view df-dec', undefined, view);
    st.fd = MG.frdec.embed({
      view: st.decView,
      active: () => MG.active === MG.modes[NAME] && state === st && st.phase === 'dec',
      hint: { set: (t) => hint.set(t) },
      onLayout: () => layout(st),
    });
    bubble(`Сократили: ${n}/${d}. Переведём в десятичную — возьми джокера`, 2800);
    const dec = await st.fd.run(n, d);
    if (state !== st) return;
    finish(st, dec, null);
  }

  function finish(st, ans, el) {
    st.done = true; st.busy = true; st.phase = 'done';
    snd('pop');
    if (el) burst(el, '#16a34a', 14);
    solved++;
    if (solved >= TOTAL) firstRun = false;
    setStats(lvlOf(), solved);
    resultText.textContent = `${st.task.a} : ${st.task.b} = ${ans}`;
    layout(st);
    after.classList.add('show');
    if (solved >= TOTAL) setTimeout(offerDone, T(1200));
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  function offerDone() {
    if (document.querySelector('.so-ov')) return;
    const ov = document.createElement('div');
    ov.className = 'so-ov';
    ov.innerHTML = '<div class="skip-offer" role="dialog"><h3>Уровень пройден!</h3><p>Ты научился делить десятичные дроби через обыкновенные. Идём дальше.</p><div class="so-row"><button type="button" class="so-go">На карту</button></div></div>';
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
    if (e.detail.tool === 'rain' && state.phase === 'cloud' && !state.busy) bubble('Нажми облаком на число', 2000);
  });
  const toolbarClass = (on) => { const tb = document.querySelector('.toolbar'); if (tb) tb.classList.toggle('df9', on); };

  MG.modes[NAME] = {
    total: TOTAL,
    levelUp() { solved = Math.min(TOTAL, (Math.floor(solved / 2) + 1) * 2); if (solved >= TOTAL) { setStats(lvlOf(), solved); offerDone(); return; } newRound(); },
    start() {
      toolbarClass(true);
      if (MG.tools.current()) MG.tools.clear();
      if (!state || state.done || state.busy) newRound(); else { setStats(lvlOf(), solved); layout(state); }
    },
    skip() { if (solved >= TOTAL) { offerDone(); return; } newRound(); },
    stop() { toolbarClass(false); cleanup(state); state = null; },
    /* подсказка-палец (coach.js): облако → вентилятор → мост → кувалда, ластик, молния → топор или джокер, молния, прожектор */
    coachStep() {
      const st = state;
      if (!st || st.done) return null;
      if (st.phase === 'cloud') {
        if (st.busy) return null;
        const k = !st.conv.a ? 'a' : 'b';
        return { tool: 'rain', el: k === 'a' ? st.aEl : st.bEl, text: `Полей облаком ${k === 'a' ? st.task.a : st.task.b}` };
      }
      if (st.phase === 'fan') return st.busy ? null : { tool: 'fan', el: st.pairEl.children[2], text: 'Нажми вентилятором на делитель' };
      if (st.phase === 'bridge') return st.busy ? null : { tool: 'bridge', el: st.pairEl, text: 'Соедини дроби мостом' };
      if (st.phase === 'factor') {
        if (canAxe(st)) return st.chopping ? null : { tool: 'axe', el: st.kit.sides.den.toks[0].el, text: 'Сруби топором единицу' };
        return st.kit.coach();
      }
      if (st.phase === 'dec' && st.fd) return st.fd.coachStep();
      return null;
    },
    _state: () => state,
  };
})();

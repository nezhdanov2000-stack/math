/* Режим «Сокращение дробей → Скобки»: 3x/2 − (x+1).
 * Коробка накрывает слагаемые (получаются скобки), джокер приводит дробь к общему знаменателю,
 * поршни склеивают дроби, коробка открывается — слагаемые вылетают, а минус перед скобкой меняет им знаки
 * (отрицательные горят), молния приводит подобные.
 */
(() => {
  'use strict';

  const MG = window.MG;
  const { $, T, sleep, ri, setStats, burst, popIn, bump, shake } = MG;

  const stage = $('#br-stage');
  const eqn = $('#br-eqn');
  const hint = $('#br-hint');
  const after = $('#br-after');
  const resultText = $('#br-resultText');
  const nextBtn = $('#br-next');

  let st = null;
  let solved = 0;
  let lastKey = '';
  let uid = 0;
  const levelOf = (s) => Math.min(6, 1 + Math.floor(s / 3));
  const MINUS = '−';
  const mk = (tag, cls, txt) => { const d = document.createElement(tag); d.className = cls; if (txt != null) d.textContent = txt; return d; };
  const fontPx = () => parseFloat(getComputedStyle(stage).fontSize) || 64;

  const css = document.createElement('style');
  css.textContent = `
    #mode-br .br-stage { font-size: 64px; font-weight: 900; max-width: 100%; display: flex; justify-content: center; user-select: none; }
    .br-eqn { display: flex; align-items: center; justify-content: center; gap: .22em; min-height: 3.6em; }
    .br-fr { display: inline-flex; flex-direction: column; align-items: center; position: relative; border-radius: 12px; }
    .br-row { display: flex; align-items: center; justify-content: center; padding: 0 .08em; min-height: 1.15em; }
    .br-bar { align-self: stretch; height: .085em; margin: .04em 0; border-radius: 9px; background: currentColor; }
    .br-raw { display: flex; align-items: center; }
    .br-t { display: inline-flex; align-items: center; position: relative; padding: .06em .04em; line-height: 1.1; transition: color .25s; touch-action: none; }
    .br-t .vx { font-style: italic; }
    .br-op { display: inline-block; padding: 0 .26em; position: relative; line-height: 1.1; }
    .br-op.big { padding: 0 .12em; }
    .br-op.hid { display: none; }
    .br-t.neg, .br-op.neg { color: #dc2626; }
    .br-tok { padding: 0 .12em; line-height: 1.1; touch-action: none; }
    .br-par { display: inline-flex; align-items: center; }
    .br-k { padding-right: .03em; }
    .br-p { display: inline-block; font-weight: 600; transform: scaleY(1.18); padding: 0 .02em; }
    .br-box { position: fixed; z-index: 58; pointer-events: none; filter: drop-shadow(0 8px 8px rgba(80,50,20,.25)); }
    .br-packrow { display: flex; justify-content: center; margin-top: 8px; min-height: 96px; }
    .br-pack { display: inline-flex; align-items: center; gap: 14px; padding: 10px 26px 10px 18px; font: 900 22px/1 Nunito, sans-serif; letter-spacing: .04em; color: #5b3a1a;
      background: #efd3ad; border: 5px solid #1f1f1f; border-radius: 6px; cursor: pointer; opacity: 0; pointer-events: none; transform: translateY(10px) scale(.96);
      transition: opacity .22s, transform .22s cubic-bezier(.3,1.5,.5,1), background .15s; }
    .br-pack svg { width: 46px; height: 46px; }
    .br-pack.show { opacity: 1; pointer-events: auto; transform: none; }
    .br-pack.show:hover { background: #f5debb; transform: translateY(-2px); }
    .br-pack.show:active { transform: translateY(1px) scale(.98); }
    .br-sel { filter: none !important; }
    #mode-br .hint { min-height: 4.6em; }
    #mode-br .br-stage { position: relative; z-index: 1; }
    .br-box.br-cont { z-index: 0; filter: drop-shadow(0 8px 10px rgba(60,30,10,.28)); }
    .br-x { padding: 0 .1em; font-weight: 900; font-size: .7em; }
    .br-rain { position: fixed; inset: 0; pointer-events: none; z-index: 70; }
    .br-rain > * { position: absolute; }
    .br-rain .drop { width: 5px; border-radius: 4px; background: linear-gradient(180deg, rgba(129,140,248,0), #6366f1 55%, #4f46e5); opacity: 0; }
    .br-rg { position: fixed; z-index: 61; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #2563eb; pointer-events: none; }
    body[data-tool="rain"] #mode-br .br-fr, body[data-tool="rain"] #mode-br .br-par, body[data-tool="rain"] #mode-br .br-par * { cursor: var(--cur-rain, pointer) !important; }
    body[data-tool="hammer"] #mode-br .br-tok, body[data-tool="hammer"] #mode-br .br-t { cursor: var(--cur-hammer, pointer) !important; }
    body[data-tool="glove"] #mode-br .br-tok, body[data-tool="glove"] #mode-br .br-k { cursor: var(--cur-glove, pointer) !important; }
    body[data-tool="rocket"] #mode-br .br-t, body[data-tool="rocket"] #mode-br .br-row { cursor: var(--cur-rocket, pointer) !important; }
    .br-fr.over { outline: 4px dashed var(--accent, #f97316); outline-offset: 8px; background: rgba(249,115,22,.08); }
    body[data-tool="box"] #mode-br .br-t, body[data-tool="box"] #mode-br .br-par, body[data-tool="box"] #mode-br .br-par * { cursor: var(--cur-box, grab) !important; }
    body[data-tool="bolt"] #mode-br .br-t, body[data-tool="bolt"] #mode-br .br-op { cursor: var(--cur-bolt, pointer) !important; }
    body[data-tool="press"] #mode-br .br-fr, body[data-tool="press"] #mode-br .br-fr *, body[data-tool="press"] #mode-br .br-op { cursor: var(--cur-press, pointer) !important; }
  `;
  document.head.append(css);

  /* ---------- огонь для отрицательных (из режима смешанных чисел) ---------- */
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

  /* ---------- генерация: a·x/b − (c·x + d) ---------- */
  function pick() {
    if (solved === 0 && lastKey === '') return { a: 3, b: 2, c: 1, d: 1, dsign: 1, sgn: -1, order: 'xn' };   // как на эскизе
    for (let i = 0; i < 2000; i++) {
      const b = ri(2, 4), c = ri(1, 3), d = ri(1, 7);
      let a = ri(1, 6);
      if (solved >= 3 && Math.random() < 0.55) {            // в ответе будет что сокращать: числитель и знаменатель делятся на g
        const gs = [2, 3, 4].filter((g) => b % g === 0);
        a = gs[ri(0, gs.length - 1)] * ri(1, 3);
      }
      const sgn = solved >= 2 && Math.random() < 0.3 ? 1 : -1;
      const dsign = solved >= 3 && Math.random() < 0.35 ? -1 : 1;
      const order = Math.random() < 0.7 ? 'xn' : 'nx';
      if (sgn < 0 && a === b * c) continue;
      const key = `${a}.${b}.${c}.${d}.${sgn}.${dsign}`;
      if (key === lastKey) continue;
      return { a, b, c, d, dsign, sgn, order };
    }
    return { a: 5, b: 3, c: 2, d: 4, dsign: 1, sgn: -1, order: 'xn' };
  }

  /* ---------- модель ---------- */
  function mkTerm(kind, v) {
    const el = mk('div', 'br-t');
    const op = mk('div', 'br-op');
    const t = { id: ++uid, kind, v, el, op };
    op._t = t; el._t = t;
    el.addEventListener('click', (e) => onRawClick(t, e));
    return t;
  }
  function mkPar(terms, sgn) {
    const p = { type: 'par', k: null, terms, sgn, el: mk('div', 'br-par'), op: mk('div', 'br-op'), kEl: mk('span', 'br-k'), lp: mk('span', 'br-p', '('), rp: mk('span', 'br-p', ')') };
    p.op._t = p; p.el._par = p;
    return p;
  }
  function mkFrac(num, denV) {
    const F = { num, den: { v: denV, el: mk('div', 'br-tok') }, el: mk('div', 'fr br-fr'), numRow: mk('div', 'br-row'), bar: mk('div', 'br-bar'), denRow: mk('div', 'br-row') };
    F.den.el.addEventListener('pointerdown', (e) => onDenDown(F, e));
    F.den.el._den = true; F.den.parts = null;
    return F;
  }
  const isPar = (n) => n.type === 'par';
  const termsOf = () => st.F1.num.filter((n) => !isPar(n));

  const bodyHTML = (t) => {
    const a = Math.abs(t.v);
    return t.kind === 'x' ? `<span class="co">${a === 1 ? '' : a}</span><span class="vx">x</span>` : String(a);
  };
  function paintTerm(t, first) {
    const neg = t.v < 0;
    t.el.innerHTML = `${first && neg ? `<span class="un">${MINUS}</span>` : ''}${bodyHTML(t)}`;
    t.el.classList.toggle('neg', neg);
    t.op.textContent = neg ? MINUS : '+';
    t.op.classList.toggle('neg', neg);
    t.op.classList.toggle('hid', first);
    t.el.classList.remove('mx-burn'); t.op.classList.remove('mx-burn');
    t.el.querySelectorAll('.mx-ember').forEach((e) => e.remove());
    if (neg) { ignite(t.el); if (!first) ignite(t.op); }
  }
  function paintNode(n, first) {
    if (!isPar(n)) { paintTerm(n, first); return; }
    n.op.textContent = n.sgn < 0 ? MINUS : '+';
    n.op.classList.toggle('neg', n.sgn < 0);
    n.op.classList.toggle('hid', first);
    n.el.replaceChildren();
    if (n.k) { n.kEl.textContent = n.k; n.el.append(n.kEl); }
    n.el.append(n.lp);
    n.terms.forEach((t, i) => { paintTerm(t, i === 0); if (i) n.el.append(t.op); n.el.append(t.el); });
    n.el.append(n.rp);
  }
  function renderFrac(F) {
    F.numRow.replaceChildren();
    F.num.forEach((n, i) => { paintNode(n, i === 0); if (i) F.numRow.append(n.op); F.numRow.append(n.el); });
    F.denRow.replaceChildren();
    if (F.den.parts) {
      F.den.parts.forEach((pt, i) => { if (i) F.denRow.append(mk('span', 'br-x', '×')); pt.el.textContent = pt.v; F.denRow.append(pt.el); });
    } else {
      F.den.el.textContent = F.den.v;
      F.denRow.append(F.den.el);
    }
    if (F.noden) F.el.replaceChildren(F.numRow); else F.el.replaceChildren(F.numRow, F.bar, F.denRow);
  }
  function render() {
    eqn.replaceChildren();
    renderFrac(st.F1);
    eqn.append(st.F1.el);
    if (st.merged) return;
    st.opS.textContent = st.sgn < 0 ? MINUS : '+';
    eqn.append(st.opS);
    if (st.F2) { renderFrac(st.F2); eqn.append(st.F2.el); return; }
    st.rawEl.replaceChildren();
    st.raw.forEach((t, i) => { paintTerm(t, i === 0); if (i) st.rawEl.append(t.op); st.rawEl.append(t.el); });
    eqn.append(st.rawEl);
  }

  function fitFont() {
    const avail = Math.min(window.innerWidth * 0.94, 980) - 20;
    stage.style.fontSize = `${Math.max(26, Math.min(64, avail / 10))}px`;
  }
  window.addEventListener('resize', () => { if (st && !$('#mode-br').hidden) fitFont(); });

  /* ---------- плавное перестроение (только листья, чтобы смещения не складывались) ---------- */
  const LEAF = '.br-t, .br-op, .br-tok, .br-k, .br-p';
  function snap() {
    const m = new Map();
    stage.querySelectorAll(LEAF).forEach((e) => {
      const r = e.getBoundingClientRect();
      if (r.width || r.height) m.set(e, r);
    });
    return m;
  }
  function playFlip(first, skip = new Set(), dur = 520, arc = 0) {
    stage.querySelectorAll(LEAF).forEach((e) => {
      if (skip.has(e)) return;
      const a = first.get(e);
      if (!a) return;
      const b = e.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      const kf = arc
        ? [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - arc}px)`, offset: 0.5 }, { transform: 'none' }]
        : [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }];
      e.animate(kf, { duration: T(dur), easing: 'cubic-bezier(.3,.7,.2,1)' });
    });
  }
  function reflow(fn, skip, dur, arc) {
    const first = snap();
    fn();
    playFlip(first, skip, dur, arc);
    return first;
  }

  /* ---------- фазы и подсказки ---------- */
  function canMerge() {
    const k = termsOf().map((t) => t.kind);
    return k.filter((x) => x === 'x').length > 1 || k.filter((x) => x === 'n').length > 1;
  }
  function computePhase() {
    if (!st.merged && !st.F2) return 'box';
    if (!st.merged) return (!st.F2.noden && st.F1.den.v === st.F2.den.v) ? 'press' : 'joker';
    if (st.F1.num.some((n) => isPar(n) && !n.factored)) return 'open';
    if (canMerge()) return 'combine';
    return reducePhase();
  }
  const gcd2 = (a, b) => (b ? gcd2(b, a % b) : Math.abs(a));
  function commonG() {                      // общий множитель коэффициентов числителя и знаменателя
    const F = st.F1;
    if (F.noden) return 1;
    return [...termsOf().map((t) => t.v), F.den.v].reduce((a, v) => gcd2(a, v), 0);
  }
  function reducePhase() {
    const F = st.F1;
    if (F.noden) return 'done';
    const par = F.num.find((n) => isPar(n) && n.factored);
    if (par) {
      if (!par.k) return 'done';
      const fs2 = F.den.parts ? F.den.parts.map((x) => x.v) : [F.den.v];
      if (fs2.includes(par.k)) return 'glove';
      return F.den.v % par.k === 0 ? 'hammer' : 'done';
    }
    return commonG() > 1 ? 'rocket' : 'done';
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
    const op = st.sgn < 0 ? '−' : '+';
    switch (st.phase) {
      case 'box': return `Возьми коробку и нажми на слагаемые, которые нужно упаковать: всё выражение после «${op}». Они обведутся пунктиром, потом нажми «Упаковать»`;
      case 'joker': return `Скобки — это одно число. Возьми джокер, нажми на ${st.F1.den.v} в знаменателе и положи карту на скобки: они станут дробью с таким же знаменателем`;
      case 'press': return 'Знаменатели одинаковые. Возьми поршни и нажми на дроби — они склеятся в одну';
      case 'open': return st.sgn < 0
        ? 'Раскрой скобки: нажми на них коробкой. Минус перед скобкой поменяет знак у каждого слагаемого внутри'
        : 'Раскрой скобки: нажми на них коробкой';
      case 'combine': return 'Приведи подобные: возьми молнию и ударь по знаку перед слагаемым, которое нужно сложить с таким же';
      case 'rocket': return `Числитель и знаменатель делятся на ${commonG()}. Возьми ракету и нажми на числитель — общий множитель вылетит за скобки`;
      case 'hammer': return `Знаменатель ${st.F1.den.v} — это ${st.F1.num.find((n) => n.factored).k} × ${st.F1.den.v / st.F1.num.find((n) => n.factored).k}. Ударь по нему молотком, чтобы разбить на множители`;
      case 'glove': return `Одинаковые множители сверху и снизу стирает ластик: нажми на ${st.F1.num.find((n) => n.factored).k} — в скобках или в знаменателе`;
      default: return '';
    }
  }
  function autoTool() {
    if (!st || st.finished) return;
    const map = { box: { box: true }, joker: { joker: true }, press: { press: true }, open: { box: true }, combine: { bolt: true }, rocket: { rocket: true }, hammer: { hammer: true }, glove: { glove: true } }[st.phase];
    if (map) MG.tools.auto('br', map);
  }
  function updateHint() {
    const t = defaultHint();
    if (t !== shownHint) setHint(t);
    autoTool();
  }
  function flashHint(text, ms = 3800) {
    setHint(text);
    const s = st;
    setTimeout(() => { if (st === s) updateHint(); }, ms);
  }

  /* ---------- раунд ---------- */
  function newRound() {
    const sp = pick();
    lastKey = `${sp.a}.${sp.b}.${sp.c}.${sp.d}.${sp.sgn}.${sp.dsign}`;
    after.classList.remove('show');
    document.querySelectorAll('.br-box').forEach((b) => b.remove());
    sel.clear(); selEl = null; packBtn.classList.remove('show');
    const tx = mkTerm('x', sp.c), tn = mkTerm('n', sp.dsign * sp.d);
    st = {
      sp, F1: mkFrac([mkTerm('x', sp.a)], sp.b), F2: null, merged: false,
      raw: sp.order === 'xn' ? [tx, tn] : [tn, tx], sgn: sp.sgn,
      opS: mk('div', 'br-op big'), rawEl: mk('div', 'br-raw'), phase: 'box', busy: false, finished: false,
    };
    fitFont();
    render();
    [...stage.querySelectorAll('.br-t, .br-tok, .br-op:not(.hid)')].forEach((e, i) => popIn(e, i * 50));
    st.phase = computePhase();
    setStats(levelOf(solved), solved);
    shownHint = '';
    updateHint();
  }

  /* ============================================================
   * Коробка (3D-картонка): рисуется по прямоугольнику
   * ============================================================ */
  function boxHTML(w, h, d) {
    return `<svg width="${w + d}" height="${h + d}" viewBox="0 0 ${w + d} ${h + d}" style="overflow:visible;display:block">
      <polygon points="${w},${d} ${w + d},0 ${w + d},${h} ${w},${d + h}" fill="#b98b55" fill-opacity=".74" stroke="#7a5128" stroke-width="3" stroke-linejoin="round"/>
      <rect x="0" y="${d}" width="${w}" height="${h}" rx="3" fill="#e8c999" fill-opacity=".30" stroke="#7a5128" stroke-width="3.5"/>
      <polygon class="lid" points="0,${d} ${d},0 ${w + d},0 ${w},${d}" fill="#d8b383" fill-opacity=".82" stroke="#7a5128" stroke-width="3" stroke-linejoin="round" style="transform-origin:${w / 2 + d}px 0px"/>
    </svg>`;
  }
  function makeBox() {
    const el = mk('div', 'br-box');
    document.body.append(el);
    const api = {
      el,
      setRect(r) {
        const fs = fontPx();
        const p = fs * 0.1, d = Math.max(14, fs * 0.26);
        el.style.left = `${r.left - p}px`;
        el.style.top = `${r.top - p - d}px`;
        el.innerHTML = boxHTML(r.width + 2 * p, r.height + 2 * p, d);
      },
      remove() { el.remove(); },
    };
    return api;
  }
  const unionRect = (els) => {
    const rs = els.map((e) => e.getBoundingClientRect());
    const l = Math.min(...rs.map((r) => r.left)), tp = Math.min(...rs.map((r) => r.top));
    const rr = Math.max(...rs.map((r) => r.right)), bt = Math.max(...rs.map((r) => r.bottom));
    return { left: l, top: tp, right: rr, bottom: bt, width: rr - l, height: bt - tp };
  };

  /* ---------- выбор слагаемых: пунктирная 3D-коробка вокруг выбранного ---------- */
  const packBtn = $('#br-pack');
  const sel = new Set();
  let selEl = null;
  function dashedHTML(w, h, d) {
    const st2 = 'fill="rgba(232,201,153,.14)" stroke="#b78650" stroke-width="3.4" stroke-dasharray="10 7" stroke-linecap="round" stroke-linejoin="round"';
    return `<svg width="${w + d}" height="${h + d}" viewBox="0 0 ${w + d} ${h + d}" style="overflow:visible;display:block">
      <polygon points="${w},${d} ${w + d},0 ${w + d},${h} ${w},${d + h}" ${st2}/>
      <polygon points="0,${d} ${d},0 ${w + d},0 ${w},${d}" ${st2}/>
      <rect x="0" y="${d}" width="${w}" height="${h}" rx="4" ${st2}/>
    </svg>`;
  }
  function drawSel(pop) {
    if (selEl) { selEl.remove(); selEl = null; }
    packBtn.classList.toggle('show', sel.size > 0 && !!st && !st.busy && st.phase === 'box');
    if (!sel.size) return;
    const r = unionRect([...sel].map((t) => t.el));
    const fs = fontPx();
    const p = fs * 0.1, d = Math.max(14, fs * 0.26);
    selEl = mk('div', 'br-box br-sel');
    selEl.style.left = `${r.left - p}px`;
    selEl.style.top = `${r.top - p - d}px`;
    selEl.innerHTML = dashedHTML(r.width + 2 * p, r.height + 2 * p, d);
    selEl.style.filter = 'none';
    document.body.append(selEl);
    if (pop) selEl.animate([{ transform: 'translateY(-14px) scale(1.12)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: T(260), easing: 'cubic-bezier(.3,1.5,.5,1)' });
  }
  function clearSel() { sel.clear(); drawSel(); }
  window.addEventListener('resize', () => drawSel());

  function onRawClick(t, e) {
    if (!st || st.busy || st.finished || st.phase !== 'box' || !st.raw || !st.raw.includes(t)) return;
    if (!MG.tools.need('box')) return;
    if (sel.has(t)) sel.delete(t); else sel.add(t);
    drawSel(true);
    bump(t.el);
  }
  packBtn.addEventListener('click', () => {
    if (!st || st.busy || st.finished || st.phase !== 'box' || !sel.size) return;
    if (sel.size < st.raw.length) {
      const hit = [...sel][0].el;
      shake(hit);
      flashHint(`Упаковать нужно всё выражение после «${st.sgn < 0 ? '−' : '+'}»: ${st.raw.length === 2 ? 'оба слагаемых' : 'все слагаемые'}. Иначе минус достанется только части`);
      clearSel();
      return;
    }
    doBox();
  });

  /* контейнер: рифлёный стальной ящик */
  function containerHTML(w, h, d) {
    let ribs = '';
    for (let x = 10; x < w - 6; x += 11) ribs += `<path d="M${x} ${d + 6} V${d + h - 6}" stroke="#a65b30" stroke-width="3" opacity=".75"/>`;
    return `<svg width="${w + d}" height="${h + d}" viewBox="0 0 ${w + d} ${h + d}" style="overflow:visible;display:block" stroke-linejoin="round" stroke-linecap="round">
      <polygon points="${w},${d} ${w + d},0 ${w + d},${h} ${w},${d + h}" fill="#9c5530" stroke="#4a2a14" stroke-width="3"/>
      <path d="M${w + d * 0.34} ${d * 0.66} V${h - 4} M${w + d * 0.68} ${d * 0.33} V${h - 8}" stroke="#4a2a14" stroke-width="2" opacity=".55"/>
      <polygon points="0,${d} ${d},0 ${w + d},0 ${w},${d}" fill="#e9a373" stroke="#4a2a14" stroke-width="3"/>
      <rect x="0" y="${d}" width="${w}" height="${h}" rx="3" fill="#d4733f" stroke="#4a2a14" stroke-width="3.5"/>
      ${ribs}
      <rect x="1.5" y="${d + 1.5}" width="13" height="${h - 3}" fill="#8c4a26" opacity=".55"/>
      <rect x="${w - 14.5}" y="${d + 1.5}" width="13" height="${h - 3}" fill="#8c4a26" opacity=".55"/>
      <rect x="${w * 0.06}" y="${d + h * 0.19}" width="${w * 0.9}" height="${h * 0.66}" fill="#f4eadb"/>
    </svg>`;
  }
  function makeContainer(r) {
    const fs = fontPx();
    const d = Math.max(16, fs * 0.3);
    const w = r.width + 2 * fs * 0.34;                 // чуть шире слагаемых
    const h = Math.max(r.height * 1.65, fs * 1.5);     // табличка занимает ~2/3 высоты лицевой стенки
    const cy = r.top + r.height / 2;
    const el = mk('div', 'br-box br-cont');
    document.body.append(el);
    el.style.left = `${r.left + r.width / 2 - w / 2}px`;
    el.style.top = `${cy - h * 0.52 - d}px`;           // центр таблички совпадает с центром слагаемых
    el.innerHTML = containerHTML(w, h, d);
    return el;
  }

  async function doBox() {
    const me = st;
    me.busy = true;
    setHint('');
    const terms = me.raw.slice();
    const r0 = unionRect(terms.map((t) => t.el));
    if (selEl) { selEl.remove(); selEl = null; }
    sel.clear();
    packBtn.classList.remove('show');
    // контейнер падает сверху и становится позади слагаемых
    const cont = makeContainer(r0);
    await cont.animate([{ transform: 'translateY(-130px) scale(1.12)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.7 }, { transform: 'translateY(-6px)', offset: 0.85 }, { transform: 'none', opacity: 1 }],
      { duration: T(520), easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' }).finished.catch(() => {});
    if (st !== me) { cont.remove(); return; }
    burst(cont, '#b78650', 12);
    terms.forEach((t, i) => { bump(t.el); });
    await sleep(380);
    // модель: слагаемые теперь в скобках; контейнер уезжает на их новое место и исчезает
    const par = mkPar(me.raw, me.sgn);
    me.F2 = mkFrac([par], 1);
    me.F2.noden = true;
    me.raw = null;
    par.lp.style.opacity = '0'; par.rp.style.opacity = '0';
    reflow(() => render(), new Set([par.lp, par.rp]), 520);
    const r1 = unionRect(terms.map((t) => t.el));
    const mx = r1.left + r1.width / 2 - (r0.left + r0.width / 2), my = r1.top + r1.height / 2 - (r0.top + r0.height / 2);
    await cont.animate([{ transform: 'none' }, { transform: `translate(${mx}px, ${my}px)` }], { duration: T(520), easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' }).finished.catch(() => {});
    // контейнер исчезает — по бокам от слагаемых остаются скобки
    cont.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '1.14 .78' }], { duration: T(420), easing: 'ease-in', fill: 'forwards' }).finished.then(() => cont.remove());
    par.lp.style.opacity = ''; par.rp.style.opacity = '';
    const fs = fontPx();
    par.lp.animate([{ transform: `translateX(${fs * 0.7}px) scaleY(1.6)`, opacity: 0 }, { transform: 'translateX(0) scaleY(1.18)', opacity: 1 }], { duration: T(460), delay: T(120), easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'backwards' });
    par.rp.animate([{ transform: `translateX(${-fs * 0.7}px) scaleY(1.6)`, opacity: 0 }, { transform: 'translateX(0) scaleY(1.18)', opacity: 1 }], { duration: T(460), delay: T(120), easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'backwards' });
    await sleep(700);
    if (st !== me) return;
    me.busy = false;
    me.phase = computePhase();
    updateHint();
  }

  /* ============================================================
   * Джокер: общий знаменатель
   * ============================================================ */
  let jdrag = null;
  function onDenDown(F, e) {
    if (!st || st.busy || st.finished || e.button || jdrag) return;
    if (MG.tools.current() !== 'joker') return;
    if (st.phase !== 'joker') { MG.indivisible(F.den.el, st.merged ? 'здесь знаменатель уже общий' : 'карту берут, когда знаменатели разные'); return; }
    if (F !== st.F1) { MG.indivisible(F.den.el, `карту берут с другой дроби: нажми на ${st.F1.den.v}`); return; }
    e.preventDefault();
    const me = st;
    const g = MG.ghost(F.den.el);
    MG.joker.style(g);
    g.classList.add('dragging');
    g.style.zIndex = 60;
    g.style.transition = 'none';
    F.den.el.style.opacity = '.3';
    const d = { g, sx: e.clientX, sy: e.clientY, moved: false };
    jdrag = d;
    const over = (ev) => {
      const r = me.F2.el.getBoundingClientRect();
      return ev.clientX >= r.left - 20 && ev.clientX <= r.right + 20 && ev.clientY >= r.top - 20 && ev.clientY <= r.bottom + 20;
    };
    const move = (ev) => {
      const dx = ev.clientX - d.sx, dy = ev.clientY - d.sy;
      if (Math.hypot(dx, dy) > 4) d.moved = true;
      g.style.transform = `translate(${dx}px, ${dy}px) scale(1.15)`;
      me.F2.el.classList.toggle('over', over(ev));
    };
    const up = async (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      jdrag = null;
      if (st !== me) { g.remove(); return; }
      const ok = ev.type === 'pointerup' && (!d.moved || over(ev));
      me.F2.el.classList.remove('over');
      if (ok) { await doJoker(g); return; }
      await g.animate([{ transform: g.style.transform }, { transform: 'translate(0,0) scale(1)', opacity: 0.2 }], { duration: T(260), easing: 'ease-in-out', fill: 'forwards' }).finished.catch(() => {});
      g.remove();
      F.den.el.style.opacity = '';
      if (d.moved) flashHint('Положи карту на правую дробь — на ту, где знаменатель ещё не такой');
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  async function doJoker(g) {
    const me = st;
    me.busy = true;
    setHint('');
    const F2 = me.F2, par = F2.num[0], b = me.F1.den.v;
    par.k = b;
    F2.den.v = b;
    const wasNoden = F2.noden;
    F2.noden = false;
    const skip = new Set();
    reflow(() => {
      render();
      par.kEl.style.opacity = '0'; F2.den.el.style.opacity = '0';
      skip.add(par.kEl); skip.add(F2.den.el);
    }, skip, 420);
    if (wasNoden) F2.bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: T(380), delay: T(380), easing: 'ease-out', fill: 'backwards' });
    me.F1.den.el.style.opacity = '';
    await MG.joker.lay(g, { frac: F2.el, targets: [par.kEl, F2.den.el], value: b, color: MG.colorOf(b) });
    if (st !== me) return;
    me.busy = false;
    me.phase = computePhase();
    updateHint();
  }

  /* ============================================================
   * Поршни: склеиваем дроби
   * ============================================================ */
  async function doPress() {
    const me = st;
    me.busy = true;
    setHint('');
    await MG.press([me.F1.el, me.opS, me.F2.el], {
      onPeak: () => {
        if (st !== me) return [];
        const par = me.F2.num[0];
        me.F1.num.push(par);
        me.F2 = null;
        me.merged = true;
        render();
        return [me.F1.el];
      },
    });
    if (st !== me) return;
    me.busy = false;
    me.phase = computePhase();
    updateHint();
  }

  /* ============================================================
   * Коробка открывается: слагаемые вылетают, минус перед скобкой меняет им знаки
   * ============================================================ */
  async function doOpen(par) {
    const me = st;
    me.busy = true;
    setHint('');
    const box = makeBox();
    box.setRect(unionRect([par.el]));
    box.el.animate([{ transform: 'translateY(-70px) scale(1.2)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: T(380), easing: 'cubic-bezier(.3,1.4,.5,1)' });
    await sleep(480);
    if (st !== me) { box.remove(); return; }
    const lid = box.el.querySelector('.lid');
    if (lid) lid.animate([{ transform: 'none' }, { transform: 'scaleY(-1.3)' }], { duration: T(320), easing: 'ease-out', fill: 'forwards' });
    await sleep(380);
    const F = me.F1;
    const k = par.k || 1, sg = par.sgn;
    const flipped = new Set();
    par.terms.forEach((t) => { const nv = t.v * k * sg; if (Math.sign(nv) !== Math.sign(t.v)) flipped.add(t); t.v = nv; });
    const first = snap();
    const idx = F.num.indexOf(par);
    F.num.splice(idx, 1, ...par.terms);
    render();
    box.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(520), delay: T(200), fill: 'forwards' }).finished.then(() => box.remove());
    playFlip(first, new Set(), 640, fontPx() * 0.5);
    par.terms.forEach((t) => {
      if (!first.has(t.op) && !t.op.classList.contains('hid')) popIn(t.op, 200);
      burst(t.el, t.v < 0 ? '#f97316' : '#60a5fa', 10);
      if (flipped.has(t)) bump(t.el);
    });
    await sleep(760);
    if (st !== me) return;
    me.busy = false;
    me.phase = computePhase();
    updateHint();
    checkDone();
  }

  /* ============================================================
   * Молния: подобные слагаемые
   * ============================================================ */
  async function merge(p, t) {
    const me = st;
    me.busy = true;
    setHint('');
    const F = me.F1;
    const sum = p.v + t.v;
    const i = F.num.indexOf(p);
    const els = [p.el, t.op, t.el];
    await Promise.all(els.map((e) => e.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '.4' }], { duration: T(260), fill: 'forwards' }).finished.catch(() => {})));
    if (st !== me) return;
    F.num.splice(F.num.indexOf(t), 1);
    F.num.splice(F.num.indexOf(p), 1);
    let nt = null;
    if (sum !== 0) {
      nt = mkTerm(p.kind, sum);
      F.num.splice(i, 0, nt);
    }
    reflow(() => {
      render();
      if (nt) { nt.el.style.opacity = '0'; nt.op.style.opacity = '0'; }
    }, nt ? new Set([nt.el, nt.op]) : new Set(), 520);
    if (nt) {
      if (F.num[0] !== nt) nt.op.style.opacity = '';
      await MG.lightning([nt.el], { color: sum < 0 ? '#fb923c' : '#fde047' });
      nt.el.style.opacity = '';
    } else await sleep(300);
    if (st !== me) return;
    me.busy = false;
    me.phase = computePhase();
    updateHint();
    checkDone();
  }

  function boltClick(e) {
    if (!st || st.finished || st.busy) return;
    const opE = e.target.closest('.br-op');
    const tE = e.target.closest('.br-t');
    const n = opE ? opE._t : tE ? tE._t : null;
    const hit = opE || tE || stage;
    if (st.phase === 'open') { MG.indivisible(hit, 'сначала раскрой скобки коробкой'); return; }
    if (st.phase !== 'combine') { MG.indivisible(hit, st.phase === 'done' ? 'уже всё посчитано' : 'считать пока нечего'); return; }
    if (!n || isPar(n)) { flashHint('Ударь молнией по знаку «+» или «−» перед слагаемым'); return; }
    const list = termsOf();
    const i = list.indexOf(n);
    const p = list.slice(0, i).reverse().find((x) => x.kind === n.kind);
    if (!opE || i === 0) { MG.indivisible(hit, 'нажми на знак перед слагаемым, которое нужно сложить с таким же слева'); return; }
    if (!p) { shake(n.el); flashHint(`${n.kind === 'x' ? 'Слева нет другого x' : 'Слева нет другого числа'}: складывать можно только подобные`); return; }
    merge(p, n);
  }

  /* ============================================================
   * Облако: под скобками вырастает знаменатель 1
   * ============================================================ */
  async function doRain() {
    const me = st;
    me.busy = true;
    setHint('');
    const F2 = me.F2;
    const r = F2.el.getBoundingClientRect();
    const fs = fontPx();
    const fx = mk('div', 'br-rain');
    document.body.append(fx);
    const cw = fs * 1.5;
    const cloud = mk('div', 'cl');
    Object.assign(cloud.style, { width: `${cw}px`, left: `${r.left + r.width / 2 - cw / 2}px`, top: `${r.top - cw * 0.62}px` });
    cloud.innerHTML = `<svg viewBox="0 0 100 62" style="display:block;width:100%;overflow:visible;filter:drop-shadow(0 .06em .09em rgba(100,90,200,.25))" stroke-linejoin="round"><path d="M24 50 C9 50 3 34 15 27 C11 13 29 5 40 14 C46 0 71 1 75 16 C93 14 99 37 85 45 C90 52 81 55 76 50 Z" fill="#d9d0ff" stroke="#8a7be8" stroke-width="2.4"/><path d="M22 22 C26 15 33 13 38 16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/></svg>`;
    fx.append(cloud);
    await cloud.animate([{ scale: '.3', opacity: 0 }, { scale: '1.08', opacity: 1, offset: .6 }, { scale: '1', opacity: 1 }], { duration: T(600), easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'forwards' }).finished.catch(() => {});
    const top = r.top - cw * 0.62 + cw * 0.3;
    const drops = [];
    for (let i = 0; i < 14; i++) {
      const h = fs * (0.2 + Math.random() * 0.12);
      const d = mk('div', 'drop');
      Object.assign(d.style, { height: `${h}px`, left: `${r.left + r.width / 2 + (Math.random() - 0.5) * cw * 0.6}px`, top: `${top}px` });
      fx.append(d);
      const dist = Math.max(10, r.bottom - top - h);
      drops.push(d.animate([{ transform: 'translateY(0)', opacity: 0 }, { opacity: 1, offset: .12 }, { transform: `translateY(${dist}px)`, opacity: 1, offset: .88 }, { transform: `translateY(${dist}px)`, opacity: 0 }],
        { duration: T(700 + Math.random() * 250), delay: T(Math.random() * 600), iterations: Infinity, easing: 'linear' }));
    }
    await sleep(T(1100));
    if (st !== me) { fx.remove(); return; }
    F2.noden = false;
    F2.den.v = 1;
    F2.bar.style.transform = 'scaleX(0)'; F2.den.el.style.opacity = '0';
    reflow(() => render(), new Set([F2.den.el]), 480);
    F2.bar.style.transform = '';
    F2.bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: T(420), easing: 'ease-out' });
    await sleep(380);
    drops.forEach((d) => d.cancel());
    F2.den.el.style.opacity = '';
    F2.den.el.style.color = '#2f9e44';
    popIn(F2.den.el, 0);
    burst(F2.den.el, '#2f9e44', 10);
    cloud.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '.5' }], { duration: T(450), fill: 'forwards' }).finished.then(() => fx.remove());
    await sleep(T(600));
    F2.den.el.style.color = '';
    if (st !== me) return;
    me.busy = false;
    me.phase = computePhase();
    updateHint();
  }

  /* ============================================================
   * Сокращение: ракета выносит общий множитель, молоток разбивает знаменатель, ластик стирает пару
   * ============================================================ */
  async function doRocket() {
    const me = st;
    me.busy = true;
    setHint('');
    const F = me.F1;
    const terms = termsOf();
    const g = commonG();
    const rects = terms.map((t) => t.el.getBoundingClientRect());
    const fs = fontPx();
    const ghosts = rects.map((r) => {
      const el = mk('div', 'br-rg', String(g));
      Object.assign(el.style, { left: `${r.left + r.width / 2 - 20}px`, top: `${r.top + r.height / 2 - 24}px`, width: '40px', height: '48px', fontSize: `${fs * 0.6}px` });
      document.body.append(el);
      return el;
    });
    const par = mkPar(terms, 1);
    par.k = g; par.factored = true;
    const first = snap();
    terms.forEach((t) => { t.v = t.v / g; });
    F.num = [par];
    render();
    par.kEl.style.opacity = '0';
    playFlip(first, new Set([par.kEl]), 520);
    terms.forEach((t) => bump(t.el));
    const kr = par.kEl.getBoundingClientRect();
    await Promise.all(ghosts.map((gh, i) => MG.rocket(gh, { left: rects[i].left + rects[i].width / 2 - 20, top: rects[i].top + rects[i].height / 2 - 24, width: 40, height: 48 }, kr, { dir: -1, delay: i * 140, color: '#3b82f6' })));
    par.kEl.style.opacity = '';
    popIn(par.kEl, 0);
    burst(par.kEl, '#3b82f6', 12);
    await sleep(380);
    if (st !== me) return;
    me.busy = false;
    me.phase = computePhase();
    updateHint();
  }

  async function doHammer() {
    const me = st;
    me.busy = true;
    setHint('');
    const F = me.F1;
    const par = F.num.find((n) => n.factored);
    const g = par.k, m = F.den.v / g;
    await MG.smash(F.den.el);
    if (st !== me) return;
    F.den.parts = [{ v: g, el: mk('div', 'br-tok') }, { v: m, el: mk('div', 'br-tok') }];
    F.den.parts.forEach((pt) => { pt.el._den = true; });
    reflow(() => render(), new Set(F.den.parts.map((x) => x.el)), 360);
    F.den.parts.forEach((pt, i) => { popIn(pt.el, i * 90); burst(pt.el, '#f59e0b', 8); });
    await sleep(520);
    if (st !== me) return;
    me.busy = false;
    me.phase = computePhase();
    updateHint();
  }

  async function doGlove() {
    const me = st;
    me.busy = true;
    setHint('');
    const F = me.F1;
    const par = F.num.find((n) => n.factored);
    const k = par.k;
    const denPart = F.den.parts ? F.den.parts.find((x) => x.v === k) : F.den;
    const els = [par.kEl, denPart.el];
    await Promise.all(els.map((e) => {
      burst(e, '#ef4444', 10);
      return e.animate([{ opacity: 1, scale: '1' }, { opacity: 1, scale: '1.25', offset: .35 }, { opacity: 0, scale: '.3' }], { duration: T(520), fill: 'forwards' }).finished.catch(() => {});
    }));
    if (st !== me) return;
    els.forEach((e) => e.getAnimations().forEach((a) => a.cancel()));
    par.k = null;
    if (F.den.parts) {
      const rest = F.den.parts.filter((x) => x !== denPart);
      F.den.v = rest.reduce((a, x) => a * x.v, 1);
      F.den.parts = null;
    } else F.den.v = 1;
    F.num = par.terms.slice();
    if (F.den.v === 1) F.noden = true;
    reflow(() => render(), new Set(), 560);
    await sleep(640);
    if (st !== me) return;
    me.busy = false;
    me.phase = computePhase();
    updateHint();
    checkDone();
  }

  /* ---------- общий обработчик кликов ---------- */
  eqn.addEventListener('click', (e) => {
    if (!st || st.finished || st.busy) return;
    const tool = MG.tools.current();
    if (tool === 'bolt') { boltClick(e); return; }
    if (tool === 'press') {
      if (st.phase === 'press') { doPress(); return; }
      const hit = e.target.closest('.br-t, .br-tok') || st.F1.den.el;
      MG.indivisible(hit, st.phase === 'joker' ? 'знаменатели ещё разные — сначала приведи их к общему' : 'склеивать пока нечего');
      return;
    }
    if (tool === 'rain') {
      if (st.phase === 'joker' && st.F2 && st.F2.noden) doRain();
      else MG.indivisible(e.target.closest('.br-t, .br-tok') || st.F1.den.el, st.phase === 'box' ? 'сначала упакуй слагаемые коробкой' : 'облако поливает скобки без знаменателя — под ними вырастет единица');
      return;
    }
    if (tool === 'rocket') {
      if (st.phase === 'rocket') doRocket();
      else MG.indivisible(e.target.closest('.br-t, .br-tok') || st.F1.den.el, 'ракета выносит общий множитель — он появится в конце, когда числитель и знаменатель делятся на одно число');
      return;
    }
    if (tool === 'hammer') {
      if (st.phase === 'hammer' && e.target.closest('.br-tok') && e.target.closest('.br-tok')._den) doHammer();
      else MG.indivisible(e.target.closest('.br-t, .br-tok') || st.F1.den.el, st.phase === 'hammer' ? 'бей молотком по знаменателю' : 'разбивать пока нечего');
      return;
    }
    if (tool === 'glove') {
      const kE = e.target.closest('.br-k'), dE = e.target.closest('.br-tok');
      if (st.phase === 'glove' && (kE || (dE && dE._den))) doGlove();
      else MG.indivisible(e.target.closest('.br-t, .br-tok') || st.F1.den.el, st.phase === 'glove' ? 'нажми на одинаковый множитель — в скобках или в знаменателе' : 'стирать пока нечего');
      return;
    }
    if (tool === 'box' && st.phase === 'open') {
      const pe = e.target.closest('.br-par');
      if (pe && pe._par) { doOpen(pe._par); return; }
      const pr = st.F1.num.find(isPar);
      if (pr) { MG.indivisible(e.target.closest('.br-t') || pr.el, 'накрой коробкой скобки — нажми прямо на них'); }
    }
  });

  /* ---------- финал ---------- */
  async function checkDone() {
    const me = st;
    if (!me || me.finished || me.phase !== 'done') return;
    me.finished = true;
    setHint('');
    await sleep(300);
    if (st !== me) return;
    const txt = termsOf().map((t, i) => {
      const a = Math.abs(t.v);
      const body = t.kind === 'x' ? `${a === 1 ? '' : a}x` : String(a);
      return `${i === 0 ? (t.v < 0 ? MINUS : '') : (t.v < 0 ? ` ${MINUS} ` : ' + ')}${body}`;
    }).join('');
    resultText.innerHTML = me.F1.noden ? txt : `(${txt}) / ${me.F1.den.v}`;
    solved++;
    setStats(levelOf(solved), solved);
    [...stage.querySelectorAll('.br-t, .br-tok')].forEach((e) => burst(e, '#16a34a', 10));
    after.classList.add('show');
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  nextBtn.addEventListener('click', newRound);

  MG.modes.br = {
    start() {
      if (!st) newRound();
      else setStats(levelOf(solved), solved);
    },
    skip: newRound,
    setSolved(n) { solved = n; lastKey = 'x'; },
  };
})();

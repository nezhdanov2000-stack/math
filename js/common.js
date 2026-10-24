/* Режим 3: приведение дробей к общему знаменателю.
 *
 *   2/3 − 1/2
 *   1. Знаменатели раскрашены по простым множителям: 3 — красный, 2 — синий.
 *      Составной знаменатель делится на множители кликом (4 → 2·2).
 *   2. Перетащи цветной множитель на дробь, где его не хватает:
 *      числитель и знаменатель этой дроби умножатся на него (2/3 → 2·2 / 3·2).
 *   3. Когда знаменатели сравнялись, дроби сами сливаются: числители считаются,
 *      дроби объединяются в одну, остаётся ответ (4 − 3) / (3·2) = 1/6.
 */
(() => {
  'use strict';

  const {
    gcd, spf, isPrime, factorize, $, T, sleep, EASE, ri, colorOf, setStats, mf, rowWidth,
    snapshot, play, ghost, burst, popIn, indivisible, smash, crumble,
  } = window.MG;

  function create(cfg) {
  /* cfg: { id: 'common' | 'big', p: префикс id в разметке, big: режим «большие знаменатели» } */

  /* ============================================================
   * DOM
   * ============================================================ */
  const stage = $(`#mode-${cfg.id}`);
  const fracsEl = $(`#${cfg.p}-fracs`);
  const hint = $(`#${cfg.p}-hint`);
  const after = $(`#${cfg.p}-after`);
  const resultText = $(`#${cfg.p}-resultText`);
  const nextBtn = $(`#${cfg.p}-next`);
  const noteEl = cfg.big ? $(`#${cfg.p}-note`) : null;

  /* ============================================================
   * Модель
   * ============================================================
   * state = { spec, fracs: [frac], ops: [glyph], finished, fontFit }
   * frac  = { el, numRow, bar, denRow, num: [tok], den: [tok] }
   * tok   = { value, frac, zone: 'num'|'den', added, role: null|'drag', el }
   *         added — множитель, добавленный перетаскиванием (красится в цвет простого числа)
   * role 'drag' — простой множитель знаменателя, которого не хватает в какой-то другой дроби
   */
  let state = null;
  let solved = 0;
  let lastKey = '';
  let uid = 0;

  const levelOf = (s) => Math.min(5, 1 + Math.floor(s / 3));
  const pick = (arr) => arr[ri(0, arr.length - 1)];
  const lcm = (a, b) => (a / gcd(a, b)) * b;
  const isComposite = (t) => t.value > 1 && !isPrime(t.value);

  /* сколько раз простой множитель p входит в знаменатель дроби (с учётом неразложенных чисел) */
  const countOf = (frac, p) => frac.den.reduce(
    (s, t) => s + factorize(t.value).filter((x) => x === p).length, 0);

  /* нужен ли множитель t (простой или составной) дроби Y: хоть одного его простого сомножителя там меньше */
  const needs = (t, Y) => [...new Set(factorize(t.value))].some((p) => countOf(Y, p) < countOf(t.frac, p));

  function densEqual() {
    const primes = new Set(state.fracs.flatMap((F) => F.den.flatMap((t) => factorize(t.value))));
    return [...primes].every((p) => state.fracs.every((F) => countOf(F, p) === countOf(state.fracs[0], p)));
  }

  /* ============================================================
   * Генерация задач
   * ============================================================ */
  const DEN_POOLS = [
    [2, 3, 5],
    [2, 3, 4, 5, 6, 8, 9, 10, 12],
    [2, 3, 4, 5, 6, 8, 9, 10, 12, 15],
    [4, 6, 8, 9, 10, 12, 14, 15, 18, 20],
    [6, 8, 9, 10, 12, 14, 15, 18, 20, 24, 30],
  ];
  const specKey = (s) => JSON.stringify([s.fracs, s.ops]);

  function genSpec(lvl) {
    const pool = DEN_POOLS[lvl - 1];
    const nF = lvl >= 3 && Math.random() < 0.5 ? 3 : 2;
    const maxL = lvl === 1 ? 15 : lvl === 2 ? 72 : 120;
    for (let i = 0; i < 4000; i++) {
      const dens = [];
      while (dens.length < nF) { const d = pick(pool); if (!dens.includes(d)) dens.push(d); }
      const L = dens.reduce(lcm);
      if (L > maxL || factorize(L).length > 5) continue;

      const fracs = dens.map((d) => {
        const cands = [];
        for (let n = 1; n < d; n++) if (gcd(n, d) === 1) cands.push(n);
        return { n: pick(cands), d };
      });
      const ops = Array.from({ length: nF - 1 }, () => (Math.random() < 0.5 ? '+' : '−'));

      let N = fracs[0].n * (L / fracs[0].d);
      ops.forEach((o, k) => {
        const f = fracs[k + 1];
        N += (o === '+' ? 1 : -1) * f.n * (L / f.d);
      });
      if (N <= 0 || gcd(N, L) !== 1) continue;      // ответ положительный и несократимый

      const spec = { fracs, ops };
      if (specKey(spec) === lastKey) continue;
      return spec;
    }
    return { fracs: [{ n: 2, d: 3 }, { n: 1, d: 2 }], ops: ['−'] };
  }

  /* большие знаменатели с общими множителями: разложив их, общий знаменатель получается намного меньше */
  const BIG_POOLS = [
    [12, 14, 15, 18, 20, 21, 24],
    [12, 14, 15, 18, 20, 21, 24, 28, 30, 36],
    [14, 15, 18, 20, 21, 24, 28, 30, 35, 36, 40, 42, 45],
    [18, 20, 24, 28, 30, 35, 36, 40, 42, 45, 48, 50, 54, 60],
    [24, 30, 36, 40, 42, 45, 48, 54, 56, 60, 63, 70, 72, 75, 84, 90],
  ];
  const BIG_MAXL = [90, 180, 300, 420, 540];

  function genBig(lvl) {
    const pool = BIG_POOLS[lvl - 1];
    const nF = lvl >= 4 && Math.random() < 0.5 ? 3 : 2;
    for (let i = 0; i < 6000; i++) {
      const dens = [];
      while (dens.length < nF) { const d = pick(pool); if (!dens.includes(d)) dens.push(d); }
      const L = dens.reduce(lcm);
      const prod = dens.reduce((a, d) => a * d, 1);
      if (L > BIG_MAXL[lvl - 1] || prod < 2 * L) continue;

      const fracs = dens.map((d) => {
        const cands = [];
        for (let n = 1; n < d; n++) if (gcd(n, d) === 1) cands.push(n);
        return { n: pick(cands), d };
      });
      const ops = Array.from({ length: nF - 1 }, () => (Math.random() < 0.5 ? '+' : '−'));
      let N = fracs[0].n * (L / fracs[0].d);
      ops.forEach((o, k) => {
        const f = fracs[k + 1];
        N += (o === '+' ? 1 : -1) * f.n * (L / f.d);
      });
      if (N <= 0 || gcd(N, L) !== 1) continue;

      const spec = { fracs, ops };
      if (specKey(spec) === lastKey) continue;
      return spec;
    }
    return { fracs: [{ n: 3, d: 14 }, { n: 2, d: 21 }], ops: ['−'] };
  }

  function pickSpec() {
    if (cfg.big) {
      if (solved === 0 && lastKey === '') return { fracs: [{ n: 3, d: 14 }, { n: 2, d: 21 }], ops: ['−'] };
      return genBig(levelOf(solved));
    }
    if (solved === 0 && lastKey === '') {           // как на эскизе: 2/3 − 1/2
      return { fracs: [{ n: 2, d: 3 }, { n: 1, d: 2 }], ops: ['−'] };
    }
    return genSpec(levelOf(solved));
  }

  /* ============================================================
   * Токены и раскладка
   * ============================================================ */
  function makeTok(value, frac, zone, added) {
    const el = document.createElement('div');
    el.className = 'token';
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    const tok = { id: ++uid, kind: 'num', value, frac, zone, added, el, role: null };
    paint(tok);
    el.addEventListener('click', () => onClick(tok));
    el.addEventListener('pointerdown', (e) => onPointerDown(tok, e));
    return tok;
  }

  function paint(tok) {
    tok.el.textContent = tok.value;
    tok.el.classList.toggle('big', isComposite(tok) && tok.zone === 'den');
    tok.el.classList.toggle('prime', isPrime(tok.value));
  }

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
    frac.num.push(makeTok(n, frac, 'num', false));
    frac.den.push(makeTok(d, frac, 'den', false));
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
    state.fracs.forEach((F) => {
      renderRow(F.numRow, F.num);
      renderRow(F.denRow, F.den);
      fitBar(F);
    });
  }

  /* размер шрифта: самая широкая запись — когда все дроби приведены к общему знаменателю */
  function fitFontSize() {
    const spec = state.spec;
    const L = spec.fracs.reduce((a, f) => lcm(a, f.d), 1);
    const AL = factorize(L).length;
    const w = spec.fracs.reduce((s, f) => {
      const own = factorize(f.d).length;
      return s + Math.max(1 + (AL - own), AL) * 1.25 + 0.5;
    }, 0) + (spec.fracs.length - 1) * 1.8;
    let width = w;
    if (cfg.big) {                                   // запас на случай, если множат на неразложенные числа
      const digs = spec.fracs.reduce((s, f) => s + String(f.d).length * 0.62 + 0.6, 0);
      width = Math.max(w, spec.fracs.length * digs * 1.08 + (spec.fracs.length - 1) * 1.8);
    }
    const avail = Math.min(window.innerWidth * 0.94, 980) - 24;
    state.fontFit = avail / width;
    applyFontSize();
  }
  function applyFontSize() {
    if (!state) return;
    fracsEl.style.fontSize = `${Math.max(24, Math.min(60, state.fontFit))}px`;
    state.fracs.forEach((F) => fitBar(F, true));
  }
  window.addEventListener('resize', () => {
    if (state && !stage.hidden && !state.finished) fitFontSize();
  });

  /* ============================================================
   * Цвета и роли
   * ============================================================ */
  function refreshRoles() {
    const st = state;
    st.fracs.forEach((F) => {
      [...F.num, ...F.den].forEach((t) => {
        const colored = isPrime(t.value) && (t.zone === 'den' || t.added);
        t.el.classList.toggle('dcol', colored);
        if (colored) t.el.style.setProperty('--c', colorOf(t.value));
      });
      F.den.forEach((t) => {
        const drag = !st.finished && t.value > 1 && (isPrime(t.value) || cfg.big)
          && st.fracs.some((Y) => Y !== F && needs(t, Y));
        t.role = drag ? 'drag' : null;
        t.el.classList.toggle('paired', drag);
        t.el.classList.toggle('drag', drag);
      });
    });
  }

  /* ============================================================
   * Подсказки
   * ============================================================ */
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
    if (!state || state.finished) return '';
    if (state.ready) return 'Знаменатели одинаковые. Возьми поршни и нажми на дроби — они сожмут их в одну дробь';
    const anyDrag = state.fracs.some((F) => F.den.some((t) => t.role === 'drag'));
    if (cfg.big && state.fracs.some((F) => F.den.some(isComposite))) {
      return 'Знаменатели большие. Возьми кувалду и ударь по числу — оно разобьётся на множители, так общий знаменатель получится проще';
    }
    if (anyDrag) {
      return 'Знаменатели разные. Возьми джокера, схвати им цветной множитель и перетащи на дробь, где его не хватает — числитель и знаменатель умножатся на него';
    }
    return densEqual() ? '' : 'Раздели составной знаменатель на множители — возьми кувалду и ударь по нему';
  }
  function autoTool() {
    if (!state || state.finished) return;
    const dens = state.fracs.flatMap((F) => F.den);
    window.MG.tools.auto(cfg.id, {
      hammer: dens.some(isComposite),
      joker: dens.some((t) => t.role === 'drag'),
      press: !!state.ready,
      glove: window.MG.tools.current() === 'glove',
    });
  }
  function updateHint() {
    const t = defaultHint();
    if (t !== shownHint) setHint(t);
    autoTool();
  }

  /* ============================================================
   * Раунд
   * ============================================================ */
  function newRound() {
    const spec = pickSpec();
    lastKey = specKey(spec);

    fracsEl.innerHTML = '';
    after.classList.remove('show');
    if (noteEl) { noteEl.textContent = ''; noteEl.className = 'note'; }

    const fracs = spec.fracs.map((f) => buildFrac(f.n, f.d));
    const ops = spec.ops.map((o) => makeGlyph(o, 'sign op'));
    state = { spec, fracs, ops, finished: false, busy: false, fontFit: 56 };

    fracs.forEach((F, i) => {
      if (i > 0) fracsEl.append(ops[i - 1].el);
      fracsEl.append(F.el);
    });

    fitFontSize();
    render();
    state.fracs.forEach((F) => fitBar(F, true));
    refreshRoles();

    let k = 0;
    fracsEl.querySelectorAll('.token, .glyph').forEach((el) => popIn(el, 70 * k++));

    setStats(levelOf(solved), solved);
    shownHint = '';
    updateHint();
  }

  /* ============================================================
   * Клики: делим составной знаменатель
   * ============================================================ */
  function onClick(tok) {
    if (!state || state.finished || state.busy || state.zapping) return;
    if (window.MG.tools.current() === 'glove') { eraseClick(tok); return; }   // ластик стирает числа джокера
    if (['press', 'bolt'].includes(window.MG.tools.current())) return;   // клики поршней и молнии — отдельно
    if (window.MG.tools.current() === 'joker' && tok.role === 'drag') return;   // карту берут нажатием на множитель
    if (tok.zone !== 'den') return;
    if (isComposite(tok)) { if (window.MG.tools.need('hammer')) splitDen(tok); return; }
    if (tok.role === 'drag') return;                       // сюда придёт перетаскивание рукой
    if (isPrime(tok.value)) indivisible(tok.el, `${tok.value} — этот множитель уже есть`);
  }

  async function splitDen(tok) {
    if (tok.smashing) return;
    const st = state;
    tok.smashing = true;
    await smash(tok.el);                              // кувалда бьёт по числу
    tok.smashing = false;
    if (state !== st || st.finished || !isComposite(tok)) return;

    const list = tok.frac.den;
    const first = snapshot();
    const p = spf(tok.value);
    const part = makeTok(p, tok.frac, 'den', false);
    part.fromJoker = tok.fromJoker;
    list.splice(list.indexOf(tok), 0, part);
    tok.value /= p;
    paint(tok);
    render();
    refreshRoles();
    updateHint();

    const src = first.get(tok.el);
    play(first, new Set([part.el]));
    crumble(tok.el, part.el, src);
  }

  /* ============================================================
   * Перетаскивание множителя на другую дробь
   * ============================================================ */
  let drag = null;

  const validTarget = (src, Y) => Y !== src.frac && needs(src, Y);

  function fracAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const fr = el && el.closest('.fr');
    return fr ? fr._frac : null;
  }

  function onPointerDown(tok, e) {
    if (!state || state.finished || state.busy || state.zapping || tok.role !== 'drag' || e.button > 0) return;
    if (window.MG.tools.current() === 'glove') return;
    if (!window.MG.tools.need('joker')) return;
    e.preventDefault();
    const g = ghost(tok.el);
    window.MG.joker.style(g);                       // джокер становится картой с числом
    g.classList.add('dragging');
    g.style.zIndex = 60;
    g.style.transition = 'none';
    tok.el.style.opacity = '.3';
    drag = { tok, g, sx: e.clientX, sy: e.clientY, moved: false };

    state.fracs.forEach((F) => {
      F.el.classList.remove('ok', 'no', 'src');
      if (F === tok.frac) F.el.classList.add('src');
      else F.el.classList.add(validTarget(tok, F) ? 'ok' : 'no');
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
    state.fracs.forEach((F) => F.el.classList.toggle('over', F === over && validTarget(drag.tok, F)));
  }

  function onUp(e) {
    if (!drag) return;
    if (e.type === 'pointerup' && drag && !drag.moved && !drag.sticky) { drag.sticky = true; drag.moved = true; window.MG.joker.armSticky((ev) => onUp(ev)); return; }   // клик: карта остаётся в руке
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);

    const { tok, g, moved } = drag;
    drag = null;
    state.fracs.forEach((F) => F.el.classList.remove('ok', 'no', 'src', 'over'));

    const target = e.type === 'pointerup' ? fracAt(e.clientX, e.clientY) : null;
    if (target && validTarget(tok, target)) { applyDrop(tok, target, g); return; }

    // возврат на место
    tok.el.style.opacity = '';
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(g.style.transform);
    const dx = m ? parseFloat(m[1]) : 0;
    const dy = m ? parseFloat(m[2]) : 0;
    g.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(1.15)` },
      { transform: 'translate(0, 0) scale(1)' },
    ], { duration: T(320), easing: EASE }).onfinish = () => g.remove();

    if (!moved) {
      if (!isComposite(tok)) indivisible(tok.el, 'перетащи на дробь, где его не хватает');
    } else if (target && target !== tok.frac) {
      indivisible(tok.el, `в той дроби уже достаточно ${tok.value}`);
    }
  }

  /* ластик: выбери два одинаковых множителя — один сверху, другой снизу в той же дроби — и они сотрутся (как в сокращении дробей) */
  let sel = [];
  function clearSel() { sel.forEach((t) => t.el.classList.remove('sel')); sel = []; }
  window.addEventListener('toolchange', (e) => { if (e.detail.tool !== 'glove') clearSel(); });

  function eraseClick(tok) {
    const st = state;
    if (!st || st.finished || st.busy || st.zapping || st.calc) return;
    if (tok.zone !== 'num' && tok.zone !== 'den') return;
    const i = sel.indexOf(tok);
    if (i >= 0) { tok.el.classList.remove('sel'); sel.splice(i, 1); return; }
    tok.el.classList.add('sel');
    sel.push(tok);
    if (sel.length < 2) return;
    const [a, b] = sel;
    clearSel();
    const F = a.frac;
    if (F && F === b.frac && a.zone !== b.zone && a.value === b.value && a.value > 1 && F[a.zone].includes(a) && F[b.zone].includes(b)) { cancelPair(a, b); return; }
    [a, b].forEach((t) => window.MG.shake(t.el));
    setHint('Эти множители сократить нельзя — ластик исчез на несколько секунд');
    setTimeout(() => { if (state) updateHint(); }, 3800);
    window.MG.tools.disable('glove', 4000);
  }

  async function cancelPair(a, b) {
    const st = state;
    st.busy = true;
    await Promise.all([window.MG.erase(a.el), window.MG.erase(b.el, 120)]);
    if (state !== st) return;
    const first = snapshot();
    const F = a.frac;
    const fresh = [];
    [a, b].forEach((t) => {
      const list = F[t.zone];
      list.splice(list.indexOf(t), 1);
      t.el.remove();
      if (!list.length) { const one = makeTok(1, F, t.zone, false); list.push(one); fresh.push(one); }
    });
    render();
    refreshRoles();
    play(first, new Set(fresh.map((f) => f.el)));
    fresh.forEach((f) => popIn(f.el));
    st.busy = false;
    if (st.ready && !densEqual()) st.ready = false;
    else if (!st.ready && densEqual()) { ready(); return; }
    updateHint();
  }

  async function applyDrop(src, Y, g) {
    const st = state;
    const p = src.value;
    const color = colorOf(p);
    src.el.style.opacity = '';

    const first = snapshot();
    const nt = makeTok(p, Y, 'num', true);
    const dt = makeTok(p, Y, 'den', false);
    nt.fromJoker = true; dt.fromJoker = true;
    Y.num.push(nt);
    Y.den.push(dt);
    render();
    refreshRoles();
    updateHint();
    [nt, dt].forEach((t) => { t.el.style.opacity = '0'; });   // числа появятся в момент удара молнии
    play(first, new Set([nt.el, dt.el]));

    st.busy = true;
    await window.MG.joker.lay(g, { frac: Y.el, targets: [nt.el, dt.el], value: p, color });   // из облака растут числа
    st.busy = false;

    await sleep(560);
    if (state === st && densEqual()) ready();
  }

  /* знаменатели сравнялись: дальше работают поршни */
  function ready() {
    state.ready = true;
    updateHint();
  }

  /* ---------- поршни: нажать на дроби с одинаковыми знаменателями ---------- */
  function pressClick(e) {
    if (!state || state.finished || state.busy || state.zapping) return;
    if (window.MG.tools.current() !== 'press') return;
    if (!state.ready) {
      indivisible(e.target.closest('.token') || state.fracs[0].den[0].el, 'знаменатели ещё разные — сначала приведи их к общему');
      return;
    }
    state.busy = true;
    finish();
  }
  fracsEl.addEventListener('click', pressClick);

  /* поршни сжимают дроби: они сливаются в одну, знаменатели — в один */
  async function squeeze() {
    const st = state;
    await window.MG.press([...fracsEl.children], {
      onPeak: () => {
        if (state !== st) return [];
        const [F0, ...rest] = st.fracs;
        const items = [...F0.num];
        rest.forEach((F, i) => { items.push(st.ops[i], ...F.num); });
        renderRow(F0.numRow, items);
        rest.forEach((F) => F.el.remove());
        F0.num = items;
        fitBar(F0, true);
        return [F0.el];
      },
    });
  }

  /* ---------- молния: посчитать числитель ---------- */
  function boltClick(e) {
    if (!state || window.MG.tools.current() !== 'bolt') return;
    if (state.calc) { calcStep(e); return; }
    if (state.finished || state.busy || state.zapping) return;
    freeZap(e);
  }

  /* свобода: молния работает в любой момент — по произведению в нажатой части любой дроби */
  async function freeZap(e) {
    const st = state;
    const row = e.target.closest('.row');
    const F = st.fracs.find((f) => f.numRow === row || f.denRow === row);
    const hit = e.target.closest('.token') || st.fracs[0].den[0].el;
    if (!F) { indivisible(hit, 'нажми молнией на числитель или знаменатель'); return; }
    const kind = row === F.denRow ? 'den' : 'num';
    if (!productRuns(F[kind]).length) { indivisible(hit, 'здесь считать пока нечего'); return; }
    st.zapping = true;
    await zapProducts(F, kind);
    st.zapping = false;
    if (state !== st) return;
    if (!st.ready && densEqual()) ready(); else updateHint();
  }
  fracsEl.addEventListener('click', boltClick);

  function waitCalc() {
    const st = state;
    st.calc = true;
    window.MG.tools.pick('bolt');
    updateCalcHint();
  }

  /* что ещё не посчитано в итоговой дроби */
  const productRuns = (list) => {            // группы множителей подряд: 2 · 3, 1 · 3 · 5
    const runs = [];
    let cur = [];
    [...list, { kind: 'glyph' }].forEach((it) => {
      if (it.kind === 'num') cur.push(it);
      else { if (cur.length > 1) runs.push(cur); cur = []; }
    });
    return runs;
  };
  const numNeeds = (F) => productRuns(F.num).length > 0 || F.num.some((i) => i.kind === 'glyph');
  const denNeeds = (F) => productRuns(F.den).length > 0;

  function updateCalcHint() {
    const F0 = state.fracs[0];
    if (numNeeds(F0)) {
      setHint('Молния считает: сначала умножение, потом сложение и вычитание. Нажми на числитель');
    } else if (denNeeds(F0)) {
      setHint('Теперь знаменатель: нажми на него молнией — она перемножит множители');
    }
  }

  /* один удар молнии: по умолчанию — по той части дроби, куда нажали */
  async function calcStep(e) {
    const st = state;
    if (st.zapping) return;
    const F0 = st.fracs[0];
    const row = e.target.closest('.row');
    const kind = row === F0.denRow ? 'den' : row === F0.numRow ? 'num' : (numNeeds(F0) ? 'num' : 'den');
    const hit = e.target.closest('.token') || F0.num[0].el;

    st.zapping = true;
    if (productRuns(F0[kind]).length) await zapProducts(F0, kind);
    else if (kind === 'num' && F0.num.some((i) => i.kind === 'glyph')) await evalNumerator();
    else { st.zapping = false; indivisible(hit, 'здесь всё уже посчитано'); return; }
    st.zapping = false;
    if (state !== st) return;

    if (!numNeeds(F0) && !denNeeds(F0)) finishCalc();
    else updateCalcHint();
  }

  /* молния бьёт в каждое произведение — множители сгорают, остаётся число */
  async function zapProducts(F, kind) {
    const st = state;
    const runs = productRuns(F[kind]);
    const marks = runs.map((run) => {
      const rs = run.map((t) => t.el.getBoundingClientRect());
      const m = document.createElement('div');
      Object.assign(m.style, {
        position: 'fixed', pointerEvents: 'none', width: '2px', height: '2px',
        left: `${(Math.min(...rs.map((r) => r.left)) + Math.max(...rs.map((r) => r.right))) / 2}px`,
        top: `${(Math.min(...rs.map((r) => r.top)) + Math.max(...rs.map((r) => r.bottom))) / 2}px`,
      });
      document.body.append(m);
      return m;
    });
    await window.MG.lightning(marks, { reveal: false, color: '#facc15' });
    marks.forEach((m) => m.remove());
    if (state !== st) return;

    runs.flat().forEach((t) => t.el.animate([
      { filter: 'brightness(1)', opacity: 1, scale: '1' },
      { filter: 'brightness(4)', opacity: 0, scale: '.5' },
    ], { duration: T(320), easing: 'ease-in', fill: 'forwards' }));
    await sleep(340);
    if (state !== st) return;

    const fresh = [];
    runs.forEach((run) => {
      const list = F[kind];
      const merged = makeTok(run.reduce((x, t) => x * t.value, 1), F, kind, false);
      const idx = list.indexOf(run[0]);
      run.forEach((t) => { list.splice(list.indexOf(t), 1); t.el.remove(); });
      list.splice(idx, 0, merged);
      fresh.push(merged.el);
    });
    render();
    fresh.forEach((el) => { popIn(el); burst(el, '#facc15', 12); });
    await sleep(560);
  }

  /* ============================================================
   * Финал: числители → одна дробь → ответ
   * ============================================================ */
  async function mergeAll(groups) {
    const st = state;
    const gs = groups.filter((g) => g.toks.length > 1);
    if (!gs.length) return;

    const outs = [];
    gs.forEach((g) => {
      const rects = g.toks.map((t) => t.el.getBoundingClientRect());
      const cx = rects.reduce((s, r) => s + r.left + r.width / 2, 0) / rects.length;
      g.toks.forEach((t, i) => {
        const dx = cx - (rects[i].left + rects[i].width / 2);
        outs.push(t.el.animate([
          { transform: 'none', opacity: 1 },
          { transform: `translateX(${dx}px) scale(.6)`, opacity: 0 },
        ], { duration: T(480), easing: 'cubic-bezier(.6,0,.4,1)', fill: 'forwards' }));
      });
    });
    await Promise.all(outs.map((a) => a.finished.catch(() => {})));
    if (state !== st) return;

    const first = snapshot();
    const fresh = [];
    gs.forEach((g) => {
      const list = g.frac[g.zone];
      const idx = list.indexOf(g.toks[0]);
      const merged = makeTok(g.toks.reduce((x, t) => x * t.value, 1), g.frac, g.zone, false);
      g.toks.forEach((t) => { list.splice(list.indexOf(t), 1); t.el.remove(); });
      list.splice(idx, 0, merged);
      fresh.push(merged.el);
    });
    render();
    play(first, new Set(fresh));
    fresh.forEach((el) => popIn(el));
    await sleep(560);
  }

  /* дроби объединяются в одну: числители и знаки переезжают в общий числитель */
  async function combine() {
    const st = state;
    const [F0, ...rest] = st.fracs;
    const first = snapshot();

    // знаменатели остальных дробей «втягиваются» в первый и растворяются
    const dr = F0.denRow.getBoundingClientRect();
    const tx = dr.left + dr.width / 2;
    const ty = dr.top + dr.height / 2;
    rest.forEach((F) => F.den.forEach((t) => {
      const g = ghost(t.el);
      const r = t.el.getBoundingClientRect();
      g.animate([
        { translate: '0 0', opacity: 1, scale: '1' },
        { translate: `${tx - (r.left + r.width / 2)}px ${ty - (r.top + r.height / 2)}px`, opacity: 0, scale: '.5' },
      ], { duration: T(520), easing: 'ease-in' }).onfinish = () => g.remove();
    }));

    const items = [...F0.num];
    rest.forEach((F, i) => { items.push(st.ops[i], ...F.num); });
    renderRow(F0.numRow, items);
    rest.forEach((F) => F.el.remove());
    F0.num = items;
    fitBar(F0);
    play(first);
    await sleep(640);
  }

  async function evalNumerator() {
    const st = state;
    const F0 = st.fracs[0];
    const items = F0.num;
    const toks = items.filter((i) => i.kind === 'num');
    let N = toks[0].value;
    let k = 1;
    st.spec.ops.forEach((o) => { N += (o === '+' ? 1 : -1) * toks[k++].value; });

    await window.MG.lightning([F0.numRow], { reveal: false, color: '#facc15' });   // молния бьёт в пример
    if (state !== st) return;
    items.forEach((it) => it.el.animate([
      { filter: 'brightness(1)', opacity: 1, scale: '1' },
      { filter: 'brightness(4)', opacity: 0, scale: '.5' },
    ], { duration: T(320), easing: 'ease-in', fill: 'forwards' }));
    await sleep(340);
    if (state !== st) return;

    items.forEach((it) => it.el.remove());
    const merged = makeTok(N, F0, 'num', false);
    F0.num = [merged];
    render();
    popIn(merged.el);
    burst(merged.el, '#facc15', 12);
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
    const F0 = st.fracs[0];

    let rn = F0.num[0].value;
    let rd = F0.den.reduce((x, t) => x * t.value, 1);
    let note = null;
    if (cfg.big) {
      const L = st.spec.fracs.reduce((a, f) => lcm(a, f.d), 1);
      const g = gcd(rn, rd);
      if (rd > L && g > 1) {
        // умножали на неразложенные числа — останавливаемся и показываем, как было проще
        const ms = st.spec.fracs.map((f) => L / f.d);
        const numExpr = st.spec.fracs
          .map((f, i) => (i ? ` ${st.spec.ops[i - 1]} ` : '') + `${f.n}·${ms[i]}`).join('');
        let N = st.spec.fracs[0].n * ms[0];
        st.spec.ops.forEach((o, k) => { N += (o === '+' ? 1 : -1) * st.spec.fracs[k + 1].n * ms[k + 1]; });
        const left0 = st.spec.fracs
          .map((f, i) => (i ? ` ${st.spec.ops[i - 1]} ` : '') + mf(f.n, f.d)).join('');
        note = {
          bad: true,
          html: `Пример можно было решить проще: общий знаменатель здесь ${L}, а у нас получился ${rd} — дробь ещё можно сократить на ${g}.`
            + `<span class="ideal">Идеальное решение: ${left0} = ${mf(numExpr, L)} = ${mf(N, L)}</span>`,
        };
      } else {
        note = { bad: false, html: `Отлично — общий знаменатель ${L} получился минимальным, сокращать ничего не пришлось.` };
      }
    }
    fracsEl.querySelectorAll('.token, .glyph').forEach((el) => el.classList.add('final'));

    const left = st.spec.fracs
      .map((f, i) => (i ? ` ${st.spec.ops[i - 1]} ` : '') + mf(f.n, f.d)).join('');
    resultText.innerHTML = `${left} = ${mf(rn, rd)}`;
    if (noteEl && note) { noteEl.innerHTML = note.html; noteEl.className = `note ${note.bad ? 'bad' : 'good'}`; }
    solved++;
    setStats(levelOf(solved), solved);

    after.classList.add('show');
    fracsEl.querySelectorAll('.token').forEach((el) => burst(el, '#16a34a', 10));
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  /* ============================================================
   * Кнопки и регистрация режима
   * ============================================================ */
  nextBtn.addEventListener('click', newRound);

  window.MG.modes[cfg.id] = {
    start() {
      if (!state) newRound();
      else setStats(levelOf(solved), solved);
    },
    skip: newRound,
  };
  }

  create({ id: 'common', p: 'c', big: false });
  create({ id: 'big', p: 'b', big: true });
})();

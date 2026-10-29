/* Режим «Уравнения → Пропорции».
 * Три вида примеров:
 *   A:  a·x / b = c / d        — конвейер переносит числа через «=», топор срубает единицу, сокращаем;
 *   B:  c / d = a·x / b        — x справа: стаканчики меняют части местами, дальше как в A;
 *   D:  p / (a·x) = c / d      — x в знаменателе: конвейер несёт его вправо, стаканчики меняют части, и дальше.
 * Конвейер: потяни число через «=» (из знаменателя — в числитель, из числителя — в знаменатель).
 */
(() => {
  'use strict';

  const {
    gcd, spf, isPrime, factorize, $, T, sleep, ri, colorOf, setStats, mf, rowWidth,
    snapshot, play, ghost, burst, popIn, bump, indivisible, smash, crumble,
  } = window.MG;

  /* ============================================================
   * DOM
   * ============================================================ */
  const stage = $('#pp-stage');
  const lf = $('#pp-lf');
  const lrows = { num: $('#pp-lnum'), den: $('#pp-lden') };
  const lbar = $('#pp-lbar');
  const eqEl = $('#pp-eq');
  const fractionEl = $('#pp-rf');
  const rows = { num: $('#pp-num'), den: $('#pp-den') };
  const bar = $('#pp-bar');
  const hint = $('#pp-hint');
  const after = $('#pp-after');
  const resultText = $('#pp-resultText');
  const nextBtn = $('#pp-next');

  let state = null;
  let solved = 0;
  let lastKey = '';
  let rounds = 0;       // сколько задач показано (включая пропущенные)
  let uid = 0;

  const levelOf = (s) => window.MG.levelOf(s, 6);   // уровень: +1 за каждые 3 задачи, не выше 6
  const isNum = (v) => typeof v === 'number';

  /* ---------- генерация примера ---------- */
  function pickSpec() {
    // тип задачи чередуется по номеру раунда (а не по числу решённых — иначе «Другая задача» даёт один и тот же тип)
    const type = rounds < 6 ? ['B', 'A', 'D'][rounds % 3] : ['A', 'B', 'D'][ri(0, 2)];
    if (solved === 0 && lastKey === '') return { type: 'B', a: 5, b: 7, c: 20, d: 49, N: 7 * 20, D: 5 * 49 };   // первая задача — со стаканчиками (20/49 = 5x/7)
    const lvl = levelOf(solved);
    const maxV = [9, 14, 24, 40, 60, 90][lvl - 1];
    for (let i = 0; i < 8000; i++) {
      if (type === 'D') {
        const p = ri(2, maxV), c = ri(2, maxV), d = ri(2, maxV);
        const a = Math.random() < 0.45 ? 1 : ri(2, Math.max(3, Math.round(maxV / 2)));
        if (gcd(p, a) !== 1 || gcd(c, d) !== 1) continue;
        const N = p * d, D = a * c;
        const g = gcd(N, D);
        if (g === 1 || D / g === 1) continue;
        if (factorize(N).length > 6 || factorize(D).length > 6) continue;
        const key = `D${p}.${a}.${c}.${d}`;
        if (key === lastKey) continue;
        return { type, p, a, c, d, N, D };
      }
      const a = ri(2, Math.max(3, Math.round(maxV / 2)));
      const b = ri(2, maxV), c = ri(2, maxV), d = ri(2, maxV);
      if (gcd(a, b) !== 1 || gcd(c, d) !== 1) continue;
      const N = b * c, D = a * d;
      const g = gcd(N, D);
      if (g === 1 || D / g === 1) continue;
      if (factorize(N).length > 6 || factorize(D).length > 6) continue;
      const key = `${type}${a}.${b}.${c}.${d}`;
      if (key === lastKey) continue;
      return { type, a, b, c, d, N, D };
    }
    return { type: 'A', a: 3, b: 4, c: 10, d: 9, N: 40, D: 27 };
  }
  const specKey = (s) => (s.type === 'D' ? `D${s.p}.${s.a}.${s.c}.${s.d}` : `${s.type}${s.a}.${s.b}.${s.c}.${s.d}`);

  /* ============================================================
   * Токены правой части (как в других режимах)
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
    const n = isNum(tok.value);
    const composite = n && tok.value > 1 && !isPrime(tok.value);
    tok.el.classList.toggle('big', composite);
    tok.el.classList.toggle('prime', n && isPrime(tok.value));
    tok.el.classList.toggle('one', tok.value === 1);
    tok.el.classList.toggle('var', !n);
  }

  function sync(side) {
    const row = rows[side.key];
    side.toks.forEach((t, i) => {
      if (row.children[i] !== t.el) row.insertBefore(t.el, row.children[i] || null);
    });
    markLead();
    fitBars();
  }

  function markLead() {
    Object.values(rows).forEach((row) =>
      [...row.children].forEach((c, i) => c.classList.toggle('lead', i === 0)));
  }

  function markLeft() {
    Object.values(lrows).forEach((row) => {
      [...row.children].forEach((c, i) => {
        const prev = row.children[i - 1];
        c.classList.toggle('xs', !!prev && !c.classList.contains('var') && !c.classList.contains('new1'));
      });
    });
  }

  /* ширина чёрточек (без анимации: плавность даёт flipBars) */
  function fitBars() {
    const fs = parseFloat(getComputedStyle(stage).fontSize);
    bar.style.width = `${Math.max(rowWidth(rows.num), rowWidth(rows.den)) + fs * 0.5}px`;
    lbar.style.width = `${Math.max(rowWidth(lrows.num), rowWidth(lrows.den)) + fs * 0.5}px`;
  }

  /* чёрточки и знак «=» плавно едут вместе с числами */
  const FLIPS = () => [lbar, bar, eqEl];
  function barSnap() {
    const m = new Map();
    FLIPS().forEach((e) => m.set(e, e.getBoundingClientRect()));
    return m;
  }
  function flipBars(first, dur = 520) {
    const finals = new Map();
    FLIPS().forEach((e) => {
      const b = e.getBoundingClientRect();
      finals.set(e, b);
      const a = first.get(e);
      if (!a || e.style.visibility === 'hidden') return;
      const dx = a.left - b.left, dy = a.top - b.top;
      const sx = b.width ? a.width / b.width : 1;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01) return;
      e.animate(
        [{ transform: `translate(${dx}px, ${dy}px) scaleX(${sx})`, transformOrigin: '0 50%' },
          { transform: 'none', transformOrigin: '0 50%' }],
        { duration: T(dur), easing: 'cubic-bezier(.3,.7,.2,1)' },
      );
    });
    return finals;
  }
  /* изменить раскладку так, чтобы всё плавно переехало */
  function reflow(fn, skip = new Set()) {
    const first = snapshot();
    const fb = barSnap();
    fn();
    play(first, skip);
    return flipBars(fb);
  }

  /* Размер шрифта: левая часть + «=» + самая широкая запись справа */
  function fitFontSize() {
    if (!state) return;
    const est = (x) => {
      const f = factorize(x);
      if (!f.length) return 1;
      return f.reduce((w, p) => w + 0.62 * String(p).length + 0.46, 0) + 0.95 * (f.length - 1);
    };
    const avail = Math.min(window.innerWidth * 0.94, 900) - 24;
    const leftEm = state.spec.type === 'D' ? 4.4 : 2.8;
    const em = Math.max(est(state.spec.N), est(state.spec.D), 3) + leftEm + 1.6;
    const px = Math.max(22, Math.min(64, avail / em));
    stage.style.fontSize = `${px}px`;
    fitBars();
  }
  window.addEventListener('resize', () => {
    if (state && !$('#mode-prop').hidden) fitFontSize();
  });

  /* ============================================================
   * Модель левой части: { num: {items:[{v,el}], ph}, den: {...} }
   * ph — зелёная «1», когда часть опустела
   * ============================================================ */
  const xOnLeftNum = () => state.L.num.items.some((it) => it.v === 'x');
  const xOnRight = () => ['num', 'den'].some((k) => state.sides[k].toks.some((t) => !t.gone && t.value === 'x'));

  function movable(part, it) {
    if (part === 'den') return true;
    return it.v !== 'x' && xOnLeftNum();
  }

  function computePhase() {
    if (xOnRight()) return 'S';
    const any = ['num', 'den'].some((k) => state.L[k].items.some((it) => movable(k, it)));
    if (any) return 'E';
    if (!state.L.den.items.length && state.L.num.items.length === 1 && state.L.num.items[0].v === 'x') return 'X';
    return 'E';
  }

  /* ============================================================
   * Подсказки
   * ============================================================ */
  const hints = window.MG.hinter(hint);          // подсказка с анимацией смены текста
  const setHint = (text) => hints.set(text);
  function defaultHint() {
    if (!state || state.finished) return '';
    if (state.phase === 'S') return 'x оказался справа. Возьми стаканчики — они накроют обе части и поменяют их местами';
    if (state.phase === 'X') return 'Слева получилось x/1. Возьми топор и сруби единицу — нам нужен чистый x';
    if (state.phase === 'E') {
      const left = [];
      ['num', 'den'].forEach((k) => state.L[k].items.forEach((it) => { if (movable(k, it)) left.push(it.v); }));
      if (!state.moved) {
        return state.L.den.items.some((it) => it.v === 'x')
          ? 'Возьми конвейер и потяни x из знаменателя через «=» — он переедет в числитель справа'
          : 'Возьми конвейер и потяни число через «=»: из знаменателя — в числитель, из числителя — в знаменатель';
      }
      return `Осталось перенести: ${left.join(', ')}. Тяни конвейером: из знаменателя — вверх, из числителя — вниз`;
    }
    const anyPair = ['num', 'den'].some((k) =>
      state.sides[k].toks.some((t) => t.paired && !t.gone));
    return anyPair
      ? 'Возьми ластик и выбери два одинаковых цветных числа — сверху и снизу. Ошибёшься — ластик исчезнет'
      : 'Возьми кувалду и ударь по числу — оно разобьётся на два множителя. Простое число не делится.';
  }
  function autoTool() {
    if (!state || state.finished) return;
    if (state.phase === 'E') { window.MG.tools.auto('prop', { conveyor: true }); return; }
    if (state.phase === 'S') { window.MG.tools.auto('prop', { cups: true }); return; }
    if (state.phase === 'X') { window.MG.tools.auto('prop', { axe: true }); return; }
    const toks = [...state.sides.num.toks, ...state.sides.den.toks].filter((t) => !t.gone && t.value !== 1);
    window.MG.tools.auto('prop', {
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
   * Раунд и отрисовка
   * ============================================================ */
  function leftTok(text, cls) {
    const el = document.createElement('div');
    el.className = `token lead ${cls}`;
    el.textContent = text;
    return el;
  }

  /* построить обе части по модели (state.L и state.sides) */
  function render() {
    const st = state;
    Object.values(rows).forEach((r) => { r.innerHTML = ''; });
    Object.values(lrows).forEach((r) => { r.innerHTML = ''; });
    ['num', 'den'].forEach((k) => {
      const part = st.L[k];
      part.ph = null;
      part.items.forEach((it) => {
        const isX = it.v === 'x';
        it.el = leftTok(it.v, isX ? 'var' : 'num');
        it.el.style.touchAction = 'none';
        it.el.addEventListener('pointerdown', (e) => startDrag(k, it, e));
        it.el.addEventListener('click', () => leftClick(k, it));
        lrows[k].append(it.el);
      });
      if (!part.items.length) {
        part.ph = leftTok('1', 'one new1');
        part.ph.addEventListener('click', () => chopOne());
        lrows[k].append(part.ph);
      }
      const side = st.sides[k];
      if (!side.toks.length) side.toks.push(makeTok(1, k));
      side.toks.forEach((t) => rows[k].append(t.el));
    });
    markLead();
    markLeft();
    fractionEl.classList.remove('nodots');
    fitBars();
  }

  function newRound() {
    clearSel();
    if (window.MG.axe) { window.MG.axe.reset(lrows.num, lbar); }
    lbar.style.opacity = '';
    lf.style.translate = ''; fractionEl.style.translate = '';
    const spec = pickSpec();
    rounds++;
    lastKey = specKey(spec);
    const { type, a, b, c, d, p } = spec;
    const mk = (v) => ({ v });
    const L = { num: { items: [] }, den: { items: [] } };
    const R = { num: [], den: [] };
    if (type === 'A') {
      L.num.items = [mk(a), mk('x')]; L.den.items = [mk(b)]; R.num = [c]; R.den = [d];
    } else if (type === 'B') {
      L.num.items = [mk(c)]; L.den.items = [mk(d)]; R.num = [a, 'x']; R.den = [b];
    } else {
      L.num.items = [mk(p)]; L.den.items = a > 1 ? [mk(a), mk('x')] : [mk('x')]; R.num = [c]; R.den = [d];
    }
    after.classList.remove('show');
    eqEl.style.visibility = '';
    state = {
      spec, phase: 'E', busy: false, finished: false, pending: 0, moved: false, L,
      sides: {
        num: { key: 'num', toks: R.num.map((v) => makeTok(v, 'num')) },
        den: { key: 'den', toks: R.den.map((v) => makeTok(v, 'den')) },
      },
    };
    render();
    fitFontSize();
    state.phase = computePhase();
    [...lf.querySelectorAll('.token'), ...fractionEl.querySelectorAll('.token')].forEach((el, i) => popIn(el, i * 60));
    setStats(levelOf(solved), solved);
    hints.reset();
    updateHint();
  }

  /* ============================================================
   * Клики по левой части
   * ============================================================ */
  function leftClick(part, it) {
    const st = state;
    if (!st || st.finished || st.busy) return;
    if (st.phase === 'S' && window.MG.tools.current() === 'cups') return;   // клик всплывёт до cupsClick — там и обработается
    if (it.v === 'x') {
      indivisible(it.el, st.phase === 'S' || st.phase === 'E' && !xOnLeftNum()
        ? 'x нужно собрать слева, в числителе' : 'x — это неизвестное, его не переносим');
      return;
    }
    if (st.phase === 'E' && movable(part, it)) {
      setHint('Потяни число к другой стороне уравнения — потянется стрелка, и запустится конвейер');
      setTimeout(() => { if (state === st) updateHint(); }, 3500);
    } else if (st.phase === 'S') {
      setHint('Сначала поменяй части местами стаканчиками');
      setTimeout(() => { if (state === st) updateHint(); }, 3200);
    }
  }

  /* ============================================================
   * Топор: срубаем единицу под x
   * ============================================================ */
  async function chopOne() {
    const st = state;
    if (!st || st.phase !== 'X' || st.busy || st.finished) return;
    if (!window.MG.tools.need('axe')) return;
    st.busy = true;
    setHint('');
    await window.MG.axe.chop({ one: st.L.den.ph, num: lrows.num, bar: lbar });
    if (state !== st) return;
    st.busy = false;
    st.phase = 'B';
    refreshPairs();
    updateHint();
    await sleep(300);
    if (state === st) checkFinish();
  }

  /* ============================================================
   * Стаканчики: накрывают обе части и меняют их местами
   * ============================================================ */
  eqEl.addEventListener('click', () => cupsClick());
  lf.addEventListener('click', () => cupsClick());
  fractionEl.addEventListener('click', () => cupsClick());
  async function cupsClick() {
    const st = state;
    if (!st || st.phase !== 'S' || st.busy || st.finished) return;
    if (!window.MG.tools.need('cups')) return;
    st.busy = true;
    setHint('');
    const fs = parseFloat(getComputedStyle(stage).fontSize);
    const R = (el) => el.getBoundingClientRect();
    const ra = R(lf), rb = R(fractionEl);
    await window.MG.cups.play({
      fs, ra, rb,
      shrink(sc, ms) {
        [lf, fractionEl].forEach((e) => e.animate([{ scale: '1' }, { scale: String(sc) }], { duration: T(ms), easing: 'ease-in-out', fill: 'forwards' }));
      },
      slide(dx, ms, ease) {
        lf.animate([{ translate: '0 0' }, { translate: `${dx}px 0` }], { duration: T(ms), easing: ease, fill: 'forwards' });
        fractionEl.animate([{ translate: '0 0' }, { translate: `${-dx}px 0` }], { duration: T(ms), easing: ease, fill: 'forwards' });
      },
      swap(sc) {
        [lf, fractionEl].forEach((e) => { e.getAnimations().forEach((an) => an.cancel()); e.style.translate = ''; e.style.scale = String(sc); });
        // меняем модели местами
        const vals = (list) => list.filter((t) => !t.gone && t.value !== 1).map((t) => t.value);
        const oldR = { num: vals(st.sides.num.toks), den: vals(st.sides.den.toks) };
        const oldL = { num: st.L.num.items.map((it) => it.v), den: st.L.den.items.map((it) => it.v) };
        st.L = { num: { items: oldR.num.map((v) => ({ v })) }, den: { items: oldR.den.map((v) => ({ v })) } };
        st.sides = {
          num: { key: 'num', toks: oldL.num.map((v) => makeTok(v, 'num')) },
          den: { key: 'den', toks: oldL.den.map((v) => makeTok(v, 'den')) },
        };
        render();
        fitFontSize();
        return { ra: R(lf), rb: R(fractionEl) };
      },
      grow(sc, ms) {
        [lf, fractionEl].forEach((e) => {
          e.style.scale = '';
          e.animate([{ scale: String(sc) }, { scale: '1' }], { duration: T(ms), easing: 'cubic-bezier(.3,1.3,.5,1)' });
        });
      },
    });
    if (state !== st) return;
    st.busy = false;
    st.phase = computePhase();
    st.moved = false;
    updateHint();
  }

  /* ============================================================
   * Конвейер: перетаскиваем число через «=»
   * ============================================================ */
  const centerOf = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

  function fly(g, c0, pts, ms, ease) {
    const kf = pts.map((p) => ({ transform: `translate(${p.x - c0.x}px, ${p.y - c0.y}px)` }));
    return g.animate(kf, { duration: T(ms), easing: ease, fill: 'forwards' }).finished.catch(() => {});
  }

  function startDrag(part, it, e) {
    const st = state;
    if (!st || st.finished || st.phase !== 'E' || st.busy || !st.L[part].items.includes(it) || !movable(part, it)) return;
    if (e.button) return;
    if (!window.MG.tools.need('conveyor')) return;
    e.preventDefault();
    const src = it.el;
    const sr = src.getBoundingClientRect();
    const o = { x: sr.left + sr.width / 2, y: sr.top + sr.height / 2 };
    const fs = parseFloat(getComputedStyle(stage).fontSize);
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    Object.assign(svg.style, { position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 66, overflow: 'visible' });
    const line = document.createElementNS(NS, 'line');
    const head = document.createElementNS(NS, 'polygon');
    const sw = Math.max(5, fs * 0.1);
    line.setAttribute('stroke', '#5b5b5b');
    line.setAttribute('stroke-width', sw);
    line.setAttribute('stroke-dasharray', `${sw * 3.2} ${sw * 2.2}`);
    head.setAttribute('fill', '#5b5b5b');
    svg.append(line, head);
    document.body.append(svg);

    const draw = (x, y) => {
      const dx = x - o.x, dy = y - o.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const hl = sw * 4.4, hw = sw * 2.6;
      const bx = x - ux * hl, by = y - uy * hl;
      line.setAttribute('x1', o.x); line.setAttribute('y1', o.y);
      line.setAttribute('x2', len > hl ? bx : o.x); line.setAttribute('y2', len > hl ? by : o.y);
      head.setAttribute('points', `${x},${y} ${bx - uy * hw},${by + ux * hw} ${bx + uy * hw},${by - ux * hw}`);
      head.style.display = len > sw * 3 ? '' : 'none';
    };
    draw(e.clientX, e.clientY);

    const fade = (ms) => {
      const an = svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(ms), fill: 'forwards' });
      an.finished.then(() => svg.remove(), () => svg.remove());
    };
    const move = (ev) => draw(ev.clientX, ev.clientY);
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      const x = ev.clientX, y = ev.clientY;
      const er = eqEl.getBoundingClientRect();
      const rr = fractionEl.getBoundingClientRect();
      const bb = bar.getBoundingClientRect();
      const mid = bb.top + bb.height / 2;
      const onRight = x > er.left + er.width / 2 && x < rr.right + fs * 0.8 && y > rr.top - fs * 0.6 && y < rr.bottom + fs * 0.6;
      if (!onRight || state !== st) { fade(260); return; }
      const wantUp = part === 'den';
      if (wantUp !== (y < mid)) {
        fade(300);
        setHint(wantUp ? 'Число из знаменателя уезжает в числитель — тяни стрелку выше дробной черты'
          : 'Число из числителя уезжает в знаменатель — тяни стрелку ниже дробной черты');
        setTimeout(() => { if (state === st) updateHint(); }, window.MG.PENALTY.hint);
        return;
      }
      fade(200);
      transfer(part, it);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  async function transfer(part, it) {
    const st = state;
    st.busy = true;
    const src = it.el;
    const toKey = part === 'den' ? 'num' : 'den';
    const R = (el) => el.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(stage).fontSize);
    const val = it.v;

    // 1. заранее освобождаем место: рядом появляется шестерёнка — будущий знак умножения — и ждёт число
    const side = st.sides[toKey];
    const fresh = makeTok(val, toKey);
    fresh.el.style.visibility = 'hidden';
    const oldFirst = side.toks[0];
    const needSign = oldFirst.value !== 1;           // «1»-заглушку число просто заменяет
    if (needSign) oldFirst.el.classList.add('xwait');
    src.style.minWidth = `${src.offsetWidth}px`;     // пока число едет, левая часть не дёргается
    src.style.textAlign = 'center';
    reflow(() => {
      if (!needSign) { side.toks.shift(); oldFirst.el.remove(); }
      side.toks.unshift(fresh);
      sync(side);
    }, new Set([fresh.el]));
    await sleep(580);
    if (state !== st) return;

    let gr = null, gt = null;
    if (needSign) {
      const gap = parseFloat(getComputedStyle(rows[toKey]).columnGap) || 0;
      const of = R(oldFirst.el);
      gt = { x: of.left - gap / 2, y: of.top + of.height / 2 - fs * 0.02 };
      gr = window.MG.conveyor.gear(fs * 0.5);
      gr.el.style.left = `${gt.x}px`; gr.el.style.top = `${gt.y}px`;
      document.body.append(gr.el);
      gr.el.animate([{ scale: '0.2', opacity: 0 }, { scale: '1.2', opacity: 1, offset: .6 }, { scale: '1', opacity: 1 }],
        { duration: T(450), easing: 'ease-out' });
    }

    // 2. лента вокруг знака «=»
    const sr = R(src);
    const c0 = centerOf(sr);
    const g = ghost(src);
    g.style.zIndex = 65;
    g.classList.add('lead');
    const er = R(eqEl);
    const dest = centerOf(R(rows[toKey]));
    let ang = Math.atan2(dest.y - c0.y, dest.x - c0.x);
    const lim = (v) => Math.max(40, Math.min(65, v)) * Math.PI / 180;
    ang = Math.sign(ang || 1) * lim(Math.abs(ang) * 180 / Math.PI);
    const belt = await window.MG.conveyor.open({
      fs, cx: er.left + er.width / 2, cy: er.top + er.height / 2, eqW: er.width, ang, eqEl,
    });
    const abort = () => { g.remove(); if (gr) gr.el.remove(); belt.destroy(); };   // иначе лента останется поверх нового раунда
    if (state !== st) { abort(); return; }

    // 3. число запрыгивает на ленту; на его месте — единица (если часть опустела) или пустота
    const lp = st.L[part];
    lp.items.splice(lp.items.indexOf(it), 1);
    const last = lp.items.length === 0;
    if (last) {
      // часть опустела — на месте числа появляется «1» (новый элемент: у старого остались слушатели перетаскивания)
      const ph = leftTok('1', 'one new1');
      ph.style.minWidth = src.style.minWidth;
      ph.style.textAlign = 'center';
      ph.addEventListener('click', () => chopOne());
      src.replaceWith(ph);
      lp.ph = ph;
      popIn(ph);
      burst(ph, '#16a34a', 12);
    } else {
      src.style.visibility = 'hidden';
    }
    const arc = (p, q, h) => ({ x: (p.x + q.x) / 2, y: Math.min(p.y, q.y) - h });
    await fly(g, c0, [c0, arc(c0, belt.start, fs * 0.5), belt.start], 520, 'cubic-bezier(.3,.7,.4,1)');
    if (state !== st) { abort(); return; }
    await fly(g, c0, [belt.start, belt.end], 1100, 'linear');
    if (state !== st) { abort(); return; }

    // 4. число спрыгивает на своё место, шестерёнка становится знаком ×
    const tc = centerOf(R(fresh.el));
    await fly(g, c0, [belt.end, arc(belt.end, tc, fs * 0.6), tc], 620, 'cubic-bezier(.3,.7,.4,1)');
    if (state !== st) { abort(); return; }
    fresh.el.style.visibility = '';
    g.remove();
    bump(fresh.el);
    burst(fresh.el, colorOf(isNum(val) ? val : 2), 8);
    if (needSign) {
      oldFirst.el.classList.remove('xwait');
      gr.el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.6) rotate(60deg)' }],
        { duration: T(360), fill: 'forwards' }).finished
        .then(() => { gr.spin.cancel(); gr.el.remove(); }, () => gr.el.remove());
      await sleep(380);
    }
    if (state !== st) { belt.destroy(); return; }

    // 5. левая часть перестраивается, лента сворачивается обратно в «=»
    st.moved = true;
    const fin = reflow(() => {
      if (last) { lp.ph.style.minWidth = ''; lp.ph.style.textAlign = ''; } else src.remove();
      markLeft();
      fitBars();
    });
    const er2 = fin.get(eqEl) || R(eqEl);
    await belt.close({ cx: er2.left + er2.width / 2, cy: er2.top + er2.height / 2, eqW: er2.width });
    if (state !== st) return;

    st.busy = false;
    st.phase = computePhase();
    updateHint();
  }

  /* ============================================================
   * Сокращение (как в «Целое × дробь»)
   * ============================================================ */
  /* вручную: множители вводит пользователь на планшете */
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

  async function splitOnce(tok) {
    if (tok.smashing) return;
    const st = state;
    tok.smashing = true;
    await smash(tok.el);
    tok.smashing = false;
    if (state !== st || st.finished || tok.gone || tok.value < 4 || isPrime(tok.value)) return;
    splitStep(st.sides[tok.side], tok);
    refreshPairs();
    updateHint();
  }

  function splitStep(side, big, forced) {
    const first = snapshot();
    const fb = barSnap();
    const p = forced || spf(big.value);
    const prime = makeTok(p, side.key);
    side.toks.splice(side.toks.indexOf(big), 0, prime);
    big.value /= p;
    paint(big);
    sync(side);
    const src = first.get(big.el);
    play(first, new Set([prime.el]));
    flipBars(fb);
    crumble(big.el, prime.el, src);
  }

  function setPaired(tok, on) {
    tok.paired = on;
    tok.el.classList.toggle('paired', on);
    if (on) tok.el.style.setProperty('--c', colorOf(tok.value));
  }

  function refreshPairs() {
    if (!state) return;
    const live = (side) => state.sides[side].toks.filter((t) => !t.gone && isNum(t.value) && t.value > 1);
    const A = live('num');
    const B = live('den');
    [...A, ...B].forEach((t) => setPaired(t, false));
    if (state.phase !== 'B') return;
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

  function onTokenClick(tok) {
    if (!state || state.finished || tok.gone || tok.value === 1) return;
    if (state.phase === 'S' && window.MG.tools.current() === 'cups') return;   // клик всплывёт до cupsClick — там и обработается
    if (state.phase !== 'B') {
      if (!isNum(tok.value)) { if (!state.busy && state.phase === 'S') indivisible(tok.el, 'x нужно собрать слева — возьми стаканчики'); return; }
      if (!state.busy) setHint(state.phase === 'X' ? 'Сначала сруби единицу слева топором' : state.phase === 'S' ? 'Сначала поменяй части местами стаканчиками' : 'Сначала перенеси числа через «=» конвейером');
      return;
    }
    const tools = window.MG.tools;
    if (tools.current() === 'glove') { gloveClick(tok); return; }
    if (!isPrime(tok.value)) {
      if (tok.paired && tools.current() !== 'hammer') { tools.need('glove'); return; }
      if (tools.need('hammer')) { if (manual()) askSplit(tok); else splitOnce(tok); }
      return;
    }
    if (tok.paired) { tools.need('glove'); return; }
    indivisible(tok.el, `${tok.value} — неделимое`);
  }

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
  }

  async function cancelPair(tok, given) {
    const st = state;
    const partner = given || partnerOf(tok);
    if (!partner) return;
    tok.gone = partner.gone = true;
    st.pending++;
    [tok, partner].forEach((t) => t.el.classList.remove('peek'));
    await Promise.all([window.MG.erase(tok.el), window.MG.erase(partner.el, 120)]);
    if (state !== st) return;

    const fresh = [];
    reflow(() => {
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
    }, new Set());
    fresh.forEach((f) => popIn(f.el));

    st.pending--;
    refreshPairs();
    updateHint();
    await sleep(580);
    if (state === st) checkFinish();
  }

  /* ---------- финал ---------- */
  function checkFinish() {
    if (!state || state.finished || state.phase !== 'B' || state.pending > 0) return;
    const prod = (k) => state.sides[k].toks
      .filter((t) => !t.gone).reduce((x, t) => x * t.value, 1);
    if (gcd(prod('num'), prod('den')) === 1) finish();
  }

  async function collapse(side) {
    if (side.toks.length < 2) return;
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
    side.toks.forEach((t) => t.el.remove());
    const merged = makeTok(product, side.key);
    side.toks = [merged];
    row.append(merged.el);
    markLead();
    fitBars();
    popIn(merged.el);
  }

  async function finish() {
    const st = state;
    st.finished = true;
    setHint('');
    await sleep(200);
    const fb = barSnap();
    const first = snapshot();
    await Promise.all([collapse(st.sides.num), collapse(st.sides.den)]);
    if (state !== st) return;
    play(first, new Set([st.sides.num.toks[0].el, st.sides.den.toks[0].el]));
    flipBars(fb);

    const rn = st.sides.num.toks[0].value;
    const rd = st.sides.den.toks[0].value;
    Object.values(st.sides).forEach((s) => s.toks.forEach((t) => {
      t.el.classList.add('final');
      t.el.classList.remove('big', 'paired');
    }));

    resultText.innerHTML = `x = ${rd === 1 ? rn : mf(rn, rd)}`;
    solved++;
    setStats(levelOf(solved), solved);

    after.classList.add('show');
    ['num', 'den'].forEach((k) => burst(st.sides[k].toks[0].el, '#16a34a', 14));
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  nextBtn.addEventListener('click', newRound);

  window.MG.modes.prop = {
    levelUp() { solved = (Math.floor(solved / 3) + 1) * 3; newRound(); },
    start() {
      if (!state) newRound();
      else setStats(levelOf(solved), solved);
    },
    skip: newRound,
    setSolved(n) { solved = n; lastKey = 'x'; },
  };
})();

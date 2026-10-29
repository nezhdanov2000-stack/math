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

  /* 8 задач: четыре стадии по 2 (обезьяна, человек, профессор, робот) */
  const TOTAL = 8;
  const levelOf = (s) => Math.min(4, 1 + Math.floor(s / 2));

  /* ---------- генерация дроби ---------- */
  function pickFraction() {
    if (solved === 0 && lastPair === '') return [15, 21];     // как на эскизе
    if (solved === 4) return [14, 12];                          // знакомство с молнией: после сокращения остаётся 2·3
    if (solved < 4) {                                           // примеры 1–4: каждое число — не больше двух простых множителей
      const P = [2, 3, 5, 7];
      for (let i = 0; i < 200; i++) {
        const g = P[ri(0, P.length - 1)], a = P[ri(0, P.length - 1)], b = P[ri(0, P.length - 1)];
        if (a === b || a === g || b === g) continue;
        const n = g * a, d = g * b;
        if (`${n}/${d}` === lastPair) continue;
        return [n, d];
      }
      return [15, 21];
    }
    const lvl = levelOf(solved);
    const maxN = solved < 6 ? 60 : 120;                    // числа, которые можно разложить в уме
    const maxP = solved < 6 ? 7 : 11;                      // и простые множители поменьше
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
      if (Math.max(...factorize(n), ...factorize(d)) > maxP) continue;
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
    el.addEventListener('click', (e) => onTokenClick(tok, e));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTokenClick(tok, null); }
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
    if (state.calc) {
      const need = ['num', 'den'].filter((k) => state.sides[k].toks.length > 1);
      const where = need.length === 2 ? 'в числителе и в знаменателе' : (need[0] === 'num' ? 'в числителе' : 'в знаменателе');
      return `Молния: нажми на множители ${where} — она перемножит их в одно число`;
    }
    const anyPair = ['num', 'den'].some((k) =>
      state.sides[k].toks.some((t) => t.paired && !t.gone));
    return anyPair
      ? 'Ластик: выбери два одинаковых цветных множителя — сверху и снизу. Ошибёшься — ластик исчезнет'
      : (manual() ? 'Кувалда: нажми на составное число и впиши два множителя. Простое число не делится' : 'Кувалда: ударь по составному числу — оно разобьётся на множители. Простое число не делится');
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
  /* молния появляется на панели с 5-го примера (профессор) */
  function unlockBolt() {
    const set = window.MG.tools.sets.cancel;
    if (solved >= 4 && !set.includes('bolt')) {
      set.push('bolt');
      const m = document.getElementById('mode-cancel');
      if (m && !m.hidden) {
        window.MG.tools.use('cancel');
        const b = document.querySelector('.toolbar .tool[data-id="bolt"]');
        if (b) { b.classList.add('back'); setTimeout(() => b.classList.remove('back'), 800); }
      }
    } else if (solved < 4 && set.includes('bolt')) {
      set.splice(set.indexOf('bolt'), 1);
      const m = document.getElementById('mode-cancel');
      if (m && !m.hidden) window.MG.tools.use('cancel');
    }
  }

  function newRound() {
    clearSel();
    window.dispatchEvent(new Event('mg:round'));
    const oldOffer = document.querySelector('.so-ov');
    if (oldOffer) oldOffer.remove();
    const [n, d] = pickFraction();
    unlockBolt();
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

  /* с 4-й задачи кувалда не делит сама: множители вводит пользователь */
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
  function onTokenClick(tok, ev) {
    if (!state || state.finished || tok.gone || tok.value === 1) return;
    const tools = window.MG.tools;
    if (tools.current() === 'glove') { gloveClick(tok); return; }   // перчатка: выбираем пару
    if (tools.current() === 'bolt') {
      /* молния бьёт по знаку умножения «·» (слева от множителя), а не по числу */
      const lead = tok.el.classList.contains('lead');
      const onDot = !ev || (!lead && ev.clientX < tok.el.getBoundingClientRect().left + 2);
      if (!onDot) { if (state.calc) indivisible(tok.el, 'нажми на точку · между множителями'); else boltClick(tok); return; }
      boltClick(tok); return;
    }
    if (state.calc) { tools.need('bolt'); return; }                 // всё сокращено — остаётся перемножить
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
    if (gcd(prod('num'), prod('den')) !== 1) return;
    if (solved < 4 || ['num', 'den'].every((k) => state.sides[k].toks.length < 2)) { finish(); return; }   // молния открывается с 7-го примера
    state.calc = true;                       // осталось перемножить остатки молнией
    updateHint();
  }

  /* ---------- молния: перемножить множители одной части в число ---------- */
  async function boltClick(tok) {
    const st = state;
    if (!st.calc) { window.MG.indivisible(tok.el, 'молния считает остатки — сначала сократи дробь'); return; }
    const side = st.sides[tok.side];
    if (side.toks.length < 2) { window.MG.indivisible(tok.el, 'здесь считать нечего'); return; }
    if (st.zapping) return;
    st.zapping = true;
    const rr = rows[side.key].getBoundingClientRect();
    const mark = document.createElement('div');
    Object.assign(mark.style, { position: 'fixed', pointerEvents: 'none', width: '2px', height: '2px', left: `${rr.left + rr.width / 2}px`, top: `${rr.top + rr.height / 2}px` });
    document.body.append(mark);
    await window.MG.lightning([mark], { reveal: false, color: '#facc15' });
    mark.remove();
    if (state !== st) return;
    await collapse(side);
    if (state !== st) return;
    st.zapping = false;
    if (['num', 'den'].every((k) => st.sides[k].toks.length < 2)) { st.calc = false; finish(); } else updateHint();
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
    if (solved >= TOTAL) setTimeout(offerDone, 900);
    ['num', 'den'].forEach((k) => burst(st.sides[k].toks[0].el, '#16a34a', 14));
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  /* после 4-й решённой задачи (первая ручная) предлагаем пропустить режим */
  const SKIPKEY = 'mg.tut.skip';
  const flag = () => { try { return !!localStorage.getItem(SKIPKEY); } catch (e) { return true; } };
  const setFlag = () => { try { localStorage.setItem(SKIPKEY, '1'); } catch (e) { /* нет хранилища */ } };
  /* 8 примеров решено — уровень пройден, дальше примеров нет */
  function offerDone() {
    if (document.querySelector('.so-ov')) return;
    const ov = document.createElement('div');
    ov.className = 'so-ov';
    ov.innerHTML = '<div class="skip-offer" role="dialog"><h3>Уровень пройден!</h3><p>Ты освоил сокращение дробей. Идём дальше.</p><div class="so-row"><button type="button" class="so-go">На карту</button></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('.so-go').addEventListener('click', () => {
      try { localStorage.setItem('mg.solved.cancel', String(Math.max(TOTAL, solved))); } catch (e) { /* нет хранилища */ }
      ov.remove();
      const home = document.getElementById('home-btn');
      if (home) home.click();
    });
  }
  function closeOffer() {
    const o = document.querySelector('.so-ov'); if (!o) return;
    o.classList.add('out'); setTimeout(() => o.remove(), 220);
  }
  function offerSkip() {
    const old = document.querySelector('.so-ov'); if (old) old.remove();
    if (solved !== 6 || flag()) return;
    setFlag();
    const ov = document.createElement('div');
    ov.className = 'so-ov';
    ov.innerHTML = '<div class="skip-offer" role="dialog"><h3>Освоил кувалду?</h3><p>Тогда этот режим можно пропустить.</p><div class="so-row"><button type="button" class="so-go">Пропустить</button><button type="button" class="so-stay">Остаться</button></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', (e) => { if (e.target === ov) closeOffer(); });
    ov.querySelector('.so-stay').addEventListener('click', closeOffer);
    ov.querySelector('.so-go').addEventListener('click', () => {
      try { localStorage.setItem('mg.solved.cancel', '10'); } catch (e) { /* нет хранилища */ }
      ov.remove();
      const home = document.getElementById('home-btn');
      if (home) home.click();
    });
  }

  /* ============================================================
   * Кнопки и регистрация режима
   * ============================================================ */
  nextBtn.addEventListener('click', () => { if (solved >= TOTAL) { offerDone(); return; } const o = document.querySelector('.so-ov'); if (o) o.remove(); newRound(); });

  window.MG.modes.cancel = {
    info: () => state && { calc: !!state.calc },   // для подсказки-пальца: всё сокращено, осталось перемножить
    levelUp() { solved = Math.min(TOTAL, (Math.floor(solved / 2) + 1) * 2); newRound(); if (solved >= TOTAL) offerDone(); },
    start() {
      if (!state) newRound();
      else setStats(levelOf(solved), solved);
    },
    skip: newRound,
  };
})();

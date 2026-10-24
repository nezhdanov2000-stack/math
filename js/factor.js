/* Режим 2: вынесение общего множителя за скобки и сокращение.
 *
 *   (2x + 4) / 2          (x² + 3x) / x          3 / (3x + 6)          (2x + 4) / (2x + 6)
 *
 *   1. Нажми на число или степень — оно делится на два множителя (4 → 2·2, x³ → x·x²).
 *   2. Множитель, который есть в КАЖДОМ слагаемом суммы, подсвечивается.
 *      Нажми на него — множители взлетают ракетами по дугам-«фонтанчикам»
 *      и взрывом объединяются в один множитель перед скобкой.
 *   3. Одинаковые множители сверху и снизу (за скобкой или в одночлене) — пара. Нажми — сократятся.
 *
 * Сумма может стоять в числителе, в знаменателе или в обеих частях дроби.
 * Задачи чередуются: числа / степени переменных × сумма сверху / снизу / с обеих сторон.
 */
(() => {
  'use strict';

  const {
    gcd, spf, isPrime, factorize, $, T, sleep, EASE, ri, colorOf, setStats, mf, rowWidth,
    snapshot, play, ghost, burst, popIn, indivisible, rocket, explode, smash, crumble, snap,
  } = window.MG;

  /* ============================================================
   * DOM
   * ============================================================ */
  const fractionEl = $('#f-fraction');
  const rows = { num: $('#f-num'), den: $('#f-den') };
  const bar = $('#f-bar');
  const hint = $('#f-hint');
  const after = $('#f-after');
  const resultText = $('#f-resultText');
  const nextBtn = $('#f-next');
  const stage = $('#mode-factor');
  const launchEl = $('#f-launch');
  const goBtn = $('#f-go');

  /* ============================================================
   * Модель
   * ============================================================
   * state = { spec, sides: { num: side, den: side }, pending, finished, fontFit }
   * side  = { key, terms: [{ neg, sign: glyph|null, toks }], outer: [tok], open, close }
   *         одно слагаемое — одночлен (скобок нет), несколько — сумма (скобки появляются,
   *         когда за них вынесен хотя бы один множитель)
   * tok   = { kind: 'num'|'var', value | name+exp, side, zone: 'term'|'outer', term,
   *           role: null|'cand'|'pair', gone }
   * role 'cand' — множитель есть в каждом слагаемом суммы (можно вынести)
   * role 'pair' — одинаковый множитель сверху и снизу (можно сократить)
   */
  let state = null;
  let solved = 0;
  let round = 0;
  let lastKey = '';
  let uid = 0;

  const VARS = ['x', 'y', 'a', 'b', 't', 'n', 'm', 'k'];
  const VAR_COLORS = {
    x: '#8b5cf6', y: '#ec4899', a: '#0ea5e9', b: '#84cc16',
    t: '#14b8a6', n: '#e11d48', m: '#a855f7', k: '#f97316',
  };
  const levelOf = (s) => Math.min(5, 1 + Math.floor(s / 3));
  const pick = (arr) => arr[ri(0, arr.length - 1)];
  const shuffled = (arr) => arr.slice().sort(() => Math.random() - 0.5);

  /* ---------- «атомы» множителей ---------- */
  const isOneTok = (t) => t.kind === 'num' && t.value === 1;
  const isComposite = (t) => (t.kind === 'num' ? t.value > 1 && !isPrime(t.value) : t.exp >= 2);
  const atomKey = (t) => {                       // ключ неделимого множителя или null
    if (t.kind === 'num') return isPrime(t.value) ? String(t.value) : null;
    return t.exp === 1 ? t.name : null;
  };
  /* ключ «одинаковости»: неделимые — по значению, составные (4, y²) — только с такими же */
  const eqKey = (t) => { const a = atomKey(t); return a !== null ? a : (t.kind === 'num' ? `n${t.value}` : `${t.name}^${t.exp}`); };
  const atomsOfTok = (t) => {
    if (t.gone) return [];
    return t.kind === 'num' ? factorize(t.value).map(String) : Array(t.exp).fill(t.name);
  };
  const colorFor = (t) => (t.kind === 'num' ? colorOf(t.value) : VAR_COLORS[t.name] || '#6366f1');

  const intersect = (lists) => lists.reduce((acc, l) => {
    const cnt = {};
    l.forEach((a) => { cnt[a] = (cnt[a] || 0) + 1; });
    const out = [];
    acc.forEach((a) => { if (cnt[a] > 0) { cnt[a]--; out.push(a); } });
    return out;
  });

  const topList = (side) => (side.terms.length > 1 ? side.outer : side.terms[0].toks);
  const allToks = () => Object.values(state.sides)
    .flatMap((s) => [...s.outer, ...s.terms.flatMap((t) => t.toks)]);

  /* ============================================================
   * Генерация задач
   * ============================================================ */
  const mergeVars = (a, b) => {
    const m = {};
    [...a, ...b].forEach((v) => { m[v.n] = (m[v.n] || 0) + v.e; });
    return Object.keys(m).sort().map((n) => ({ n, e: m[n] }));
  };
  const mulMono = (a, b) => ({ c: a.c * b.c, vars: mergeVars(a.vars, b.vars) });
  const atomsOfMono = (m) => [
    ...factorize(m.c).map(String),
    ...m.vars.flatMap((v) => Array(v.e).fill(v.n)),
  ];
  const validMono = (m) => m.c <= 72 && m.vars.every((v) => v.e <= 4) && atomsOfMono(m).length <= 6;
  const monoKey = (m) => JSON.stringify([m.c, m.vars]);
  const degree = (m) => m.vars.reduce((s, v) => s + v.e, 0);

  const supHTML = (e) => (e > 1 ? `<sup>${e}</sup>` : '');
  const monoHTML = (m) => {
    const vars = m.vars.map((v) => v.n + supHTML(v.e)).join('');
    return vars ? (m.c > 1 ? m.c : '') + vars : String(m.c);
  };
  const sumHTML = (terms) => terms.map((t, i) =>
    (i ? (t.neg ? ' − ' : ' + ') : (t.neg ? '−' : '')) + monoHTML(t)).join('');

  /* сумма из слагаемых вида F × (малый множитель); общий множитель всех слагаемых ровно F */
  function genSum(F, nT, R, names, needVar) {
    const fAtoms = atomsOfMono(F).length;
    for (let tries = 0; tries < 250; tries++) {
      const terms = [];
      for (let i = 0; i < nT; i++) {
        const vars = Math.random() < 0.5 ? [{ n: pick(names), e: ri(1, 2) }] : [];
        terms.push(mulMono(F, { c: ri(1, R), vars }));
      }
      if (terms.some((t) => !validMono(t))) continue;
      if (intersect(terms.map(atomsOfMono)).length !== fAtoms) continue;
      if (needVar && !terms.some((t) => t.vars.length)) continue;
      // у слагаемых разная переменная часть: без подобных (3x + x) и двух констант (10 + 6)
      if (new Set(terms.map((t) => JSON.stringify(t.vars))).size !== terms.length) continue;
      terms.sort((a, b) => degree(b) - degree(a) || b.c - a.c);
      return terms;
    }
    return null;
  }

  const KINDS_EASY = ['num-n', 'num-p', 'den-n', 'den-p'];
  const KINDS_ALL = ['num-n', 'num-p', 'den-n', 'den-p', 'both-n', 'both-p'];

  function genSpec(kind, lvl) {
    const [where, flavor] = kind.split('-');
    const pow = flavor === 'p';
    for (let i = 0; i < 800; i++) {
      const [v, w] = shuffled(VARS);
      const gList = lvl === 1 ? [2, 3, 5] : lvl === 2 ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 8, 9, 10, 12];
      const F = pow
        ? { c: pick([1, 1, 2, 2, 3]), vars: [{ n: v, e: pick(lvl >= 3 ? [1, 1, 2] : [1]) }] }
        : { c: pick(gList), vars: [] };
      const R = lvl === 1 ? 3 : lvl === 2 ? 4 : 5;
      const nT = lvl >= 3 ? ri(2, 3) : 2;

      const sum1 = genSum(F, nT, R, [v, w], !pow);
      if (!sum1) continue;
      let sum2 = null;
      let mono = null;
      if (where === 'both') {
        sum2 = genSum(F, lvl >= 3 ? ri(2, 3) : 2, R, [v, w], !pow);
        if (!sum2 || JSON.stringify(sum2.map(monoKey)) === JSON.stringify(sum1.map(monoKey))) continue;
      } else {
        const H = (lvl >= 3 && Math.random() < 0.5)
          ? { c: pick([1, 2, 3]), vars: Math.random() < 0.4 ? [{ n: w, e: 1 }] : [] }
          : { c: 1, vars: [] };
        mono = mulMono(F, H);
        if (!validMono(mono)) continue;
      }

      const sign = (terms) => terms.map((t, idx) => ({
        ...t, neg: lvl >= 4 && idx > 0 && Math.random() < 0.35,
      }));
      const plain = (m) => ({ ...m, neg: false });
      let spec;
      if (where === 'num') spec = { num: sign(sum1), den: [plain(mono)] };
      else if (where === 'den') spec = { num: [plain(mono)], den: sign(sum1) };
      else spec = { num: sign(sum1), den: sign(sum2) };
      return { ...spec, kind };
    }
    return {
      kind: 'num-n',
      num: [{ c: 6, vars: [{ n: 'x', e: 1 }], neg: false }, { c: 9, vars: [], neg: false }],
      den: [{ c: 3, vars: [], neg: false }],
    };
  }

  const specKey = (s) => JSON.stringify([s.num, s.den]);

  function pickSpec() {
    if (solved === 0 && lastKey === '') {          // как на эскизе: (2x + 4) / 2
      round = 1;
      return {
        kind: 'num-n',
        num: [{ c: 2, vars: [{ n: 'x', e: 1 }], neg: false }, { c: 4, vars: [], neg: false }],
        den: [{ c: 2, vars: [], neg: false }],
      };
    }
    const lvl = levelOf(solved);
    const kinds = lvl >= 3 ? KINDS_ALL : KINDS_EASY;
    for (let i = 0; i < 20; i++) {
      const spec = genSpec(kinds[round % kinds.length], lvl);
      if (specKey(spec) !== lastKey) { round++; return spec; }
    }
    round++;
    return genSpec(kinds[round % kinds.length], lvl);
  }

  /* ============================================================
   * Токены и глифы
   * ============================================================ */
  function mk(props) {
    const el = document.createElement('div');
    el.className = `token${props.kind === 'var' ? ' var' : ''}`;
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    const tok = { id: ++uid, term: null, el, role: null, paired: false, gone: false, ...props };
    paint(tok);
    el.addEventListener('click', () => onTokenClick(tok));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTokenClick(tok); }
    });
    el.addEventListener('mouseenter', () => peek(tok, true));
    el.addEventListener('mouseleave', () => peek(tok, false));
    return tok;
  }
  const makeNum = (value, side, zone) => mk({ kind: 'num', value, side, zone });
  const makeVar = (name, exp, side, zone) => mk({ kind: 'var', name, exp, side, zone });

  function paint(tok) {
    if (tok.kind === 'num') tok.el.textContent = tok.value;
    else tok.el.innerHTML = tok.name + supHTML(tok.exp);
    tok.el.classList.toggle('big', isComposite(tok));
    tok.el.classList.toggle('prime', atomKey(tok) !== null);
    tok.el.classList.toggle('one', isOneTok(tok));
  }

  function makeGlyph(text, cls) {
    const el = document.createElement('div');
    el.className = `glyph ${cls}`;
    el.textContent = text;
    return { kind: 'glyph', el };
  }

  function buildSide(key, termsSpec) {
    const side = {
      key, terms: [], outer: [],
      open: makeGlyph('(', 'br'), close: makeGlyph(')', 'br'),
    };
    termsSpec.forEach((t, i) => {
      const term = {
        neg: t.neg, toks: [],
        sign: i ? makeGlyph(t.neg ? '−' : '+', 'sign') : null,
      };
      side.terms.push(term);
      const push = (tok) => { tok.term = term; term.toks.push(tok); };
      if (t.c > 1 || !t.vars.length) push(makeNum(t.c, key, 'term'));
      t.vars.forEach((v) => push(makeVar(v.n, v.e, key, 'term')));
    });
    return side;
  }

  const sortToks = (list) => list.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'num' ? -1 : 1;
    if (a.kind === 'num') return a.value - b.value;
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });

  const listOf = (tok) => (tok.zone === 'outer' ? state.sides[tok.side].outer : tok.term.toks);

  /* ============================================================
   * Раскладка
   * ============================================================ */
  function sideItems(side) {
    const items = [];
    const sum = side.terms.length > 1;
    if (sum) {
      side.outer.forEach((t) => items.push(t));
      if (side.outer.length) items.push(side.open);
    }
    side.terms.forEach((term, i) => {
      if (i > 0) items.push(term.sign);
      term.toks.forEach((t) => items.push(t));
    });
    if (sum && side.outer.length) items.push(side.close);
    return items;
  }

  const dotBetween = (prev, cur) => !!prev && prev.kind !== 'glyph' && cur.kind !== 'glyph' && (
    (prev.kind === 'num' && cur.kind === 'num')
    || (prev.kind === 'var' && cur.kind === 'var' && prev.name === cur.name));

  function renderRow(row, items) {
    const keep = new Set(items.map((i) => i.el));
    [...row.children].forEach((c) => { if (!keep.has(c)) c.remove(); });
    items.forEach((it, i) => {
      if (row.children[i] !== it.el) row.insertBefore(it.el, row.children[i] || null);
      it.el.classList.toggle('dot', dotBetween(items[i - 1], it));
    });
  }

  function render() {
    renderRow(rows.num, sideItems(state.sides.num));
    renderRow(rows.den, sideItems(state.sides.den));
    fitBar();
  }

  function fitBar(instant) {
    const fs = parseFloat(getComputedStyle(fractionEl).fontSize);
    const w = Math.max(rowWidth(rows.num), rowWidth(rows.den)) + fs * 0.5;
    if (instant) bar.classList.add('instant');
    bar.style.width = `${w}px`;
    if (instant) { void bar.offsetWidth; bar.classList.remove('instant'); }
  }

  /* размер шрифта под самую широкую запись */
  function estimateEm(spec) {
    const sideW = (terms) => {
      const body = terms.reduce((s, t, i) =>
        s + atomsOfMono(t).length * 1.35 + 0.8 + (i ? 1.0 : 0), 0);
      const common = terms.length > 1 ? intersect(terms.map(atomsOfMono)).length + 1.0 : 0;
      return body + common;
    };
    return Math.max(sideW(spec.num), sideW(spec.den), 4) * 0.9;
  }
  function fitFontSize() {
    const avail = Math.min(window.innerWidth * 0.94, 940) - 24;
    state.fontFit = avail / estimateEm(state.spec);
    applyFontSize();
  }
  function applyFontSize() {
    if (!state) return;
    fractionEl.style.fontSize = `${Math.max(24, Math.min(64, state.fontFit))}px`;
    fitBar(true);
  }
  window.addEventListener('resize', () => {
    if (state && !stage.hidden) fitFontSize();
  });

  /* ============================================================
   * Роли множителей: «можно вынести» и «можно сократить»
   * ============================================================ */
  function setRole(tok, role) {
    tok.role = role;
    tok.paired = role !== null;
    tok.el.classList.toggle('paired', role !== null);
    if (role) tok.el.style.setProperty('--c', colorFor(tok));
    else tok.el.classList.remove('peek');
  }

  function refreshRoles() {
    const st = state;
    allToks().forEach((t) => setRole(t, null));

    // пары: неделимые множители «верхнего уровня» числителя и знаменателя
    const A = topList(st.sides.num).filter((t) => !t.gone && atomKey(t));
    const B = topList(st.sides.den).filter((t) => !t.gone && atomKey(t));
    new Set([...A, ...B].map(atomKey)).forEach((k) => {
      const a = A.filter((t) => atomKey(t) === k);
      const b = B.filter((t) => atomKey(t) === k);
      const n = Math.min(a.length, b.length);
      a.slice(0, n).forEach((t) => setRole(t, 'pair'));
      b.slice(0, n).forEach((t) => setRole(t, 'pair'));
    });

    // кандидаты на вынесение: неделимый множитель, который есть в КАЖДОМ слагаемом суммы
    Object.values(st.sides).forEach((side) => {
      if (side.terms.length < 2) return;
      const keys = new Set(side.terms.flatMap((term) =>
        term.toks.filter((t) => atomKey(t)).map(atomKey)));
      keys.forEach((k) => {
        const found = side.terms.map((term) =>
          term.toks.find((t) => !t.gone && atomKey(t) === k));
        if (found.every(Boolean)) found.forEach((t) => setRole(t, 'cand'));
      });
    });
  }

  function partnerOf(tok) {
    const other = state.sides[tok.side === 'num' ? 'den' : 'num'];
    return topList(other)
      .find((t) => t.role === 'pair' && !t.gone && atomKey(t) === atomKey(tok)) || null;
  }

  function groupOf(tok) {
    if (tok.role === 'cand') {
      const k = atomKey(tok);
      return state.sides[tok.side].terms.flatMap((t) => t.toks)
        .filter((t) => t.role === 'cand' && atomKey(t) === k && !t.gone);
    }
    if (tok.role === 'pair') {
      const p = partnerOf(tok);
      return p ? [tok, p] : [tok];
    }
    return [];
  }

  function peek(tok, on) {
    if (!state || state.finished || tok.gone || !tok.role) return;
    groupOf(tok).forEach((t) => t.el.classList.toggle('peek', on));
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
    if (state.chop) return 'В знаменателе осталась единица. Возьми топор и срубай её — числитель упадёт';
    const all = allToks();
    if (all.some((t) => t.role === 'pair')) {
      return 'Одинаковые цветные множители сверху и снизу — возьми ластик и выбери оба. Ошибёшься — ластик исчезнет';
    }
    if (all.some((t) => t.role === 'cand')) {
      if (armed.length && window.MG.tools.current() === 'rocket') {
        return 'Ракета прицеплена. Прицепи такие же множители в остальных слагаемых и нажми «Запуск»';
      }
      return 'Этот множитель есть в каждом слагаемом — возьми ракету, прицепи её к нему в каждом слагаемом и нажми «Запуск»';
    }
    return 'Найди множитель, общий для всех слагаемых суммы: бей кувалдой по числам и степеням, чтобы делить их на множители';
  }
  function autoTool() {
    if (!state || state.finished) return;
    if (state.chop) { window.MG.tools.auto('factor', { axe: true }); return; }
    if (window.MG.tools.current() === 'rocket') return;   // ракета остаётся в руках, пока пользователь сам не выберет другой инструмент
    const all = allToks().filter((t) => !t.gone && !isOneTok(t));
    window.MG.tools.auto('factor', {
      hammer: all.some(isComposite),
      rocket: all.some((t) => t.role === 'cand'),
      glove: all.some((t) => t.role === 'pair'),
      axe: false,
    });
  }
  function updateHint() {
    const t = defaultHint();
    if (t !== shownHint) setHint(t);
    autoTool();
    updateLaunchUI();
  }

  /* ============================================================
   * Раунд
   * ============================================================ */
  function newRound() {
    clearSel();
    clearArm();
    if (window.MG.axe) window.MG.axe.reset(rows.num, bar);
    const spec = pickSpec();
    lastKey = specKey(spec);

    Object.values(rows).forEach((r) => {
      r.innerHTML = '';
      r.getAnimations().forEach((a) => a.cancel());
      r.style.display = '';
    });
    bar.getAnimations().forEach((a) => a.cancel());
    bar.style.display = '';
    after.classList.remove('show');

    state = {
      spec, pending: 0, finished: false, fontFit: 60,
      sides: { num: buildSide('num', spec.num), den: buildSide('den', spec.den) },
    };

    fitFontSize();
    render();
    fitBar(true);
    refreshRoles();

    [...rows.num.children, ...rows.den.children].forEach((el, i) => popIn(el, i * 60));

    setStats(levelOf(solved), solved);
    shownHint = '';
    updateHint();
  }

  /* ============================================================
   * Клики
   * ============================================================ */
  function onTokenClick(tok) {
    if (!state || state.finished || tok.gone) return;
    const tools = window.MG.tools;
    if (tools.current() === 'axe') { axeClick(tok); return; }                       // топор: рубим единицу в знаменателе
    if (state.chop) { tools.need('axe'); return; }
    if (isOneTok(tok)) return;
    if (tools.current() === 'glove') { gloveClick(tok); return; }                   // перчатка: выбираем пару
    if (tools.current() === 'rocket' && rocketClick(tok)) return;                   // ракета: цепляем к множителю
    if (isComposite(tok)) { if (tools.need('hammer')) splitOnce(tok); return; }   // составное → кувалда
    if (tok.role === 'cand') { tools.need('rocket'); return; }                      // общий множитель → ракета
    if (tok.role === 'pair') { tools.need('glove'); return; }                       // пару сокращает перчатка
    const name = tok.kind === 'num' ? tok.value : tok.name;
    indivisible(tok.el, `${name} — неделимое`);
  }

  /* ---------- деление на два множителя ---------- */
  async function splitOnce(tok) {
    if (tok.smashing) return;
    const st = state;
    tok.smashing = true;
    await smash(tok.el);                              // кувалда бьёт по числу
    tok.smashing = false;
    if (state !== st || st.finished || tok.gone || !isComposite(tok)) return;

    const list = listOf(tok);
    const first = snapshot();

    let part;
    if (tok.kind === 'num') {
      const p = spf(tok.value);
      part = makeNum(p, tok.side, tok.zone);
      tok.value /= p;
    } else {
      part = makeVar(tok.name, 1, tok.side, tok.zone);   // x³ → x · x²
      tok.exp -= 1;
    }
    part.term = tok.term;
    list.splice(list.indexOf(tok), 0, part);
    paint(tok);
    render();

    const src = first.get(tok.el);
    play(first, new Set([part.el]));
    crumble(tok.el, part.el, src);

    refreshRoles();
    updateHint();
  }

  /* ---------- ракета: прицепить к множителям и запустить ---------- */
  let armed = [];                                    // множители, к которым прицеплена ракета

  function clearArm() {
    armed.forEach((t) => t.el.classList.remove('armed'));
    armed = [];
    updateLaunchUI();
  }
  window.addEventListener('toolchange', (e) => {
    if (e.detail.tool !== 'rocket') clearArm();
    updateLaunchUI();
  });

  function updateLaunchUI() {
    if (!launchEl) return;
    const show = !!state && !state.finished && window.MG.tools.current() === 'rocket';
    launchEl.classList.toggle('show', show);
    goBtn.disabled = !armed.length || !state || state.pending > 0;
    goBtn.querySelector('b').textContent = armed.length ? ` (${armed.length})` : '';
  }

  /* ракета цепляется к любому множителю суммы — даже к «неправильному»: это выяснится при запуске */
  function rocketClick(tok) {   // всегда true: с ракетой в руках ни один клик не переключает инструмент
    if (state.pending > 0) return true;
    const side = state.sides[tok.side];
    if (tok.zone !== 'term' || side.terms.length < 2) {
      indivisible(tok.el, 'ракета выносит множитель из суммы');
      return true;
    }
    const i = armed.indexOf(tok);
    if (i >= 0) { armed.splice(i, 1); tok.el.classList.remove('armed'); }
    else { armed.push(tok); tok.el.classList.add('armed'); }
    updateHint();
    return true;
  }

  /* проверка выбора: в каждом слагаемом одной суммы выбраны одни и те же множители */
  function checkSelection(sel) {
    const sides = [...new Set(sel.map((t) => t.side))];
    if (sides.length > 1) return { ok: false, reason: 'Выбраны множители из числителя и знаменателя.' };
    const side = state.sides[sides[0]];
    const per = side.terms.map((term) => {
      const m = {};
      sel.filter((t) => t.term === term).forEach((t) => { const k = eqKey(t); m[k] = (m[k] || 0) + 1; });
      return m;
    });
    if (per.some((m) => !Object.keys(m).length)) {
      return { ok: false, reason: 'Ракета прицеплена не в каждом слагаемом — вынести можно только общий множитель.' };
    }
    const sig = (m) => Object.keys(m).sort().map((k) => `${k}:${m[k]}`).join(',');
    if (new Set(per.map(sig)).size > 1) {
      return { ok: false, reason: sel.some((t) => atomKey(t) === null)
        ? 'В слагаемых выбраны разные множители. Составное число можно выносить, только если оно есть целиком в каждом слагаемом, — иначе раздели его кувалдой.'
        : 'В слагаемых выбраны разные множители — вынести можно только общий.' };
    }
    const groups = [];
    Object.keys(per[0]).forEach((k) => {
      for (let j = 0; j < per[0][k]; j++) {
        groups.push(side.terms.map((term) => sel.filter((t) => t.term === term && eqKey(t) === k)[j]));
      }
    });
    return { ok: true, side, groups };
  }

  function launch() {
    if (!state || state.finished || state.pending > 0) return;
    const sel = armed.filter((t) => !t.gone && t.el.isConnected);
    if (!sel.length) return;
    const res = checkSelection(sel);
    clearArm();
    if (res.ok) launchGroups(res.side, res.groups);
    else failLaunch(sel, res.reason);
  }
  if (goBtn) goBtn.addEventListener('click', launch);

  /* ошибка: числа летят по разным траекториям и возвращаются на место со взрывом */
  async function failLaunch(sel, reason) {
    const st = state;
    st.pending++;
    updateLaunchUI();
    setHint(`${reason} Ракеты вернулись на место — попробуй ещё раз`);
    await Promise.all(sel.map((t, i) =>
      window.MG.scatter(t.el, { color: '#ef4444', delay: i * 110 })));
    st.pending--;
    if (state !== st) return;
    updateLaunchUI();
    setTimeout(() => { if (state === st) updateHint(); }, 2200);
  }

  /* успех: ракеты взлетают из слагаемых и взрывом собираются в множитель перед скобкой */
  async function launchGroups(side, groups) {
    const st = state;
    st.pending++;
    updateLaunchUI();
    const first = snapshot();
    const hadBrackets = side.outer.length > 0;

    const flat = groups.flat();
    flat.forEach((c) => c.el.classList.remove('peek', 'armed'));
    const ghosts = flat.map((c) => ghost(c.el));    // «призраки» полетят к новому месту за скобкой

    groups.forEach((cands) => cands.forEach((c, i) => {
      const term = side.terms[i];
      term.toks.splice(term.toks.indexOf(c), 1);
      c.el.remove();
    }));

    const Ps = groups.map((cands) => {
      const t = cands[0];
      const P = t.kind === 'num' ? makeNum(t.value, side.key, 'outer') : makeVar(t.name, t.exp, side.key, 'outer');
      side.outer.push(P);
      return P;
    });
    sortToks(side.outer);

    const fresh = Ps.map((P) => P.el);
    side.terms.forEach((term) => {
      if (!term.toks.length) {                      // слагаемое целиком вынесено → остаётся 1
        const one = makeNum(1, side.key, 'term');
        one.term = term;
        term.toks.push(one);
        fresh.push(one.el);
      }
    });
    if (!hadBrackets) fresh.push(side.open.el, side.close.el);

    render();
    refreshRoles();
    updateHint();

    const prs = Ps.map((P) => P.el.getBoundingClientRect());
    play(first, new Set(fresh));

    // новые множители и скобки появятся только после взрыва
    const hold = [...Ps.map((P) => P.el), ...(hadBrackets ? [] : [side.open.el, side.close.el])];
    hold.forEach((el) => { el.style.opacity = '0'; el.style.pointerEvents = 'none'; });

    // ракеты стартуют из слагаемых по дугам-фонтанчикам: над числителем, под знаменателем
    const dir = side.key === 'num' ? -1 : 1;
    const flights = [];
    groups.forEach((cands, gi) => cands.forEach((c, i) => {
      const k = gi * cands.length + i;
      flights.push(rocket(ghosts[k], first.get(c.el), prs[gi],
        { dir, delay: i * 120 + gi * 60, duration: 880, color: colorFor(Ps[gi]) }));
    }));

    // слагаемое, из которого вылетел весь множитель, сразу показывает 1
    fresh.filter((el) => !hold.includes(el)).forEach((el) => popIn(el, 150));

    await Promise.all(flights);

    // взрыв: ракеты объединились в множители за скобкой
    hold.forEach((el) => { el.style.opacity = ''; el.style.pointerEvents = ''; });
    Ps.forEach((P) => { explode(P.el, colorFor(P)); popIn(P.el); });
    if (!hadBrackets) { popIn(side.open.el, 120); popIn(side.close.el, 120); }

    await sleep(560);
    st.pending--;
    updateLaunchUI();
    if (state === st) checkFinish();
  }


  /* ---------- перчатка: выбрать два множителя, которые сокращаются ---------- */
  let sel = [];
  function clearSel() { sel.forEach((t) => t.el.classList.remove('sel')); sel = []; }
  window.addEventListener('toolchange', (e) => { if (e.detail.tool !== 'glove') clearSel(); });

  /* число внутри суммы или разности: сокращать нельзя — вся сумма «замерзает» кубиком льда */
  const inSum = (tok) => tok.zone === 'term' && state.sides[tok.side].terms.length > 1;
  async function freezeSum(sideKey) {
    const st = state;
    const side = st.sides[sideKey];
    const els = [];
    side.terms.forEach((term, i) => {
      if (i > 0 && term.sign) els.push(term.sign.el);
      term.toks.forEach((t) => els.push(t.el));
    });
    if (side.outer.length) els.push(side.open.el, side.close.el);
    setHint('Сумма и разность — как кубик льда: слагаемые сокращать нельзя. Сначала вынеси общий множитель за скобки');
    await window.MG.ice(els, { key: sideKey });
    if (state === st) updateHint();
  }

  function gloveClick(tok) {
    if (state.pending > 0) return;
    if (inSum(tok)) { clearSel(); freezeSum(tok.side); return; }
    const i = sel.indexOf(tok);
    if (i >= 0) { tok.el.classList.remove('sel'); sel.splice(i, 1); return; }
    tok.el.classList.add('sel');
    sel.push(tok);
    if (sel.length < 2) return;
    const [a, b] = sel;
    clearSel();
    if (a.side !== b.side && a.role === 'pair' && b.role === 'pair' && atomKey(a) && atomKey(a) === atomKey(b)) { cancelPair(a, b); return; }
    [a, b].forEach((t) => window.MG.shake(t.el));
    setHint('Эти множители сократить нельзя — ластик исчез на несколько секунд');
    setTimeout(() => { if (state) updateHint(); }, 3800);
    window.MG.tools.disable('glove', 4000);
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
      const list = listOf(t);
      list.splice(list.indexOf(t), 1);
      t.el.remove();
    });

    Object.values(st.sides).forEach((side) => {
      if (side.terms.length === 1) {
        const term = side.terms[0];
        if (!term.toks.length) {                    // одночлен сократился целиком → 1
          const one = makeNum(1, side.key, 'term');
          one.term = term;
          term.toks.push(one);
          fresh.push(one.el);
        }
      } else if (!side.outer.length) {              // за скобкой ничего не осталось → скобки уходят
        [side.open, side.close].forEach((g) => {
          if (!g.el.isConnected) return;
          const gh = ghost(g.el);
          gh.animate([
            { opacity: 1, scale: '1' },
            { opacity: 0, scale: '.4' },
          ], { duration: T(340), easing: 'ease-in' }).onfinish = () => gh.remove();
        });
      }
    });

    render();
    play(first, new Set(fresh));
    fresh.forEach((el) => popIn(el));

    st.pending--;
    refreshRoles();
    updateHint();
    await sleep(580);
    if (state === st) checkFinish();
  }

  /* ============================================================
   * Финал
   * ============================================================ */
  /* всё, что можно вынести/сократить в части дроби: множители за скобкой + общее у слагаемых */
  function sideCommon(side) {
    const termAtoms = side.terms.map((term) => term.toks.flatMap(atomsOfTok));
    if (side.terms.length === 1) return termAtoms[0];
    return [...side.outer.flatMap(atomsOfTok), ...intersect(termAtoms)];
  }

  function checkFinish() {
    if (!state || state.finished || state.pending > 0) return;
    const common = intersect([sideCommon(state.sides.num), sideCommon(state.sides.den)]);
    if (!common.length) {
      if (isOneSide(state.sides.den)) { state.chop = true; updateHint(); return; }   // единицу в знаменателе срубает топор
      finish();
    }
  }

  /* топор: клик по единице в знаменателе */
  function axeClick(tok) {
    if (!state.chop) { indivisible(tok.el, 'топор пригодится, когда в знаменателе останется единица'); return; }
    if (tok.side !== 'den' || !isOneTok(tok)) { indivisible(tok.el, 'руби единицу в знаменателе'); return; }
    finish(true);
  }

  /* слить одинаковые множители в группе: 2·3 → 6, x·x² → x³ */
  async function mergeGroups() {
    const st = state;
    const groups = [];
    const collect = (list, term) => {
      const byKey = {};
      list.forEach((t) => {
        const k = t.kind === 'num' ? '#' : `v:${t.name}`;
        (byKey[k] = byKey[k] || []).push(t);
      });
      Object.values(byKey).forEach((toks) => { if (toks.length > 1) groups.push({ list, toks, term }); });
    };
    Object.values(st.sides).forEach((side) => {
      if (side.terms.length > 1) collect(side.outer, null);
      side.terms.forEach((term) => collect(term.toks, term));
    });
    if (!groups.length) return;

    const outs = [];
    groups.forEach((g) => {
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
    groups.forEach((g) => {
      const f = g.toks[0];
      const merged = f.kind === 'num'
        ? makeNum(g.toks.reduce((x, t) => x * t.value, 1), f.side, f.zone)
        : makeVar(f.name, g.toks.reduce((x, t) => x + t.exp, 0), f.side, f.zone);
      merged.term = g.term;
      const idx = g.list.indexOf(f);
      g.toks.forEach((t) => { g.list.splice(g.list.indexOf(t), 1); t.el.remove(); });
      g.list.splice(idx, 0, merged);
      fresh.push(merged.el);
    });
    render();
    play(first, new Set(fresh));
    fresh.forEach((el) => popIn(el));
    await sleep(560);
  }

  /* текст результата из текущего состояния */
  function toksHTML(toks) {
    const nums = toks.filter((t) => !t.gone && t.kind === 'num').reduce((x, t) => x * t.value, 1);
    const vars = {};
    toks.filter((t) => !t.gone && t.kind === 'var')
      .forEach((t) => { vars[t.name] = (vars[t.name] || 0) + t.exp; });
    const v = Object.keys(vars).sort().map((n) => n + supHTML(vars[n])).join('');
    return v ? (nums === 1 ? '' : nums) + v : String(nums);
  }
  function sideHTML(side) {
    if (side.terms.length === 1) return toksHTML(side.terms[0].toks);
    const inner = side.terms
      .map((term, i) => (i ? (term.neg ? ' − ' : ' + ') : (term.neg ? '−' : '')) + toksHTML(term.toks))
      .join('');
    return side.outer.length ? `${toksHTML(side.outer)}(${inner})` : inner;
  }
  const isOneSide = (side) => side.terms.length === 1
    && side.terms[0].toks.every((t) => isOneTok(t));

  async function finish(chop) {
    const st = state;
    if (st.finished) return;
    st.finished = true;
    updateLaunchUI();
    setHint('');
    await sleep(200);

    await mergeGroups();
    if (state !== st) return;

    if (chop && isOneSide(st.sides.den)) {
      const one = [...rows.den.children].find((el) => el.classList.contains('token') && el.textContent.trim() === '1') || rows.den.firstElementChild;
      await window.MG.axe.chop({ one, num: rows.num, bar });
      if (state !== st) return;
    }

    if (isOneSide(st.sides.den)) {                  // знаменатель 1 → дробной черты больше нет
      rows.den.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(300), fill: 'forwards' });
      bar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(300), fill: 'forwards' });
      await sleep(330);
      if (state !== st) return;
      const first = snapshot();
      rows.den.style.display = 'none';
      bar.style.display = 'none';
      play(first);
      await sleep(540);
      if (state !== st) return;
    }

    const numer = sideHTML(st.sides.num);
    const html = isOneSide(st.sides.den) ? numer : mf(numer, sideHTML(st.sides.den));
    [...rows.num.children, ...rows.den.children].forEach((el) => {
      el.classList.add('final');
      el.classList.remove('big', 'paired');
    });

    resultText.innerHTML = `${mf(sumHTML(st.spec.num), sumHTML(st.spec.den))} = ${html}`;
    solved++;
    setStats(levelOf(solved), solved);

    after.classList.add('show');
    [...rows.num.children, ...rows.den.children]
      .filter((el) => el.classList.contains('token') && el.offsetParent)
      .forEach((el) => burst(el, '#16a34a', 6));
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  /* ============================================================
   * Кнопки и регистрация режима
   * ============================================================ */
  nextBtn.addEventListener('click', newRound);

  window.MG.modes.factor = {
    start() {
      if (!state) newRound();
      else setStats(levelOf(solved), solved);
      updateLaunchUI();
    },
    skip: newRound,
  };
})();

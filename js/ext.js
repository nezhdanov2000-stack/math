/* Режим «Выделить целую часть»: неправильная дробь → смешанное число.
 * Инструмент — пасть (maw): дробная черта раскрывается и выплёвывает целое
 * (знаменатель/знаменатель = 1), из числителя уходит один знаменатель.
 * Так до тех пор, пока числитель не станет меньше знаменателя. */
(() => {
  'use strict';
  const MG = window.MG;
  const { gcd, $, T, sleep, EASE, ri, setStats, mf, rowWidth, burst, popIn, bump, shake } = MG;

  const stageEl = $('#ex-stage');
  const wholeEl = $('#ex-whole');
  const fracEl = $('#ex-fraction');
  const numRow = $('#ex-num');
  const denRow = $('#ex-den');
  const bar = $('#ex-bar');
  const after = $('#ex-after');
  const resultText = $('#ex-resultText');
  const nextBtn = $('#ex-next');
  const hint = MG.hinter($('#ex-hint'));

  const css = document.createElement('style');
  css.textContent = `
    .ex-stage { display: flex; align-items: center; justify-content: center; gap: .18em; font-size: clamp(54px, 16vw, 84px); font-weight: 900; max-width: 100%; min-height: 3.6em; }
    .ex-stage .fraction { width: auto; font-size: inherit; }
    .ex-whole { min-width: 0; display: inline-block; font-weight: 900; color: #f97316; opacity: 0; scale: .4; transition: opacity .3s, scale .4s ${EASE}; }
    .ex-whole.on { opacity: 1; scale: 1; }
    .ex-whole.final, .ex-stage .final { color: var(--ok); }
    .ex-chip { position: fixed; z-index: 75; pointer-events: none; display: grid; place-items: center; min-width: 1.7em; padding: .08em .35em; border-radius: 999px;
      background: #f97316; color: #fff; font: 900 26px/1.15 inherit; font-family: inherit; box-shadow: 0 6px 14px rgba(249, 115, 22, .45); }
    .ex-chip .mf { font-size: .62em; }
    .ex-chip .mf i:first-child { border-bottom-color: #fff; }
    #mode-ext .fraction .token { cursor: pointer; }
    .ex-stage .fraction.nodots .token::before { opacity: 0 !important; }
  `;
  document.head.append(css);

  let state = null, solved = 0, lastKey = '';

  /* уровень растёт каждые 2 решённых примера; с каждым уровнем целая часть (ответ) на 1 знак длиннее:
   * однозначная, двузначная, трёхзначная… до пятизначной (больше не влезает на экран) */
  const lvlOf = () => 1 + Math.floor(solved / 2);
  function pick() {
    const lvl = lvlOf();
    const qd = Math.min(lvl, 5);
    const dMax = [5, 7, 9, 9, 9][qd - 1];
    if (solved === 0 && !lastKey) return { n: 7, d: 3 };
    for (let i = 0; i < 400; i++) {
      const d = ri(2, dMax), r = ri(1, d - 1);
      if (gcd(r, d) !== 1) continue;
      const k = ri(Math.max(1, 10 ** (qd - 1)), 10 ** qd - 1), n = k * d + r;
      if (`${n}/${d}` === lastKey) continue;
      return { n, d };
    }
    return { n: 11, d: 4 };
  }

  const tok = (v) => { const el = document.createElement('div'); el.className = 'token'; el.textContent = v; return el; };

  function fitBar(instant) {
    const fs = parseFloat(getComputedStyle(fracEl).fontSize);
    const w = Math.max(rowWidth(numRow), rowWidth(denRow)) + fs * 0.5;
    if (instant) bar.classList.add('instant');
    bar.style.width = `${w}px`;
    if (instant) { void bar.offsetWidth; bar.classList.remove('instant'); }
  }

  function newRound() {
    window.dispatchEvent(new Event('mg:round'));   // лампа-подсказка гаснет на новом примере
    const { n, d } = pick();
    lastKey = `${n}/${d}`;
    state = { n0: n, n, d, k: 0, busy: false, done: false };
    after.classList.remove('show');
    wholeEl.className = 'ex-whole';
    wholeEl.textContent = '';
    stageEl.querySelectorAll('.final').forEach((e) => e.classList.remove('final'));
    numRow.replaceChildren(tok(n));
    denRow.replaceChildren(tok(d));
    fitBar(true);
    popIn(fracEl);
    setStats(lvlOf(), solved);
    say();
  }

  function say() {
    const s = state;
    hint.set(s.done ? '' : s.k === 0
      ? (MG.clip && MG.clip.isManual(1) ? `Нажми на дробь пастью и сам посчитай: сколько раз ${s.d} помещается в ${s.n}` : `Нажми на дробь: пасть выплюнет целое, когда числитель ${s.n} больше знаменателя ${s.d}`)
      : `Числитель ${s.n} ещё не меньше знаменателя ${s.d} — выплюнем ещё`);
  }

  function flyChip(x, y, st) {
    const chip = document.createElement('div');
    chip.className = 'ex-chip';
    chip.innerHTML = mf(st.d, st.d);
    chip.style.left = `${x}px`; chip.style.top = `${y}px`;
    document.body.append(chip);
    const wr = wholeEl.getBoundingClientRect();
    const tx = wr.width > 4 ? wr.left + wr.width / 2 : fracEl.getBoundingClientRect().left - 30;
    const ty = wr.top + wr.height / 2;
    const dx = tx - x, dy = ty - y;
    const a = chip.animate([
      { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
      { transform: 'translate(-50%,-50%) translate(0,-36px) scale(1.15)', opacity: 1, offset: .25 },
      { transform: `translate(-50%,-50%) translate(${dx * .6}px, ${dy * .5 - 30}px) scale(1)`, opacity: 1, offset: .6 },
      { transform: `translate(-50%,-50%) translate(${dx}px, ${dy}px) scale(.8)`, opacity: .9 },
    ], { duration: T(620), easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
    setTimeout(() => { chip.innerHTML = '1'; }, T(260));
    return a.finished.catch(() => {}).then(() => chip.remove());
  }

  async function onClick() {
    const st = state;
    if (!st || st.busy || st.done) return;
    if (!MG.tools.need('maw')) return;
    if (st.n < st.d) return;
    if (MG.clip && MG.clip.isManual(1)) { manualCount(st); return; }
    st.busy = true;
    let landed = null;
    await MG.maw.spit({ bar, onSpit: (x, y) => { landed = flyChip(x, y, st); } });
    if (state !== st) return;
    /* числитель теряет знаменатель */
    st.n -= st.d;
    st.k += 1;
    numRow.firstChild.textContent = st.n;
    bump(numRow.firstChild);
    fitBar();
    if (landed) await landed;
    if (state !== st) return;
    wholeEl.textContent = st.k;
    wholeEl.classList.add('on');
    bump(wholeEl);
    st.busy = false;
    if (st.n < st.d) { finish(st); return; }
    say();
  }

  /* ручной счёт: планшет просит целое и остаток, пасть потом выплёвывает ответ */
  async function manualCount(st) {
    st.busy = true;
    const res = await MG.clip.askDiv(st.n0, st.d, fracEl);
    if (state !== st) return;
    if (!res) { st.busy = false; return; }
    let landed = null;
    await MG.maw.spit({ bar, onSpit: (x, y) => { landed = flyChip(x, y, st); } });
    if (state !== st) return;
    st.k = res[0]; st.n = res[1];
    numRow.firstChild.textContent = st.n;
    bump(numRow.firstChild);
    fitBar();
    if (landed) await landed;
    if (state !== st) return;
    wholeEl.textContent = st.k;
    wholeEl.classList.add('on');
    bump(wholeEl);
    st.busy = false;
    finish(st);
  }

  async function finish(st) {
    st.done = true;
    hint.set('');
    await sleep(T(250));
    if (state !== st) return;
    stageEl.querySelectorAll('.token').forEach((t) => t.classList.add('final'));
    wholeEl.classList.add('final');
    resultText.innerHTML = `${mf(st.n0, st.d)} = <span class="mw">${st.k}</span>${mf(st.n, st.d)}`;
    solved++;
    setStats(lvlOf(), solved);
    after.classList.add('show');
    offerEnd();
    burst(wholeEl, '#16a34a', 14);
    burst(numRow.firstChild, '#16a34a', 10);
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  /* после 7 решённых примеров предлагаем закончить режим */
  const ENDKEY = 'mg.tut.skipext';
  const closeOffer = () => { const o = document.querySelector('.so-ov'); if (!o) return; o.classList.add('out'); setTimeout(() => o.remove(), 220); };
  function offerEnd() {
    const old = document.querySelector('.so-ov'); if (old) old.remove();
    let seen = true;
    try { seen = !!localStorage.getItem(ENDKEY); } catch (err) { /* нет хранилища */ }
    if (solved !== 7 || seen) return;
    try { localStorage.setItem(ENDKEY, '1'); } catch (err) { /* нет хранилища */ }
    const ov = document.createElement('div');
    ov.className = 'so-ov';
    ov.innerHTML = '<div class="skip-offer" role="dialog"><h3>Освоил пасть?</h3><p>Тогда этот режим можно закончить.</p><div class="so-row"><button type="button" class="so-go">Закончить</button><button type="button" class="so-stay">Остаться</button></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', (ev) => { if (ev.target === ov) closeOffer(); });
    ov.querySelector('.so-stay').addEventListener('click', closeOffer);
    ov.querySelector('.so-go').addEventListener('click', () => {
      try { localStorage.setItem('mg.solved.ext', '10'); } catch (err) { /* нет хранилища */ }
      ov.remove();
      const home = document.getElementById('home-btn');
      if (home) home.click();
    });
  }
  nextBtn.addEventListener('click', () => { const o = document.querySelector('.so-ov'); if (o) o.remove(); });

  fracEl.addEventListener('click', onClick);
  nextBtn.addEventListener('click', newRound);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (state) fitBar(true); });

  MG.modes.ext = {
    info: () => state && { n: state.n, d: state.d, busy: state.busy, done: state.done },
    levelUp() { solved = (Math.floor(solved / 2) + 1) * 2; newRound(); },
    start() { if (!state) newRound(); else { setStats(lvlOf(), solved); fitBar(true); } },
    skip: newRound,
  };
})();

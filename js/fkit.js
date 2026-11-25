/* Множители дроби: кувалда → ластик → молния (как в «Сокращении дробей»). Общий кусок для режимов
 * «Деление десятичных дробей» (decdiv.js) и «Деление через обыкновенные дроби» (decdivfr.js).
 *
 *   const kit = MG.fkit.make({ frac, rows: { num, den }, bar, num: [3, 10], den: [10, 4], live, bubble, onChange, onDone, onTool })
 *     frac — элемент .fraction, rows — его строки .row, bar — черта .bar; num/den — начальные множители (фишки);
 *     live() — раунд ещё идёт; bubble(text) — подсказка; onChange() — после каждого шага (обновить подсказку);
 *     onDone() — дробь сокращена и в каждой части одно число; onTool(tool, tok) — нажатие другим инструментом
 *     (вернуть true, если режим обработал сам).
 *   kit.tool() — какой инструмент нужен дальше: 'hammer' | 'glove' | 'bolt' | null (готово)
 *   kit.coach() — { tool, el, text } для пальца-подсказки;  kit.prod('num') — произведение части;
 *   kit.reduced() — нечего сокращать;  kit.sides — { num: { toks }, den: { toks } };  kit.busy() — идёт анимация.
 *   Кувалда делит составное на наименьший простой × остаток; ластик стирает пару одинаковых (сверху и снизу);
 *   молния перемножает фишки одной части, когда сокращать больше нечего. */
(() => {
  'use strict';
  const MG = window.MG;
  const { T, sleep, isPrime, spf, gcd, colorOf, snapshot, play, popIn, smash, crumble, indivisible } = MG;
  const snd = (n, o) => { if (MG.snd && MG.snd.play) MG.snd.play(n, o); };
  let uid = 0;

  function make(o) {
    const sides = { num: { key: 'num', toks: [] }, den: { key: 'den', toks: [] } };
    let pending = 0, zapping = false, dead = false;
    const live = () => !dead && (!o.live || o.live());
    let sel = [];
    const clearSel = () => { sel.forEach((t) => t.el.classList.remove('sel')); sel = []; };
    const onToolChange = (e) => { if (e.detail.tool !== 'glove') clearSel(); };
    window.addEventListener('toolchange', onToolChange);

    function makeTok(value, side) {
      const el = document.createElement('div');
      el.className = 'token';
      el.setAttribute('role', 'button');
      const tok = { id: ++uid, value, side, el, paired: false, gone: false };
      paint(tok);
      el.addEventListener('click', (e) => { e.stopPropagation(); onTok(tok, e); });
      return tok;
    }
    function paint(tok) {
      tok.el.textContent = tok.value;
      tok.el.classList.toggle('big', tok.value > 1 && !isPrime(tok.value));
      tok.el.classList.toggle('prime', isPrime(tok.value));
      tok.el.classList.toggle('one', tok.value === 1);
    }
    function sync(side) {
      const row = o.rows[side.key];
      side.toks.forEach((t, i) => { if (row.children[i] !== t.el) row.insertBefore(t.el, row.children[i] || null); });
      Object.values(o.rows).forEach((rw) => [...rw.children].forEach((c, i) => c.classList.toggle('lead', i === 0)));
      const fs = parseFloat(getComputedStyle(o.frac).fontSize);
      const rw = (row) => (MG.rowWidth ? MG.rowWidth(row) : row.scrollWidth);   // ширина самих фишек, а не строки
      o.bar.style.width = `${Math.max(rw(o.rows.num), rw(o.rows.den)) + fs * 0.3}px`;
    }
    function setPaired(tok, on) {
      tok.paired = on;
      tok.el.classList.toggle('paired', on);
      if (on) tok.el.style.setProperty('--c', colorOf(tok.value));
    }
    function refreshPairs() {
      const liveT = (k) => sides[k].toks.filter((t) => !t.gone && t.value > 1);
      const A = liveT('num'), B = liveT('den');
      [...A, ...B].forEach((t) => setPaired(t, false));
      new Set([...A, ...B].map((t) => t.value)).forEach((p) => {
        const a = A.filter((t) => t.value === p), b = B.filter((t) => t.value === p), k = Math.min(a.length, b.length);
        a.slice(0, k).forEach((t) => setPaired(t, true)); b.slice(0, k).forEach((t) => setPaired(t, true));
      });
    }
    const prod = (k) => sides[k].toks.filter((t) => !t.gone).reduce((x, t) => x * t.value, 1);
    const reduced = () => gcd(prod('num'), prod('den')) === 1;
    const boltSide = () => (!reduced() ? null : sides.num.toks.length > 1 ? 'num' : sides.den.toks.length > 1 ? 'den' : null);
    const allToks = () => [...sides.num.toks, ...sides.den.toks].filter((t) => !t.gone);
    function tool() {
      if (reduced()) return boltSide() ? 'bolt' : null;
      const lv = allToks();
      if (lv.some((t) => t.paired)) return lv.some((t) => t.value > 1 && !isPrime(t.value) && !t.paired) ? 'hammer' : 'glove';
      return 'hammer';
    }

    function onTok(tok, ev) {
      if (!live() || tok.gone || pending > 0) return;
      const tl = MG.tools.current();
      if (tl === 'hammer') {
        if (tok.value > 1 && !isPrime(tok.value)) { split(tok); return; }
        indivisible(tok.el, tok.value === 1 ? 'единицу не разбить' : `${tok.value} — простое, не делится`);
        return;
      }
      if (tl === 'glove') { gloveClick(tok); return; }
      if (tl === 'bolt') { boltClick(tok); return; }
      if (o.onTool && o.onTool(tl, tok, ev)) return;
      const need = tool();
      if (need && MG.tools.need) MG.tools.need(need);
    }
    async function split(tok) {
      if (tok.smashing) return;
      tok.smashing = true;
      await smash(tok.el);
      tok.smashing = false;
      if (!live() || tok.gone) return;
      const side = sides[tok.side];
      const first = snapshot();
      const p = spf(tok.value);
      const prime = makeTok(p, side.key);
      side.toks.splice(side.toks.indexOf(tok), 0, prime);
      tok.value /= p; paint(tok);
      sync(side);
      const src = first.get(tok.el);
      play(first, new Set([prime.el]));
      crumble(tok.el, prime.el, src);
      refreshPairs();
      changed();
    }
    function gloveClick(tok) {
      const i = sel.indexOf(tok);
      if (i >= 0) { tok.el.classList.remove('sel'); sel.splice(i, 1); return; }
      tok.el.classList.add('sel'); sel.push(tok);
      if (sel.length < 2) return;
      const [a, b] = sel;
      clearSel();
      if (a.side !== b.side && a.value === b.value && a.value > 1) { cancelPair(a, b); return; }
      [a, b].forEach((t) => MG.shake(t.el));
      if (o.bubble) o.bubble(a.side === b.side ? 'Стирают пару: один множитель сверху, такой же снизу' : 'Стирать можно только одинаковые множители');
    }
    async function cancelPair(a, b) {
      a.gone = b.gone = true;
      pending += 1;
      await Promise.all([MG.erase(a.el), MG.erase(b.el, 120)]);
      if (!live()) return;
      const first = snapshot();
      const fresh = [];
      [a, b].forEach((t) => { const s = sides[t.side]; s.toks.splice(s.toks.indexOf(t), 1); t.el.remove(); });
      ['num', 'den'].forEach((k) => {
        const s = sides[k];
        if (!s.toks.length) { const one = makeTok(1, k); s.toks.push(one); fresh.push(one); }
        sync(s);
      });
      play(first, new Set(fresh.map((f) => f.el)));
      fresh.forEach((f) => popIn(f.el));
      pending -= 1;
      refreshPairs();
      await sleep(500);
      if (!live()) return;
      changed();
    }
    async function boltClick(tok) {
      const bs = boltSide();
      if (!bs) { indivisible(tok.el, reduced() ? 'здесь считать нечего' : 'сначала сотри все пары ластиком'); return; }
      if (sides[tok.side].toks.length < 2) { indivisible(tok.el, `нажми молнией на ${bs === 'num' ? 'числитель' : 'знаменатель'}`); return; }
      if (zapping) return;
      zapping = true;
      const rr = o.rows[tok.side].getBoundingClientRect();
      const mark = document.createElement('div');
      Object.assign(mark.style, { position: 'fixed', pointerEvents: 'none', width: '2px', height: '2px', left: `${rr.left + rr.width / 2}px`, top: `${rr.top + rr.height / 2}px` });
      document.body.append(mark);
      await MG.lightning([mark], { reveal: false, color: '#facc15' });
      mark.remove();
      if (!live()) return;
      await collapse(sides[tok.side]);
      zapping = false;
      if (!live()) return;
      changed();
    }
    async function collapse(side) {
      if (side.toks.length < 2) return;
      const row = o.rows[side.key];
      const product = side.toks.reduce((x, t) => x * t.value, 1);
      const rr = row.getBoundingClientRect(), cx = rr.left + rr.width / 2;
      await Promise.all(side.toks.map((t) => {
        const r = t.el.getBoundingClientRect();
        return t.el.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${cx - (r.left + r.width / 2)}px) scale(.6)`, opacity: 0 }], { duration: T(480), easing: 'cubic-bezier(.6,0,.4,1)', fill: 'forwards' }).finished.catch(() => {});
      }));
      if (!live()) return;
      side.toks.forEach((t) => t.el.remove());
      const merged = makeTok(product, side.key);
      side.toks = [merged];
      row.append(merged.el);
      sync(side);
      popIn(merged.el);
      snd('pop');
    }
    let doneSent = false;
    function changed() {
      if (o.onChange) o.onChange();
      if (!doneSent && pending === 0 && !zapping && tool() === null) { doneSent = true; if (o.onDone) o.onDone(); }
    }
    function coach() {
      if (zapping || pending > 0) return null;
      const tl = tool();
      if (!tl) return null;
      const lv = allToks();
      if (tl === 'hammer') { const t = lv.find((x) => x.value > 1 && !isPrime(x.value) && !x.paired) || lv.find((x) => x.value > 1 && !isPrime(x.value)); return t ? { tool: tl, el: t.el, text: 'Разбей кувалдой' } : null; }
      if (tl === 'glove') {
        const t = sel.length ? lv.find((x) => x.paired && x.value === sel[0].value && x.side !== sel[0].side) : lv.find((x) => x.paired);
        return t ? { tool: tl, el: t.el, text: sel.length ? 'И его пару' : 'Сотри ластиком пару одинаковых' } : null;
      }
      const bs = boltSide();
      return { tool: 'bolt', el: o.rows[bs], text: `Нажми молнией на ${bs === 'num' ? 'числитель' : 'знаменатель'}` };
    }

    (o.num || []).forEach((v) => sides.num.toks.push(makeTok(v, 'num')));
    (o.den || []).forEach((v) => sides.den.toks.push(makeTok(v, 'den')));
    sync(sides.num); sync(sides.den);
    refreshPairs();
    return {
      sides, tool, coach, prod, reduced,
      busy: () => zapping || pending > 0,
      hint: () => { const tl = tool(); return tl === 'hammer' ? 'Кувалдой разбей числа на множители' : tl === 'glove' ? 'Ластиком сотри одинаковые множители: один сверху, другой снизу' : tl === 'bolt' ? 'Молнией перемножь оставшиеся множители' : ''; },
      check: changed,
      destroy() { dead = true; clearSel(); window.removeEventListener('toolchange', onToolChange); },
    };
  }

  MG.fkit = { make };
})();
